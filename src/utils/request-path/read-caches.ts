/**
 * In-process caches, and whether they hold database reads (#373, #374).
 *
 * Three shapes of cache are found, in Python and TS/JS:
 *
 * - A caching decorator on a function (Python): `functools.lru_cache` /
 *   `cache`, `cachetools.func.*_cache`, `cachetools.cached(…)`,
 *   `async_lru.alru_cache`, `aiocache.cached` (in-memory backend only). Its
 *   fill is the decorated function; its key is the call's arguments.
 * - A container: a module-level name or an attribute (`self._x`,
 *   `app.state.x`) bound to a cache class (cachetools `TTLCache`,
 *   `LRUCache`, …; lru-cache's `LRUCache` in TS/JS), or to a plain dict /
 *   `Map` whose name says cache or memo. Its fills are the statements that
 *   store into it: `NAME[key] = value` (Python), `NAME.set(key, value)` (TS/JS).
 *
 * Expiry (a TTL) and a size bound are read from the decorator or the class
 * and, for a plain container, from the code around it: a clock read in a
 * function that touches it (a timestamp stored with the entry), a size check
 * or an eviction (`len(NAME)`, `popitem`, `.size`).
 *
 * A fill holds a database read when the decorated function reads (itself,
 * or through a function it calls one step deep), or when the stored value
 * comes, through the function's own assignments, from a statement that
 * reads (see {@link isDatabaseRead}).
 */

import { apisFor, isDatabaseRead, type ClientApi, type ProjectClients } from './data-clients';
import type { ModuleGraph } from './module-graph';
import type { CallSite, FunctionModel, ModuleModel, StatementModel } from './model';

export interface CacheFill {
  fn: FunctionModel;
  line: number;
  /** The key expression; null for a decorator (the arguments are the key). */
  key: string | null;
  /** The stored expression; null for a decorator. */
  value: string | null;
  /** The fill stores a database read. */
  readsDatabase: boolean;
  /** Read calls of the fill, for collections and per-user keys. */
  reads: CallSite[];
}

export interface CacheSite {
  module: ModuleModel;
  line: number;
  kind: 'decorator' | 'container';
  /** The decorated function's name, or the container's last name segment (`_cache` for `self._cache`). */
  name: string;
  /** As written: `@lru_cache(maxsize=None)`, `USER_CACHE = {}`. */
  label: string;
  ttl: boolean;
  bounded: boolean;
  /** The decorator's backend could not be told (a cache object passed by a name not bound in the module). */
  unknownBackend: boolean;
  /** For a decorator: the decorated function. */
  decorated: FunctionModel | null;
  fills: CacheFill[];
}

const CACHE_NAME = /cache|memo/i;
const CLOCK = /\b(?:time\.(?:monotonic|time|perf_counter)|monotonic|loop\.time|datetime\.(?:now|utcnow)|Date\.now|performance\.now)\s*\(|expir|\bttl\b/i;

/** `functools.lru_cache`, `cachetools.func.ttl_cache`, `async_lru.alru_cache`, `aiocache.cached`, bare or module-qualified. */
const DECORATOR =
  /^(?:(?:functools|cachetools|cachetools\.func|func|async_lru|aiocache)\.)?(lru_cache|cache|ttl_cache|lfu_cache|fifo_cache|rr_cache|alru_cache|cached|cachedmethod)\s*(?:\((.*)\))?$/s;
const NOT_IN_PROCESS = /\b(?:Cache\.(?:REDIS|MEMCACHED)|RedisCache|MemcachedCache)\b/;
const TTL_CLASS = /\b(?:TTLCache|TLRUCache)\s*\(/;
const BOUNDED_CLASS = /\b(?:TTLCache|TLRUCache|LRUCache|LFUCache|FIFOCache|RRCache|Cache)\s*\(/;
const PLAIN_MAP = /^(?:\{\s*\}|dict\(\s*\)|(?:collections\.)?(?:OrderedDict|defaultdict)\(.*\))$/s;

interface Policy {
  ttl: boolean;
  bounded: boolean;
  unknown: boolean;
}

const maxsizeNone = (args: string): boolean => /\bmaxsize\s*=\s*None\b/.test(args) || /^\s*None\s*(?:,|$)/.test(args);
const hasTtl = (args: string): boolean => /\bttl\s*=\s*(?!None\b)\S/.test(args);

/** The policy of a cache object expression (`TTLCache(...)`, `{}`), or null when it is not one. */
function objectPolicy(expr: string): Policy | null {
  if (TTL_CLASS.test(expr)) return { ttl: true, bounded: true, unknown: false };
  if (BOUNDED_CLASS.test(expr)) return { ttl: false, bounded: true, unknown: false };
  if (/^\s*(?:\{\s*\}|dict\(\s*\))\s*$/.test(expr)) return { ttl: false, bounded: false, unknown: false };
  return null;
}

/** `cached(cache=…)` / `cached(TTLCache(…))` / aiocache `cached(ttl=…)`; null when not in-process. */
function cachedPolicy(args: string, bindings: ReadonlyMap<string, string>): Policy | null {
  if (NOT_IN_PROCESS.test(args)) return null;
  const cacheArg = (/\bcache\s*=\s*([^,]+)/.exec(args)?.[1] ?? args.split(',')[0] ?? '').trim();
  const direct = objectPolicy(cacheArg);
  if (direct) return direct;
  const bound = bindings.get(cacheArg);
  const viaName = bound !== undefined ? objectPolicy(bound) : null;
  if (viaName) return viaName;
  if (hasTtl(args)) return { ttl: true, bounded: false, unknown: false };
  return { ttl: false, bounded: false, unknown: true };
}

/** The policy of a caching decorator, or null when the decorator is not an in-process cache. */
export function decoratorPolicy(decorator: string, bindings: ReadonlyMap<string, string>): Policy | null {
  const m = DECORATOR.exec(decorator.trim());
  if (!m) return null;
  const kind = m[1] as string;
  const args = m[2] ?? '';
  if (kind === 'cache') return m[2] === undefined ? { ttl: false, bounded: false, unknown: false } : null;
  if (kind === 'cached' || kind === 'cachedmethod') return cachedPolicy(args, bindings);
  const ttl = kind === 'ttl_cache' || (kind === 'alru_cache' && hasTtl(args));
  return { ttl, bounded: !maxsizeNone(args), unknown: false };
}

/** The policy of a container binding, or null when the binding is not a cache. */
function containerPolicy(name: string, expr: string, language: ModuleModel['language']): Policy | null {
  if (language === 'typescript') {
    const m = /^new\s+(Map|LRUCache)\b([\s\S]*)$/.exec(expr.trim());
    if (!m) return null;
    if (m[1] === 'LRUCache') return { ttl: /\bttl\s*:/.test(m[2] ?? ''), bounded: /\b(?:max|maxSize)\s*:/.test(m[2] ?? ''), unknown: false };
    return CACHE_NAME.test(name) ? { ttl: false, bounded: false, unknown: false } : null;
  }
  const cls = /^(?:cachetools\.)?(?:TTLCache|TLRUCache|LRUCache|LFUCache|FIFOCache|RRCache)\s*\(/.test(expr.trim()) ? objectPolicy(expr) : null;
  if (cls) return cls;
  return PLAIN_MAP.test(expr.trim()) && CACHE_NAME.test(name) ? { ttl: false, bounded: false, unknown: false } : null;
}

export const lastSegment = (name: string): string => name.split('.').pop() ?? name;

const escapeRe = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The raw source of a function (comments included). */
export function functionText(module: ModuleModel, fn: FunctionModel): string {
  return module.lines.slice(fn.line - 1, fn.endLine).join('\n');
}

interface Binding {
  name: string;
  expr: string;
  line: number;
}

const PY_MODULE_BINDING = /^([A-Za-z_]\w*)\s*(?::[^=\n]+)?=(?!=)\s*(.+?)\s*$/;
const PY_ATTRIBUTE_BINDING = /^((?:self|cls)\.\w+|[\w.]*\bstate\.\w+)\s*(?::[^=]+)?=(?!=)\s*(.+)$/s;
const TS_BINDING = /^\s*(?:export\s+)?(?:(?:const|let|var)\s+|(?:(?:private|protected|public|readonly|static|declare)\s+)*(?:this\.)?)(#?[A-Za-z_$][\w$]*)\s*(?:!?:\s*[^=]+)?=\s*(new\s+(?:Map|LRUCache)\b.*)$/;

/** The text from `start` of `lines[index]` to the end of its call: enough to read an options object. */
function ctorText(lines: readonly string[], index: number, start: string): string {
  return [start, ...lines.slice(index + 1, index + 8)].join('\n').split(/\)\s*;?\s*$/m)[0] ?? start;
}

function containerBindings(module: ModuleModel): Binding[] {
  if (module.language === 'typescript') {
    return module.lines.flatMap((text, index) => {
      const m = TS_BINDING.exec(text);
      return m ? [{ name: m[1] as string, expr: ctorText(module.lines, index, m[2] as string), line: index + 1 }] : [];
    });
  }
  const top = module.lines.flatMap((text, index) => {
    const m = /^\S/.test(text) ? PY_MODULE_BINDING.exec(text.replace(/\s+#.*$/, '')) : null;
    return m ? [{ name: m[1] as string, expr: m[2] as string, line: index + 1 }] : [];
  });
  const attributes = module.functions.flatMap(fn =>
    fn.blocks.flat().flatMap(statement => {
      const m = statement.simple ? PY_ATTRIBUTE_BINDING.exec(statement.text) : null;
      return m ? [{ name: m[1] as string, expr: m[2] as string, line: statement.line }] : [];
    })
  );
  return [...top, ...attributes];
}

/** Lines of the function's database reads (awaited, or a sync registry read), with the calls. */
function readCalls(fn: FunctionModel, apis: readonly ClientApi[]): CallSite[] {
  const awaited = new Set(fn.blocks.flat().flatMap(s => s.awaits).flatMap(a => (a.call ? [`${a.call.line}:${a.call.text}`] : [])));
  return fn.calls.filter(call => isDatabaseRead(call, apis, awaited.has(`${call.line}:${call.text}`)));
}

export interface CacheScan {
  clients: ProjectClients;
  graph: ModuleGraph;
}

/** The function's own reads, and the reads of the functions it calls one step deep. */
function readsThrough(module: ModuleModel, fn: FunctionModel, scan: CacheScan): CallSite[] {
  const apis = apisFor(scan.clients, module.language);
  const own = readCalls(fn, apis);
  const helpers = fn.calls.flatMap(call => {
    const target = scan.graph.resolve(module, fn, call);
    if (!target || target.fn === fn) return [];
    const theirs = readCalls(target.fn, apisFor(scan.clients, target.module.language));
    return theirs.length > 0 ? [call] : [];
  });
  return [...own, ...helpers];
}

/** Does the stored value come from a statement that reads, through the function's own assignments? */
function valueFromRead(fn: FunctionModel, store: StatementModel, value: string, readLines: ReadonlySet<number>): boolean {
  const reads = (s: StatementModel): boolean => [...readLines].some(line => line >= s.line && line <= s.endLine);
  if (reads(store) && /\bawait\b|\(/.test(value)) return true;
  const names = new Set<string>(value.match(/[A-Za-z_$][\w$]*/g) ?? []);
  const earlier = fn.blocks
    .flat()
    .filter(s => s.line < store.line)
    .sort((a, b) => b.line - a.line);
  for (let pass = 0; pass < 4; pass++) {
    for (const s of earlier) {
      if (!s.bound.some(name => names.has(name))) continue;
      if (reads(s)) return true;
      s.used.forEach(name => names.add(name.split('.')[0] as string));
    }
  }
  return false;
}

interface Store {
  fn: FunctionModel;
  statement: StatementModel;
  line: number;
  key: string;
  value: string;
}

/** `NAME[key] = value` (Python) or `NAME.set(key, value)` (TS/JS), with NAME as the last segment of the target. */
export function storesInto(module: ModuleModel, name: string): Store[] {
  const segment = escapeRe(lastSegment(name));
  if (module.language === 'python') {
    const target = new RegExp(String.raw`^(?:[\w]+\.)*${segment}\s*\[(.+)\]\s*=(?!=)\s*(.+)$`, 's');
    return module.functions.flatMap(fn =>
      fn.blocks.flat().flatMap(statement => {
        const m = statement.simple ? target.exec(statement.text) : null;
        return m ? [{ fn, statement, line: statement.line, key: (m[1] as string).trim(), value: (m[2] as string).trim() }] : [];
      })
    );
  }
  return module.functions.flatMap(fn =>
    fn.calls
      .filter(call => call.method === 'set' && call.args.length >= 2 && lastSegment(call.receiver) === lastSegment(name))
      .flatMap(call => {
        const statement = fn.blocks.flat().find(s => call.line >= s.line && call.line <= s.endLine);
        return statement ? [{ fn, statement, line: call.line, key: call.args[0]?.text ?? '', value: call.args[1]?.text ?? '' }] : [];
      })
  );
}

/** Functions of the module whose source mentions the container's last name segment. */
function touching(module: ModuleModel, name: string): string[] {
  const re = new RegExp(String.raw`(?<![\w$])${escapeRe(lastSegment(name))}(?![\w$])`);
  return module.functions.map(fn => functionText(module, fn)).filter(text => re.test(text));
}

function containerSite(module: ModuleModel, binding: Binding, policy: Policy, scan: CacheScan): CacheSite {
  const segment = escapeRe(lastSegment(binding.name));
  const texts = touching(module, binding.name);
  const eviction = new RegExp(String.raw`len\(\s*(?:[\w.]*\.)?${segment}\s*\)|\b${segment}\.(?:popitem|size)\b|${segment}\.keys\(\)\.next\(\)`);
  const fills = storesInto(module, binding.name).map(store => {
    const reads = readsThrough(module, store.fn, scan);
    const readLines = new Set(reads.map(call => call.line));
    const fromRead = reads.length > 0 && valueFromRead(store.fn, store.statement, store.value, readLines);
    return { fn: store.fn, line: store.line, key: store.key, value: store.value, readsDatabase: fromRead, reads: fromRead ? reads : [] };
  });
  return {
    module,
    line: binding.line,
    kind: 'container',
    name: lastSegment(binding.name),
    label: `${binding.name} = ${binding.expr.split('\n')[0]}`,
    ttl: policy.ttl || texts.some(text => CLOCK.test(text)),
    bounded: policy.bounded || texts.some(text => eviction.test(text)),
    unknownBackend: false,
    decorated: null,
    fills,
  };
}

function decoratorSites(module: ModuleModel, bindings: ReadonlyMap<string, string>, scan: CacheScan): CacheSite[] {
  return module.functions.flatMap(fn => {
    for (const decorator of fn.decorators ?? []) {
      const policy = decoratorPolicy(decorator, bindings);
      if (!policy) continue;
      const reads = readsThrough(module, fn, scan);
      const fill: CacheFill = { fn, line: fn.line, key: null, value: null, readsDatabase: reads.length > 0, reads };
      return [
        {
          module,
          line: fn.line,
          kind: 'decorator' as const,
          name: fn.shortName,
          label: `@${decorator}`,
          ttl: policy.ttl,
          bounded: policy.bounded,
          unknownBackend: policy.unknown,
          decorated: fn,
          fills: [fill],
        },
      ];
    }
    return [];
  });
}

/** Every in-process cache of the modules, with whether each fill holds a database read. */
export function findCaches(modules: readonly ModuleModel[], scan: CacheScan): CacheSite[] {
  return modules.flatMap(module => {
    const bindings = containerBindings(module);
    const byName = new Map(bindings.map(binding => [binding.name, binding.expr]));
    const containers = bindings.flatMap(binding => {
      const policy = containerPolicy(binding.name, binding.expr, module.language);
      return policy ? [containerSite(module, binding, policy, scan)] : [];
    });
    return [...decoratorSites(module, byName, scan), ...dedupe(containers)];
  });
}

/** One site per container name per module (an attribute bound in two methods is one cache). */
function dedupe(sites: CacheSite[]): CacheSite[] {
  const seen = new Set<string>();
  return sites.filter(site => {
    const key = `${site.module.rel}|${site.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Does the cache hold database reads? */
export function holdsDatabaseReads(site: CacheSite): boolean {
  return site.fills.some(fill => fill.readsDatabase);
}

/** The literal collections the cache's reads name (`collection("users")`, `collection(db, "users")`). */
export function cacheCollections(site: CacheSite, graph: ModuleGraph): string[] {
  const links = site.fills.flatMap(fill => fill.reads).flatMap(call => call.chain.filter(link => COLLECTION_LINKS.has(link.name)));
  const values = links.map(link => {
    const arg = (link.args ?? []).find(a => a.literal !== null || site.module.constants.has(a.text));
    return arg ? arg.literal ?? graph.constantFor(site.module, arg.text) : null;
  });
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

const COLLECTION_LINKS = new Set(['collection', 'collection_group', 'collectionGroup']);

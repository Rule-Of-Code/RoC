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

import {
  apisFor,
  isDatabaseRead,
  type ClientApi,
  type ProjectClients,
} from './data-clients';
import { containerPolicy, decoratorPolicy, type Policy } from './cache-policy';
import {
  type Binding,
  containerBindings,
  escapeRe,
  functionText,
  lastSegment,
  storesInto,
} from './cache-stores';
import type { ModuleGraph } from './module-graph';
import type {
  CallSite,
  FunctionModel,
  ModuleModel,
  StatementModel,
} from './model';

export { decoratorPolicy } from './cache-policy';
export { functionText, lastSegment, storesInto } from './cache-stores';

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

const CLOCK =
  /\b(?:time\.(?:monotonic|time|perf_counter)|monotonic|loop\.time|datetime\.(?:now|utcnow)|Date\.now|performance\.now)\s*\(|expir|\bttl\b/i;

/** Lines of the function's database reads (awaited, or a sync registry read), with the calls. */
function readCalls(fn: FunctionModel, apis: readonly ClientApi[]): CallSite[] {
  const awaited = new Set(
    fn.blocks
      .flat()
      .flatMap(s => s.awaits)
      .flatMap(a => (a.call ? [`${a.call.line}:${a.call.text}`] : []))
  );
  return fn.calls.filter(call =>
    isDatabaseRead(call, apis, awaited.has(`${call.line}:${call.text}`))
  );
}

export interface CacheScan {
  clients: ProjectClients;
  graph: ModuleGraph;
}

/** The function's own reads, and the reads of the functions it calls one step deep. */
function readsThrough(
  module: ModuleModel,
  fn: FunctionModel,
  scan: CacheScan
): CallSite[] {
  const apis = apisFor(scan.clients, module.language);
  const own = readCalls(fn, apis);
  const helpers = fn.calls.flatMap(call => {
    const target = scan.graph.resolve(module, fn, call);
    if (!target || target.fn === fn) return [];
    const theirs = readCalls(
      target.fn,
      apisFor(scan.clients, target.module.language)
    );
    return theirs.length > 0 ? [call] : [];
  });
  return [...own, ...helpers];
}

/** Does the stored value come from a statement that reads, through the function's own assignments? */
function valueFromRead(
  fn: FunctionModel,
  store: StatementModel,
  value: string,
  readLines: ReadonlySet<number>
): boolean {
  const reads = (s: StatementModel): boolean =>
    [...readLines].some(line => line >= s.line && line <= s.endLine);
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

/** Functions of the module whose source mentions the container's last name segment. */
function touching(module: ModuleModel, name: string): string[] {
  const re = new RegExp(
    String.raw`(?<![\w$])${escapeRe(lastSegment(name))}(?![\w$])`
  );
  return module.functions
    .map(fn => functionText(module, fn))
    .filter(text => re.test(text));
}

function containerSite(
  module: ModuleModel,
  binding: Binding,
  policy: Policy,
  scan: CacheScan
): CacheSite {
  const segment = escapeRe(lastSegment(binding.name));
  const texts = touching(module, binding.name);
  const eviction = new RegExp(
    String.raw`len\(\s*(?:[\w.]*\.)?${segment}\s*\)|\b${segment}\.(?:popitem|size)\b|${segment}\.keys\(\)\.next\(\)`
  );
  const fills = storesInto(module, binding.name).map(store => {
    const reads = readsThrough(module, store.fn, scan);
    const readLines = new Set(reads.map(call => call.line));
    const fromRead =
      reads.length > 0 &&
      valueFromRead(store.fn, store.statement, store.value, readLines);
    return {
      fn: store.fn,
      line: store.line,
      key: store.key,
      value: store.value,
      readsDatabase: fromRead,
      reads: fromRead ? reads : [],
    };
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

function decoratorSites(
  module: ModuleModel,
  bindings: ReadonlyMap<string, string>,
  scan: CacheScan
): CacheSite[] {
  return module.functions.flatMap(fn => {
    for (const decorator of fn.decorators ?? []) {
      const policy = decoratorPolicy(decorator, bindings);
      if (!policy) continue;
      const reads = readsThrough(module, fn, scan);
      const fill: CacheFill = {
        fn,
        line: fn.line,
        key: null,
        value: null,
        readsDatabase: reads.length > 0,
        reads,
      };
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
export function findCaches(
  modules: readonly ModuleModel[],
  scan: CacheScan
): CacheSite[] {
  return modules.flatMap(module => {
    const bindings = containerBindings(module);
    const byName = new Map(
      bindings.map(binding => [binding.name, binding.expr])
    );
    const containers = bindings.flatMap(binding => {
      const policy = containerPolicy(
        binding.name,
        binding.expr,
        module.language
      );
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
export function cacheCollections(
  site: CacheSite,
  graph: ModuleGraph
): string[] {
  const links = site.fills
    .flatMap(fill => fill.reads)
    .flatMap(call =>
      call.chain.filter(link => COLLECTION_LINKS.has(link.name))
    );
  const values = links.map(link => {
    const arg = (link.args ?? []).find(
      a => a.literal !== null || site.module.constants.has(a.text)
    );
    return arg
      ? (arg.literal ?? graph.constantFor(site.module, arg.text))
      : null;
  });
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
}

const COLLECTION_LINKS = new Set([
  'collection',
  'collection_group',
  'collectionGroup',
]);

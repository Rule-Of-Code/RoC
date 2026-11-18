/**
 * How a cache of database reads is used (#373): cleared on the write paths,
 * kept out of authorization checks, keyed by the user when the read is per
 * user. Each answer names a file and a line.
 *
 * - Invalidation: a call that clears the cache or drops an entry —
 *   `fn.cache_clear()` / `cache_invalidate(…)` for a decorator,
 *   `NAME.clear()` / `.pop(…)` / `.delete(…)` / `del NAME[…]` for a
 *   container — in a function on a write path, or in a function a write path
 *   calls one step deep. A write path is a handler routed for POST, PUT,
 *   PATCH or DELETE, a function that makes a registry write call, or a
 *   middleware that branches on the request method.
 * - Same collection: where the cache's reads name a literal collection, each
 *   function that writes that collection must reach an invalidation too.
 * - Authorization: a function that refuses with 401/403 (or is a guard)
 *   and reads through the cache.
 * - Per-user key: the stored read uses a user id the key does not carry, or
 *   a decorated function reads an ambient user (`g.user`,
 *   `request.state.user`, a context variable) its arguments do not carry.
 */

import { apisFor, isDatabaseWrite, type ProjectClients } from './data-clients';
import type { ModuleGraph } from './module-graph';
import type { CallSite, FunctionModel, ModuleModel } from './model';
import {
  functionText,
  lastSegment,
  type CacheFill,
  type CacheSite,
} from './read-caches';

export interface FunctionRef {
  module: ModuleModel;
  fn: FunctionModel;
}

export interface UsageContext {
  modules: readonly ModuleModel[];
  graph: ModuleGraph;
  clients: ProjectClients;
}

const escapeRe = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const WRITE_ROUTE_PY =
  /\.(?:post|put|patch|delete)\s*\(|\bmethods\s*=\s*[[(][^\])]*["'](?:POST|PUT|PATCH|DELETE)["']/i;
const WRITE_ROUTE_TS =
  /@(?:Post|Put|Patch|Delete)\s*\(|\.(?:post|put|patch|delete)\s*\(/;
const METHOD_BRANCH = /\.method\s*(?:!==?|===?|not\s+in\b|in\b)/;

const AUTH_PY =
  /\braise\s+[\w.]*\([^)]*\b(?:401|403|HTTP_401_UNAUTHORIZED|HTTP_403_FORBIDDEN)\b|\braise\s+[\w.]*(?:PermissionDenied|NotAuthenticated|AuthenticationFailed|Unauthorized|Forbidden)\w*|\bstatus_code\s*=\s*(?:401|403|status\.HTTP_40[13]_\w+)\b/;
const AUTH_TS =
  /\bthrow\s+new\s+\w*(?:Unauthorized|Forbidden)\w*|\.status\(\s*40[13]\s*\)|\bHttpStatus\.(?:UNAUTHORIZED|FORBIDDEN)\b|\bstatusCode\s*[:=]\s*40[13]\b|\bcanActivate\s*\(/;

const USER_SEGMENT =
  /^(?:uid|user_?id|user|current_?user|account_?id|owner_?id|member_?id|principal|caller_?id)$/i;

const hasUserSegment = (name: string): boolean =>
  name.split('.').some(segment => USER_SEGMENT.test(segment));

function everyFunction(ctx: UsageContext): FunctionRef[] {
  return ctx.modules.flatMap(module =>
    module.functions.map(fn => ({ module, fn }))
  );
}

/** Is this function a write path: routed for a write method, a registry write, or a branch on the request method? */
export function isWritePath(
  ref: FunctionRef,
  clients: ProjectClients
): boolean {
  const { module, fn } = ref;
  const apis = apisFor(clients, module.language);
  if (fn.calls.some(call => isDatabaseWrite(call, apis))) return true;
  if (METHOD_BRANCH.test(functionText(module, fn))) return true;
  if (module.language === 'python')
    return (fn.decorators ?? []).some(d => WRITE_ROUTE_PY.test(d));
  const header = module.lines
    .slice(Math.max(0, fn.line - 4), fn.line)
    .join('\n');
  return WRITE_ROUTE_TS.test(header);
}

/** The pattern of a call that clears the cache or drops an entry. */
export function invalidationPattern(site: CacheSite): RegExp {
  const name = escapeRe(site.name);
  if (site.kind === 'decorator') {
    return new RegExp(
      String.raw`\b${name}\.(?:cache_clear|cache_invalidate)\s*\(|\b${name}\.cache\.(?:clear|delete)\s*\(`
    );
  }
  return new RegExp(
    String.raw`(?<![\w$])${name}\.(?:clear|pop|delete|invalidate)\s*\(|\bdel\s+(?:[\w.]*\.)?${name}\s*\[|^\s*(?:[\w.]*\.)?${name}\s*=\s*(?:\{\s*\}|dict\(\s*\)|new\s+Map\b)`,
    'm'
  );
}

/** Functions that clear the cache (their own source holds the call). */
function invalidators(site: CacheSite, ctx: UsageContext): FunctionRef[] {
  const pattern = invalidationPattern(site);
  return everyFunction(ctx).filter(
    ref =>
      ref.fn !== site.decorated &&
      pattern.test(functionText(ref.module, ref.fn))
  );
}

/** Does `ref` clear the cache itself, or call (one step deep) a function that does? */
function reaches(
  ref: FunctionRef,
  clearing: readonly FunctionRef[],
  graph: ModuleGraph
): boolean {
  if (clearing.some(c => c.fn === ref.fn)) return true;
  return ref.fn.calls.some(call => {
    const target = graph.resolve(ref.module, ref.fn, call);
    return target !== null && clearing.some(c => c.fn === target.fn);
  });
}

export interface InvalidationVerdict {
  /** A write path reaches an invalidation of the cache. */
  onWritePath: boolean;
  /** Writes to a collection the cache holds that reach no invalidation. */
  staleWrites: Array<{ rel: string; line: number; collection: string }>;
}

/** The write call of a function that writes the given literal collection, or null. */
function writeOfCollection(
  ref: FunctionRef,
  collection: string,
  clients: ProjectClients
): CallSite | null {
  const text = functionText(ref.module, ref.fn);
  const named = new RegExp(
    String.raw`\bcollection(?:_group|Group)?\(\s*(?:[\w.]+\s*,\s*)?["'\x60]${escapeRe(collection)}["'\x60]`
  );
  if (!named.test(text)) return null;
  const apis = apisFor(clients, ref.module.language);
  return ref.fn.calls.find(call => isDatabaseWrite(call, apis)) ?? null;
}

export function invalidationOf(
  site: CacheSite,
  collections: readonly string[],
  ctx: UsageContext
): InvalidationVerdict {
  const clearing = invalidators(site, ctx);
  const writers = everyFunction(ctx).filter(ref =>
    isWritePath(ref, ctx.clients)
  );
  const onWritePath = writers.some(ref => reaches(ref, clearing, ctx.graph));
  if (!onWritePath) return { onWritePath, staleWrites: [] };
  const staleWrites = collections.flatMap(collection =>
    everyFunction(ctx).flatMap(ref => {
      const write = writeOfCollection(ref, collection, ctx.clients);
      return write && !reaches(ref, clearing, ctx.graph)
        ? [{ rel: ref.module.rel, line: write.line, collection }]
        : [];
    })
  );
  return { onWritePath, staleWrites };
}

/** Is this function an authorization check: it refuses with 401/403, raises a permission error, or is a guard? */
export function isAuthorizationCheck(ref: FunctionRef): boolean {
  const text = functionText(ref.module, ref.fn);
  return ref.module.language === 'python'
    ? AUTH_PY.test(text)
    : AUTH_TS.test(text);
}

/** Where an authorization check reads through the cache: a call to the decorated function, or a read of the container. */
export function authorizationUses(
  site: CacheSite,
  ctx: UsageContext
): Array<{ rel: string; line: number; check: string }> {
  return everyFunction(ctx)
    .filter(isAuthorizationCheck)
    .flatMap(ref => {
      const direct = readThroughCache(site, ref, ctx);
      if (direct !== null)
        return [{ rel: ref.module.rel, line: direct, check: ref.fn.name }];
      // One step deep: a helper the check calls (require_admin → is_admin) reads through the cache.
      for (const call of ref.fn.calls) {
        const target = ctx.graph.resolve(ref.module, ref.fn, call);
        if (target === null || target.fn === ref.fn) continue;
        if (readThroughCache(site, target, ctx) !== null) {
          const check = `${ref.fn.name} (through ${target.fn.name})`;
          return [{ rel: ref.module.rel, line: call.line, check }];
        }
      }
      return [];
    });
}

/** The line where a function reads through the cache — calls the decorated function, or reads the container — or null. */
function readThroughCache(
  site: CacheSite,
  ref: FunctionRef,
  ctx: UsageContext
): number | null {
  if (site.kind === 'decorator') {
    if (ref.fn === site.decorated) return ref.fn.line;
    const call = ref.fn.calls.find(c => {
      const target = ctx.graph.resolve(ref.module, ref.fn, c);
      return target !== null
        ? target.fn === site.decorated
        : c.method === site.name &&
            c.chain.length === 1 &&
            ref.module === site.module;
    });
    return call ? call.line : null;
  }
  const read = new RegExp(
    String.raw`(?<![\w$])${escapeRe(site.name)}(?:\.(?:get|has)\s*\(|\s*\[)|\bin\s+(?:[\w.]*\.)?${escapeRe(site.name)}\b`
  );
  const lines = ref.module.lines.slice(ref.fn.line - 1, ref.fn.endLine);
  const index = lines.findIndex(line => read.test(line));
  return index >= 0 ? ref.fn.line + index : null;
}

/** Names reachable from `seed` through the function's own assignments (a key built in a local). */
function namesBehind(fn: FunctionModel, seed: readonly string[]): Set<string> {
  const names = new Set(seed);
  const statements = fn.blocks.flat();
  for (let pass = 0; pass < 4; pass++) {
    for (const s of statements) {
      if (s.bound.some(name => names.has(name)))
        s.used.forEach(name => names.add(name));
    }
  }
  return names;
}

const identifiers = (text: string): string[] =>
  text.match(/[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g) ?? [];

/** A container fill whose read uses a user id the key does not carry: the user id it names. */
function containerKeyMissesUser(fill: CacheFill): string | null {
  const readUser = fill.reads.flatMap(call => call.names).find(hasUserSegment);
  if (!readUser || fill.key === null) return null;
  const behindKey = namesBehind(fill.fn, identifiers(fill.key));
  return [...behindKey].some(hasUserSegment) ? null : readUser;
}

/** A decorated function that reads an ambient user (not one of its arguments): the name it reads. */
function decoratedReadsAmbientUser(fill: CacheFill): string | null {
  const params = new Set(fill.fn.params);
  const bound = new Set(fill.fn.blocks.flat().flatMap(s => s.bound));
  const used = namesBehind(
    fill.fn,
    fill.reads.flatMap(call => call.names)
  );
  const ambient = [...used].find(
    name =>
      hasUserSegment(name) &&
      !params.has(name.split('.')[0] as string) &&
      !bound.has(name.split('.')[0] as string)
  );
  return ambient ?? null;
}

/** Fills keyed without the user whose data they store. */
export function keysWithoutUser(
  site: CacheSite
): Array<{ rel: string; line: number; user: string; key: string }> {
  return site.fills.flatMap(fill => {
    if (!fill.readsDatabase) return [];
    const user =
      site.kind === 'decorator'
        ? decoratedReadsAmbientUser(fill)
        : containerKeyMissesUser(fill);
    return user
      ? [
          {
            rel: site.module.rel,
            line: fill.line,
            user,
            key: fill.key ?? `the arguments of ${lastSegment(fill.fn.name)}`,
          },
        ]
      : [];
  });
}

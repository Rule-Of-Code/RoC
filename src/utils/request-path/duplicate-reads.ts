/**
 * The same document read more than once while serving one request (#353).
 *
 * For every function (a handler, or any function that calls others), the
 * reads it makes itself and the reads of the functions it calls one step
 * deep — same module or one import (see module-graph.ts) — are put in the
 * caller's terms: a helper's id expression that is one of its parameters is
 * replaced by the argument the caller passed. Two reads with the same
 * literal collection path and the same id expression are a duplicate. A
 * helper read whose id is not a parameter (a value the helper computed) is
 * left out: it cannot be shown to be the same document.
 */

import { apisFor, classifyRead, type ProjectClients } from './data-clients';
import { documentKeyOf, repositoryKeyOf, type DocumentKey, type KeyScope } from './document-keys';
import { ModuleGraph, type ResolvedCall } from './module-graph';
import { orderedCall } from './sequential-awaits';
import type { CallSite, FunctionModel, ModuleModel } from './model';

export interface ReadSite {
  rel: string;
  line: number;
  function: string;
  /** Where the caller called the helper that reads; null for the caller's own read. */
  via: { rel: string; line: number } | null;
  /** The helper that reads (for a read made through a call). */
  helper?: { module: ModuleModel; fn: FunctionModel };
}

export interface DuplicateRead {
  handler: string;
  /** The document, in the handler's terms: `users/{uid}`. */
  document: string;
  sites: ReadSite[];
}

interface KeyedRead {
  key: DocumentKey;
  call: CallSite;
}

/** `const ref = doc(db, "users", uid)` → the bound expression's text, for the last binding of `name`. */
function localResolver(fn: FunctionModel): (name: string) => string | null {
  return name => {
    const statements = fn.blocks.flat().filter(s => s.bound.includes(name));
    const last = statements[statements.length - 1];
    if (!last) return null;
    const m = /^(?:(?:const|let|var)\s+)?[\w$]+\s*(?::[^=]+)?=(?!=)\s*(.+?);?$/s.exec(last.text);
    return m ? (m[1] as string).replace(/^await\s+/, '') : null;
  };
}

const readCache = new WeakMap<FunctionModel, KeyedRead[]>();

/** Calls that are awaited one-key repository reads (not document reads the registry already keys). */
function awaitedRepositoryReads(fn: FunctionModel, clients: ProjectClients, module: ModuleModel): Set<CallSite> {
  const apis = apisFor(clients, module.language);
  const out = new Set<CallSite>();
  for (const site of fn.blocks.flat().flatMap(s => s.awaits)) {
    if (site.call && classifyRead(site.call, apis) === 'read') out.add(site.call);
  }
  return out;
}

function keyOf(call: CallSite, scope: KeyScope, repositoryReads: ReadonlySet<CallSite>): DocumentKey | null {
  const key = documentKeyOf(call, scope);
  if (key) return key;
  const awaited = [...repositoryReads].find(r => r.line === call.line && r.text === call.text);
  return awaited ? repositoryKeyOf(call) : null;
}

function readsOf(graph: ModuleGraph, module: ModuleModel, fn: FunctionModel): KeyedRead[] {
  const hit = readCache.get(fn);
  if (hit) return hit;
  const scope = { local: localResolver(fn), constant: (name: string) => graph.constantFor(module, name) };
  const repositoryReads = awaitedRepositoryReads(fn, graph.clients, module);
  const reads = fn.calls
    .map(call => ({ call, key: keyOf(call, scope, repositoryReads) }))
    .filter((r): r is KeyedRead => r.key !== null);
  readCache.set(fn, reads);
  return reads;
}

function render(key: DocumentKey, ids: readonly string[]): string {
  if (key.path.startsWith('{0}.')) return key.path.replace(/\{(\d+)\}/g, (_, i: string) => ids[Number(i)] ?? '');
  return key.path.replace(/\{(\d+)\}/g, (_, i: string) => `{${ids[Number(i)]}}`);
}

/** Parameter → the argument text the call passed for it. */
function argumentMap(target: ResolvedCall, call: CallSite): Map<string, string> {
  const params = target.boundMethod ? target.fn.params.slice(1) : target.fn.params;
  const map = new Map<string, string>();
  // `self.helper(…)` / `this.helper(…)`: the helper's self is the caller's.
  const head = call.chain[0]?.name;
  if (call.chain.length === 2 && (head === 'self' || head === 'this')) map.set(head, head);
  let position = 0;
  for (const arg of call.args) {
    if (arg.text.startsWith('*') || arg.text.startsWith('...')) break;
    if (arg.keyword) map.set(arg.keyword, arg.text);
    else if (params[position] !== undefined) map.set(params[position++] as string, arg.text);
  }
  return map;
}

/** Conversions an id is commonly wrapped in: `str(uid)`, `String(uid)`. */
const ID_WRAPPERS = new Set(['str', 'String', 'int', 'Number']);

/**
 * A helper's id expression in the caller's terms: every free name in it
 * must be a parameter (replaced by the argument passed) or a conversion
 * wrapper; null otherwise — the id was computed inside the helper.
 */
function translateId(id: string, args: ReadonlyMap<string, string>): string | null {
  if (/^"[^"]*"$/.test(id)) return id;
  let known = true;
  let usesParameter = false;
  const translated = id.replace(/(?<![\w$.])[A-Za-z_$][\w$]*/g, name => {
    if (args.has(name)) {
      usesParameter = true;
      return args.get(name) as string;
    }
    if (!ID_WRAPPERS.has(name)) known = false;
    return name;
  });
  return known && usesParameter ? translated : null;
}

function helperReads(
  graph: ModuleGraph,
  module: ModuleModel,
  handler: FunctionModel,
  call: CallSite
): Array<{ document: string; site: ReadSite }> {
  const target = graph.resolve(module, handler, call);
  if (!target || target.fn === handler) return [];
  const args = argumentMap(target, call);
  return readsOf(graph, target.module, target.fn).flatMap(read => {
    const ids = read.key.ids.map(id => translateId(id, args));
    if (ids.some(id => id === null)) return [];
    return [
      {
        document: render(read.key, ids as string[]),
        site: {
          rel: target.module.rel,
          line: read.call.line,
          function: target.fn.name,
          via: { rel: module.rel, line: call.line },
          helper: { module: target.module, fn: target.fn },
        },
      },
    ];
  });
}

function siteKey(site: ReadSite): string {
  return `${site.rel}:${site.line}@${site.via ? `${site.via.rel}:${site.via.line}` : ''}`;
}

/** The line in the handler where a site's read happens (its own line, or the call into the helper). */
function handlerLine(site: ReadSite): number {
  return site.via ? site.via.line : site.line;
}

/** Does this call write — itself, or (one step deep) in the body of the function it runs? */
function writes(graph: ModuleGraph, module: ModuleModel, handler: FunctionModel, call: CallSite): boolean {
  if (orderedCall(call, graph.clients, module)) return true;
  const target = graph.resolve(module, handler, call);
  return target !== null && target.fn !== handler && target.fn.calls.some(c => orderedCall(c, graph.clients, target.module));
}

/**
 * A read after a write sees the new state: re-reading it is the point, not
 * a duplicate. Two reads count only when nothing between them in the
 * handler writes — counting a helper call that writes in its body, the
 * helper that made the first read included.
 */
function writtenBetween(graph: ModuleGraph, module: ModuleModel, handler: FunctionModel, sites: readonly ReadSite[]): boolean {
  const lines = sites.map(handlerLine);
  const first = Math.min(...lines);
  const last = Math.max(...lines);
  if (handler.calls.some(call => call.line >= first && call.line < last && writes(graph, module, handler, call))) return true;
  return sites.some(a => sites.some(b => a !== b && writtenInsideOneCall(graph, a, b)));
}

/** Two reads made through the same helper call: does the helper write between them? */
function writtenInsideOneCall(graph: ModuleGraph, a: ReadSite, b: ReadSite): boolean {
  if (!a.helper || a.helper.fn !== b.helper?.fn || a.via?.line !== b.via?.line || a.line >= b.line) return false;
  const { module, fn } = a.helper;
  return fn.calls.some(call => call.line >= a.line && call.line < b.line && writes(graph, module, fn, call));
}

function duplicatesOf(graph: ModuleGraph, module: ModuleModel, handler: FunctionModel): DuplicateRead[] {
  const reads = [
    ...readsOf(graph, module, handler).map(read => ({
      document: render(read.key, read.key.ids),
      site: { rel: module.rel, line: read.call.line, function: handler.name, via: null } as ReadSite,
    })),
    ...handler.calls.flatMap(call => helperReads(graph, module, handler, call)),
  ];
  const byDocument = new Map<string, Map<string, ReadSite>>();
  for (const { document, site } of reads) {
    const sites = byDocument.get(document) ?? new Map<string, ReadSite>();
    sites.set(siteKey(site), site);
    byDocument.set(document, sites);
  }
  return [...byDocument.entries()]
    .filter(([, sites]) => sites.size >= 2 && !writtenBetween(graph, module, handler, [...sites.values()]))
    .map(([document, sites]) => ({ handler: handler.name, document, sites: [...sites.values()] }));
}

/** Every duplicate read, each set of sites reported once (a set inside a larger one is dropped). */
export function scanDuplicateReads(
  modules: readonly ModuleModel[],
  clients: ProjectClients
): { duplicates: DuplicateRead[]; keyedReads: number } {
  const graph = new ModuleGraph(modules, clients);
  const all: DuplicateRead[] = [];
  let keyedReads = 0;
  for (const module of modules) {
    for (const fn of module.functions) {
      keyedReads += readsOf(graph, module, fn).length;
      all.push(...duplicatesOf(graph, module, fn));
    }
  }
  const keys = all.map(d => new Set(d.sites.map(siteKey)));
  const kept = all.filter((d, i) => {
    const mine = keys[i] as Set<string>;
    return !keys.some((other, j) => j !== i && other.size >= mine.size && [...mine].every(k => other.has(k)) && (other.size > mine.size || j < i));
  });
  return { duplicates: kept, keyedReads };
}

export function describeDuplicateRead(dup: DuplicateRead): string {
  const first = dup.sites[0] as ReadSite;
  const listed = dup.sites
    .map(s => `${s.rel}:${s.line} in ${s.function}()${s.via ? ` (called at ${s.via.rel}:${s.via.line})` : ''}`)
    .join(', ');
  return (
    `${first.rel}:${first.line}: ${dup.document} is read ${dup.sites.length} times while serving ${dup.handler}() — ${listed}; ` +
    'read it once and pass the value down, or keep it in a request-scoped cache'
  );
}

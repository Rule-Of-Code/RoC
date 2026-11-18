/**
 * Counting by fetching every document (#354).
 *
 * `len(list(q.stream()))`, `len(await q.get())`, `(await getDocs(q)).size`:
 * the database bills and transfers every document, and the client decodes
 * each one, only for the number of them. A count aggregation returns the
 * number alone. Reported per site:
 *
 * - Python: `len(…)` of a whole-result fetch — `list(fetch)`, a comprehension
 *   over a fetch with no filter, `await fetch`, a fetch itself — or of a
 *   local bound only to such a fetch and used nowhere else in the function.
 * - TS/JS: `(await fetch).size` / `.length` / `.docs.length`, or the same on
 *   a local bound only to `await fetch` and used nowhere else.
 *
 * A fetch is a call the client registry lists as returning a whole result
 * set (Firestore `get` on a query / `stream` / `getDocs`, Mongo `find` /
 * `to_list` / `toArray`, SQLAlchemy `.all()`, Django `.all()` / `.filter()`,
 * Prisma `findMany`, TypeORM `find` / `findBy` / `getMany`, Sequelize
 * `findAll`), shaped like a query: awaited, or (Python, unawaited) chained
 * from a query builder — so `len(data.get("tags"))` is not one.
 */

import { apisFor, countCalls, isFetchAll, type ProjectClients } from './data-clients';
import { matchingClose, matchingOpen } from './expr-text';
import type { FunctionModel, ModuleModel, StatementModel } from './model';

export interface CountByFetch {
  rel: string;
  line: number;
  expression: string;
  language: ModuleModel['language'];
  counts: string[];
}

/** Links that make a Python call chain a query, not a dict or a list. */
const QUERY_LINK = /\.(?:collection|collection_group|where|order_by|limit|offset|select|start_after|find|objects|filter|exclude|filter_by|query|execute|scalars|aggregate)\(?/;

function stripAwait(text: string): { text: string; awaited: boolean } {
  let t = text.trim();
  let awaited = false;
  for (;;) {
    if (t.startsWith('(') && matchingClose(t, 0) === t.length - 1) t = t.slice(1, -1).trim();
    else if (/^await\s/.test(t)) {
      t = t.slice(5).trim();
      awaited = true;
    } else return { text: t, awaited };
  }
}

/** The method of the outermost call `text` ends with (`q.where(…).stream()` → stream), with its receiver. */
function lastCall(text: string): { method: string; receiver: string } | null {
  if (!text.endsWith(')')) return null;
  const open = matchingOpen(text, text.length - 1);
  if (open <= 0) return null;
  const callee = text.slice(0, open);
  const m = /(?:^|\.)\s*([A-Za-z_$][\w$]*)\s*$/.exec(callee);
  if (!m) return null;
  return { method: m[1] as string, receiver: callee.slice(0, callee.length - m[0].length) };
}

/** Fetch calls no other common API shares a name with: a fetch wherever they appear. */
const ALWAYS_FETCH = new Set(['stream', 'to_list', 'toArray', 'getDocs', 'getDocsFromServer', 'getDocsFromCache', 'findMany', 'findAll', 'getMany']);

/** Is `text` a whole-result fetch (a distinctive fetch call, or a generic one that is awaited or query-shaped)? */
export function isFetchExpression(text: string, language: ModuleModel['language'], fetchMethods: (m: string) => boolean): boolean {
  const { text: inner, awaited } = stripAwait(text);
  const call = lastCall(inner);
  if (!call || !fetchMethods(call.method)) return false;
  if (ALWAYS_FETCH.has(call.method)) return true;
  if (call.receiver === '') return false;
  // `….document(id).get()` / `….doc(id).get()` reads one document, not a result set.
  if (/\.(?:document|doc)\([^()]*\)\s*$/.test(call.receiver)) return false;
  if (awaited) return true;
  return language === 'python' && QUERY_LINK.test(`${call.receiver}.`);
}

/** Python `len(...)` argument shapes that count a fetch. */
function pythonCountedFetch(arg: string, isFetch: (t: string) => boolean): boolean {
  const t = arg.trim();
  const listOf = /^list\((.*)\)$/s.exec(t);
  if (listOf && matchingClose(t, 4) === t.length - 1) return isFetch(listOf[1] as string);
  const comprehension = /^\[.*?\s(?:async\s+)?for\s+[\w, ()]+\s+in\s+(.+)\]$/s.exec(t);
  if (comprehension && matchingClose(t, 0) === t.length - 1) {
    const iterable = comprehension[1] as string;
    return !/\sif\s/.test(iterable) && isFetch(iterable);
  }
  return isFetch(t);
}

/** Occurrences of `name` as a standalone name across the function's statements. */
function occurrences(fn: FunctionModel, name: string): number {
  const re = new RegExp(`(?<![\\w$.])${name.replace(/\$/g, '\\$')}(?![\\w$])`, 'g');
  return fn.blocks.flat().reduce((n, s) => n + (s.text.match(re)?.length ?? 0), 0);
}

/** The statement binding `name` to a fetch, when that is its only binding; the fetch text. */
function onlyFetchBinding(fn: FunctionModel, name: string, isFetch: (t: string) => boolean, python: boolean): string | null {
  const bindings = fn.blocks.flat().filter(s => s.bound.includes(name));
  if (bindings.length !== 1) return null;
  const m = /^(?:(?:const|let|var)\s+)?([\w$]+)\s*(?::[^=]+)?=(?!=)\s*(.+?);?$/s.exec((bindings[0] as StatementModel).text);
  if (!m || m[1] !== name) return null;
  const value = m[2] as string;
  return (python ? pythonCountedFetch(value, isFetch) : isFetch(value)) ? value : null;
}

function pythonSites(fn: FunctionModel, isFetch: (t: string) => boolean): Array<{ line: number; expression: string }> {
  return fn.calls
    .filter(call => call.method === 'len' && call.receiver === '' && call.args.length === 1)
    .flatMap(call => {
      const arg = call.args[0]?.text ?? '';
      if (pythonCountedFetch(arg, isFetch)) return [{ line: call.line, expression: call.text }];
      if (!/^[A-Za-z_]\w*$/.test(arg) || occurrences(fn, arg) !== 2) return [];
      const fetch = onlyFetchBinding(fn, arg, isFetch, true);
      return fetch ? [{ line: call.line, expression: `${call.text} of ${arg} = ${fetch}` }] : [];
    });
}

const SIZE_SUFFIX = /^\.(?:size|length|docs\.length)\b/;

type Site = { line: number; expression: string };

/** `(await fetch).size` / `.length` / `.docs.length` inside one statement. */
function inlineCounts(statement: StatementModel, isFetch: (t: string) => boolean): Site[] {
  const out: Site[] = [];
  const text = statement.text;
  for (let i = text.indexOf('(await '); i >= 0; i = text.indexOf('(await ', i + 1)) {
    const close = matchingClose(text, i);
    const suffix = close > 0 ? SIZE_SUFFIX.exec(text.slice(close + 1)) : null;
    if (suffix && isFetch(text.slice(i, close + 1))) {
      out.push({ line: statement.line, expression: text.slice(i, close + 1 + suffix[0].length) });
    }
  }
  return out;
}

/** `snap.size` where `snap` is bound only to `await fetch` and read only here. */
function localCounts(fn: FunctionModel, statement: StatementModel, isFetch: (t: string) => boolean): Site[] {
  return [...statement.text.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\.(size|length|docs\.length)\b/g)].flatMap(m => {
    const name = m[1] as string;
    if ((fn.nameUses.get(name) ?? 0) !== 1) return [];
    const fetch = onlyFetchBinding(fn, name, isFetch, false);
    return fetch && /^await\s/.test(fetch) ? [{ line: statement.line, expression: `${m[0]} of ${name} = ${fetch}` }] : [];
  });
}

function tsSites(fn: FunctionModel, isFetch: (t: string) => boolean): Site[] {
  return fn.blocks.flat().flatMap(statement => [...inlineCounts(statement, isFetch), ...localCounts(fn, statement, isFetch)]);
}

/** The whole-result fetches of a function, each call once whether seen as a call or as an awaited call. */
function fetchCount(fn: FunctionModel, isFetch: (t: string) => boolean): number {
  const fetchCalls = new Set<string>();
  for (const call of fn.calls) if (isFetch(call.text)) fetchCalls.add(`${call.line}:${call.text}`);
  for (const site of fn.blocks.flat().flatMap(s => s.awaits)) {
    if (site.call && isFetch(`await ${site.call.text}`)) fetchCalls.add(`${site.call.line}:${site.call.text}`);
  }
  return fetchCalls.size;
}

/** Every count-by-fetch site, and how many whole-result fetches were seen at all. */
export function scanCountByFetch(modules: readonly ModuleModel[], clients: ProjectClients): { sites: CountByFetch[]; fetches: number } {
  const sites: CountByFetch[] = [];
  let fetches = 0;
  for (const module of modules) {
    const apis = apisFor(clients, module.language);
    const fetchMethod = (m: string): boolean => isFetchAll(m, apis);
    const isFetch = (t: string): boolean => isFetchExpression(t, module.language, fetchMethod);
    for (const fn of module.functions) {
      fetches += fetchCount(fn, isFetch);
      const found = module.language === 'python' ? pythonSites(fn, isFetch) : tsSites(fn, isFetch);
      for (const site of found) {
        sites.push({ rel: module.rel, line: site.line, expression: site.expression, language: module.language, counts: countCalls(apis) });
      }
    }
  }
  return { sites, fetches };
}

export function describeCountByFetch(site: CountByFetch): string {
  const fix =
    site.language === 'python'
      ? 'count on the server instead (Firestore: await q.count().get(); Mongo: count_documents; SQLAlchemy: select(func.count()); Django: .count() / acount())'
      : 'count on the server instead (Firestore: getCountFromServer(q) or q.count().get(); Mongo: countDocuments; Prisma / TypeORM / Sequelize: count())';
  return `${site.rel}:${site.line}: ${site.expression} fetches every document only to count them — ${fix}`;
}

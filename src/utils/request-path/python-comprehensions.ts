/**
 * The comprehensions (list, set, dict, generator) inside one Python
 * statement: the parts of the text that run once per element, the names the
 * `for` clauses bind, and the `async for` iterables. Text here is lexed text
 * (see python-source.ts).
 */

import { depthMap, matchingClose } from './expr-text';

/** A comprehension inside a statement: where its per-element parts are, and its async iterables. */
export interface Comprehension {
  /** Ranges of the text that run once per element. */
  perElement: Array<[number, number]>;
  /** The first iterable's text when the first clause is `async for`. */
  asyncIterable: string | null;
  /** Ranges of later `async for` iterables (they run per element too). */
  laterAsyncIterables: string[];
  /** Names the `for` clauses bind (`x` in `for x in xs`, `k, v` in `for k, v in …`). */
  targets: string[];
  start: number;
  end: number;
}

interface Clause {
  kind: 'for' | 'async for' | 'if';
  at: number;
}

function clausesIn(inner: string): Clause[] {
  const depths = depthMap(inner);
  const clauses: Clause[] = [];
  const re = /(?<![\w.])(async\s+for|for|if)(?!\w)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    if (depths[m.index] !== 0) continue;
    const kind = (m[1] as string).startsWith('async')
      ? 'async for'
      : (m[1] as 'for' | 'if');
    // `x if c else y` is a conditional expression, not a filter, before the first `for`.
    if (kind === 'if' && !clauses.some(c => c.kind !== 'if')) continue;
    clauses.push({ kind, at: m.index });
  }
  return clauses;
}

/** ` in ` of a `for` clause (the iterable starts after it), at bracket depth 0. */
function iterableRange(
  inner: string,
  clause: Clause,
  next: number
): [number, number] {
  const depths = depthMap(inner);
  const re = /(?<![\w.])in(?!\w)/g;
  re.lastIndex = clause.at + clause.kind.length;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null && m.index < next) {
    if (depths[m.index] === 0) return [m.index + 2, next];
  }
  return [next, next];
}

/** The names a `for` clause binds: the identifiers between `for` and its ` in `. */
function clauseTargets(inner: string, clause: Clause): string[] {
  const from = clause.at + clause.kind.length;
  const [iterStart] = iterableRange(inner, clause, inner.length);
  const target = inner.slice(from, Math.max(from, iterStart - 2));
  return [...target.matchAll(/[A-Za-z_]\w*/g)].map(m => m[0]);
}

/** Every comprehension (list, set, dict, generator) in a statement's text. */
export function pythonComprehensions(text: string): Comprehension[] {
  const out: Comprehension[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== '[' && ch !== '(' && ch !== '{') continue;
    const close = matchingClose(text, i);
    if (close < 0) continue;
    const inner = text.slice(i + 1, close);
    const clauses = clausesIn(inner);
    const fors = clauses.filter(c => c.kind !== 'if');
    if (fors.length === 0) continue;
    const first = fors[0] as Clause;
    const afterFirst = clauses[clauses.indexOf(first) + 1]?.at ?? inner.length;
    const [iterStart, iterEnd] = iterableRange(inner, first, afterFirst);
    const later = fors.slice(1).map(clause => {
      const next = clauses[clauses.indexOf(clause) + 1]?.at ?? inner.length;
      return { clause, range: iterableRange(inner, clause, next) };
    });
    out.push({
      start: i,
      end: close,
      perElement: [
        [i + 1, i + 1 + first.at],
        [i + 1 + iterEnd, close],
      ],
      asyncIterable:
        first.kind === 'async for'
          ? inner.slice(iterStart, iterEnd).trim()
          : null,
      laterAsyncIterables: later
        .filter(l => l.clause.kind === 'async for')
        .map(l => inner.slice(l.range[0], l.range[1]).trim()),
      targets: fors.flatMap(clause => clauseTargets(inner, clause)),
    });
  }
  return out;
}

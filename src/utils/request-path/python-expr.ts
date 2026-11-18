/**
 * Expressions inside one Python statement: names read, calls, awaits and the
 * comprehension regions that run once per element. Text here is lexed text
 * (string literals are `«n»` placeholders, see python-source.ts).
 */

import type { AwaitSite, CallArgument, CallSite, ChainLink } from './model';
import { chainPrefixes, collapse, depthMap, matchingClose, matchingOpen, splitTopLevel } from './expr-text';
import type { PyLiteral } from './python-source';

const PY_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del',
  'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
  'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield', 'match', 'case', 'print',
]);

const PLACEHOLDER = /«(\d+)»/g;

export function isPyKeyword(name: string): boolean {
  return PY_KEYWORDS.has(name);
}

/** Lexed text → normalised source: literals written back with double quotes. */
export function renderPython(text: string, literals: readonly PyLiteral[]): string {
  return collapse(
    text.replace(PLACEHOLDER, (_, n: string) => {
      const lit = literals[Number(n)];
      if (!lit) return '""';
      const body = lit.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `${lit.formatted ? 'f' : ''}"${body}"`;
    })
  );
}

/** Names an f-string's `{expr}` parts read. */
function formattedNames(value: string): string[] {
  const names: string[] = [];
  const re = /\{(?!\{)([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) {
    const expr = (m[1] ?? '').split(/[!:]/)[0] ?? '';
    names.push(...namesInPlain(expr));
  }
  return names;
}

/** Is the identifier at `start` a keyword argument name (`f(limit=5)`)? */
function isKeywordArgument(text: string, end: number, depth: number): boolean {
  if (depth === 0) return false;
  const after = text.slice(end).match(/^\s*=(?!=)/);
  return after !== null;
}

function namesInPlain(text: string): string[] {
  const names = new Set<string>();
  const depths = depthMap(text);
  const re = /[A-Za-z_]\w*(?:\s*\.\s*[A-Za-z_]\w*)*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(0, m.index).trimEnd();
    if (before.endsWith('.') || /\d$/.test(text.slice(0, m.index))) continue;
    const chain = m[0].replace(/\s+/g, '');
    const root = chain.split('.')[0] as string;
    if (PY_KEYWORDS.has(root)) continue;
    if (isKeywordArgument(text, m.index + m[0].length, depths[m.index] ?? 0)) continue;
    chainPrefixes(chain).forEach(name => names.add(name));
  }
  return [...names];
}

/** Names (roots and dotted chains) an expression reads, f-string parts included. */
export function pythonNames(text: string, literals: readonly PyLiteral[]): string[] {
  const names = new Set(namesInPlain(text));
  for (const m of text.matchAll(PLACEHOLDER)) {
    const lit = literals[Number(m[1])];
    if (lit?.formatted) formattedNames(lit.value).forEach(name => names.add(name));
  }
  return [...names];
}

/** Arguments of a call from the lexed text between its parentheses. */
export function pythonArguments(inner: string, literals: readonly PyLiteral[]): CallArgument[] {
  return splitTopLevel(inner).map(part => {
    const kw = /^([A-Za-z_]\w*)\s*=(?!=)\s*/.exec(part);
    const valueText = kw ? part.slice(kw[0].length) : part;
    const lit = /^«(\d+)»$/.exec(valueText.trim());
    const literal = lit ? literals[Number(lit[1])] : undefined;
    return {
      text: renderPython(valueText, literals),
      literal: literal && !literal.formatted ? literal.value : null,
      keyword: kw ? (kw[1] as string) : null,
    };
  });
}

/** Split a callee into its links: `db.collection(«0»).document(uid).get`. */
export function pythonChain(callee: string, literals: readonly PyLiteral[]): ChainLink[] {
  const links: ChainLink[] = [];
  const depths = depthMap(callee);
  let start = 0;
  const pieces: string[] = [];
  for (let i = 0; i <= callee.length; i++) {
    if (i === callee.length || (callee[i] === '.' && depths[i] === 0)) {
      pieces.push(callee.slice(start, i).trim());
      start = i + 1;
    }
  }
  for (const piece of pieces) {
    const name = /^[A-Za-z_]\w*/.exec(piece)?.[0] ?? piece;
    const open = piece.indexOf('(');
    const close = open >= 0 ? matchingClose(piece, open) : -1;
    links.push({
      name,
      args: open >= 0 && close > open ? pythonArguments(piece.slice(open + 1, close), literals) : null,
    });
  }
  return links;
}

function skipNameBack(text: string, i: number): number {
  let j = i;
  while (j >= 0 && /\w/.test(text[j] as string)) j--;
  return j;
}

/** Start of the callee chain that ends just before `paren`, or -1 when it is not a call. */
function calleeStart(text: string, paren: number): number {
  let i = paren - 1;
  let start = -1;
  while (i >= 0) {
    const ch = text[i] as string;
    if (/\w/.test(ch)) {
      i = skipNameBack(text, i);
      start = i + 1;
      if (text[i] !== '.') return start;
      i--;
    } else if (ch === ')' || ch === ']') {
      const open = matchingOpen(text, i);
      if (open < 0) return -1;
      start = open;
      i = open - 1;
      if (!/[\w)\]]/.test(text[i] ?? '')) return start;
    } else {
      return start;
    }
  }
  return start;
}

/** Build a call site from the callee text and the index of its `(` in `text`. */
function callAt(
  text: string,
  start: number,
  paren: number,
  line: number,
  literals: readonly PyLiteral[]
): CallSite | null {
  const close = matchingClose(text, paren);
  if (close < 0) return null;
  const calleeRaw = text.slice(start, paren).trim();
  const root = /^[A-Za-z_]\w*/.exec(calleeRaw)?.[0] ?? '';
  if (!root || (PY_KEYWORDS.has(root) && root === calleeRaw)) return null;
  const chain = pythonChain(calleeRaw, literals);
  const method = chain[chain.length - 1]?.name ?? root;
  const lastDot = lastTopLevelDot(calleeRaw);
  const receiverRaw = lastDot < 0 ? '' : calleeRaw.slice(0, lastDot);
  const inner = text.slice(paren + 1, close);
  return {
    line,
    callee: renderPython(calleeRaw, literals),
    method,
    receiver: renderPython(receiverRaw, literals),
    args: pythonArguments(inner, literals),
    chain,
    text: renderPython(text.slice(start, close + 1), literals),
    names: pythonNames(`${receiverRaw} ${inner}`, literals),
  };
}

function lastTopLevelDot(text: string): number {
  const depths = depthMap(text);
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === '.' && depths[i] === 0) return i;
  }
  return -1;
}

/** Every call in a statement's text. */
export function pythonCalls(text: string, line: number, literals: readonly PyLiteral[]): CallSite[] {
  const calls: CallSite[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '(') continue;
    const prev = text.slice(0, i).trimEnd();
    if (!/[\w)\]]$/.test(prev) || prev.length !== i) continue;
    const start = calleeStart(text, i);
    if (start < 0) continue;
    const call = callAt(text, start, i, line, literals);
    if (call) calls.push(call);
  }
  return calls;
}

/** The index after one piece of a primary expression at `j` (a name, a bracket group, a literal, a dot), or null. */
function primaryStep(text: string, i: number, j: number): number | null {
  const ch = text[j] as string;
  if (/\w/.test(ch) && (j === i || /[.\w]/.test(text[j - 1] as string))) {
    let k = j;
    while (k < text.length && /\w/.test(text[k] as string)) k++;
    return k;
  }
  if (ch === '(' || ch === '[') {
    const close = matchingClose(text, j);
    return close < 0 ? text.length : close + 1;
  }
  if (ch === '«') return text.indexOf('»', j) + 1 || text.length;
  if (ch === '.' && /[A-Za-z_]/.test(text[j + 1] ?? '')) return j + 1;
  return null;
}

/** End index (exclusive) of the primary expression that starts at `i`. */
function primaryEnd(text: string, i: number): number {
  let j = i;
  let next = j < text.length ? primaryStep(text, i, j) : null;
  while (next !== null) {
    j = next;
    next = j < text.length ? primaryStep(text, i, j) : null;
  }
  return j;
}

interface RawAwait {
  start: number;
  operandStart: number;
  end: number;
}

function rawAwaits(text: string): RawAwait[] {
  const found: RawAwait[] = [];
  const re = /(?<![\w.])await\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    let operandStart = m.index + 5;
    while (text[operandStart] === ' ') operandStart++;
    found.push({ start: m.index, operandStart, end: primaryEnd(text, operandStart) });
  }
  return found;
}

/** The call an awaited operand makes, when the operand is a call. */
function operandCall(operand: string, line: number, literals: readonly PyLiteral[]): CallSite | null {
  let text = operand.trim();
  while (text.startsWith('(') && matchingClose(text, 0) === text.length - 1) text = text.slice(1, -1).trim();
  if (!text.endsWith(')')) return null;
  const open = matchingOpen(text, text.length - 1);
  if (open <= 0) return null;
  const start = calleeStart(text, open);
  return start === 0 ? callAt(text, 0, open, line, literals) : null;
}

/** Awaits in a statement with their positions; `outermost` drops awaits nested in another's operand. */
export function pythonAwaits(
  text: string,
  line: number,
  literals: readonly PyLiteral[]
): Array<AwaitSite & { start: number; end: number }> {
  const raws = rawAwaits(text);
  return raws
    .filter(a => !raws.some(b => b !== a && a.start >= b.operandStart && a.start < b.end))
    .map(a => ({
      start: a.start,
      end: a.end,
      line,
      call: operandCall(text.slice(a.operandStart, a.end), line, literals),
      nested: raws.some(b => b !== a && b.start >= a.operandStart && b.start < a.end),
      asyncIteration: false,
    }));
}

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
    const kind = (m[1] as string).startsWith('async') ? 'async for' : (m[1] as 'for' | 'if');
    // `x if c else y` is a conditional expression, not a filter, before the first `for`.
    if (kind === 'if' && !clauses.some(c => c.kind !== 'if')) continue;
    clauses.push({ kind, at: m.index });
  }
  return clauses;
}

/** ` in ` of a `for` clause (the iterable starts after it), at bracket depth 0. */
function iterableRange(inner: string, clause: Clause, next: number): [number, number] {
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
      asyncIterable: first.kind === 'async for' ? inner.slice(iterStart, iterEnd).trim() : null,
      laterAsyncIterables: later
        .filter(l => l.clause.kind === 'async for')
        .map(l => inner.slice(l.range[0], l.range[1]).trim()),
      targets: fors.flatMap(clause => clauseTargets(inner, clause)),
    });
  }
  return out;
}

/** The call an `async for` iterable makes (`q.stream()`), as an iteration await. */
export function iterationAwait(iterable: string, line: number, literals: readonly PyLiteral[]): AwaitSite {
  return { line, call: operandCall(iterable, line, literals), nested: false, asyncIteration: true };
}

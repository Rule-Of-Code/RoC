/**
 * Expressions inside one Python statement: names read, calls, awaits and the
 * comprehension regions that run once per element. Text here is lexed text
 * (string literals are `«n»` placeholders, see python-source.ts).
 */

import type { AwaitSite, CallSite } from './model';
import {
  chainPrefixes,
  collapse,
  depthMap,
  matchingClose,
  matchingOpen,
} from './expr-text';
import { callAt, calleeStart } from './python-calls';
import type { PyLiteral } from './python-source';

const PY_KEYWORDS = new Set([
  'False',
  'None',
  'True',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield',
  'match',
  'case',
  'print',
]);

const PLACEHOLDER = /«(\d+)»/g;

/** True for a Python keyword, the soft keywords `match`/`case`, or `print`. */
export function isPyKeyword(name: string): boolean {
  return PY_KEYWORDS.has(name);
}

/** Lexed text → normalised source: literals written back with double quotes. */
export function renderPython(
  text: string,
  literals: readonly PyLiteral[]
): string {
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
    if (isKeywordArgument(text, m.index + m[0].length, depths[m.index] ?? 0))
      continue;
    chainPrefixes(chain).forEach(name => names.add(name));
  }
  return [...names];
}

/** Names (roots and dotted chains) an expression reads, f-string parts included. */
export function pythonNames(
  text: string,
  literals: readonly PyLiteral[]
): string[] {
  const names = new Set(namesInPlain(text));
  for (const m of text.matchAll(PLACEHOLDER)) {
    const lit = literals[Number(m[1])];
    if (lit?.formatted)
      formattedNames(lit.value).forEach(name => names.add(name));
  }
  return [...names];
}

/** The index after one piece of a primary expression at `j` (a name, a bracket group, a literal, a dot), or null. */
function primaryStep(text: string, i: number, j: number): number | null {
  const ch = text[j] as string;
  if (/\w/.test(ch) && (j === i || /[.\w]/.test(text[j - 1] as string)))
    return nameEnd(text, j);
  if (ch === '(' || ch === '[') return groupEnd(text, j);
  if (ch === '«') return text.indexOf('»', j) + 1 || text.length;
  if (ch === '.' && /[A-Za-z_]/.test(text[j + 1] ?? '')) return j + 1;
  return null;
}

/** The index after the identifier that starts at `j`. */
function nameEnd(text: string, j: number): number {
  let k = j;
  while (k < text.length && /\w/.test(text[k] as string)) k++;
  return k;
}

/** The index after the bracket group that opens at `j` (the text's end when unclosed). */
function groupEnd(text: string, j: number): number {
  const close = matchingClose(text, j);
  return close < 0 ? text.length : close + 1;
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
    found.push({
      start: m.index,
      operandStart,
      end: primaryEnd(text, operandStart),
    });
  }
  return found;
}

/** The call an awaited operand makes, when the operand is a call. */
function operandCall(
  operand: string,
  line: number,
  literals: readonly PyLiteral[]
): CallSite | null {
  let text = operand.trim();
  while (text.startsWith('(') && matchingClose(text, 0) === text.length - 1)
    text = text.slice(1, -1).trim();
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
    .filter(
      a =>
        !raws.some(b => b !== a && a.start >= b.operandStart && a.start < b.end)
    )
    .map(a => ({
      start: a.start,
      end: a.end,
      line,
      call: operandCall(text.slice(a.operandStart, a.end), line, literals),
      nested: raws.some(
        b => b !== a && b.start >= a.operandStart && b.start < a.end
      ),
      asyncIteration: false,
    }));
}

/** The call an `async for` iterable makes (`q.stream()`), as an iteration await. */
export function iterationAwait(
  iterable: string,
  line: number,
  literals: readonly PyLiteral[]
): AwaitSite {
  return {
    line,
    call: operandCall(iterable, line, literals),
    nested: false,
    asyncIteration: true,
  };
}

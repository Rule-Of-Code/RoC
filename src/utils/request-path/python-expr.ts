/**
 * Expressions inside one Python statement: keywords, the names an expression
 * reads, and lexed text rendered back as source. Text here is lexed text
 * (string literals are `«n»` placeholders, see python-source.ts). Calls and
 * awaits are read in python-calls.ts, comprehensions in
 * python-comprehensions.ts.
 */

import { chainPrefixes, collapse, depthMap } from './expr-text';
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

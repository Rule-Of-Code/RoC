/**
 * Python read as structure, without a Python runtime.
 *
 * RoC runs on Node and has no Python interpreter to ask for an AST (see
 * `checkers/python-laws/python-law-base.ts`), so this module builds the part
 * of one the request-path laws need, from the grammar's own rules:
 *
 * 1. Lexing: comments are removed and every string literal (any prefix,
 *    single or triple quoted) is replaced by a placeholder `«n»` that indexes
 *    a literal table. Newlines inside a triple-quoted string are kept, so line
 *    numbers stay true. No bracket, quote or `#` inside a literal can confuse
 *    what follows.
 * 2. Logical lines: a statement ends at a newline outside every bracket that
 *    is not escaped by a trailing backslash; `;` separates statements on one
 *    line.
 * 3. Blocks: a compound statement's header ends at its `:`; its body is the
 *    run of following statements indented deeper (or the statements after the
 *    colon on the same line).
 *
 * What it cannot do: it does not resolve names or types, and it trusts the
 * file to be valid Python (a file that is not parses into whatever lines it
 * holds — it never throws).
 */

import { depthMap } from './expr-text';

export interface PyLiteral {
  value: string;
  /** An f-string: `{expr}` parts read names. */
  formatted: boolean;
}

export interface PyLexed {
  /** Source with comments removed and literals replaced by `«n»`. */
  code: string;
  literals: PyLiteral[];
}

/** A statement of the block tree. */
export interface PyNode {
  /** 1-based first and last physical line. */
  line: number;
  endLine: number;
  indent: number;
  /** Statement text with placeholders, whitespace collapsed. */
  text: string;
  /** The compound keyword (`def`, `async def`, `for`, `if`, …), '@' for a decorator, null for a simple statement. */
  keyword: string | null;
  /** For a compound statement: the header text after the keyword, without the colon. */
  header: string;
  children: PyNode[];
}

const STRING_START = /^([rRbBuUfF]{0,2})("""|'''|"|')/;

function isIdentChar(ch: string | undefined): boolean {
  return ch !== undefined && /\w/.test(ch);
}

/** Read the literal opening at `i`; returns its end index and decoded value. */
function readString(
  source: string,
  i: number,
  quote: string,
  raw: boolean
): { end: number; value: string } {
  const triple = quote.length === 3;
  let j = i;
  let value = '';
  while (j < source.length) {
    const ch = source[j] as string;
    if (ch === '\\') {
      value += raw ? source.slice(j, j + 2) : (source[j + 1] ?? '');
      j += 2;
      continue;
    }
    if (source.startsWith(quote, j)) return { end: j + quote.length, value };
    if (ch === '\n' && !triple) return { end: j, value };
    value += ch;
    j++;
  }
  return { end: j, value };
}

/** Comments out, literals replaced by placeholders; line structure kept. */
export function lexPython(content: string): PyLexed {
  const source = content.replace(/\r\n|\r/g, '\n');
  const literals: PyLiteral[] = [];
  let code = '';
  let i = 0;
  while (i < source.length) {
    const ch = source[i] as string;
    if (ch === '#') {
      const nl = source.indexOf('\n', i);
      i = nl < 0 ? source.length : nl;
      continue;
    }
    const m = isIdentChar(source[i - 1])
      ? null
      : STRING_START.exec(source.slice(i, i + 5));
    if (m) {
      const prefix = (m[1] ?? '').toLowerCase();
      const quote = m[2] as string;
      const { end, value } = readString(
        source,
        i + m[0].length,
        quote,
        prefix.includes('r')
      );
      literals.push({ value, formatted: prefix.includes('f') });
      const newlines = source.slice(i, end).split('\n').length - 1;
      code += `«${literals.length - 1}»` + '\n'.repeat(newlines);
      i = end;
      continue;
    }
    code += ch;
    i++;
  }
  return { code, literals };
}

interface LogicalLine {
  line: number;
  endLine: number;
  indent: number;
  text: string;
}

function indentOf(physical: string): number {
  let width = 0;
  for (const ch of physical) {
    if (ch === ' ') width++;
    else if (ch === '\t') width = width + 8 - (width % 8);
    else break;
  }
  return width;
}

/** Physical lines joined into logical lines (brackets and backslash continuations). */
function logicalLines(code: string): LogicalLine[] {
  const out: LogicalLine[] = [];
  const physical = code.split('\n');
  let depth = 0;
  let current: LogicalLine | null = null;
  physical.forEach((raw, index) => {
    const continued = /\\\s*$/.test(raw);
    const piece = continued ? raw.replace(/\\\s*$/, '') : raw;
    if (current === null) {
      if (piece.trim() === '' && !continued) return;
      current = {
        line: index + 1,
        endLine: index + 1,
        indent: indentOf(piece),
        text: piece.trim(),
      };
    } else {
      current.text += ` ${piece.trim()}`;
      current.endLine = index + 1;
    }
    for (const ch of piece) {
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}')
        depth = Math.max(0, depth - 1);
    }
    if (depth === 0 && !continued) {
      if (current.text.trim() !== '') out.push(current);
      current = null;
    }
  });
  if (current !== null) out.push(current);
  return out;
}

const COMPOUND =
  /^(async\s+def|def|class|if|elif|else|for|async\s+for|while|with|async\s+with|try|except\*?|finally|match|case)\b/;

/** Index of the colon that ends a compound header, or -1. Lambda colons are skipped. */
function headerColon(text: string): number {
  const depths = depthMap(text);
  let pendingLambdas = 0;
  for (let i = 0; i < text.length; i++) {
    if (depths[i] !== 0) continue;
    if (
      text.startsWith('lambda', i) &&
      !isIdentChar(text[i - 1]) &&
      !isIdentChar(text[i + 6])
    ) {
      pendingLambdas++;
    } else if (text[i] === ':' && text[i + 1] !== '=') {
      if (pendingLambdas === 0) return i;
      pendingLambdas--;
    }
  }
  return -1;
}

/** `match x:` / `case y:` are soft keywords: `match = 3` is an assignment. */
function softKeywordMisread(keyword: string, rest: string): boolean {
  if (keyword !== 'match' && keyword !== 'case') return false;
  return rest === '' || /^[=.([,:]/.test(rest);
}

function splitStatements(text: string): string[] {
  const depths = depthMap(text);
  const parts: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ';' && depths[i] === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map(part => part.trim()).filter(Boolean);
}

/** One statement text → a node (compound header split from an inline body). */
function toNode(text: string, at: LogicalLine, indent: number): PyNode {
  const base = {
    line: at.line,
    endLine: at.endLine,
    indent,
    children: [] as PyNode[],
  };
  if (text.startsWith('@'))
    return { ...base, text, keyword: '@', header: text.slice(1) };
  const m = COMPOUND.exec(text);
  const keyword = m ? (m[1] as string).replace(/\s+/g, ' ') : null;
  const rest = m ? text.slice(m[0].length).trimStart() : '';
  if (!keyword || softKeywordMisread(keyword, rest))
    return { ...base, text, keyword: null, header: '' };
  const colon = headerColon(text);
  if (colon < 0) return { ...base, text, keyword: null, header: '' };
  const header = text.slice(m?.[0].length ?? 0, colon).trim();
  const inline = text.slice(colon + 1).trim();
  const node: PyNode = {
    ...base,
    text: text.slice(0, colon).trim(),
    keyword,
    header,
  };
  if (inline)
    node.children = splitStatements(inline).map(part =>
      toNode(part, at, indent + 1)
    );
  return node;
}

/** The block tree of a lexed module. */
export function pythonTree(code: string): PyNode[] {
  const root: PyNode[] = [];
  const stack: Array<{
    indent: number;
    children: PyNode[];
    opener: PyNode | null;
  }> = [{ indent: -1, children: root, opener: null }];
  for (const logical of logicalLines(code)) {
    while (
      stack.length > 1 &&
      logical.indent <= (stack[stack.length - 1] as { indent: number }).indent
    ) {
      stack.pop();
    }
    const parent = stack[stack.length - 1] as { children: PyNode[] };
    const nodes = splitStatements(logical.text).map(part =>
      toNode(part, logical, logical.indent)
    );
    parent.children.push(...nodes);
    const last = nodes[nodes.length - 1];
    if (
      last &&
      last.keyword &&
      last.keyword !== '@' &&
      last.children.length === 0
    ) {
      stack.push({
        indent: logical.indent,
        children: last.children,
        opener: last,
      });
    }
  }
  closeEndLines(root);
  return root;
}

/** A compound node ends where its last child ends. */
function closeEndLines(nodes: PyNode[]): number {
  let end = 0;
  for (const node of nodes) {
    if (node.children.length > 0)
      node.endLine = Math.max(node.endLine, closeEndLines(node.children));
    end = Math.max(end, node.endLine);
  }
  return end;
}

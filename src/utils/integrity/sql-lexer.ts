/**
 * SQL read as tokens, with comments and string contents taken out first.
 *
 * A `CHECK` inside a comment, inside a string, or inside a dollar-quoted
 * function body is not a constraint, and a `;` inside any of them does not end
 * a statement. Masking replaces each of those with blanks of the same length
 * (newlines kept), so every token still carries its real offset and a finding
 * can name its line.
 */

export type TokenKind = 'ident' | 'number' | 'op' | 'punct' | 'string';

export interface SqlToken {
  kind: TokenKind;
  /** Identifiers: unquoted and lower-cased. Everything else: the text as written. */
  value: string;
  /** Offset in the file. */
  pos: number;
  /** A quoted identifier ("x", `x`): never a keyword. */
  quoted: boolean;
}

const blank = (text: string): string => text.replace(/[^\n]/g, ' ');

/** Length of the dollar-quote tag at `i` (`$$`, `$fn$`), or 0. */
function dollarTag(text: string, i: number): string {
  const match = /^\$[A-Za-z_]*\$/.exec(text.slice(i, i + 64));
  return match ? match[0] : '';
}

/**
 * Comments and dollar-quoted bodies become blanks; a single-quoted string
 * keeps its quotes with its contents blanked to `_`, so it stays one token.
 */
export function maskSql(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const end = maskedSpanEnd(text, i);
    if (end === i) {
      out += text[i];
      i += 1;
      continue;
    }
    const span = text.slice(i, end);
    out += span.startsWith("'") ? `'${span.slice(1, -1).replace(/[^\n]/g, '_')}'` : blank(span);
    i = end;
  }
  return out;
}

/** End of the comment/string/dollar body starting at `i`, or `i` when none starts there. */
function maskedSpanEnd(text: string, i: number): number {
  const two = text.slice(i, i + 2);
  if (two === '--') {
    const nl = text.indexOf('\n', i);
    return nl === -1 ? text.length : nl;
  }
  if (two === '/*') {
    const close = text.indexOf('*/', i + 2);
    return close === -1 ? text.length : close + 2;
  }
  if (text[i] === "'") return quotedEnd(text, i);
  const tag = text[i] === '$' ? dollarTag(text, i) : '';
  if (tag) {
    const close = text.indexOf(tag, i + tag.length);
    return close === -1 ? text.length : close + tag.length;
  }
  return i;
}

/** End of a '…' string; '' inside is an escaped quote. */
function quotedEnd(text: string, start: number): number {
  let i = start + 1;
  while (i < text.length) {
    if (text[i] === "'" && text[i + 1] === "'") i += 2;
    else if (text[i] === "'") return i + 1;
    else i += 1;
  }
  return text.length;
}

const OPERATORS = ['::', '<=', '>=', '<>', '!=', '||'];
const TOKEN_PATTERN =
  /\s+|"((?:[^"]|"")*)"|`([^`]*)`|('[^']*')|(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([A-Za-z_][A-Za-z0-9_$]*)|([(),.;[\]])|(.)/gy;

/** Tokens of masked SQL. */
export function tokenizeSql(masked: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  TOKEN_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_PATTERN.exec(masked)) !== null) {
    const pos = match.index;
    const op = OPERATORS.find(candidate => masked.startsWith(candidate, pos));
    if (op) {
      tokens.push({ kind: 'op', value: op, pos, quoted: false });
      TOKEN_PATTERN.lastIndex = pos + op.length;
      continue;
    }
    const token = toToken(match, pos);
    if (token) tokens.push(token);
  }
  return tokens;
}

function toToken(match: RegExpExecArray, pos: number): SqlToken | null {
  const [, dq, bq, str, num, word, punct, other] = match;
  if (dq !== undefined) return { kind: 'ident', value: dq.replace(/""/g, '"').toLowerCase(), pos, quoted: true };
  if (bq !== undefined) return { kind: 'ident', value: bq.toLowerCase(), pos, quoted: true };
  if (str !== undefined) return { kind: 'string', value: str, pos, quoted: false };
  if (num !== undefined) return { kind: 'number', value: num, pos, quoted: false };
  if (word !== undefined) return { kind: 'ident', value: word.toLowerCase(), pos, quoted: false };
  if (punct !== undefined) return { kind: 'punct', value: punct, pos, quoted: false };
  if (other !== undefined) return { kind: 'op', value: other, pos, quoted: false };
  return null; // whitespace
}

/** Statements: token runs split on `;` outside parentheses. */
export function splitStatements(tokens: SqlToken[]): SqlToken[][] {
  const statements: SqlToken[][] = [];
  let current: SqlToken[] = [];
  let depth = 0;
  for (const token of tokens) {
    if (token.value === '(' && token.kind === 'punct') depth += 1;
    if (token.value === ')' && token.kind === 'punct') depth = Math.max(0, depth - 1);
    if (token.kind === 'punct' && token.value === ';' && depth === 0) {
      if (current.length) statements.push(current);
      current = [];
      continue;
    }
    current.push(token);
  }
  if (current.length) statements.push(current);
  return statements;
}

/** Index of the `)` closing the `(` at `open`, or the last index when unbalanced. */
export function closingParen(tokens: SqlToken[], open: number): number {
  let depth = 0;
  for (let i = open; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token?.kind !== 'punct') continue;
    if (token.value === '(') depth += 1;
    if (token.value === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return tokens.length - 1;
}

/** Split `tokens` on commas outside parentheses. */
export function splitTopLevel(tokens: SqlToken[]): SqlToken[][] {
  const parts: SqlToken[][] = [];
  let current: SqlToken[] = [];
  let depth = 0;
  for (const token of tokens) {
    if (token.kind === 'punct' && token.value === '(') depth += 1;
    if (token.kind === 'punct' && token.value === ')') depth -= 1;
    if (token.kind === 'punct' && token.value === ',' && depth === 0) {
      parts.push(current);
      current = [];
      continue;
    }
    current.push(token);
  }
  if (current.length) parts.push(current);
  return parts;
}

/** 1-based line of an offset. */
export function lineAt(text: string, pos: number): number {
  let line = 1;
  for (let i = 0; i < pos && i < text.length; i += 1) {
    if (text[i] === '\n') line += 1;
  }
  return line;
}

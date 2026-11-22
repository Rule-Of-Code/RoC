/**
 * The text TODO Management reads comments from, by the file's language.
 *
 * `commentLines` follows quotes only within one line, so a template literal
 * that spans lines, such as a test fixture holding `// TODO: …`, read as
 * code and its `//` as a comment. Markdown keeps `<!-- TODO -->` examples in
 * inline code and fenced blocks. Both are blanked here first, line breaks
 * kept, so line numbers stay true (QA on #541).
 */

const C_LIKE_WITH_STRINGS = /\.(?:[cm]?[jt]sx?|scss|sass|less)$/i;

/** The content with string literals or Markdown code blanked, for comment reading. */
export function todoCommentSource(content: string, file: string): string {
  if (C_LIKE_WITH_STRINGS.test(file)) return blankCLikeStrings(content);
  if (/\.md$/i.test(file)) return blankMarkdownCode(content);
  return content;
}

const blank = (text: string): string => text.replace(/[^\n]/g, ' ');

/**
 * Blank the contents of '…', "…" and `…` literals (a template's `${…}` is
 * code), walking comments as comments: an apostrophe in a comment opens no
 * string, and a quote in a string opens no comment.
 */
function blankCLikeStrings(content: string): string {
  const scan: Scan = { content, out: [], expressions: [] };
  let i = 0;
  while (i < content.length) i = step(scan, i);
  return scan.out.join('');
}

interface Scan {
  content: string;
  out: string[];
  /**
   * For each `${` still open, the brace depth inside it: its `}` at depth 0
   * goes back into the template text.
   */
  expressions: number[];
}

/** One token from `i`: written to `scan.out`; returns where the next one starts. */
function step(scan: Scan, i: number): number {
  const { content } = scan;
  const ch = content[i] as string;
  const next = content[i + 1];
  if (ch === '/' && next === '/') return copyUntil(scan, i, '\n', 0);
  if (ch === '/' && next === '*') return copyUntil(scan, i, '*/', 2);
  if (ch === "'" || ch === '"') return blankQuoted(scan, i, ch);
  if (ch === '`' || closesExpression(scan, ch)) return blankTemplate(scan, i);
  countBrace(scan, ch);
  scan.out.push(ch);
  return i + 1;
}

/** Copy a comment as written, through `end` (kept when `keep` > 0). */
function copyUntil(scan: Scan, i: number, end: string, keep: number): number {
  const at = scan.content.indexOf(end, i + 2);
  const stop = at < 0 ? scan.content.length : at + keep;
  scan.out.push(scan.content.slice(i, stop));
  return stop;
}

function blankQuoted(scan: Scan, i: number, quote: string): number {
  const close = endOfQuoted(scan.content, i, quote);
  const closed = scan.content[close] === quote;
  scan.out.push(
    quote + blank(scan.content.slice(i + 1, close)) + (closed ? quote : '')
  );
  return closed ? close + 1 : close;
}

/** Whether `ch` is the `}` that ends the innermost open `${`. */
function closesExpression(scan: Scan, ch: string): boolean {
  return ch === '}' && scan.expressions.at(-1) === 0;
}

function blankTemplate(scan: Scan, i: number): number {
  const ch = scan.content[i] as string;
  if (ch === '}') scan.expressions.pop();
  const chunk = endOfTemplateChunk(scan.content, i + 1);
  scan.out.push(ch + blank(scan.content.slice(i + 1, chunk.textEnd)));
  scan.out.push(scan.content.slice(chunk.textEnd, chunk.stop));
  if (chunk.opensExpression) scan.expressions.push(0);
  return chunk.stop;
}

/** Track braces inside an open `${`, so a `}` of an object literal stays code. */
function countBrace(scan: Scan, ch: string): void {
  if (scan.expressions.length === 0 || (ch !== '{' && ch !== '}')) return;
  const top = scan.expressions.length - 1;
  scan.expressions[top] = (scan.expressions[top] ?? 0) + (ch === '{' ? 1 : -1);
}

/**
 * Index of the closing quote of a '…' / "…" literal started at `start`, or
 * of the line break that ends an unterminated one (kept, not blanked).
 */
function endOfQuoted(content: string, start: number, quote: string): number {
  for (let i = start + 1; i < content.length; i++) {
    const ch = content[i];
    if (ch === '\\') i++;
    else if (ch === quote) return i;
    else if (ch === '\n') return i;
  }
  return content.length;
}

/**
 * A template chunk from `from`: its text runs to `textEnd`, then the closing
 * backtick or a `${` runs to `stop`.
 */
function endOfTemplateChunk(
  content: string,
  from: number
): { textEnd: number; stop: number; opensExpression: boolean } {
  for (let i = from; i < content.length; i++) {
    const ch = content[i];
    if (ch === '\\') i++;
    else if (ch === '`') {
      return { textEnd: i, stop: i + 1, opensExpression: false };
    } else if (ch === '$' && content[i + 1] === '{') {
      return { textEnd: i, stop: i + 2, opensExpression: true };
    }
  }
  return {
    textEnd: content.length,
    stop: content.length,
    opensExpression: false,
  };
}

/** Blank fenced code blocks and inline code spans, keeping line breaks. */
function blankMarkdownCode(content: string): string {
  return (
    content
      .replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[^\n]*$/gm, blank)
      // A span opened by N backticks closes at the next run of N.
      .replace(/(`+)[^\n]*?\1/g, blank)
  );
}

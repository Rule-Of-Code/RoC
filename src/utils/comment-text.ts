/**
 * The comments of a source file, line by line, by the comment syntax of its
 * language — for checks that judge what a comment says (a TODO marker), and
 * must not read code, strings, CSS class names or prose as one.
 *
 * Line-based: a block comment is followed across lines; quotes are tracked
 * within a line, so `"// not a comment"` is not a comment. A string that
 * spans lines (a template literal, a Python triple-quoted string) is not
 * followed — its later lines read as code, never as comments.
 */

export interface CommentLine {
  /** 1-based line number. */
  line: number;
  /** The comment text on that line, without its delimiters. */
  text: string;
}

interface Syntax {
  line: readonly string[];
  block: ReadonlyArray<readonly [string, string]>;
  quotes: string;
}

const C_LIKE: Syntax = { line: ['//'], block: [['/*', '*/']], quotes: `'"\`` };
const SYNTAX_BY_EXTENSION: Record<string, Syntax> = {
  ts: C_LIKE,
  tsx: C_LIKE,
  mts: C_LIKE,
  cts: C_LIKE,
  js: C_LIKE,
  jsx: C_LIKE,
  mjs: C_LIKE,
  cjs: C_LIKE,
  java: C_LIKE,
  c: C_LIKE,
  cpp: C_LIKE,
  h: C_LIKE,
  hpp: C_LIKE,
  cs: C_LIKE,
  go: C_LIKE,
  rs: C_LIKE,
  scss: C_LIKE,
  sass: C_LIKE,
  less: C_LIKE,
  php: { line: ['//', '#'], block: [['/*', '*/']], quotes: `'"` },
  css: { line: [], block: [['/*', '*/']], quotes: `'"` },
  py: { line: ['#'], block: [], quotes: `'"` },
  rb: { line: ['#'], block: [], quotes: `'"` },
  sh: { line: ['#'], block: [], quotes: `'"` },
  yml: { line: ['#'], block: [], quotes: `'"` },
  yaml: { line: ['#'], block: [], quotes: `'"` },
  sql: { line: ['--'], block: [['/*', '*/']], quotes: `'"` },
  html: { line: [], block: [['<!--', '-->']], quotes: '' },
  htm: { line: [], block: [['<!--', '-->']], quotes: '' },
  xml: { line: [], block: [['<!--', '-->']], quotes: '' },
  md: { line: [], block: [['<!--', '-->']], quotes: '' },
};

/** The comment syntax for a file name; null for a format without comments (JSON) or unknown. */
export function commentSyntaxOf(fileName: string): Syntax | null {
  const extension = fileName.toLowerCase().split('.').pop() ?? '';
  return SYNTAX_BY_EXTENSION[extension] ?? null;
}

interface Opening {
  at: number;
  kind: 'line' | 'block';
  open: string;
  close?: string;
}

/** The first comment opener on `text` from `from`, outside quotes. */
function firstOpening(
  text: string,
  from: number,
  syntax: Syntax
): Opening | null {
  let quote = '';
  for (let i = from; i < text.length; i++) {
    const ch = text[i] as string;
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = '';
      continue;
    }
    if (syntax.quotes.includes(ch)) {
      quote = ch;
      continue;
    }
    const line = syntax.line.find(open => text.startsWith(open, i));
    if (line) return { at: i, kind: 'line', open: line };
    const block = syntax.block.find(([open]) => text.startsWith(open, i));
    if (block) return { at: i, kind: 'block', open: block[0], close: block[1] };
  }
  return null;
}

/** The comment text of one line, and the block left open at its end (if any). */
function commentsOnLine(
  text: string,
  syntax: Syntax,
  openBlock: string | null
): { texts: string[]; open: string | null } {
  const texts: string[] = [];
  let from = 0;
  let close = openBlock;
  while (from <= text.length) {
    if (close) {
      const end = text.indexOf(close, from);
      if (end < 0) {
        texts.push(text.slice(from));
        return { texts, open: close };
      }
      texts.push(text.slice(from, end));
      from = end + close.length;
      close = null;
      continue;
    }
    const opening = firstOpening(text, from, syntax);
    if (!opening) break;
    if (opening.kind === 'line') {
      texts.push(text.slice(opening.at + opening.open.length));
      break;
    }
    from = opening.at + opening.open.length;
    close = opening.close ?? null;
  }
  return { texts, open: null };
}

/** Every comment line of `content`, read with the syntax of `fileName`; none for a format without comments. */
export function commentLines(fileName: string, content: string): CommentLine[] {
  const syntax = commentSyntaxOf(fileName);
  if (!syntax) return [];
  const out: CommentLine[] = [];
  let open: string | null = null;
  content.split(/\r?\n/).forEach((text, index) => {
    const found = commentsOnLine(text, syntax, open);
    open = found.open;
    for (const comment of found.texts) {
      if (comment.trim()) out.push({ line: index + 1, text: comment });
    }
  });
  return out;
}

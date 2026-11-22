/**
 * A source file as the code-quality detectors should read it: the code, and
 * separately the comments — never a word in a string taken for either (#424).
 *
 * Detectors that match text ran over the raw file or stripped comments only,
 * so a `console.log` in a message string, `as unknown as` in law prose, a
 * `TODO` in a regex, or `{0,300}` in a regex literal was judged as code. Here
 * the TypeScript parser finds every string, template and regex literal and
 * every JSX text, and those are blanked before anything else is looked at.
 *
 * `code` keeps the file's length and line breaks, so an offset or a line
 * number found in it points at the same place in the file.
 */
import type * as TS from 'typescript';

/** One comment: where it is and what it says (with its `//` or `/*`). */
export interface SourceComment {
  start: number;
  text: string;
}

/** The parsed file, its code with literals and comments blanked, and its comments. */
export interface SourceView {
  source: TS.SourceFile;
  code: string;
  comments: SourceComment[];
}

/** A token whose text is data, not code. */
function isLiteralText(ts: typeof TS, node: TS.Node): boolean {
  return (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node) ||
    ts.isRegularExpressionLiteral(node) ||
    ts.isJsxText(node)
  );
}

/** Turn `[start, end)` into spaces, keeping line breaks. */
function blank(chars: string[], start: number, end: number): void {
  for (let i = start; i < end; i++) if (chars[i] !== '\n') chars[i] = ' ';
}

/** Read a file through the parser. `fileName` decides TS/TSX/JS parsing. */
export function readSource(
  ts: typeof TS,
  content: string,
  fileName: string
): SourceView {
  const source = ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  const chars = content.split('');
  const visit = (node: TS.Node): void => {
    if (isLiteralText(ts, node)) {
      blank(chars, node.getStart(source), node.getEnd());
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  // With every literal blanked, a `//` or `/*` left in the text opens a
  // comment: nothing inside a string can pretend to be one.
  const comments: SourceComment[] = [];
  const withoutLiterals = chars.join('');
  for (const match of withoutLiterals.matchAll(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g
  )) {
    const start = match.index ?? 0;
    comments.push({
      start,
      text: content.slice(start, start + match[0].length),
    });
    blank(chars, start, start + match[0].length);
  }
  return { source, code: chars.join(''), comments };
}

/** The 1-based line of an offset in the file. */
export function lineAt(view: SourceView, offset: number): number {
  return view.source.getLineAndCharacterOfPosition(offset).line + 1;
}

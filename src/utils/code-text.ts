import { loadTypeScript, parserUnavailable } from './react/tsx-source';

/**
 * Strip COMMENTS from source text, so a pattern search sees code, not prose.
 *
 * A recurring false-positive class: a detector greps raw file text for a token
 * (`[innerHTML]`, `interval(`, `eval(`), so the token fires from a `// comment`
 * explaining why it was removed. A consumer who did the right thing — deleted
 * the risky call, left a note — is then failed for the note. FE hit exactly
 * this: after removing an `[innerHTML]` binding, the word in a code comment
 * still raised an XSS error.
 *
 * Comments only — NOT string literals. In Angular an inline `template: '<div
 * [innerHTML]="x">'` is a string, but it is a REAL sink that must still be
 * detected; blanking string contents would hide it. Comments are unambiguously
 * not code; strings are not. (A token merely mentioned in a plain data string is
 * a rarer, residual false positive we accept rather than regress template
 * detection.)
 *
 * Regex-based, not a parser: the usual imperfection applies (a `/*` sequence
 * inside a string can be mis-stripped). That is the same tradeoff every strip
 * helper in this codebase already makes, and the right one for a presence check.
 */
export class CodeText {
  static stripComments(content: string): string {
    return content
      .replace(/\/\*[\s\S]*?\*\//g, ' ') // block comments
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1') // line comments (not URL `://`)
      .replace(/<!--[\s\S]*?-->/g, ' '); // HTML comments
  }

  /**
   * Strip comments AND blank string/template-literal contents — a keyword-in-a-
   * string is text, not code. Use this ONLY for presence checks where a string is
   * never a legitimate hit (an `interval(` inside a service is never a real timer;
   * a `signalStore(` inside a string is never a real store) — NOT where a string
   * can be a real sink (e.g. an Angular inline `template:` string, which must keep
   * its content — those callers use stripComments). Not line-accurate: string
   * quotes are kept but their contents are blanked; use a preserving strip when
   * line numbers matter.
   */
  static stripCommentsAndStrings(content: string): string {
    return this.stripComments(content).replace(
      /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g,
      '""'
    );
  }

  /**
   * The same result, with the string literals found by the TypeScript parser
   * instead of a regex. The regex loses its place on nested quotes — a
   * template literal holding `"it('…')"` — and from there reads code as text
   * and text as code; a test file that keeps fixtures as source strings is
   * exactly that shape. Strings are blanked first (from the parse, so a `//`
   * or a quote inside one cannot mislead), then comments are stripped.
   *
   * Without a loadable `typescript` it throws instead of falling back to the
   * regex (#427): that fallback made an error law's result depend on the
   * machine — the regex read strings in detector tests as code and failed a
   * project that passes with the parser — and said nothing. A law that needs
   * this checks `loadTypeScript` first and reports its files as not read; a
   * caller that forgets ends in the law's error result, never in a silent
   * second opinion.
   */
  static codeOnly(
    content: string,
    fileName = 'file.tsx',
    projectRoot = process.cwd()
  ): string {
    const ts = loadTypeScript(projectRoot);
    if (!ts) throw new Error(parserUnavailable(projectRoot, 'the files'));
    const source = ts.createSourceFile(
      fileName,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    const ranges: Array<[number, number]> = [];
    const visit = (node: import('typescript').Node): void => {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node) ||
        ts.isRegularExpressionLiteral(node)
      ) {
        ranges.push([node.getStart(source), node.getEnd()]);
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    let blanked = content;
    for (const [start, end] of ranges.reverse()) {
      // Keep the line breaks a literal spans, so later line numbers hold.
      const newlines = (blanked.slice(start, end).match(/\n/g) ?? []).join('');
      blanked = `${blanked.slice(0, start)}""${newlines}${blanked.slice(end)}`;
    }
    return this.stripComments(blanked);
  }
}

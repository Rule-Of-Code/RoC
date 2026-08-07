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
}

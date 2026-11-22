/**
 * The text TODO Management looks for markers in, by the file's language.
 */

/**
 * The text the TODO markers are looked for in, by the file's language
 * (#426). The JS string blanker reads quotes as JS does; run over Markdown,
 * an apostrophe in prose opened a "string" that swallowed the lines below,
 * so whether a line counted depended on everything written above it.
 *
 * - JS/TS: string and template contents blanked (comments kept);
 * - Markdown: fenced code blocks and inline code blanked — a `// TODO`
 *   there is an example, not a pending task; prose and `<!-- TODO -->`
 *   comments are read as written;
 * - HTML, CSS, SCSS: read as written.
 */
export function todoScannableText(content: string, file: string): string {
  if (/\.[cm]?[jt]sx?$/i.test(file)) return blankStringLiterals(content);
  if (/\.md$/i.test(file)) return blankMarkdownCode(content);
  return content;
}

/** Blank fenced code blocks and inline code spans, keeping line breaks. */
function blankMarkdownCode(content: string): string {
  const blank = (text: string): string => text.replace(/[^\n]/g, ' ');
  return (
    content
      .replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[^\n]*$/gm, blank)
      // A span opened by N backticks closes at the next run of N: a
      // double-backtick span can hold single backticks (`` `x` ``).
      .replace(/(`+)[^\n]*?\1/g, blank)
  );
}

/**
 * Blank string/template-literal CONTENTS, keeping comments and newlines, so a
 * TODO marker that only appears inside a string (a captured or display string
 * showing what a TODO looks like) is not counted as a real TODO.
 */
function blankStringLiterals(content: string): string {
  return content.replace(
    /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g,
    match => match.replace(/[^\n]/g, ' ')
  );
}

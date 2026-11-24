/**
 * Code quoted in a finding: one line, short enough to read in a terminal.
 * Shared by the laws that name the expression they could not judge, so a
 * quote looks the same whichever law prints it.
 */

/** The longest quote, the ellipsis included. */
export const CODE_EXCERPT_LENGTH = 60;

const ELLIPSIS = '...';

/** `code` with every whitespace run collapsed, cut to CODE_EXCERPT_LENGTH with "...". */
export function codeExcerpt(code: string): string {
  const text = code.replace(/\s+/g, ' ');
  return text.length > CODE_EXCERPT_LENGTH
    ? `${text.slice(0, CODE_EXCERPT_LENGTH - ELLIPSIS.length)}${ELLIPSIS}`
    : text;
}

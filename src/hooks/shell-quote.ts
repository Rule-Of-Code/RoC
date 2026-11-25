/**
 * Config values written into hook text.
 *
 * A hook is a POSIX `sh` script, and a commit type, an emoji or a pattern from
 * the config is written into it. Whatever the value holds, it stays a value:
 * these are the only ways one is put into a line of a hook (#624).
 */

/** `value` as one single-quoted `sh` word: `it's` → `'it'\''s'`. */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/** `value` on one comment line: a line break would end the comment. */
export function shellComment(value: string): string {
  return value.replace(/[\r\n]+/g, ' ');
}

/** What `"…"` or `echo` does not print as written. */
const NOT_PLAIN = /["$`\\\r\n]/;

/**
 * A line that prints `text` as written. Plain text keeps the `echo "…"` form,
 * so a hook generated from plain values does not change; anything else is
 * printed with `printf`, because `echo` also reads backslashes in some shells.
 */
export function shellPrint(text: string): string {
  return NOT_PLAIN.test(text)
    ? `printf '%s\\n' ${shellQuote(text)}`
    : `echo "${text}"`;
}

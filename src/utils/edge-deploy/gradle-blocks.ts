/**
 * Gradle build scripts (Groovy and Kotlin DSL) read as nested blocks — not
 * a Gradle evaluator. Enough to answer "which build types and product
 * flavours does this module declare, and what does each block say?":
 * `benchmark { … }`, `create("benchmark") { … }`, `getByName("debug") { … }`.
 * Blocks produced by code (loops, `all { }`, plugins) are not seen.
 */

export interface GradleBlock {
  name: string;
  body: string;
}

const CHILD_NAME = /(?:\b(?:create|register|getByName|maybeCreate|named)\s*\(\s*["'](\w+)["']\s*\)|\b([A-Za-z_]\w*))\s*$/;
const NOT_A_VARIANT = new Set(['all', 'configureEach', 'withType', 'matching', 'each', 'whenObjectAdded']);

/** The script without `/* … *\/` comments and `//` line comments (a `//` inside a quoted URL is kept). */
export function stripGradleComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'])\/\/.*$/gm, '$1');
}

/** The index just past the `}` that closes the `{` at `open`. */
function closing(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return i + 1;
  }
  return text.length;
}

/** The body of the first `name { … }` block anywhere in the script, or null. */
export function blockBody(text: string, name: string): string | null {
  const match = new RegExp(String.raw`\b${name}\s*\{`).exec(text);
  if (!match) return null;
  const open = match.index + match[0].length - 1;
  return text.slice(open + 1, closing(text, open) - 1);
}

/** The named child blocks directly inside a block body. */
export function childBlocks(body: string): GradleBlock[] {
  const children: GradleBlock[] = [];
  let from = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== '{') continue;
    const end = closing(body, i);
    const head = CHILD_NAME.exec(body.slice(from, i));
    const name = head?.[1] ?? head?.[2];
    if (name && !NOT_A_VARIANT.has(name)) children.push({ name, body: body.slice(i + 1, end - 1) });
    from = end;
    i = end - 1;
  }
  return children;
}

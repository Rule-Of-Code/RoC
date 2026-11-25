/**
 * A Vue single-file component (`.vue`) split into what the laws read (#607, P1).
 *
 * The laws read `.ts` / `.js` text and parse it with TypeScript, and read
 * markup as HTML text. A `.vue` file holds both, and a `<style>`. Rather than
 * map line numbers between a block and the file, each view keeps the file's
 * length and line breaks and blanks everything else with spaces:
 *
 * - `scriptView`: only the contents of `<script>` and `<script setup>`;
 * - `templateView`: only the contents of the top-level `<template>`.
 *
 * An offset or a line found in a view is the same offset or line in the
 * `.vue` file, so a finding needs no translation. Only top-level blocks count:
 * a `<template #slot>` inside the template is markup, and an HTML comment at
 * the top level is not a block. A block ends at the first matching closing
 * tag, as Vue's own compiler reads it; a `<template>` counts the templates
 * nested in it.
 */

/** One top-level block of an SFC: where its content starts and ends. */
export interface SfcBlock {
  kind: 'script' | 'template' | 'style';
  /** The `lang` attribute, lower case; null when absent. */
  lang: string | null;
  /** `<script setup>`. */
  setup: boolean;
  /** Offset of the first character of the content (after `>`). */
  start: number;
  /** Offset just past the content (at the `<` of the closing tag). */
  end: number;
}

const OPEN_TAG = /<(script|template|style)\b([^>]*)>/gi;
/** A closed HTML comment; an unclosed `<!--` (say, in a script string) blanks nothing. */
const COMMENT = /<!--[\s\S]*?-->/g;

function attribute(attributes: string, name: string): string | null {
  const match = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
    'i'
  ).exec(attributes);
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : null;
}

function hasAttribute(attributes: string, name: string): boolean {
  return new RegExp(`(?:^|\\s)${name}(?=\\s|=|/?$)`, 'i').test(attributes);
}

/** Where a `<template>` that opens at `from` ends, counting nested templates. */
function templateEnd(text: string, from: number): number {
  const tags = /<(\/?)template\b[^>]*?(\/?)>/gi;
  tags.lastIndex = from;
  let depth = 1;
  for (let match = tags.exec(text); match; match = tags.exec(text)) {
    if (match[2] === '/') continue; // <template /> opens nothing
    depth += match[1] === '/' ? -1 : 1;
    if (depth === 0) return match.index;
  }
  return text.length;
}

/** The text with top-level HTML comments blanked, so no block is found inside one. */
function withoutTopComments(text: string): string {
  return text.replace(COMMENT, comment => comment.replace(/[^\n]/g, ' '));
}

/** The top-level blocks of an SFC, in file order. */
export function sfcBlocks(text: string): SfcBlock[] {
  const scan = withoutTopComments(text);
  const blocks: SfcBlock[] = [];
  OPEN_TAG.lastIndex = 0;
  for (let match = OPEN_TAG.exec(scan); match; match = OPEN_TAG.exec(scan)) {
    const kind = (match[1] ?? '').toLowerCase() as SfcBlock['kind'];
    const attributes = match[2] ?? '';
    if (attributes.trimEnd().endsWith('/')) continue; // self-closing: no content
    const start = match.index + match[0].length;
    let end: number;
    if (kind === 'template') {
      end = templateEnd(scan, start);
    } else {
      const close = new RegExp(`</${kind}\\s*>`, 'ig');
      close.lastIndex = start;
      const found = close.exec(scan);
      end = found ? found.index : text.length;
    }
    blocks.push({
      kind,
      lang: attribute(attributes, 'lang')?.toLowerCase() ?? null,
      setup: kind === 'script' && hasAttribute(attributes, 'setup'),
      start,
      end,
    });
    OPEN_TAG.lastIndex = end;
  }
  return blocks;
}

/** `text` with everything outside the given blocks' contents blanked; line breaks kept. */
function viewOf(text: string, blocks: SfcBlock[]): string {
  const keep = new Array<boolean>(text.length).fill(false);
  for (const block of blocks) {
    for (let i = block.start; i < block.end; i++) keep[i] = true;
  }
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] ?? '';
    out += keep[i] || ch === '\n' || ch === '\r' ? ch : ' ';
  }
  return out;
}

/** The script of an SFC (`<script>` and `<script setup>`), at its offsets in the file. */
export function scriptView(text: string): string {
  return viewOf(
    text,
    sfcBlocks(text).filter(block => block.kind === 'script')
  );
}

/** The top-level `<template>` of an SFC, at its offsets in the file. */
export function templateView(text: string): string {
  return viewOf(
    text,
    sfcBlocks(text).filter(block => block.kind === 'template')
  );
}

/**
 * The file name a parser should read the script view as: the script's `lang`
 * decides TypeScript or JavaScript and JSX or not (`lang="ts"` → `.ts`,
 * `lang="tsx"` → `.tsx`, none → `.js`). Two script blocks with different
 * langs are read as the stronger one (TS over JS, JSX over none).
 */
export function scriptFileName(file: string, text: string): string {
  const langs = sfcBlocks(text)
    .filter(block => block.kind === 'script')
    .map(block => block.lang ?? 'js');
  const ts = langs.some(lang => lang === 'ts' || lang === 'tsx');
  const jsx = langs.some(lang => lang === 'tsx' || lang === 'jsx');
  const ext = `${ts ? 'ts' : 'js'}${jsx ? 'x' : ''}`;
  return `${file}.${ext}`;
}

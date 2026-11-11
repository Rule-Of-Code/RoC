/**
 * A Gradle build script read as text — Groovy and Kotlin DSL alike.
 *
 * There is no Gradle parser to borrow, and a pattern over the raw file
 * answers the wrong question: the comment above a block can name the very
 * call the block replaced, and a multi-line string can hold the word `try`.
 * So the script is read twice, position for position:
 *
 * - `plain`: comments blanked, strings kept — where a literal's value is read.
 * - `code`: comments AND string contents blanked, quotes kept — where the
 *   structure (braces, calls, assignments) is read.
 *
 * Both have the source's length and line breaks, so an offset found in one
 * is the same character in the other and in the source.
 *
 * Limits: Groovy slashy strings (`/re/`, `$/…/$`) are read as code; a brace
 * inside one that is not balanced would shift the block structure.
 */

export interface GradleBlock {
  /** `release`, `buildTypes`, `try`, `catch`, `if`; `dev` for `create("dev")`. */
  name: string;
  /** The header before `{`, comments removed, strings kept. */
  header: string;
  /** Offset of the opening brace. */
  open: number;
  /** Offset of the closing brace (the source length when unbalanced). */
  close: number;
  parent: GradleBlock | null;
}

const NAMED_CONTAINER = /(?:create|getByName|register|maybeCreate|named)\s*\(\s*["'](\w+)["']\s*\)\s*$/;
const KEYWORD = /^(if|else|try|catch|finally|for|while)\b/;
const TRAILING_IDENTIFIER = /(\w+)\s*$/;
const HEADER_START = /[;{}\n]/;

export class GradleText {
  readonly plain: string;
  readonly code: string;
  private cachedBlocks: GradleBlock[] | null = null;

  constructor(readonly source: string) {
    const masked = GradleText.mask(source);
    this.plain = masked.plain;
    this.code = masked.code;
  }

  /** Blank comments (both outputs) and string contents (`code` only). */
  static mask(source: string): { plain: string; code: string } {
    const plain = source.split('');
    const code = source.split('');
    const blank = (from: number, to: number, both: boolean) => {
      for (let i = from; i < to; i++) {
        if (source[i] === '\n') continue;
        code[i] = ' ';
        if (both) plain[i] = ' ';
      }
    };
    let i = 0;
    while (i < source.length) {
      const end = GradleText.tokenEnd(source, i);
      if (end.kind === 'comment') blank(i, end.to, true);
      else if (end.kind === 'string') blank(i + end.quote, end.to - end.quote, false);
      i = end.kind === 'code' ? i + 1 : end.to;
    }
    return { plain: plain.join(''), code: code.join('') };
  }

  private static tokenEnd(
    source: string,
    i: number
  ): { kind: 'code' } | { kind: 'comment'; to: number } | { kind: 'string'; to: number; quote: number } {
    const two = source.slice(i, i + 2);
    if (two === '//') {
      const nl = source.indexOf('\n', i);
      return { kind: 'comment', to: nl < 0 ? source.length : nl };
    }
    if (two === '/*') {
      const close = source.indexOf('*/', i + 2);
      return { kind: 'comment', to: close < 0 ? source.length : close + 2 };
    }
    return GradleText.stringEnd(source, i) ?? { kind: 'code' };
  }

  /** The end of a string literal starting at `i` ('…', "…", '''…''', """…"""), or null. */
  private static stringEnd(source: string, i: number): { kind: 'string'; to: number; quote: number } | null {
    const three = source.slice(i, i + 3);
    if (three === "'''" || three === '"""') {
      const close = source.indexOf(three, i + 3);
      return { kind: 'string', to: close < 0 ? source.length : close + 3, quote: 3 };
    }
    const ch = source[i];
    if (ch !== '"' && ch !== "'") return null;
    let j = i + 1;
    while (j < source.length && source[j] !== ch && source[j] !== '\n') {
      j += source[j] === '\\' ? 2 : 1;
    }
    return { kind: 'string', to: Math.min(j + 1, source.length), quote: 1 };
  }

  /** Every block of the script, outermost first, in source order. */
  blocks(): GradleBlock[] {
    if (this.cachedBlocks) return this.cachedBlocks;
    const blocks: GradleBlock[] = [];
    const stack: GradleBlock[] = [];
    for (let i = 0; i < this.code.length; i++) {
      const ch = this.code[i];
      if (ch === '{') {
        const header = this.headerBefore(i);
        const block: GradleBlock = {
          name: GradleText.blockName(header),
          header,
          open: i,
          close: this.code.length,
          parent: stack[stack.length - 1] ?? null,
        };
        blocks.push(block);
        stack.push(block);
      } else if (ch === '}') {
        const block = stack.pop();
        if (block) block.close = i;
      }
    }
    this.cachedBlocks = blocks;
    return blocks;
  }

  /** The blocks that contain `offset`, outermost first. */
  enclosing(offset: number): GradleBlock[] {
    return this.blocks().filter(block => block.open < offset && offset < block.close);
  }

  /** Direct child blocks of `parent` (top-level blocks for null) named `name`. */
  children(parent: GradleBlock | null, name?: string): GradleBlock[] {
    return this.blocks().filter(
      block => block.parent === parent && (name === undefined || block.name === name)
    );
  }

  /** Blocks named `name` anywhere, at any depth. */
  named(name: string): GradleBlock[] {
    return this.blocks().filter(block => block.name === name);
  }

  /** The body of a block in `plain` (comments removed, strings kept). */
  body(block: GradleBlock): string {
    return this.plain.slice(block.open + 1, block.close);
  }

  /** The text of `block` directly, with its nested blocks blanked out. */
  ownText(block: GradleBlock): string {
    const chars = this.plain.slice(block.open + 1, block.close).split('');
    for (const child of this.children(block)) {
      for (let i = child.open; i <= child.close; i++) {
        const at = i - block.open - 1;
        if (at >= 0 && at < chars.length && chars[at] !== '\n') chars[at] = ' ';
      }
    }
    return chars.join('');
  }

  /** 1-based line of an offset. */
  lineOf(offset: number): number {
    let line = 1;
    for (let i = 0; i < offset && i < this.source.length; i++) if (this.source[i] === '\n') line++;
    return line;
  }

  /** Every match of `pattern` in `code` (structure only, never inside a comment or string). */
  codeMatches(pattern: RegExp): RegExpMatchArray[] {
    const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    return [...this.code.matchAll(global)];
  }

  private headerBefore(brace: number): string {
    let start = brace - 1;
    while (start >= 0 && !HEADER_START.test(this.code[start] ?? '')) start--;
    return this.plain.slice(start + 1, brace).trim();
  }

  private static blockName(header: string): string {
    const container = NAMED_CONTAINER.exec(header);
    if (container?.[1]) return container[1];
    const keyword = KEYWORD.exec(header)?.[1];
    if (keyword) return /^else\s+if\b/.test(header) ? 'if' : keyword;
    return TRAILING_IDENTIFIER.exec(GradleText.withoutTrailingCall(header))?.[1] ?? '';
  }

  /** `tasks.register('x')` → `tasks.register`: the arguments of a final call removed. */
  private static withoutTrailingCall(header: string): string {
    if (!header.endsWith(')')) return header;
    let depth = 0;
    for (let i = header.length - 1; i >= 0; i--) {
      if (header[i] === ')') depth++;
      else if (header[i] === '(' && --depth === 0) return header.slice(0, i);
    }
    return header;
  }
}

/** The string literal value of `key "v"` / `key 'v'` / `key = "v"` / `key("v")` in a text, or undefined. */
export function gradleStringValue(text: string, key: string): string | undefined {
  const pattern = new RegExp(`\\b${key}\\s*(?:=\\s*|\\(\\s*|\\s)\\s*(["'])([^"'\\n]*)\\1`);
  return pattern.exec(text)?.[2];
}

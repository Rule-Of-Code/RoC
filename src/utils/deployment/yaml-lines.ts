/**
 * YAML read as keyed lines with their path — not a YAML parser.
 *
 * The deploy laws ask "does this step set `with.flags`?", "is there a
 * `template.spec.containerConcurrency`?", "which `entrypoint` belongs to the
 * same Cloud Build step as these `args`?". Those are questions about a key's
 * ancestors and about which list item it sits in, which indentation answers
 * without a parser (RoC ships no YAML dependency).
 *
 * Read: block mappings and block sequences by indentation, `- key: value`
 * items, scalar list items (`- run`), flow lists on one or several lines
 * (`[a, b]`), and block scalars (`key: |`, `key: >-`), whose lines are kept.
 * Not read: anchors and aliases (`*x`, `<<: *x`), flow mappings (`{a: 1}`),
 * multi-document streams as separate documents, and keys that contain
 * quotes. What is not read is never invented: a missing key is reported as
 * missing, and a law that relies on this reader says so in its limits.
 */

export interface YamlLine {
  text: string;
  line: number;
}

export interface YamlEntry {
  key: string;
  /** The scalar value on the key's line, unquoted ('' for a parent key or a block scalar). */
  value: string;
  line: number;
  indent: number;
  /** Ancestor keys and this key (list items add no segment). */
  path: string[];
  /** Id of the innermost list item the key belongs to; -1 outside any list item. */
  item: number;
  /** Scalar list items directly under this key. */
  items: YamlLine[];
  /** The lines of a block scalar value (`key: |` / `key: >`). */
  block: YamlLine[];
  /** The block scalar is folded (`>`): its lines join into one. */
  folded: boolean;
}

interface Frame {
  indent: number;
  entry: YamlEntry;
}

interface Item {
  id: number;
  /** Indentation of the keys inside the item. */
  indent: number;
}

const LINE = /^(\s*)((?:-(?:\s+|$))*)(.*)$/;
const KEY =
  /^(?:"([^"]*)"|'([^']*)'|([^\s"'#[\]{}][^"'#]*?))\s*:(?:\s+|$)(.*)$/;
const BLOCK_SCALAR = /^[|>][-+0-9]*$/;

/** A scalar as written, without its trailing comment and its quotes. */
export function unquote(raw: string): string {
  const text = raw.replace(/(^|\s)#.*$/, '').trim();
  const quoted = /^(["'])(.*)\1$/.exec(text);
  return quoted ? (quoted[2] ?? '') : text;
}

/** The items of a flow list `['run', "deploy", x]`. */
export function flowItems(value: string): string[] {
  const inner = value.trim().replace(/^\[/, '').replace(/\]$/, '');
  const items: string[] = [];
  let current = '';
  let quote: string | null = null;
  for (const c of inner) {
    if (quote) {
      if (c === quote) quote = null;
      current += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      current += c;
    } else if (c === ',') {
      items.push(unquote(current));
      current = '';
    } else {
      current += c;
    }
  }
  if (current.trim()) items.push(unquote(current));
  return items.filter(Boolean);
}

const bracketDepth = (text: string): number =>
  (text.match(/\[/g) ?? []).length - (text.match(/\]/g) ?? []).length;

class Reader {
  readonly entries: YamlEntry[] = [];
  private readonly stack: Frame[] = [];
  private readonly openItems: Item[] = [];
  private nextItem = 0;
  private blockOwner: YamlEntry | null = null;

  constructor(private readonly lines: string[]) {}

  read(): YamlEntry[] {
    for (let index = 0; index < this.lines.length; index++) {
      index = this.readLine(index);
    }
    return this.entries;
  }

  /** Reads the line at `index`; returns the last line it consumed. */
  private readLine(index: number): number {
    const raw = (this.lines[index] ?? '').replace(/\r$/, '');
    if (this.continuesBlock(raw, index)) return index;
    this.blockOwner = null;
    if (raw.trim() === '' || raw.trimStart().startsWith('#')) return index;
    const [, lead = '', dashes = '', rest = ''] = LINE.exec(raw) ?? [];
    const key = KEY.exec(rest);
    if (dashes) this.closeItems(lead.length);
    if (!key) {
      if (dashes)
        this.parentOf(lead.length)?.items.push({
          text: unquote(rest),
          line: index + 1,
        });
      return index;
    }
    const keyIndent = lead.length + dashes.length;
    if (dashes) this.openItems.push({ id: this.nextItem++, indent: keyIndent });
    else this.closeItems(keyIndent);
    return this.addEntry(index, keyIndent, key);
  }

  /**
   * A blank line, or one indented deeper than the key that opened a block
   * scalar (`run: |`), belongs to that block; it is kept and consumed.
   */
  private continuesBlock(raw: string, index: number): boolean {
    const owner = this.blockOwner;
    if (!owner) return false;
    const text = raw.trim();
    const indent = raw.length - raw.trimStart().length;
    if (text !== '' && indent <= owner.indent) return false;
    if (text !== '') owner.block.push({ text, line: index + 1 });
    return true;
  }

  private addEntry(
    index: number,
    indent: number,
    key: RegExpExecArray
  ): number {
    while ((this.stack[this.stack.length - 1]?.indent ?? -1) >= indent)
      this.stack.pop();
    let value = (key[4] ?? '').trim();
    let last = index;
    while (
      value.startsWith('[') &&
      bracketDepth(value) > 0 &&
      last + 1 < this.lines.length
    ) {
      last++;
      value += ` ${(this.lines[last] ?? '').trim()}`;
    }
    const name = key[1] ?? key[2] ?? key[3] ?? '';
    const scalar = unquote(value);
    const entry: YamlEntry = {
      key: name.trim(),
      value: BLOCK_SCALAR.test(scalar) ? '' : scalar,
      line: index + 1,
      indent,
      path: [...this.stack.map(frame => frame.entry.key), name.trim()],
      item: this.openItems[this.openItems.length - 1]?.id ?? -1,
      items: [],
      block: [],
      folded: scalar.startsWith('>'),
    };
    if (BLOCK_SCALAR.test(scalar)) this.blockOwner = entry;
    this.entries.push(entry);
    this.stack.push({ indent, entry });
    return last;
  }

  /** Close the list items whose keys sit deeper than `indent`. */
  private closeItems(indent: number): void {
    while ((this.openItems[this.openItems.length - 1]?.indent ?? -1) > indent)
      this.openItems.pop();
  }

  /** The key a scalar list item at `dashIndent` belongs to. */
  private parentOf(dashIndent: number): YamlEntry | undefined {
    while ((this.stack[this.stack.length - 1]?.indent ?? -1) > dashIndent)
      this.stack.pop();
    return this.stack[this.stack.length - 1]?.entry;
  }
}

/** Every keyed line of a YAML text, in order. */
export function yamlEntries(text: string): YamlEntry[] {
  return new Reader(text.split('\n')).read();
}

/** Does any entry's path end with `suffix` (dotted segments compared one by one)? */
export function hasPathSuffix(
  entries: YamlEntry[],
  suffix: readonly string[]
): boolean {
  return entries.some(entry =>
    suffix.every(
      (segment, i) =>
        entry.path[entry.path.length - suffix.length + i] === segment
    )
  );
}

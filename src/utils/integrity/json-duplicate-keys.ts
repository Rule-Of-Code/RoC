/**
 * Duplicate keys in a JSON object, read from the TEXT.
 *
 * `JSON.parse` keeps the last of two equal keys and drops the first without a
 * word, so a parsed document cannot show that a text merge left the same
 * table twice in a snapshot. Only the characters can.
 *
 * This is a scanner, not a validator: it assumes the text already parses
 * (callers parse it first and report a parse failure separately), and it only
 * tracks which keys each object has seen.
 */

export interface DuplicateKey {
  key: string;
  /** Dotted path of the object holding the key (`tables.public.users`), '' for the root. */
  path: string;
  /** 1-based line of the second occurrence. */
  line: number;
}

interface Frame {
  isObject: boolean;
  keys: Set<string>;
  /** In an object: the next string is a key. */
  expectKey: boolean;
  /** The key whose value is being read, for paths. */
  currentKey: string;
}

class Scanner {
  private readonly stack: Frame[] = [];
  private line = 1;
  readonly found: DuplicateKey[] = [];

  constructor(private readonly text: string) {}

  run(): void {
    let i = 0;
    while (i < this.text.length) {
      const ch = this.text.charAt(i);
      if (ch === '"') {
        i = this.readString(i);
        continue;
      }
      this.punctuation(ch);
      i += 1;
    }
  }

  private punctuation(ch: string): void {
    const top = this.stack[this.stack.length - 1];
    if (ch === '\n') this.line += 1;
    else if (ch === '{' || ch === '[') {
      this.stack.push({ isObject: ch === '{', keys: new Set(), expectKey: ch === '{', currentKey: '' });
    } else if (ch === '}' || ch === ']') this.stack.pop();
    else if (ch === ',' && top?.isObject) top.expectKey = true;
  }

  /** Read the string starting at `start` (a quote); returns the index after it. */
  private readString(start: number): number {
    let i = start + 1;
    while (i < this.text.length && this.text[i] !== '"') {
      i += this.text[i] === '\\' ? 2 : 1;
    }
    const raw = this.text.slice(start, i + 1);
    const top = this.stack[this.stack.length - 1];
    if (top?.isObject && top.expectKey) this.key(top, raw);
    return i + 1;
  }

  private key(frame: Frame, raw: string): void {
    let key: string;
    try {
      key = JSON.parse(raw) as string; // decodes escapes: "a" and "a" are one key
    } catch {
      key = raw.slice(1, -1);
    }
    if (frame.keys.has(key)) {
      this.found.push({ key, path: this.path(), line: this.line });
    }
    frame.keys.add(key);
    frame.currentKey = key;
    frame.expectKey = false;
  }

  private path(): string {
    return this.stack
      .slice(0, -1)
      .filter(frame => frame.isObject)
      .map(frame => frame.currentKey)
      .join('.');
  }
}

/** Every key that appears twice in the same object of `text`. */
export function duplicateJsonKeys(text: string): DuplicateKey[] {
  const scanner = new Scanner(text);
  scanner.run();
  return scanner.found;
}

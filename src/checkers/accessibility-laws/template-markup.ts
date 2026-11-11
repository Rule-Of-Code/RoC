/**
 * An HTML/Angular template read as elements, not as text.
 *
 * A regex for `<button\b[^>]*>` stops at the first `>` — also the one inside
 * `(click)="n > 0 && go()"` — matches `<button-group>` as a button, and cannot
 * say which element another one sits in. The accessibility laws need all
 * three: an attribute by its exact name, the whole opening tag, and the
 * ancestors (a wrapping `<label>`, an enclosing `<ion-accordion>`, a
 * `slot="label"` child).
 *
 * This is a tolerant tokenizer, not a validating parser: a closing tag pops
 * back to its opener, void elements never open, `{{ … }}` interpolations and
 * `<script>`/`<style>` bodies are text. A `<` that is not followed by a tag
 * name (`a < b`, `@if (n<max)`) is text, as in the HTML tokenizer. The one
 * thing it refuses is an opening tag or an attribute value that never ends:
 * from there on nothing can be told apart, so the document reports `error`
 * and a law reports the file as not read — it never passes it.
 */

/** One attribute as written: `type="button"` → name `type`, value `button`. */
export interface MarkupAttribute {
  name: string;
  /** null for a bare attribute (`<ion-item button>`). */
  value: string | null;
}

export interface MarkupElement {
  /** Tag name, lower-cased (`button`, `ion-input`, `app-field`). */
  tag: string;
  attributes: MarkupAttribute[];
  parent: MarkupElement | null;
  children: MarkupElement[];
  /** Text written directly inside the element (not inside its children). */
  text: string;
  /** 1-based line of the opening `<`. */
  line: number;
}

export interface MarkupDocument {
  /** Every element, in source order. */
  elements: MarkupElement[];
  /** Why the document could not be read to the end, or null. */
  error: string | null;
}

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);
const RAW_TEXT_ELEMENTS = new Set(['script', 'style']);
const TAG_NAME = /^[A-Za-z][\w:.-]*/;
const ATTRIBUTE_NAME_END = /[\s=>]/;

/** Replace comments with blanks of the same shape, so lines stay where they were. */
function blankComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, match => match.replace(/[^\n]/g, ' '));
}

class Tokenizer {
  private readonly text: string;
  private position = 0;
  private line = 1;
  private readonly root: MarkupElement;
  private readonly stack: MarkupElement[];
  readonly elements: MarkupElement[] = [];
  error: string | null = null;

  constructor(html: string) {
    this.text = blankComments(html);
    this.root = { tag: '#root', attributes: [], parent: null, children: [], text: '', line: 1 };
    this.stack = [this.root];
  }

  run(): void {
    while (this.position < this.text.length && this.error === null) {
      if (this.text.startsWith('{{', this.position)) {
        this.skipInterpolation();
      } else if (this.text[this.position] === '<') {
        this.readAngle();
      } else {
        this.readText();
      }
    }
  }

  private get current(): MarkupElement {
    return this.stack[this.stack.length - 1] ?? this.root;
  }

  private advanceTo(end: number): string {
    const chunk = this.text.slice(this.position, end);
    for (const ch of chunk) if (ch === '\n') this.line++;
    this.position = end;
    return chunk;
  }

  private skipInterpolation(): void {
    const close = this.text.indexOf('}}', this.position + 2);
    const end = close === -1 ? this.text.length : close + 2;
    this.current.text += this.advanceTo(end);
  }

  private readText(): void {
    let end = this.position + 1;
    while (
      end < this.text.length &&
      this.text[end] !== '<' &&
      !this.text.startsWith('{{', end)
    ) {
      end++;
    }
    this.current.text += this.advanceTo(end);
  }

  private readAngle(): void {
    const rest = this.text.slice(this.position + 1, this.position + 200);
    if (rest.startsWith('/')) {
      const close = /^\/([A-Za-z][\w:.-]*)\s*>/.exec(rest);
      if (close) {
        this.advanceTo(this.position + 1 + close[0].length);
        this.closeElement((close[1] ?? '').toLowerCase());
        return;
      }
    } else {
      const name = TAG_NAME.exec(rest);
      const after = name ? rest.charAt(name[0].length) : '';
      if (name && (after === '' || /[\s/>]/.test(after))) {
        this.readOpeningTag(name[0]);
        return;
      }
    }
    this.current.text += this.advanceTo(this.position + 1);
  }

  private closeElement(tag: string): void {
    for (let i = this.stack.length - 1; i > 0; i--) {
      if (this.stack[i]?.tag === tag) {
        this.stack.length = i;
        return;
      }
    }
  }

  private readOpeningTag(name: string): void {
    const line = this.line;
    const tag = name.toLowerCase();
    this.advanceTo(this.position + 1 + name.length);
    const attributes: MarkupAttribute[] = [];
    let selfClosing = false;
    for (;;) {
      this.skipWhitespace();
      if (this.position >= this.text.length) {
        this.error = `line ${line}: <${name}> is never closed with ">"`;
        return;
      }
      if (this.text[this.position] === '>') {
        this.advanceTo(this.position + 1);
        break;
      }
      if (this.text.startsWith('/>', this.position)) {
        this.advanceTo(this.position + 2);
        selfClosing = true;
        break;
      }
      const attribute = this.readAttribute(name, line);
      if (attribute === null) return;
      if (attribute.name !== '') attributes.push(attribute);
    }
    const parent = this.current;
    const element: MarkupElement = { tag, attributes, parent, children: [], text: '', line };
    parent.children.push(element);
    this.elements.push(element);
    if (selfClosing || VOID_ELEMENTS.has(tag)) return;
    if (RAW_TEXT_ELEMENTS.has(tag)) {
      const close = this.text.toLowerCase().indexOf(`</${tag}`, this.position);
      this.advanceTo(close === -1 ? this.text.length : close);
      return;
    }
    this.stack.push(element);
  }

  private skipWhitespace(): void {
    let end = this.position;
    while (end < this.text.length && /\s/.test(this.text.charAt(end))) end++;
    this.advanceTo(end);
  }

  /** One attribute; null (with `error` set) when its quoted value never ends. */
  private readAttribute(tagName: string, line: number): MarkupAttribute | null {
    let end = this.position;
    // A lone '/' that does not close the tag is part of nothing: skip it.
    if (this.text[end] === '/') {
      this.advanceTo(end + 1);
      return { name: '', value: null };
    }
    while (end < this.text.length && !ATTRIBUTE_NAME_END.test(this.text.charAt(end))) {
      if (this.text.startsWith('/>', end)) break;
      end++;
    }
    const name = this.advanceTo(end);
    this.skipWhitespace();
    if (this.text[this.position] !== '=') return { name, value: null };
    this.advanceTo(this.position + 1);
    this.skipWhitespace();
    const quote = this.text[this.position];
    if (quote === '"' || quote === "'") {
      const close = this.text.indexOf(quote, this.position + 1);
      if (close === -1) {
        this.error = `line ${line}: the value of ${name} on <${tagName}> never ends`;
        return null;
      }
      const value = this.advanceTo(close + 1).slice(1, -1);
      return { name, value };
    }
    let valueEnd = this.position;
    while (valueEnd < this.text.length && !/[\s>]/.test(this.text.charAt(valueEnd))) {
      valueEnd++;
    }
    return { name, value: this.advanceTo(valueEnd) };
  }
}

export class TemplateMarkup {
  static parse(html: string): MarkupDocument {
    const tokenizer = new Tokenizer(html);
    tokenizer.run();
    return { elements: tokenizer.elements, error: tokenizer.error };
  }

  /**
   * The attribute `name` as written statically or bound by Angular:
   * `name`, `[name]`, `[attr.name]` (case-insensitive, exact name — so
   * `data-type` is not `type`).
   */
  static attribute(element: MarkupElement, name: string): MarkupAttribute | undefined {
    const wanted = name.toLowerCase();
    return element.attributes.find(attribute => {
      const written = attribute.name.toLowerCase();
      return (
        written === wanted ||
        written === `[${wanted}]` ||
        written === `[attr.${wanted}]`
      );
    });
  }

  static has(element: MarkupElement, name: string): boolean {
    return this.attribute(element, name) !== undefined;
  }

  /** The value of a static (unbound) attribute, or undefined. */
  static staticValue(element: MarkupElement, name: string): string | undefined {
    const wanted = name.toLowerCase();
    const found = element.attributes.find(a => a.name.toLowerCase() === wanted);
    return found ? (found.value ?? '') : undefined;
  }

  /** The nearest ancestor whose tag is one of `tags`, or null. */
  static ancestor(element: MarkupElement, tags: readonly string[]): MarkupElement | null {
    for (let node = element.parent; node; node = node.parent) {
      if (tags.includes(node.tag)) return node;
    }
    return null;
  }

  /** Every element nested inside `element`, at any depth. */
  static descendants(element: MarkupElement): MarkupElement[] {
    const found: MarkupElement[] = [];
    const visit = (node: MarkupElement): void => {
      for (const child of node.children) {
        found.push(child);
        visit(child);
      }
    };
    visit(element);
    return found;
  }

  /** The class tokens of a static `class="…"` attribute. */
  static classes(element: MarkupElement): string[] {
    return (this.staticValue(element, 'class') ?? '').split(/\s+/).filter(Boolean);
  }
}

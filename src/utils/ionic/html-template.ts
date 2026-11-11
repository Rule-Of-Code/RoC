/**
 * An Angular template read as a tree of elements, not as text.
 *
 * The Ionic rendering laws ask structural questions a regex over the file
 * cannot answer: is this `<ion-fab>` a direct child of `<ion-content>`? does
 * THIS opening tag of `<ion-content>` carry `[scrollEvents]`, or another one
 * in the same file? is the element inside `slot="fixed"`?
 *
 * This is a tolerant reader, not an HTML parser. It blanks `<!-- … -->`
 * comments (newlines kept, so every line number still points into the
 * original), reads each opening tag with its attributes — quoted values may
 * hold `>` (`(click)="a > b"`), so quotes are honoured — and keeps a stack of
 * open elements so each one knows its parent. A closing tag pops back to the
 * matching open element; one that matches nothing is ignored. `<script>` and
 * `<style>` bodies are skipped. Angular's own syntax (`@if (…) { }`, `{{ }}`)
 * is text to it, which is also what it is in the DOM: control flow creates no
 * element.
 */

export interface TemplateAttribute {
  /** As written: `class`, `[scrollEvents]`, `(ionScroll)`, `*ngIf`, `slot`. */
  name: string;
  /** The value without quotes; null for a bare attribute (`<input disabled>`). */
  value: string | null;
}

export interface TemplateElement {
  /** Lower-cased tag name. */
  tag: string;
  attributes: TemplateAttribute[];
  /** 1-based line of the opening `<`, in the file the template lives in. */
  line: number;
  parent: TemplateElement | null;
  children: TemplateElement[];
}

/** Elements that never have a closing tag. */
const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'source', 'track', 'wbr',
]);

/** Elements Angular renders no DOM node for: their children belong to their parent. */
const TRANSPARENT = new Set(['ng-container', 'ng-template']);

const RAW_TEXT = new Set(['script', 'style']);

const TAG_NAME = /^[A-Za-z][\w:.-]*/;

export class HtmlTemplate {
  /** Same length as `text`; every `<!-- … -->` becomes spaces, newlines kept. */
  static stripComments(text: string): string {
    return text.replace(/<!--[\s\S]*?(?:-->|$)/g, comment => comment.replace(/[^\n]/g, ' '));
  }

  /**
   * Every element of the template in document order. `firstLine` is the line
   * the template text starts on in its file (1 for a `.html`, the line of the
   * backtick for an inline template).
   */
  static elements(text: string, firstLine = 1): TemplateElement[] {
    const source = this.stripComments(text);
    const all: TemplateElement[] = [];
    const open: TemplateElement[] = [];
    let line = firstLine;
    let i = 0;
    while (i < source.length) {
      const c = source[i];
      if (c === '\n') line++;
      if (c !== '<') {
        i++;
        continue;
      }
      const closing = source[i + 1] === '/';
      const name = TAG_NAME.exec(source.slice(closing ? i + 2 : i + 1))?.[0];
      if (!name) {
        i++;
        continue;
      }
      if (closing) {
        this.close(open, name.toLowerCase());
        const end = this.skipTo(source, i, '>');
        line += this.newlines(source, i, end);
        i = end;
        continue;
      }
      const opened = this.openElement(source, i, name, line, open);
      all.push(opened.element);
      line = opened.line;
      i = opened.end;
      if (opened.push) open.push(opened.element);
    }
    return all;
  }

  /** Read the opening tag at `at` and, for script/style, skip its body. */
  private static openElement(
    source: string,
    at: number,
    name: string,
    line: number,
    open: TemplateElement[]
  ): { element: TemplateElement; end: number; line: number; push: boolean } {
    const tag = this.readTag(source, at + 1 + name.length);
    const element: TemplateElement = {
      tag: name.toLowerCase(),
      attributes: tag.attributes,
      line,
      parent: open[open.length - 1] ?? null,
      children: [],
    };
    element.parent?.children.push(element);
    const afterTag = line + this.newlines(source, at, tag.end);
    if (tag.selfClosing || VOID.has(element.tag)) {
      return { element, end: tag.end, line: afterTag, push: false };
    }
    if (RAW_TEXT.has(element.tag)) {
      const close = source.toLowerCase().indexOf(`</${element.tag}`, tag.end);
      const stop = close === -1 ? source.length : close;
      return { element, end: stop, line: afterTag + this.newlines(source, tag.end, stop), push: false };
    }
    return { element, end: tag.end, line: afterTag, push: true };
  }

  /** The attribute named `name`, as written (`[name]` and `name` are different names). */
  static attribute(element: TemplateElement, name: string): TemplateAttribute | undefined {
    return element.attributes.find(attribute => attribute.name === name);
  }

  /** The attribute bound under any of Angular's spellings: `x`, `[x]`, `[attr.x]`. */
  static bound(element: TemplateElement, name: string): TemplateAttribute | undefined {
    return element.attributes.find(
      attribute =>
        attribute.name === name ||
        attribute.name === `[${name}]` ||
        attribute.name === `[attr.${name}]`
    );
  }

  /** An event binding: `(event)` or `on-event`. */
  static listens(element: TemplateElement, event: string): boolean {
    return element.attributes.some(
      attribute => attribute.name === `(${event})` || attribute.name === `on-${event}`
    );
  }

  /** Static class names: `class="a b"` and `[class.a]`. */
  static classes(element: TemplateElement): string[] {
    const names: string[] = [];
    for (const attribute of element.attributes) {
      if (attribute.name === 'class' && attribute.value) {
        names.push(...attribute.value.split(/\s+/).filter(Boolean));
      }
      const bound = /^\[class\.([\w-]+)\]$/.exec(attribute.name);
      if (bound?.[1]) names.push(bound[1]);
    }
    return names;
  }

  /** The nearest ancestor that renders a DOM node (ng-container / ng-template skipped). */
  static domParent(element: TemplateElement): TemplateElement | null {
    let parent = element.parent;
    while (parent && TRANSPARENT.has(parent.tag)) parent = parent.parent;
    return parent;
  }

  /** The nearest ancestor with this tag, or null. */
  static ancestor(element: TemplateElement, tag: string): TemplateElement | null {
    let parent = element.parent;
    while (parent && parent.tag !== tag) parent = parent.parent;
    return parent;
  }

  /**
   * True when the element sits in the default slot of an `<ion-content>` —
   * inside the scroller. An ancestor chain that reaches `<ion-content>`
   * through a direct child carrying `slot="fixed"` is outside it.
   */
  static insideScroller(element: TemplateElement): boolean {
    let node: TemplateElement = element;
    let parent = this.domParent(node);
    while (parent) {
      if (parent.tag === 'ion-content') return this.attribute(node, 'slot')?.value !== 'fixed';
      node = parent;
      parent = this.domParent(node);
    }
    return false;
  }

  private static close(open: TemplateElement[], tag: string): void {
    for (let k = open.length - 1; k >= 0; k--) {
      if (open[k]?.tag === tag) {
        open.length = k;
        return;
      }
    }
  }

  private static skipTo(source: string, from: number, char: string): number {
    const at = source.indexOf(char, from);
    return at === -1 ? source.length : at + 1;
  }

  private static newlines(source: string, from: number, to: number): number {
    let count = 0;
    for (let k = from; k < to; k++) if (source[k] === '\n') count++;
    return count;
  }

  /** The attributes of an opening tag whose name ends at `from`, and where the tag ends. */
  private static readTag(
    source: string,
    from: number
  ): { attributes: TemplateAttribute[]; end: number; selfClosing: boolean } {
    const attributes: TemplateAttribute[] = [];
    let i = from;
    while (i < source.length) {
      i = this.skipSpace(source, i);
      const c = source[i];
      if (c === '>') return { attributes, end: i + 1, selfClosing: false };
      if (c === '/' && source[i + 1] === '>') return { attributes, end: i + 2, selfClosing: true };
      if (c === '/') {
        i++;
        continue;
      }
      const read = this.readAttribute(source, i);
      if (read.attribute) attributes.push(read.attribute);
      i = Math.max(read.end, i + 1);
    }
    return { attributes, end: source.length, selfClosing: false };
  }

  private static skipSpace(source: string, from: number): number {
    let i = from;
    while (i < source.length && /\s/.test(source[i] ?? '')) i++;
    return i;
  }

  private static readAttribute(
    source: string,
    from: number
  ): { attribute: TemplateAttribute | null; end: number } {
    const name = /^[^\s=>/]+/.exec(source.slice(from))?.[0];
    if (!name) return { attribute: null, end: from + 1 };
    let i = this.skipSpace(source, from + name.length);
    if (source[i] !== '=') return { attribute: { name, value: null }, end: from + name.length };
    i = this.skipSpace(source, i + 1);
    const quote = source[i];
    if (quote === '"' || quote === "'") {
      const close = source.indexOf(quote, i + 1);
      const end = close === -1 ? source.length : close;
      return { attribute: { name, value: source.slice(i + 1, end) }, end: end + 1 };
    }
    const bare = /^[^\s>]*/.exec(source.slice(i))?.[0] ?? '';
    return { attribute: { name, value: bare }, end: i + bare.length };
  }
}

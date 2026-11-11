/**
 * A stylesheet read as rules and declarations, not as text.
 *
 * The Ionic rendering laws ask which selector declares `position: fixed`,
 * whether a declaration on the top edge reads `--ion-safe-area-top`, and
 * whether `touch-action` is set on `::part(scroll)`. A search over the file
 * finds those words in comments too, and cannot say which selector a
 * declaration belongs to.
 *
 * This is a tolerant reader for CSS, SCSS and Less, not a parser. It blanks
 * comments (`/* *\/` always, `//` in SCSS/Less outside strings and `url()`),
 * then walks the braces: the text before `{` is a selector (or an at-rule),
 * the text before `;` or `}` inside a block is a declaration when it has a
 * colon. Nested selectors are joined to their parent (`&` replaced, else
 * descendant), and `@media` / `@supports` blocks keep the selector they are
 * in. `@keyframes` and `@font-face` bodies are not rules about elements and
 * are skipped. A Sass interpolation `#{…}` in a selector is read as text.
 */

import * as fs from 'fs';
import type { LawCheckContext } from '../../types/law.types';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';

export interface CssDeclaration {
  /** Lower-cased property: `padding-top`, `--ion-color`, `touch-action`. */
  property: string;
  value: string;
  /** 1-based line of the property. */
  line: number;
}

export interface CssRule {
  /** The full selector list, parents joined: `.bar .title, .bar h1`. */
  selector: string;
  declarations: CssDeclaration[];
  /** 1-based line of the selector. */
  line: number;
}

interface Frame {
  selector: string;
  skip: boolean;
  rule: CssRule | null;
}

const NOT_ELEMENT_RULES = /^@(?:-[\w]+-)?(?:keyframes|font-face|page|property|counter-style)\b/i;

export class CssRules {
  /** Every rule with at least one declaration, in source order. */
  static parse(text: string, file = '', firstLine = 1): CssRule[] {
    const source = this.stripComments(text, /\.(?:scss|sass|less)$/i.test(file));
    const rules: CssRule[] = [];
    const stack: Frame[] = [{ selector: '', skip: false, rule: null }];
    let buffer = '';
    let bufferLine = firstLine;
    let line = firstLine;
    let quote: string | null = null;
    for (const c of source) {
      if (c === '\n') line++;
      if (quote) {
        if (c === quote) quote = null;
        buffer += c;
        continue;
      }
      if (c === '"' || c === "'") quote = c;
      if (c === '{' || c === ';' || c === '}') {
        this.flush(stack, rules, buffer, bufferLine, c);
        buffer = '';
        bufferLine = line;
        continue;
      }
      if (!buffer.trim()) bufferLine = line;
      buffer += c;
    }
    return rules;
  }

  /** The class names in the LAST compound of each selector in a list: `.a .b.c` → b, c. */
  static subjectClasses(selector: string): string[] {
    const names: string[] = [];
    for (const one of selector.split(',')) {
      const last = one.trim().split(/\s+|>|\+|~/).filter(Boolean).pop() ?? '';
      for (const match of last.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
        if (match[1]) names.push(match[1]);
      }
    }
    return names;
  }

  /** Every class name anywhere in a selector list. */
  static allClasses(selector: string): string[] {
    return [...selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(match => match[1] ?? '');
  }

  /** Same length as `text`; comments become spaces, newlines kept. */
  static stripComments(text: string, lineComments: boolean): string {
    let out = '';
    let i = 0;
    let quote: string | null = null;
    let inUrl = false;
    while (i < text.length) {
      const c = text[i] ?? '';
      if (quote) {
        if (c === quote) quote = null;
        out += c;
        i++;
        continue;
      }
      const stop = this.commentEnd(text, i, lineComments && !inUrl);
      if (stop > i) {
        out += text.slice(i, stop).replace(/[^\n]/g, ' ');
        i = stop;
        continue;
      }
      if (c === '"' || c === "'") quote = c;
      if (text.slice(i, i + 4).toLowerCase() === 'url(') inUrl = true;
      if (c === ')') inUrl = false;
      out += c;
      i++;
    }
    return out;
  }

  /** Index past the comment starting at `i`, or `i` when none starts there. */
  private static commentEnd(text: string, i: number, lineComments: boolean): number {
    if (text[i] !== '/') return i;
    if (text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      return end === -1 ? text.length : end + 2;
    }
    if (lineComments && text[i + 1] === '/') {
      const end = text.indexOf('\n', i);
      return end === -1 ? text.length : end;
    }
    return i;
  }

  private static flush(
    stack: Frame[],
    rules: CssRule[],
    buffer: string,
    bufferLine: number,
    terminator: string
  ): void {
    const top = stack[stack.length - 1];
    const text = buffer.trim();
    if (terminator === '{') {
      stack.push(this.open(top, text, bufferLine));
      return;
    }
    if (text && top?.rule && !top.skip) this.declare(top.rule, text, bufferLine);
    if (terminator === '}' && stack.length > 1) {
      const closed = stack.pop();
      if (closed?.rule?.declarations.length) rules.push(closed.rule);
    }
  }

  private static open(parent: Frame | undefined, header: string, line: number): Frame {
    const parentSelector = parent?.selector ?? '';
    if (parent?.skip || NOT_ELEMENT_RULES.test(header)) {
      return { selector: parentSelector, skip: true, rule: null };
    }
    if (header.startsWith('@')) {
      // @media / @supports / @layer: the rules inside belong to the enclosing selector.
      const rule = parentSelector ? { selector: parentSelector, declarations: [], line } : null;
      return { selector: parentSelector, skip: false, rule };
    }
    const selector = this.join(parentSelector, header);
    return { selector, skip: false, rule: { selector, declarations: [], line } };
  }

  private static join(parent: string, header: string): string {
    const own = header.replace(/\s+/g, ' ').trim();
    if (!parent) return own;
    const parents = parent.split(',').map(one => one.trim());
    return own
      .split(',')
      .map(one => one.trim())
      .flatMap(one =>
        parents.map(p => (one.includes('&') ? one.replace(/&/g, p) : `${p} ${one}`))
      )
      .join(', ');
  }

  private static declare(rule: CssRule, text: string, line: number): void {
    const colon = text.indexOf(':');
    if (colon <= 0 || text.startsWith('@')) return;
    const property = text.slice(0, colon).trim().toLowerCase();
    if (!/^-{0,2}[a-z][\w-]*$/.test(property)) return;
    rule.declarations.push({ property, value: text.slice(colon + 1).trim(), line });
  }
}

export interface StyleSheet {
  file: string;
  rules: CssRule[];
}

/** The project's own stylesheets (the normal scan, so node_modules and `ignores` are out) plus inline styles. */
export function projectStyleSheets(
  context: LawCheckContext,
  inline: ReadonlyArray<{ file: string; text: string; firstLine: number }> = []
): { sheets: StyleSheet[]; unread: string[] } {
  const sheets: StyleSheet[] = [];
  const unread: string[] = [];
  const files = FileUtils.scanForFiles(
    context.projectRoot,
    context.config,
    ['.css', '.scss', '.sass', '.less'],
    context.lawId,
    false
  );
  for (const file of files) {
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      unread.push(`${PathOperations.getRelative(context.projectRoot, file)}: could not be read`);
      continue;
    }
    sheets.push({ file, rules: CssRules.parse(text, file) });
  }
  const scanned = new Set(files.map(file => PathOperations.normalize(file)));
  for (const style of inline) {
    const isSheet = /\.(?:s?css|sass|less)$/i.test(style.file);
    if (isSheet && scanned.has(PathOperations.normalize(style.file))) continue;
    sheets.push({ file: style.file, rules: CssRules.parse(style.text, style.file, style.firstLine) });
  }
  return { sheets, unread };
}

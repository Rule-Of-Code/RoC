/**
 * The Angular components of a project, each with its template and styles,
 * and where each one is rendered relative to `<ion-content>`.
 *
 * The Ionic rendering laws judge a component by what surrounds it at runtime:
 * a window-scroll read, a pointer swipe or a floating toast is wrong because
 * the element sits inside `ion-content`'s shadow scroller. That is a fact
 * about the component's own template OR about the template that renders it,
 * so this module reads every `@Component` (TypeScript AST, the project's own
 * compiler), its inline template or `templateUrl`, its styles, and its
 * element selector, and works out which components are rendered inside a
 * scroller by following selectors through parent templates.
 *
 * Files that could not be read — a `templateUrl` that does not exist, an
 * inline template built with `${}` substitutions, a project without
 * `typescript` — are returned in `unread`. A law that gets a non-empty list
 * must report it: what was not read was not judged.
 */

import * as fs from 'fs';
import type * as TS from 'typescript';
import type { LawCheckContext } from '../../types/law.types';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';
import { loadTypeScript, parserUnavailable, TsxSource } from '../react/tsx-source';
import { HtmlTemplate, type TemplateElement } from './html-template';

export interface SourceText {
  file: string;
  text: string;
  /** Line in `file` the text starts on. */
  firstLine: number;
}

export interface AngularComponent {
  className: string;
  file: string;
  line: number;
  /** Element selectors only (`app-card`); attribute selectors are not elements. */
  selectors: string[];
  template: SourceText | null;
  elements: TemplateElement[];
  styles: SourceText[];
  /** Keys of the decorator's `host` object: `(pointerdown)`, `[class.x]`. */
  hostKeys: string[];
  source: TsxSource;
  node: TS.ClassDeclaration;
}

export interface AngularScan {
  components: AngularComponent[];
  /** Every non-test .ts file that was parsed, components or not. */
  sources: TsxSource[];
  unread: string[];
}

const TEST_FILE = /\.(?:spec|test|cy|e2e)\.ts$/;

/** The decorators of a node, across TypeScript versions (getDecorators arrived in 4.8). */
export function decoratorsOf(ts: typeof TS, node: TS.Node): readonly TS.Decorator[] {
  if (typeof ts.getDecorators === 'function' && ts.canHaveDecorators(node)) {
    return ts.getDecorators(node) ?? [];
  }
  return (node as unknown as { decorators?: TS.Decorator[] }).decorators ?? [];
}

/** The object literal argument of `@Name({...})` on a class, or null. */
export function decoratorObject(
  ts: typeof TS,
  node: TS.Node,
  name: string
): TS.ObjectLiteralExpression | null {
  for (const decorator of decoratorsOf(ts, node)) {
    const call = decorator.expression;
    if (!ts.isCallExpression(call) || !ts.isIdentifier(call.expression)) continue;
    if (call.expression.text !== name) continue;
    const arg = call.arguments[0];
    return arg && ts.isObjectLiteralExpression(arg) ? arg : null;
  }
  return null;
}

/** The initializer of `key:` in an object literal, or undefined. */
export function propertyOf(
  ts: typeof TS,
  object: TS.ObjectLiteralExpression,
  key: string
): TS.Expression | undefined {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = property.name;
    const text = ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
    if (text === key) return property.initializer;
  }
  return undefined;
}

export class AngularComponents {
  /** Non-test .ts source through the normal scan, so `ignores` apply. */
  static tsFiles(context: LawCheckContext): string[] {
    return FileUtils.scanForFiles(context.projectRoot, context.config, ['.ts'], context.lawId, false)
      .filter(file => !TEST_FILE.test(file) && !file.endsWith('.d.ts'));
  }

  static scan(context: LawCheckContext): AngularScan {
    const files = this.tsFiles(context);
    const scan: AngularScan = { components: [], sources: [], unread: [] };
    if (files.length === 0) return scan;
    const ts = loadTypeScript(context.projectRoot);
    if (!ts) {
      scan.unread.push(`${files.length} file(s): ${parserUnavailable(context.projectRoot)}`);
      return scan;
    }
    for (const file of files) {
      let text: string;
      try {
        text = fs.readFileSync(file, 'utf8');
      } catch {
        scan.unread.push(`${this.relative(context, file)}: could not be read`);
        continue;
      }
      const source = TsxSource.parse(ts, file, text);
      scan.sources.push(source);
      if (text.includes('@Component')) this.collect(context, source, scan);
    }
    return scan;
  }

  /**
   * Components whose host is rendered inside an `<ion-content>` scroller (its
   * default slot): a parent template places the selector there, or places it
   * anywhere in a component that is itself inside a scroller.
   */
  static insideScroller(components: AngularComponent[]): Set<AngularComponent> {
    const bySelector = new Map<string, AngularComponent[]>();
    for (const component of components) {
      for (const selector of component.selectors) {
        bySelector.set(selector, [...(bySelector.get(selector) ?? []), component]);
      }
    }
    const inside = new Set<AngularComponent>();
    while (components.some(parent => this.placeChildren(parent, bySelector, inside))) {
      // repeat until no component is newly found inside a scroller
    }
    return inside;
  }

  /** Mark the children `parent` renders inside a scroller; true when any was new. */
  private static placeChildren(
    parent: AngularComponent,
    bySelector: Map<string, AngularComponent[]>,
    inside: Set<AngularComponent>
  ): boolean {
    let changed = false;
    for (const element of parent.elements) {
      if (!inside.has(parent) && !HtmlTemplate.insideScroller(element)) continue;
      for (const child of bySelector.get(element.tag) ?? []) {
        if (child === parent || inside.has(child)) continue;
        inside.add(child);
        changed = true;
      }
    }
    return changed;
  }

  /** Components with `<ion-content>` in their own template, or rendered inside one. */
  static underContent(components: AngularComponent[]): Set<AngularComponent> {
    const under = this.insideScroller(components);
    for (const component of components) {
      if (component.elements.some(element => element.tag === 'ion-content')) under.add(component);
    }
    return under;
  }

  static relative(context: LawCheckContext, file: string): string {
    return PathOperations.getRelative(context.projectRoot, file).replace(/\\/g, '/');
  }

  private static collect(context: LawCheckContext, source: TsxSource, scan: AngularScan): void {
    const ts = source.ts;
    source.walk(node => {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      const meta = decoratorObject(ts, node, 'Component');
      if (!meta) return;
      const component: AngularComponent = {
        className: node.name.text,
        file: source.fileName,
        line: source.lineOf(node.name),
        selectors: this.selectors(ts, meta),
        template: this.template(context, source, meta, scan.unread),
        elements: [],
        styles: this.styles(context, source, meta, scan.unread),
        hostKeys: this.hostKeys(ts, meta),
        source,
        node,
      };
      if (component.template) {
        component.elements = HtmlTemplate.elements(
          component.template.text,
          component.template.firstLine
        );
      }
      scan.components.push(component);
    });
  }

  private static selectors(ts: typeof TS, meta: TS.ObjectLiteralExpression): string[] {
    const value = propertyOf(ts, meta, 'selector');
    if (!value || !ts.isStringLiteralLike(value)) return [];
    return value.text
      .split(',')
      .map(one => /^\s*([a-zA-Z][\w-]*)/.exec(one)?.[1]?.toLowerCase() ?? '')
      .filter(Boolean);
  }

  private static hostKeys(ts: typeof TS, meta: TS.ObjectLiteralExpression): string[] {
    const host = propertyOf(ts, meta, 'host');
    if (!host || !ts.isObjectLiteralExpression(host)) return [];
    return host.properties
      .map(property => property.name)
      .filter((name): name is TS.PropertyName => Boolean(name))
      .map(name => (ts.isStringLiteral(name) || ts.isIdentifier(name) ? name.text : ''))
      .filter(Boolean);
  }

  private static template(
    context: LawCheckContext,
    source: TsxSource,
    meta: TS.ObjectLiteralExpression,
    unread: string[]
  ): SourceText | null {
    const ts = source.ts;
    const inline = propertyOf(ts, meta, 'template');
    if (inline) return this.inlineText(context, source, inline, unread, 'template');
    const url = propertyOf(ts, meta, 'templateUrl');
    if (!url) return null;
    return this.urlText(context, source, url, unread);
  }

  private static styles(
    context: LawCheckContext,
    source: TsxSource,
    meta: TS.ObjectLiteralExpression,
    unread: string[]
  ): SourceText[] {
    const ts = source.ts;
    const found: SourceText[] = [];
    const each = (value: TS.Expression | undefined, read: (e: TS.Expression) => SourceText | null): void => {
      if (!value) return;
      const items = ts.isArrayLiteralExpression(value) ? [...value.elements] : [value];
      for (const item of items) {
        const text = read(item);
        if (text) found.push(text);
      }
    };
    each(propertyOf(ts, meta, 'styles'), e => this.inlineText(context, source, e, unread, 'styles'));
    each(propertyOf(ts, meta, 'styleUrl'), e => this.urlText(context, source, e, unread));
    each(propertyOf(ts, meta, 'styleUrls'), e => this.urlText(context, source, e, unread));
    return found;
  }

  private static inlineText(
    context: LawCheckContext,
    source: TsxSource,
    value: TS.Expression,
    unread: string[],
    what: string
  ): SourceText | null {
    if (source.ts.isStringLiteralLike(value)) {
      return { file: source.fileName, text: value.text, firstLine: source.lineOf(value) };
    }
    unread.push(
      `${this.relative(context, source.fileName)}:${source.lineOf(value)}: inline ${what} is not a literal (built with substitutions or a variable) — it was not read`
    );
    return null;
  }

  private static urlText(
    context: LawCheckContext,
    source: TsxSource,
    value: TS.Expression,
    unread: string[]
  ): SourceText | null {
    if (!source.ts.isStringLiteralLike(value)) {
      unread.push(
        `${this.relative(context, source.fileName)}:${source.lineOf(value)}: a template/style URL that is not a literal — it was not read`
      );
      return null;
    }
    const file = PathOperations.resolve(PathOperations.getDirectory(source.fileName), value.text);
    try {
      return { file, text: fs.readFileSync(file, 'utf8'), firstLine: 1 };
    } catch {
      unread.push(
        `${this.relative(context, source.fileName)}:${source.lineOf(value)}: '${value.text}' could not be read — it was not judged`
      );
      return null;
    }
  }
}

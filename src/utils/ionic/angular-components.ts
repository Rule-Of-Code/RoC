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
import {
  loadTypeScript,
  parserUnavailable,
  TsxSource,
} from '../react/tsx-source';
import {
  decoratorObject,
  hostKeysOf,
  relativePath,
  selectorsOf,
  type SourceText,
  stylesOf,
  templateOf,
} from './angular-component-meta';
import { HtmlTemplate, type TemplateElement } from './html-template';

export {
  decoratorObject,
  decoratorsOf,
  propertyOf,
  type SourceText,
} from './angular-component-meta';

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

/** Parsed scans by file-list signature; a handful covers one audit's laws. */
const SCAN_CACHE = new Map<string, AngularScan>();
const SCAN_CACHE_LIMIT = 4;

/**
 * Finds the `@Component` classes of a project's non-test .ts files (parsed
 * once per audit and cached by file list, mtime and size) with their
 * templates, styles, selectors and host keys, and answers which components
 * are rendered inside an `<ion-content>` scroller by following selectors
 * through parent templates.
 */
export class AngularComponents {
  /** Non-test .ts source through the normal scan, so `ignores` apply. */
  static tsFiles(context: LawCheckContext): string[] {
    return FileUtils.scanForFiles(
      context.projectRoot,
      context.config,
      ['.ts'],
      context.lawId,
      false
    ).filter(file => !TEST_FILE.test(file) && !file.endsWith('.d.ts'));
  }

  /**
   * The scan, parsed once per audit. Seven template laws read the same
   * components, and each parsed every non-test .ts file again — about 3–4 s
   * per law on a 2,000-file app. The key is the exact file list (it follows
   * each law's own ignores) with every file's mtime and size, so an edited
   * file is parsed again; callers get their own arrays.
   */
  static scan(context: LawCheckContext): AngularScan {
    const files = this.tsFiles(context);
    const signature = `${context.projectRoot}\n${files
      .map(file => {
        try {
          const stat = fs.statSync(file);
          return `${file}:${stat.mtimeMs}:${stat.size}`;
        } catch {
          return `${file}:missing`;
        }
      })
      .join('\n')}`;
    let scan = SCAN_CACHE.get(signature);
    if (!scan) {
      scan = this.scanFiles(context, files);
      SCAN_CACHE.set(signature, scan);
      while (SCAN_CACHE.size > SCAN_CACHE_LIMIT) {
        SCAN_CACHE.delete(SCAN_CACHE.keys().next().value as string);
      }
    }
    return {
      components: [...scan.components],
      sources: [...scan.sources],
      unread: [...scan.unread],
    };
  }

  private static scanFiles(
    context: LawCheckContext,
    files: string[]
  ): AngularScan {
    const scan: AngularScan = { components: [], sources: [], unread: [] };
    if (files.length === 0) return scan;
    const ts = loadTypeScript(context.projectRoot);
    if (!ts) {
      scan.unread.push(
        `${files.length} file(s): ${parserUnavailable(context.projectRoot)}`
      );
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
        bySelector.set(selector, [
          ...(bySelector.get(selector) ?? []),
          component,
        ]);
      }
    }
    const inside = new Set<AngularComponent>();
    while (
      components.some(parent => this.placeChildren(parent, bySelector, inside))
    ) {
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
      if (!inside.has(parent) && !HtmlTemplate.insideScroller(element))
        continue;
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
      if (component.elements.some(element => element.tag === 'ion-content'))
        under.add(component);
    }
    return under;
  }

  static relative(context: LawCheckContext, file: string): string {
    return relativePath(context, file);
  }

  private static collect(
    context: LawCheckContext,
    source: TsxSource,
    scan: AngularScan
  ): void {
    const ts = source.ts;
    source.walk(node => {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      const meta = decoratorObject(ts, node, 'Component');
      if (!meta) return;
      const component: AngularComponent = {
        className: node.name.text,
        file: source.fileName,
        line: source.lineOf(node.name),
        selectors: selectorsOf(ts, meta),
        template: templateOf(context, source, meta, scan.unread),
        elements: [],
        styles: stylesOf(context, source, meta, scan.unread),
        hostKeys: hostKeysOf(ts, meta),
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
}

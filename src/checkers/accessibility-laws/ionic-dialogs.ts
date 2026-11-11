/**
 * Which component templates Ionic itself presents as a dialog.
 *
 * `ion-modal` puts role="dialog", aria-modal="true" and tabIndex -1 on its own
 * wrapper (@ionic/core 8.8.17 modal.js:1188) and traps focus unless its
 * `focusTrap` property is false (modal.js:140). The component it shows has
 * none of that in its own template, and must not: the wrapper already is the
 * dialog. A component is shown by ion-modal in two ways, and both are read:
 *
 * - `ModalController.create({ component: X })` in a file that imports
 *   ModalController from an `@ionic/*` package — X's template;
 * - `<ion-modal>…<x-selector>…</ion-modal>` in a template — the template of
 *   the component whose selector is nested there.
 *
 * Component classes are matched to templates through their `@Component`
 * decorator (`templateUrl`, `selector`), read with the project's TypeScript.
 */

import type * as TS from 'typescript';
import type { LawCheckContext } from '../../types/law.types';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import {
  loadTypeScript,
  parserUnavailable,
  TsxSource,
  type TypeScriptModule,
} from '../../utils/react/tsx-source';
import { parseErrors } from './jsx-sources';
import { TemplateMarkup, type MarkupDocument } from './template-markup';

/** How a template is presented by ion-modal. */
export interface IonicPresentation {
  /** `ModalController.create` in <file>, or `<ion-modal>` in <file>. */
  via: string;
  /** False when that presentation sets focusTrap to false. */
  focusTrap: boolean;
}

export interface IonicDialogs {
  /** templateKey(template) → how ion-modal presents it. */
  presented: Map<string, IonicPresentation>;
  /** Component sources that could not be read; each is a violation where it matters. */
  unread: string[];
}

interface ComponentDeclaration {
  className: string;
  selector: string | null;
  template: string | null;
}

const TEST_FILE = /\.(?:spec|test)\.ts$/;

/** One spelling per file, whatever separators or drive-letter case the scan used. */
export function templateKey(file: string): string {
  const unix = PathOperations.toUnixStyle(PathOperations.resolve(file));
  return process.platform === 'win32' ? unix.toLowerCase() : unix;
}

const ION_MODAL = 'ion-modal';

export class IonicDialogReader {
  /**
   * Read the project's component sources and templates for ion-modal
   * presentations. `templates` are the already-parsed templates, by path.
   */
  static read(
    context: LawCheckContext,
    templates: ReadonlyMap<string, MarkupDocument>
  ): IonicDialogs {
    const presented = new Map<string, IonicPresentation>();
    const files = FileUtils.scanForFiles(
      context.projectRoot,
      context.config,
      ['.ts'],
      context.lawId,
      false
    ).filter(file => !TEST_FILE.test(file) && !file.endsWith('.d.ts'));
    const relevant = files
      .map(file => ({ file, text: this.readText(file) }))
      .filter(
        entry =>
          entry.text !== null &&
          (entry.text.includes('templateUrl') || entry.text.includes('ModalController'))
      ) as Array<{ file: string; text: string }>;
    if (relevant.length === 0) return { presented, unread: [] };

    const ts = loadTypeScript(context.projectRoot);
    if (!ts) {
      return {
        presented,
        unread: [
          `${relevant.length} component file(s): ${parserUnavailable(context.projectRoot)}`,
        ],
      };
    }

    const unread: string[] = [];
    const components: ComponentDeclaration[] = [];
    const created = new Map<string, IonicPresentation>();
    for (const { file, text } of relevant) {
      const source = TsxSource.parse(ts, file, text);
      const errors = parseErrors(ts, source.sourceFile);
      if (errors.length > 0) {
        unread.push(
          `${PathOperations.getRelative(context.projectRoot, file)}: could not be parsed (${errors[0]}) — its components were NOT read`
        );
        continue;
      }
      components.push(...this.components(ts, source, file));
      this.collectCreated(ts, source, PathOperations.getRelative(context.projectRoot, file), created);
    }

    const nested = this.nestedInIonModal(context, templates);
    for (const component of components) {
      if (!component.template) continue;
      const byController = created.get(component.className);
      const bySelector = component.selector ? nested.get(component.selector) : undefined;
      const presentation = byController ?? bySelector;
      if (presentation) presented.set(component.template, presentation);
    }
    return { presented, unread };
  }

  private static readText(file: string): string | null {
    try {
      return FileSystemOperations.readFile(file, { fallbackToEmpty: false });
    } catch {
      return null;
    }
  }

  /** `@Component({ selector, templateUrl })` classes declared in `source`. */
  private static components(
    ts: TypeScriptModule,
    source: TsxSource,
    file: string
  ): ComponentDeclaration[] {
    const found: ComponentDeclaration[] = [];
    source.walk(node => {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      const options = this.componentOptions(ts, node);
      if (!options) return;
      const templateUrl = this.stringProperty(ts, options, 'templateUrl');
      found.push({
        className: node.name.text,
        selector: this.stringProperty(ts, options, 'selector'),
        template: templateUrl
          ? templateKey(PathOperations.resolve(PathOperations.getDirectory(file), templateUrl))
          : null,
      });
    });
    return found;
  }

  private static componentOptions(
    ts: TypeScriptModule,
    node: TS.ClassDeclaration
  ): TS.ObjectLiteralExpression | null {
    for (const decorator of ts.getDecorators?.(node) ?? []) {
      const call = decorator.expression;
      if (!ts.isCallExpression(call)) continue;
      if (call.expression.getText() !== 'Component') continue;
      const argument = call.arguments[0];
      if (argument && ts.isObjectLiteralExpression(argument)) return argument;
    }
    return null;
  }

  private static property(
    ts: TypeScriptModule,
    object: TS.ObjectLiteralExpression,
    name: string
  ): TS.Expression | null {
    for (const property of object.properties) {
      if (
        ts.isPropertyAssignment(property) &&
        (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) &&
        property.name.text === name
      ) {
        return property.initializer;
      }
    }
    return null;
  }

  private static stringProperty(
    ts: TypeScriptModule,
    object: TS.ObjectLiteralExpression,
    name: string
  ): string | null {
    const value = this.property(ts, object, name);
    return value && ts.isStringLiteralLike(value) ? value.text : null;
  }

  /** `<x>.create({ component: X, focusTrap? })` in a file importing ModalController from @ionic/*. */
  private static collectCreated(
    ts: TypeScriptModule,
    source: TsxSource,
    relative: string,
    created: Map<string, IonicPresentation>
  ): void {
    const importsController = source
      .imports()
      .some(
        entry =>
          entry.module.startsWith('@ionic/') &&
          entry.named.some(named => named.imported === 'ModalController')
      );
    if (!importsController) return;
    source.walk(node => {
      if (!ts.isCallExpression(node)) return;
      const callee = node.expression;
      if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'create') return;
      const options = node.arguments[0];
      if (!options || !ts.isObjectLiteralExpression(options)) return;
      const component = this.property(ts, options, 'component');
      if (!component || !ts.isIdentifier(component)) return;
      const focusTrap = this.property(ts, options, 'focusTrap');
      created.set(component.text, {
        via: `ModalController.create in ${relative}`,
        focusTrap: !(focusTrap && focusTrap.kind === ts.SyntaxKind.FalseKeyword),
      });
    });
  }

  /** Selector → presentation, for every element nested in an <ion-modal>. */
  private static nestedInIonModal(
    context: LawCheckContext,
    templates: ReadonlyMap<string, MarkupDocument>
  ): Map<string, IonicPresentation> {
    const nested = new Map<string, IonicPresentation>();
    for (const [file, document] of templates) {
      for (const modal of document.elements.filter(el => el.tag === ION_MODAL)) {
        const trap = TemplateMarkup.attribute(modal, 'focusTrap');
        const presentation: IonicPresentation = {
          via: `<ion-modal> in ${PathOperations.getRelative(context.projectRoot, file)}`,
          focusTrap: !trap || (trap.value ?? '').trim() !== 'false',
        };
        for (const element of TemplateMarkup.descendants(modal)) {
          nested.set(element.tag, presentation);
        }
      }
    }
    return nested;
  }
}

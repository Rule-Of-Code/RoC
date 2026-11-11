/**
 * Ionic Icons Registered
 *
 * In the standalone (custom elements) build, `<ion-icon name="trash-outline">`
 * finds its SVG only in the map `addIcons` fills (ionicons getNamedUrl); the
 * fallback `getAssetPath('svg/…')` throws there because no asset path is
 * defined, and the only signal is a console warning. The name is lower-cased
 * before the lookup (getName → toLower), and `addIcons({ trashOutline })`
 * registers both the key as written and its kebab-case form — the same
 * conversion is applied here, so a name is judged registered exactly when
 * ionicons would find it.
 *
 * Scope: a project that imports `@ionic/angular/standalone`. The module build
 * resolves names through the asset path and is out of scope.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AngularComponents, type AngularComponent } from '../../utils/ionic/angular-components';
import { HtmlTemplate } from '../../utils/ionic/html-template';
import { withNotes } from '../../utils/ionic/law-notes';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

const STANDALONE_ENTRY = '@ionic/angular/standalone';
const ICON_PACKAGE = 'ionicons';
const ICON_SET = 'ionicons/icons';
/** Attributes ion-icon reads a name from (getName: ios / md by mode, else name, else a non-URL icon). */
const NAME_ATTRIBUTES = ['name', 'ios', 'md', 'icon'];

interface Registry {
  keys: Set<string>;
  /** Where each key was registered, for the unused-key note. */
  sites: Map<string, string>;
  everything: boolean;
  unread: string[];
}

/** ionicons' own kebab-case rule (addIcons → toKebabCase). */
export function ioniconsKebab(name: string): string {
  return name.replace(/([a-z0-9]|(?=[A-Z]))([A-Z0-9])/g, '$1-$2').toLowerCase();
}

export class IonicIconsRegisteredLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic Icons Registered';

  static check(context: LawCheckContext): LawResult {
    const scan = AngularComponents.scan(context);
    const violations = [...scan.unread];
    const notes: string[] = [];
    const standalone = scan.sources.some(source =>
      source.imports().some(info => info.module === STANDALONE_ENTRY && !info.typeOnly)
    );
    if (standalone) {
      const judged = this.judgeProject(context, scan.sources, scan.components);
      violations.push(...judged.violations);
      notes.push(...judged.notes);
    } else {
      notes.push(`no value import from '${STANDALONE_ENTRY}' — the module build resolves icon names through its asset path, which this law does not judge`);
    }
    const result = this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        `Register every icon a template names: addIcons({ camelCaseName }) with the import from '${ICON_SET}'`,
        'Register it in the component that renders it, and rename both sides in one commit',
      ],
      context
    );
    return withNotes(result, notes);
  }

  private static judgeProject(
    context: LawCheckContext,
    sources: TsxSource[],
    components: AngularComponent[]
  ): { violations: string[]; notes: string[] } {
    const registry = this.registry(context, sources);
    const violations = [...registry.unread];
    const notes: string[] = [];
    const used = new Set<string>();
    for (const component of components) {
      const found = this.judgeTemplate(context, component, registry, used);
      violations.push(...found.violations);
      notes.push(...found.notes);
    }
    if (used.size === 0) {
      const templates = components.filter(component => component.template).length;
      notes.push(`no literal <ion-icon> name in the ${templates} component template(s) read — nothing to judge`);
    }
    if (registry.everything) return { violations, notes };
    for (const [key, site] of registry.sites) {
      if (!used.has(key)) notes.push(`${site}: '${key}' is registered but no template names it — dead weight in the chunk that registers it`);
    }
    return { violations, notes };
  }

  private static judgeTemplate(
    context: LawCheckContext,
    component: AngularComponent,
    registry: Registry,
    used: Set<string>
  ): { violations: string[]; notes: string[] } {
    const violations: string[] = [];
    const notes: string[] = [];
    if (!component.template) return { violations, notes };
    const where = (line: number): string => `${AngularComponents.relative(context, component.template?.file ?? '')}:${line}`;
    for (const element of component.elements) {
      if (element.tag !== 'ion-icon') continue;
      for (const attribute of element.attributes) {
        const name = this.literalName(attribute.name, attribute.value);
        if (name === undefined) continue;
        if (name === null) {
          notes.push(`${where(element.line)}: <ion-icon ${attribute.name}="${attribute.value ?? ''}"> is computed — not judged`);
          continue;
        }
        const key = name.toLowerCase();
        used.add(key);
        if (registry.everything || registry.keys.has(key)) continue;
        violations.push(
          `${where(element.line)}: <ion-icon ${attribute.name}="${name}"> is not registered with addIcons — in the standalone build it draws no SVG (only a console warning). Register it: import { ${this.camel(key)} } from '${ICON_SET}'; addIcons({ ${this.camel(key)} })`
        );
      }
    }
    return { violations, notes };
  }

  /**
   * The literal icon name an attribute gives: a string; null when it is
   * computed (not judged); undefined when the attribute does not name an icon.
   */
  private static literalName(attribute: string, value: string | null): string | null | undefined {
    const bare = attribute.replace(/^\[(?:attr\.)?/, '').replace(/\]$/, '');
    if (!NAME_ATTRIBUTES.includes(bare) || value === null) return undefined;
    const bound = attribute.startsWith('[');
    if (!bound) {
      if (value.includes('{{')) return null;
      // An `icon` holding a URL or a path is an SVG source, not a name (isSrc).
      if (bare === 'icon' && /[/.]/.test(value)) return undefined;
      return value.trim() || undefined;
    }
    const literal = /^\s*'([^']*)'\s*$|^\s*"([^"]*)"\s*$/.exec(value);
    if (literal) return literal[1] ?? literal[2] ?? '';
    // [icon]="trashOutline" passes SVG data and bypasses the map; [name]="x" is computed.
    return bare === 'icon' ? undefined : null;
  }

  private static camel(kebab: string): string {
    return kebab.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  }

  /** Every key `addIcons` is called with, in ionicons' lookup form. */
  static registry(context: LawCheckContext, sources: TsxSource[]): Registry {
    const registry: Registry = { keys: new Set(), sites: new Map(), everything: false, unread: [] };
    for (const source of sources) {
      const ts = source.ts;
      const imports = source.imports();
      const addIcons = new Set(
        imports.filter(i => i.module === ICON_PACKAGE).flatMap(i => i.named.filter(n => n.imported === 'addIcons').map(n => n.local))
      );
      if (addIcons.size === 0) continue;
      const allIcons = new Set(imports.filter(i => i.module === ICON_SET && i.namespaceName).map(i => i.namespaceName ?? ''));
      source.walk(node => {
        if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return;
        if (!addIcons.has(node.expression.text)) return;
        const where = `${AngularComponents.relative(context, source.fileName)}:${source.lineOf(node)}`;
        this.register(ts, node.arguments[0], allIcons, where, registry);
      });
    }
    return registry;
  }

  private static register(
    ts: typeof TS,
    arg: TS.Expression | undefined,
    allIcons: Set<string>,
    where: string,
    registry: Registry
  ): void {
    if (arg && ts.isIdentifier(arg) && allIcons.has(arg.text)) {
      registry.everything = true;
      return;
    }
    if (!arg || !ts.isObjectLiteralExpression(arg)) {
      registry.unread.push(`${where}: addIcons is called with something other than an object literal — what it registers was NOT read`);
      return;
    }
    for (const property of arg.properties) {
      if (ts.isSpreadAssignment(property) && ts.isIdentifier(property.expression) && allIcons.has(property.expression.text)) {
        registry.everything = true;
        continue;
      }
      const name = property.name;
      const key = name && (ts.isIdentifier(name) || ts.isStringLiteral(name)) ? name.text : null;
      if (key === null) {
        registry.unread.push(`${where}: an addIcons entry whose key is computed or spread — what it registers was NOT read`);
        continue;
      }
      const kebab = ioniconsKebab(key);
      registry.keys.add(key);
      registry.keys.add(kebab);
      if (!registry.sites.has(kebab)) registry.sites.set(kebab, where);
    }
  }
}

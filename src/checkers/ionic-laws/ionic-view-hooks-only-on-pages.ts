/**
 * Ionic View Hooks Only On Pages
 *
 * @ionic/angular calls ionViewWillEnter / DidEnter / WillLeave / DidLeave /
 * WillUnload by adding DOM listeners on the host element of a component it
 * CREATED (bindLifecycleEvents). It is called from two places only:
 * IonRouterOutlet.activateWith, for routed pages, and AngularDelegate, for the
 * components ModalController, PopoverController and ion-nav create (ion-modal
 * and ion-popover then re-dispatch their present/dismiss events as
 * ionView* on that element). A component rendered by another component's
 * template never gets the listeners, so its hook compiles, passes the
 * interface law and a unit test that calls it directly, and never runs.
 *
 * A class is judged by how the project refers to it:
 * - green: `component: X` (a route, or a controller's create options),
 *   `loadComponent: () => import(…).then(m => m.X)`, a default export loaded
 *   by `loadComponent`, an argument of `push` / `setRoot` / `insert` (ion-nav),
 *   an abstract class, or a base class of a green class;
 * - red: listed only in an `imports` / `declarations` / `exports` array —
 *   rendered from a template;
 * - not judged (a note, not a pass claim): referred to any other way (a
 *   variable, a helper) or not at all.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AngularComponents } from '../../utils/ionic/angular-components';
import { withNotes } from '../../utils/ionic/law-notes';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

const HOOKS = new Set([
  'ionViewWillEnter',
  'ionViewDidEnter',
  'ionViewWillLeave',
  'ionViewDidLeave',
  'ionViewWillUnload',
]);
const HOOK_INTERFACES = new Set(['ViewWillEnter', 'ViewDidEnter', 'ViewWillLeave', 'ViewDidLeave']);
/** Arrays whose members a template renders. */
const TEMPLATE_ARRAYS = new Set(['imports', 'declarations', 'exports']);
/** ion-nav methods that create the component they are given. */
const IMPLEMENTS = 'implements';
const NAV_METHODS = new Set(['push', 'setRoot', 'insert', 'insertPages', 'setPages']);

interface HookClass {
  name: string;
  /** `Cls.ionViewWillEnter`, or `Cls implements ViewWillEnter` when only the interface is there. */
  label: string;
  where: string;
  file: string;
  abstract: boolean;
  defaultExport: boolean;
}

interface Evidence {
  created: Set<string>;
  composed: Map<string, string>;
  byValue: Map<string, string>;
  /** base class name → names of classes that extend it */
  subclasses: Map<string, Set<string>>;
  defaultLoads: Set<string>;
  unresolvedDefaultLoads: number;
}

export class IonicViewHooksOnlyOnPagesLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic View Hooks Only On Pages';

  static check(context: LawCheckContext): LawResult {
    const scan = AngularComponents.scan(context);
    const violations = [...scan.unread];
    const notes: string[] = [];
    const hookClasses = scan.sources.flatMap(source => this.hookClasses(context, source));
    if (hookClasses.length > 0) {
      const evidence = this.evidence(context, scan.sources, new Set(hookClasses.map(c => c.name)));
      for (const cls of hookClasses) {
        const verdict = this.verdict(cls, evidence);
        if (verdict) (verdict.red ? violations : notes).push(verdict.text);
      }
    }
    const result = this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        'Declare ionView* hooks only on route targets and on components created by ModalController / PopoverController / ion-nav',
        'A child that needs per-visit work exposes a method its page calls from its own ionViewWillEnter; or use ngOnInit / effect',
      ],
      context
    );
    return withNotes(result, notes);
  }

  /** Classes in one file that declare an ionView* hook or implement its interface. */
  static hookClasses(context: LawCheckContext, source: TsxSource): HookClass[] {
    const ts = source.ts;
    const found: HookClass[] = [];
    source.walk(node => {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      const hook = this.hookOf(ts, node);
      if (!hook) return;
      const modifiers = node.modifiers ?? [];
      found.push({
        name: node.name.text,
        label: hook.name.startsWith(IMPLEMENTS) ? `${node.name.text} ${hook.name}` : `${node.name.text}.${hook.name}`,
        where: `${AngularComponents.relative(context, source.fileName)}:${source.lineOf(hook.node)}`,
        file: PathOperations.normalize(source.fileName),
        abstract: modifiers.some(m => m.kind === ts.SyntaxKind.AbstractKeyword),
        defaultExport: modifiers.some(m => m.kind === ts.SyntaxKind.DefaultKeyword),
      });
    });
    return found;
  }

  private static hookOf(
    ts: typeof TS,
    node: TS.ClassDeclaration
  ): { name: string; node: TS.Node } | null {
    for (const member of node.members) {
      const name = member.name && ts.isIdentifier(member.name) ? member.name.text : '';
      if (HOOKS.has(name)) return { name, node: member };
    }
    for (const clause of node.heritageClauses ?? []) {
      if (clause.token !== ts.SyntaxKind.ImplementsKeyword) continue;
      for (const type of clause.types) {
        const name = type.expression.getText(node.getSourceFile()).split('.').pop() ?? '';
        if (HOOK_INTERFACES.has(name)) return { name: `${IMPLEMENTS} ${name}`, node: type };
      }
    }
    return null;
  }

  private static verdict(cls: HookClass, evidence: Evidence): { red: boolean; text: string } | null {
    if (cls.abstract || this.isGreen(cls.name, evidence, new Set())) return null;
    if (cls.defaultExport && evidence.defaultLoads.has(cls.file)) return null;
    const composedAt = evidence.composed.get(cls.name);
    const valueAt = evidence.byValue.get(cls.name);
    const loadedByDefault = cls.defaultExport && evidence.unresolvedDefaultLoads > 0;
    if (composedAt && !valueAt && !loadedByDefault) {
      return {
        red: true,
        text: `${cls.where}: ${cls.label} — ${cls.name} is rendered only from a template (listed at ${composedAt}) and is never a route target or controller-created, so Ionic never calls it. Use ngOnInit / effect, or call it from the page's own hook`,
      };
    }
    const why = valueAt
      ? `it is passed by value at ${valueAt}, which this law does not follow`
      : 'no route, controller or template reference to it was found';
    return { red: false, text: `${cls.where}: ${cls.label} not judged — ${why}` };
  }

  private static isGreen(name: string, evidence: Evidence, seen: Set<string>): boolean {
    if (evidence.created.has(name)) return true;
    if (seen.has(name)) return false;
    seen.add(name);
    for (const sub of evidence.subclasses.get(name) ?? []) {
      if (this.isGreen(sub, evidence, seen)) return true;
    }
    return false;
  }

  /** How every file refers to the hook classes (and which classes extend which). */
  static evidence(context: LawCheckContext, sources: TsxSource[], names: Set<string>): Evidence {
    const evidence: Evidence = {
      created: new Set(),
      composed: new Map(),
      byValue: new Map(),
      subclasses: new Map(),
      defaultLoads: new Set(),
      unresolvedDefaultLoads: 0,
    };
    for (const source of sources) {
      const ts = source.ts;
      source.walk(node => {
        if (ts.isClassDeclaration(node) && node.name) this.recordHeritage(ts, node, evidence);
        if (ts.isPropertyAssignment(node) && this.keyOf(ts, node) === 'loadComponent') {
          this.recordDefaultLoad(source, node.initializer, evidence);
        }
        if (ts.isIdentifier(node) && names.has(node.text)) this.recordUse(context, source, node, evidence);
      });
    }
    return evidence;
  }

  private static recordHeritage(ts: typeof TS, node: TS.ClassDeclaration, evidence: Evidence): void {
    for (const clause of node.heritageClauses ?? []) {
      if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
      for (const type of clause.types) {
        const base = ts.isIdentifier(type.expression) ? type.expression.text : null;
        if (!base || !node.name) continue;
        const subs = evidence.subclasses.get(base) ?? new Set<string>();
        subs.add(node.name.text);
        evidence.subclasses.set(base, subs);
      }
    }
  }

  /** `loadComponent: () => import('./x')` (or `.then(m => m.default)`): the default export of x. */
  private static recordDefaultLoad(source: TsxSource, initializer: TS.Expression, evidence: Evidence): void {
    const ts = source.ts;
    const visit = (node: TS.Node): void => {
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const spec = node.arguments[0];
        if (spec && ts.isStringLiteralLike(spec) && this.loadsDefault(ts, node)) {
          const file = this.resolveModule(source.fileName, spec.text);
          if (file) evidence.defaultLoads.add(file);
          else evidence.unresolvedDefaultLoads++;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(initializer);
  }

  /** The import() call is used for its default export: no `.then`, or `.then(m => m.default)`. */
  private static loadsDefault(ts: typeof TS, call: TS.CallExpression): boolean {
    const access = call.parent;
    if (!ts.isPropertyAccessExpression(access) || access.name.text !== 'then') return true;
    return access.parent.getText().includes('.default');
  }

  private static resolveModule(fromFile: string, spec: string): string | null {
    if (!spec.startsWith('.')) return null;
    const base = PathOperations.resolve(PathOperations.getDirectory(fromFile), spec);
    for (const candidate of [`${base}.ts`, PathOperations.join(base, 'index.ts'), base]) {
      if (FileUtils.isFile(candidate)) return PathOperations.normalize(candidate);
    }
    return null;
  }

  private static recordUse(
    context: LawCheckContext,
    source: TsxSource,
    node: TS.Identifier,
    evidence: Evidence
  ): void {
    const ts = source.ts;
    const parent = node.parent;
    const where = `${AngularComponents.relative(context, source.fileName)}:${source.lineOf(node)}`;
    const kind = this.useKind(ts, node, parent);
    if (kind === 'created') evidence.created.add(node.text);
    if (kind === 'composed' && !evidence.composed.has(node.text)) evidence.composed.set(node.text, where);
    if (kind === 'value' && !evidence.byValue.has(node.text)) evidence.byValue.set(node.text, where);
  }

  /** What one occurrence of a hook class's name means; null when it is not a value use. */
  private static useKind(
    ts: typeof TS,
    node: TS.Identifier,
    parent: TS.Node
  ): 'created' | 'composed' | 'value' | null {
    if (this.isDeclarationOrType(ts, node, parent)) return null;
    if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
      return this.insideKey(ts, parent, 'loadComponent') ? 'created' : null;
    }
    if (ts.isShorthandPropertyAssignment(parent)) return 'value';
    if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
      return this.keyOf(ts, parent) === 'component' ? 'created' : 'value';
    }
    if (ts.isCallExpression(parent) && parent.arguments.includes(node as TS.Expression)) {
      return this.isNavCall(ts, parent) ? 'created' : 'value';
    }
    return this.inTemplateArray(ts, parent) ? 'composed' : 'value';
  }

  /** `nav.push(X)`, `nav.setRoot(X)`, … — ion-nav creates what it is given. */
  private static isNavCall(ts: typeof TS, call: TS.CallExpression): boolean {
    const callee = call.expression;
    return ts.isPropertyAccessExpression(callee) && NAV_METHODS.has(callee.name.text);
  }

  /** An element of `imports: [...]` / `declarations: [...]` / `exports: [...]`. */
  private static inTemplateArray(ts: typeof TS, parent: TS.Node): boolean {
    if (!ts.isArrayLiteralExpression(parent) || !ts.isPropertyAssignment(parent.parent)) return false;
    const key = this.keyOf(ts, parent.parent);
    return key !== null && TEMPLATE_ARRAYS.has(key);
  }

  private static isDeclarationOrType(ts: typeof TS, node: TS.Identifier, parent: TS.Node): boolean {
    if ((ts.isClassDeclaration(parent) || ts.isClassExpression(parent)) && parent.name === node) return true;
    if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent) || ts.isImportClause(parent)) return true;
    if (ts.isExpressionWithTypeArguments(parent) || ts.isTypeReferenceNode(parent)) return true;
    // Any other node whose `name` this is — an interface, a variable, an object key — declares, not uses.
    const named = !ts.isShorthandPropertyAssignment(parent) && !ts.isPropertyAccessExpression(parent);
    if (named && (parent as { name?: TS.Node }).name === node) return true;
    return ts.isQualifiedName(parent) || ts.isTypeQueryNode(parent);
  }

  private static keyOf(ts: typeof TS, node: TS.PropertyAssignment): string | null {
    const name = node.name;
    return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
  }

  private static insideKey(ts: typeof TS, node: TS.Node, key: string): boolean {
    let current: TS.Node | undefined = node.parent;
    while (current && !ts.isSourceFile(current)) {
      if (ts.isPropertyAssignment(current) && this.keyOf(ts, current) === key) return true;
      current = current.parent;
    }
    return false;
  }
}

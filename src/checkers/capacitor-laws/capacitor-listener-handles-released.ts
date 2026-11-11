/**
 * Capacitor Listener Handles Released
 *
 * Every Capacitor plugin event returns a PluginListenerHandle, and only its
 * remove() — or the plugin's removeAllListeners() — ends the subscription.
 * The plugin lives as long as the WebView, so a listener registered by a
 * short-lived object keeps the object alive and keeps firing. Under
 * ion-router-outlet a page is created once per forward navigation and kept,
 * so a component that registers in its constructor or ngOnInit and drops the
 * handle adds one more live listener per instance. The timer, RxJS and
 * addEventListener cleanup laws do not see plugin listeners.
 *
 * Judged: calls in classes decorated @Component / @Directive / @Pipe, page
 * classes, and @Injectable classes that are not providedIn 'root' or
 * 'platform'. Root services, app initializers, InjectionToken factories and
 * module functions live as long as the app — the plugin's own lifetime.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { relative } from '../../utils/capacitor/capacitor-law-support';
import {
  bridgeSources,
  classDecorators,
  enclosing,
  listenerCalls,
  type ListenerCall,
  methodCalls,
  objectProperty,
} from '../../utils/capacitor/capacitor-sources';
import { IonicProject } from '../../utils/ionic/ionic-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

const SHORT_LIVED_DECORATORS = new Set(['Component', 'Directive', 'Pipe']);
const APP_LIFETIME_SCOPES = new Set(['root', 'platform']);
const TEARDOWN_METHODS = new Set(['ngOnDestroy', 'ionViewWillLeave', 'ionViewDidLeave']);
const TEARDOWN_PLACES = 'ngOnDestroy, DestroyRef.onDestroy, ionViewWillLeave or ionViewDidLeave';

/** What happens to the promise of a handle at the call site. */
export type HandleFate =
  | { kind: 'discarded' }
  | { kind: 'returned' }
  /** Kept under `name` (a variable, a property, an array it is pushed to), or null when unnamed. */
  | { kind: 'kept'; name: string | null };

export class CapacitorListenerHandlesReleasedLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Listener Handles Released';

  static check(context: LawCheckContext): LawResult {
    const { sources, unread } = bridgeSources(context);
    const violations = unread.map(
      reason => `${reason} — plugin listeners in these files would not be judged, so this law does not pass on them`
    );
    for (const source of sources) {
      const pageFile = IonicProject.isPage(source.fileName, source.text);
      for (const call of listenerCalls(source)) {
        const violation = this.judge(context, source, call, pageFile);
        if (violation) violations.push(violation);
      }
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'PERFORMANCE',
      [
        'Register plugin listeners in a root service or app initializer and expose them as an Observable or signal',
        'If a component must register one, keep the handle and remove() it in DestroyRef.onDestroy (or ionViewWillLeave for per-visit listeners)',
      ],
      context
    );
  }

  private static judge(
    context: LawCheckContext,
    source: TsxSource,
    call: ListenerCall,
    pageFile: boolean
  ): string | null {
    const ts = source.ts;
    const owner = enclosing(call.call, (node): node is TS.ClassLikeDeclaration => ts.isClassLike(node));
    if (!owner) return null; // a module function or token factory: app lifetime
    const kind = this.shortLived(source, owner, pageFile);
    if (!kind) return null;
    const fate = this.fate(source, call.call);
    if (fate.kind === 'returned') return null; // the caller owns the handle
    const where = `${relative(context, source.fileName)}:${call.line}`;
    const subject = `${call.receiver}.addListener('${call.event}') in ${owner.name?.text ?? 'an anonymous class'} (${kind})`;
    if (fate.kind === 'discarded') {
      return `${where}: ${subject} drops its PluginListenerHandle — the plugin outlives the ${kind}, so every new instance adds one more live listener (handlers run N times, the instance leaks). Keep the handle and remove() it in ${TEARDOWN_PLACES}`;
    }
    if (this.released(source, owner, fate.name)) return null;
    const held = fate.name ? ` as '${fate.name}'` : '';
    return `${where}: ${subject} keeps its handle${held} but never removes it in ${TEARDOWN_PLACES} — the listener outlives the ${kind}. Call remove() on it there (or removeAllListeners())`;
  }

  /** Why the class is short-lived ('component', 'page', …), or null when it lives as long as the app. */
  private static shortLived(source: TsxSource, owner: TS.ClassLikeDeclaration, pageFile: boolean): string | null {
    const decorators = classDecorators(source, owner);
    const decorated = decorators.find(decorator => SHORT_LIVED_DECORATORS.has(decorator.name));
    if (decorated) return pageFile && decorated.name === 'Component' ? 'page' : decorated.name.toLowerCase();
    const injectable = decorators.find(decorator => decorator.name === 'Injectable');
    if (injectable) {
      const scope = objectProperty(source, injectable.argument, 'providedIn');
      const value = scope && source.ts.isStringLiteralLike(scope) ? scope.text : null;
      return value && APP_LIFETIME_SCOPES.has(value) ? null : 'service not provided in root';
    }
    return pageFile ? 'page' : null;
  }

  /** Follow the call's value up through await, parentheses and `void` to where it lands. */
  static fate(source: TsxSource, call: TS.CallExpression): HandleFate {
    const ts = source.ts;
    let node: TS.Node = call;
    while (ts.isAwaitExpression(node.parent) || ts.isParenthesizedExpression(node.parent)) node = node.parent;
    const parent = node.parent;
    if (ts.isExpressionStatement(parent) || ts.isVoidExpression(parent)) return { kind: 'discarded' };
    if (ts.isReturnStatement(parent) || (ts.isArrowFunction(parent) && parent.body === node)) {
      return { kind: 'returned' };
    }
    if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      return { kind: 'kept', name: this.nameOf(source, parent.left) };
    }
    if ((ts.isVariableDeclaration(parent) || ts.isPropertyDeclaration(parent)) && parent.initializer === node) {
      return { kind: 'kept', name: this.nameOf(source, parent.name) };
    }
    if (ts.isCallExpression(parent) && ts.isPropertyAccessExpression(parent.expression) && parent.expression.name.text === 'push') {
      return { kind: 'kept', name: this.nameOf(source, parent.expression.expression) };
    }
    return { kind: 'kept', name: null };
  }

  private static nameOf(source: TsxSource, node: TS.Node): string | null {
    const ts = source.ts;
    if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) return node.text;
    if (ts.isPropertyAccessExpression(node)) return node.name.text;
    return null;
  }

  /** Is there a remove() of the handle, or a removeAllListeners(), in a teardown of the class? */
  private static released(source: TsxSource, owner: TS.ClassLikeDeclaration, name: string | null): boolean {
    return this.teardowns(source, owner).some(region => {
      if (methodCalls(source, region, 'removeAllListeners').length > 0) return true;
      if (methodCalls(source, region, 'remove').length === 0) return false;
      return name === null || this.mentions(source, region, name);
    });
  }

  /** The bodies that run when the instance ends: the teardown hooks and DestroyRef.onDestroy callbacks. */
  private static teardowns(source: TsxSource, owner: TS.ClassLikeDeclaration): TS.Node[] {
    const ts = source.ts;
    const regions: TS.Node[] = [];
    for (const member of owner.members) {
      if (ts.isMethodDeclaration(member) && member.body && ts.isIdentifier(member.name) && TEARDOWN_METHODS.has(member.name.text)) {
        regions.push(member.body);
      }
    }
    for (const call of methodCalls(source, owner, 'onDestroy')) {
      const [callback] = call.arguments;
      if (callback) regions.push(callback);
    }
    return regions;
  }

  private static mentions(source: TsxSource, region: TS.Node, name: string): boolean {
    const ts = source.ts;
    let found = false;
    const visit = (node: TS.Node): void => {
      if ((ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) && node.text === name) found = true;
      if (!found) ts.forEachChild(node, visit);
    };
    visit(region);
    return found;
  }
}

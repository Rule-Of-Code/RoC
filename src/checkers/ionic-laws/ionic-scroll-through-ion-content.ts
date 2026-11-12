/**
 * Ionic Scroll Through Ion Content
 *
 * Under Ionic the page does not scroll: ion-content scrolls a `div.inner-scroll`
 * in its shadow root, and binds that div's scroll listener only when
 * `scrollEvents` is true (@ionic/core content.js: `scrollEvents = false`,
 * `onScroll: this.scrollEvents ? … : undefined`). ionScroll, ionScrollStart
 * and ionScrollEnd are all emitted from that listener. So:
 *
 * 1. `(ionScroll)` / `(ionScrollStart)` / `(ionScrollEnd)` on an
 *    `<ion-content>` whose opening tag does not set `scrollEvents` never fires;
 * 2. `window.scrollTo`, `window.scrollY`, `document.scrollingElement`,
 *    `@HostListener('window:scroll')`, `fromEvent(window, 'scroll')` in a
 *    component that has an ion-content, or is rendered inside one, read 0 and
 *    never fire — while working in a plain Angular app and in jsdom.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AngularComponents, type AngularComponent } from '../../utils/ionic/angular-components';
import { HtmlTemplate, type TemplateElement } from '../../utils/ionic/html-template';
import { withNotes } from '../../utils/ionic/law-notes';
import { LawBase } from '../law-base';

const SCROLL_EVENTS = ['ionScroll', 'ionScrollStart', 'ionScrollEnd'];
const WINDOW_METHODS = new Set(['scrollTo', 'scrollBy', 'scroll']);
const WINDOW_READS = new Set(['scrollY', 'scrollX', 'pageYOffset', 'pageXOffset']);
const WINDOW_NAMES = new Set(['window', 'globalThis', 'self']);
const ION_CONTENT = 'ion-content';

export class IonicScrollThroughIonContentLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic Scroll Through Ion Content';

  static check(context: LawCheckContext): LawResult {
    const scan = AngularComponents.scan(context);
    const violations = [...scan.unread];
    const under = AngularComponents.underContent(scan.components);
    for (const component of scan.components) {
      violations.push(...this.unboundListeners(context, component));
      if (under.has(component)) violations.push(...this.windowScroll(context, component));
    }
    const result = this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        'Pair every (ionScroll|ionScrollStart|ionScrollEnd) with [scrollEvents]="true" on the same ion-content',
        'Read and set positions through IonContent (scrollToTop, scrollToPoint, getScrollElement), never through window',
      ],
      context
    );
    const templates = scan.components.filter(component => component.template).length;
    const contents = scan.components.some(c => c.elements.some(element => element.tag === ION_CONTENT));
    return withNotes(
      result,
      contents ? [] : [`no <ion-content> in the ${templates} component template(s) read — the window is the scroller here, nothing to judge`]
    );
  }

  /** Scroll listeners on an `<ion-content>` whose own opening tag does not enable them. */
  static unboundListeners(context: LawCheckContext, component: AngularComponent): string[] {
    const file = AngularComponents.relative(context, component.template?.file ?? component.file);
    return component.elements
      .filter(element => element.tag === ION_CONTENT)
      .flatMap(element => {
        const events = SCROLL_EVENTS.filter(event => HtmlTemplate.listens(element, event));
        if (events.length === 0 || this.enablesEvents(element)) return [];
        return [
          `${file}:${element.line}: <ion-content (${events.join(', ')})> without [scrollEvents]="true" — ion-content binds its scroll listener only when scrollEvents is true (default false), so the handler never runs`,
        ];
      });
  }

  private static enablesEvents(element: TemplateElement): boolean {
    const attribute = HtmlTemplate.bound(element, 'scrollEvents');
    if (!attribute) return false;
    const value = (attribute.value ?? '').trim().replace(/^'|'$/g, '');
    return value !== 'false';
  }

  /** Window-level scroll use in a component that lives in an ion-content. */
  static windowScroll(context: LawCheckContext, component: AngularComponent): string[] {
    const source = component.source;
    const ts = source.ts;
    const where = AngularComponents.relative(context, component.file);
    const found: string[] = [];
    const visit = (node: TS.Node): void => {
      const use = this.windowUse(ts, node);
      if (use) {
        found.push(
          `${where}:${source.lineOf(node)}: ${component.className} uses ${use} but renders inside ion-content — the window does not scroll under Ionic, so it reads 0 / never fires. Use IonContent (scrollToTop, scrollToPoint, getScrollElement)`
        );
      }
      ts.forEachChild(node, visit);
    };
    visit(component.node);
    return found;
  }

  private static windowUse(ts: typeof TS, node: TS.Node): string | null {
    if (ts.isPropertyAccessExpression(node)) return this.windowAccess(ts, node);
    if (ts.isCallExpression(node)) return this.scrollSubscription(ts, node);
    if (ts.isDecorator(node)) return this.hostListener(ts, node);
    return null;
  }

  /** `window.scrollTo(…)`, `window.scrollY`, `document.scrollingElement`. */
  private static windowAccess(ts: typeof TS, node: TS.PropertyAccessExpression): string | null {
    const target = ts.isIdentifier(node.expression) ? node.expression.text : '';
    const name = node.name.text;
    if (WINDOW_NAMES.has(target) && (WINDOW_METHODS.has(name) || WINDOW_READS.has(name))) {
      return `${target}.${name}`;
    }
    if (target === 'document' && name === 'scrollingElement') return 'document.scrollingElement';
    return null;
  }

  /** `fromEvent(window, 'scroll')` and `window.addEventListener('scroll', …)`. */
  private static scrollSubscription(ts: typeof TS, node: TS.CallExpression): string | null {
    const [first, second] = node.arguments;
    const callee = node.expression;
    const isWindow = (e: TS.Node | undefined): boolean =>
      Boolean(e && ts.isIdentifier(e) && WINDOW_NAMES.has(e.text));
    const isScroll = (e: TS.Node | undefined): boolean =>
      Boolean(e && ts.isStringLiteralLike(e) && e.text === 'scroll');
    if (ts.isIdentifier(callee) && callee.text === 'fromEvent' && isWindow(first) && isScroll(second)) {
      return "fromEvent(window, 'scroll')";
    }
    const listens =
      ts.isPropertyAccessExpression(callee) &&
      callee.name.text === 'addEventListener' &&
      isWindow(callee.expression) &&
      isScroll(first);
    return listens ? "window.addEventListener('scroll')" : null;
  }

  /** `@HostListener('window:scroll')`. */
  private static hostListener(ts: typeof TS, node: TS.Decorator): string | null {
    const call = node.expression;
    if (!ts.isCallExpression(call) || !ts.isIdentifier(call.expression)) return null;
    if (call.expression.text !== 'HostListener') return null;
    const arg = call.arguments[0];
    return arg && ts.isStringLiteralLike(arg) && arg.text.replace(/\s/g, '') === 'window:scroll'
      ? "@HostListener('window:scroll')"
      : null;
  }
}

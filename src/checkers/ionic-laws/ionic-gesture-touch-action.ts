/**
 * Ionic Gesture Touch Action
 *
 * ion-content's scroller declares `touch-action: pan-x pan-y pinch-zoom`
 * (@ionic/core content.css, `.inner-scroll`). With pan-x allowed, the browser
 * takes a horizontal finger drag as its own pan and ends the pointer with
 * `pointercancel`: `pointerup` never arrives and a swipe built from raw
 * pointer events never completes. With a mouse it works, and a jsdom test
 * that dispatches MouseEvent('pointerup') cannot tell. The fix narrows
 * touch-action on the element, its host, or `ion-content::part(scroll)`.
 *
 * A component is judged when it binds `pointerdown` AND `pointermove` or
 * `pointerup` (template `(pointer…)`, `host: { '(pointer…)' }`,
 * `@HostListener('pointer…')`, `addEventListener` / `fromEvent` /
 * `renderer.listen` with a pointer event) and it has an ion-content or is
 * rendered inside one. Using createGesture elsewhere in the component does not
 * excuse its raw pointer handlers: they are still raw, so it is not credited.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AngularComponents, type AngularComponent } from '../../utils/ionic/angular-components';
import { CssRules, projectStyleSheets, type CssRule } from '../../utils/ionic/css-rules';
import { HtmlTemplate, type TemplateElement } from '../../utils/ionic/html-template';
import { LawBase } from '../law-base';

const DOWN = 'pointerdown';
const FOLLOW_UPS = new Set(['pointermove', 'pointerup']);
/** Calls whose SECOND argument is the event: fromEvent(target, e), renderer.listen(target, e, fn). */
const TARGET_FIRST_CALLS = new Set(['fromEvent', 'listen']);

interface Bindings {
  events: Set<string>;
  /** Line of the first pointerdown binding (in the template file or the .ts file). */
  line: number;
  file: string;
  /** Template elements that bind a pointer event: their tag and classes may carry the rule. */
  elements: TemplateElement[];
}

export class IonicGestureTouchActionLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic Gesture Touch Action';

  static check(context: LawCheckContext): LawResult {
    const scan = AngularComponents.scan(context);
    const styles = projectStyleSheets(context, scan.components.flatMap(c => c.styles));
    const violations = [...scan.unread, ...styles.unread];
    const allRules = styles.sheets.flatMap(sheet => sheet.rules);
    const under = AngularComponents.underContent(scan.components);
    for (const component of scan.components) {
      if (!under.has(component)) continue;
      const bindings = this.bindings(component);
      const follows = [...bindings.events].some(event => FOLLOW_UPS.has(event));
      if (!bindings.events.has(DOWN) || !follows) continue;
      if (this.touchActionSet(component, bindings, allRules)) continue;
      const events = [...bindings.events].sort().join(' + ');
      violations.push(
        `${AngularComponents.relative(context, bindings.file)}:${bindings.line}: ${component.className} builds a gesture from ${events} inside ion-content, and no touch-action is set on its element, :host or ion-content::part(scroll) — the scroller allows pan-x, so a finger drag ends in pointercancel (a mouse works). Set touch-action (pan-y for a horizontal swipe), or use createGesture`
      );
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        "Build gestures with Ionic's createGesture / GestureController, or set touch-action (pan-y for horizontal swipes) on ion-content::part(scroll) of the hosting page",
        'Test the gesture with touch input, not MouseEvent',
      ],
      context
    );
  }

  /** Every pointer event the component binds, from its template, host metadata and class code. */
  static bindings(component: AngularComponent): Bindings {
    const found: Bindings = { events: new Set(), line: component.line, file: component.file, elements: [] };
    let downLine: { line: number; file: string } | null = null;
    for (const element of component.elements) {
      const events = element.attributes
        .map(attribute => /^\((?:[\w-]+:)?(pointer\w+)\)$/.exec(attribute.name)?.[1] ?? '')
        .filter(Boolean);
      if (events.length === 0) continue;
      found.elements.push(element);
      events.forEach(event => found.events.add(event));
      if (!downLine && events.includes(DOWN)) downLine = { line: element.line, file: component.template?.file ?? component.file };
    }
    for (const key of component.hostKeys) {
      const event = /^\((?:[\w-]+:)?(pointer\w+)\)$/.exec(key)?.[1];
      if (event) found.events.add(event);
    }
    const codeDown = this.codeBindings(component, found.events);
    downLine ??= codeDown;
    if (downLine) {
      found.line = downLine.line;
      found.file = downLine.file;
    }
    return found;
  }

  /** Pointer events bound in the class body; returns where pointerdown was bound, if there. */
  private static codeBindings(
    component: AngularComponent,
    events: Set<string>
  ): { line: number; file: string } | null {
    const source = component.source;
    const ts = source.ts;
    let down: { line: number; file: string } | null = null;
    const visit = (node: TS.Node): void => {
      const event = this.codeEvent(ts, node);
      if (event) {
        events.add(event);
        if (event === DOWN && !down) down = { line: source.lineOf(node), file: component.file };
      }
      ts.forEachChild(node, visit);
    };
    visit(component.node);
    return down;
  }

  /** The pointer event a call or decorator binds, or null. */
  private static codeEvent(ts: typeof TS, node: TS.Node): string | null {
    if (!ts.isCallExpression(node)) return null;
    const callee = node.expression;
    const name = ts.isIdentifier(callee)
      ? callee.text
      : ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : '';
    const literal = (index: number): string => {
      const arg = node.arguments[index];
      return arg && ts.isStringLiteralLike(arg) ? arg.text : '';
    };
    let event = '';
    if (name === 'HostListener' || name === 'addEventListener') event = literal(0);
    else if (TARGET_FIRST_CALLS.has(name)) event = literal(1);
    const bare = event.replace(/^[\w-]+:/, '');
    return /^pointer\w+$/.test(bare) ? bare : null;
  }

  /** A touch-action other than auto on the element, its host, or ion-content's scroll part. */
  private static touchActionSet(component: AngularComponent, bindings: Bindings, allRules: CssRule[]): boolean {
    const own = component.styles.flatMap(style => CssRules.parse(style.text, style.file, style.firstLine));
    const elementClasses = bindings.elements.flatMap(element => HtmlTemplate.classes(element));
    const elementTags = bindings.elements.map(element => element.tag);
    const ownMatch = (selector: string): boolean =>
      /:host\b|::part\(\s*scroll\s*\)/.test(selector) || this.names(selector, elementClasses, elementTags);
    const globalMatch = (selector: string): boolean =>
      /::part\(\s*scroll\s*\)/.test(selector) ||
      this.names(selector, elementClasses, [...component.selectors, ...elementTags]);
    return own.some(rule => this.setsTouchAction(rule) && ownMatch(rule.selector)) ||
      allRules.some(rule => this.setsTouchAction(rule) && globalMatch(rule.selector));
  }

  private static names(selector: string, classes: string[], tags: string[]): boolean {
    if (CssRules.allClasses(selector).some(name => classes.includes(name))) return true;
    return tags.some(tag => {
      const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(?:^|[\\s>+~,(])${escaped}(?![\\w-])`, 'i').test(selector);
    });
  }

  private static setsTouchAction(rule: CssRule): boolean {
    return rule.declarations.some(
      d => d.property === 'touch-action' && !/^auto\b/i.test(d.value.trim())
    );
  }
}

/**
 * Ionic Fixed Content In Fixed Slot
 *
 * ion-content projects its default slot INSIDE the shadow `div.inner-scroll`
 * and renders a second slot, `fixed`, outside it (@ionic/core content.js:
 * `<slot name="fixed">` beside the scroller; "Should be used for fixed content
 * that should not scroll"). ion-fab's own `edge` doc ends "Should be used with
 * a `fixed` slot." So a floating action, a toast or a sticky call to action
 * placed as an ordinary child scrolls away with the content, or anchors to the
 * content's bottom rather than the screen's — and at the developer's own
 * viewport, on a short screen, it looks right.
 *
 * - `<ion-fab>` inside an ion-content scroller (not through `slot="fixed"`):
 *   reported always.
 * - any other element inside a scroller whose class matches the floating-UI
 *   pattern (`thresholds.ionic.fixedContentPattern`, default
 *   toast|snackbar|fab|floating|sticky-cta) AND is positioned by the
 *   project's CSS (`position: fixed|absolute` with `top`/`bottom`/`inset`):
 *   reported as a heuristic.
 *
 * "Inside a scroller" follows components: an element in a child component's
 * template is inside when the child's host is placed inside one.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AngularComponents, type AngularComponent } from '../../utils/ionic/angular-components';
import { projectStyleSheets, CssRules, type CssRule, type StyleSheet } from '../../utils/ionic/css-rules';
import { HtmlTemplate, type TemplateElement } from '../../utils/ionic/html-template';
import { LawBase } from '../law-base';

export const DEFAULT_FIXED_CONTENT_PATTERN = 'toast|snackbar|fab|floating|sticky-cta';
/** Overlays render outside the page; they are the fix, not the defect. */
const OVERLAYS = new Set(['ion-toast', 'ion-modal', 'ion-popover', 'ion-alert', 'ion-action-sheet', 'ion-loading']);

export class IonicFixedContentInFixedSlotLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic Fixed Content In Fixed Slot';

  static check(context: LawCheckContext): LawResult {
    const scan = AngularComponents.scan(context);
    const styles = projectStyleSheets(context, scan.components.flatMap(c => c.styles));
    const violations = [...scan.unread, ...styles.unread];
    const pattern = this.pattern(context, violations);
    const floating = this.floatingClasses(context, styles.sheets);
    const inside = AngularComponents.insideScroller(scan.components);
    for (const component of scan.components) {
      violations.push(...this.judge(context, component, inside.has(component), pattern, floating));
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        'Put floating UI as a direct child of ion-content with slot="fixed", or use ToastController / ion-toast',
        'Measure visibility against the viewport at several sizes, not by querySelector',
      ],
      context
    );
  }

  /** The configured floating-UI pattern; an invalid one is a violation, never a silent default. */
  private static pattern(context: LawCheckContext, violations: string[]): RegExp | null {
    const configured = context.config.thresholds?.ionic?.fixedContentPattern;
    const source = configured ?? DEFAULT_FIXED_CONTENT_PATTERN;
    try {
      return new RegExp(source, 'i');
    } catch {
      violations.push(
        `thresholds.ionic.fixedContentPattern '${source}' is not a valid regular expression — the floating-element check did NOT run`
      );
      return null;
    }
  }

  /** Class → where the project's CSS positions it as floating (fixed/absolute plus an edge). */
  static floatingClasses(context: LawCheckContext, sheets: StyleSheet[]): Map<string, string> {
    const floating = new Map<string, string>();
    for (const sheet of sheets) {
      for (const rule of sheet.rules.filter(r => this.positionsFloating(r))) {
        for (const name of CssRules.subjectClasses(rule.selector)) {
          if (!floating.has(name)) floating.set(name, `${AngularComponents.relative(context, sheet.file)}:${rule.line}`);
        }
      }
    }
    return floating;
  }

  /** `position: fixed|absolute` together with an edge offset. */
  private static positionsFloating(rule: CssRule): boolean {
    const position = rule.declarations.find(d => d.property === 'position')?.value.toLowerCase() ?? '';
    if (!/^(?:fixed|absolute)\b/.test(position)) return false;
    return rule.declarations.some(d => /^(?:top|bottom|inset|inset-block(?:-start|-end)?)$/.test(d.property));
  }

  private static judge(
    context: LawCheckContext,
    component: AngularComponent,
    hostInside: boolean,
    pattern: RegExp | null,
    floating: Map<string, string>
  ): string[] {
    const file = AngularComponents.relative(context, component.template?.file ?? component.file);
    const found: string[] = [];
    for (const element of component.elements) {
      if (OVERLAYS.has(element.tag)) continue;
      if (!hostInside && !HtmlTemplate.insideScroller(element)) continue;
      if (element.tag === 'ion-fab') {
        found.push(`${file}:${element.line}: ${this.fabMessage(element, hostInside)}`);
        continue;
      }
      const floats = this.floatingClass(element, pattern, floating);
      if (floats) {
        found.push(
          `${file}:${element.line}: <${element.tag} class="${floats.name}"> is positioned as floating UI (${floats.at}) but sits inside ion-content's scroller — it scrolls away or anchors to the content, not the screen. Make it a direct child of ion-content with slot="fixed", or use ToastController`
        );
      }
    }
    return found;
  }

  private static fabMessage(element: TemplateElement, hostInside: boolean): string {
    const parent = HtmlTemplate.domParent(element);
    const where =
      parent?.tag === 'ion-content'
        ? 'a direct child of <ion-content> without slot="fixed"'
        : hostInside && !HtmlTemplate.insideScroller(element)
          ? "in a component rendered inside ion-content's scroller"
          : "nested inside ion-content's scroller";
    return `<ion-fab> is ${where} — it scrolls with the content. Ionic: "Should be used with a fixed slot"; make it a direct child of ion-content with slot="fixed"`;
  }

  private static floatingClass(
    element: TemplateElement,
    pattern: RegExp | null,
    floating: Map<string, string>
  ): { name: string; at: string } | null {
    if (!pattern) return null;
    for (const name of HtmlTemplate.classes(element)) {
      const at = floating.get(name);
      if (at && pattern.test(name)) return { name, at };
    }
    return null;
  }
}

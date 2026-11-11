/**
 * Disclosure Control ARIA State Law (advisory)
 * A button that shows/hides a panel or menu must expose `aria-expanded` so screen
 * readers announce the collapsed/expanded state. This is a low-precision heuristic
 * (advisory): it only flags buttons whose (click) handler clearly toggles
 * disclosure (toggle/expand/open/menu/dropdown/collapse) and that lack the state.
 *
 * Ionic: `ion-button` and `ion-item button` are read as well. Neither keeps a
 * bound aria-expanded on the control a screen reader focuses (read in
 * @ionic/core 8.8.17): ion-button copies the aria-* attributes to its inner
 * <button> once, when it loads, removes them from the host, and afterwards
 * watches only aria-checked, aria-label and aria-pressed (button.js:136 and
 * its `watchers`); ion-item copies only aria-label (item.js:109). So on those
 * two an aria-expanded is reported too: the announced state goes stale after
 * the first toggle. A toggle inside `ion-accordion` is exempt — the accordion
 * sets aria-expanded on its own header button (accordion.js:155).
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AccessibilityLawBase } from './accessibility-law-base';
import { TemplateMarkup, type MarkupElement } from './template-markup';

/** Keywords in a click handler that strongly imply a disclosure toggle. */
export const DISCLOSURE_INTENT = /toggle|expand|collaps|dropdown|menu|disclos|isopen|open/i;

export class DisclosureControlAriaStateLaw extends AccessibilityLawBase {
  static check(context: LawCheckContext): LawResult {
    const { templates, unread } = this.readTemplates(context);
    const violations: string[] = [...unread];

    for (const template of templates) {
      const { missing, ionicStale } = this.findings(template.document.elements);
      if (missing.length > 0) {
        violations.push(
          `${template.relative}: ${missing.length} disclosure button(s) toggling a panel/menu without [attr.aria-expanded] at ${this.lines(missing)} — add it so the state is announced.`
        );
      }
      if (ionicStale.length > 0) {
        violations.push(
          `${template.relative}: aria-expanded on ${ionicStale.join(', ')} does not follow the state — ion-button copies it to its inner <button> once at load and does not watch it; ion-item copies only aria-label. Use a native <button [attr.aria-expanded]> or ion-accordion.`
        );
      }
    }

    return this.createResult(
      violations,
      'Disclosure Control ARIA State',
      [
        'Bind [attr.aria-expanded] to the open/closed signal on the toggle button',
        'Add aria-haspopup / role="menu" when it opens a menu',
        'Ionic: use ion-accordion, or a native <button> for the toggle',
      ],
      context
    );
  }

  /** Toggles without the state, and Ionic toggles whose state cannot follow. */
  private static findings(elements: MarkupElement[]): {
    missing: number[];
    ionicStale: string[];
  } {
    const missing: number[] = [];
    const ionicStale: string[] = [];
    for (const element of elements) {
      if (!this.isDisclosureToggle(element)) continue;
      const ionic = this.isIonicButton(element);
      if (ionic && TemplateMarkup.ancestor(element, ['ion-accordion'])) continue;
      const hasExpanded = TemplateMarkup.has(element, 'aria-expanded');
      if (ionic && hasExpanded) {
        ionicStale.push(`<${element.tag}> line ${element.line}`);
      } else if (!hasExpanded) {
        missing.push(element.line);
      }
    }
    return { missing, ionicStale };
  }

  private static isIonicButton(element: MarkupElement): boolean {
    return element.tag === 'ion-button' || element.tag === 'ion-item';
  }

  /** A button whose (click) handler reads as a disclosure toggle. */
  private static isDisclosureToggle(element: MarkupElement): boolean {
    const isButton =
      element.tag === 'button' ||
      element.tag === 'ion-button' ||
      (element.tag === 'ion-item' && this.isClickableItem(element));
    if (!isButton) return false;
    const click = element.attributes.find(a => a.name === '(click)');
    if (!click || !DISCLOSURE_INTENT.test(click.value ?? '')) return false;
    // A button that exposes aria-pressed is a TOGGLE button (a theme switch,
    // an active filter chip), not a disclosure: aria-pressed is the correct
    // ARIA for it and aria-expanded would be wrong.
    return !TemplateMarkup.has(element, 'aria-pressed');
  }

  /** `<ion-item button>` or `[button]="…"` (anything but a literal false). */
  private static isClickableItem(element: MarkupElement): boolean {
    const written = TemplateMarkup.attribute(element, 'button');
    if (!written) return false;
    return (written.value ?? '').trim() !== 'false';
  }
}

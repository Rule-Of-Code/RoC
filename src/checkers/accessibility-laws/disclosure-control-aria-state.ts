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
import { jsxAttribute, type JsxElementInfo } from '../../utils/react/tsx-source';
import { AccessibilityLawBase } from './accessibility-law-base';
import { JsxSources, type JsxFile } from './jsx-sources';
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
    violations.push(...this.checkJsx(context));

    return this.createResult(
      violations,
      'Disclosure Control ARIA State',
      [
        'Bind [attr.aria-expanded] (JSX: aria-expanded={open}) to the open/closed state on the toggle button',
        'Add aria-haspopup / role="menu" when it opens a menu',
        'Ionic: use ion-accordion, or a native <button> for the toggle',
      ],
      context
    );
  }

  /**
   * JSX: a native `<button>` whose `onClick` handler text reads as a
   * disclosure toggle (`() => setOpen(o => !o)`, `toggleMenu`), without
   * aria-expanded (or aria-pressed, which makes it a toggle button). With a
   * `{...spread}` it is reported as not readable: the spread may carry the
   * state.
   */
  private static checkJsx(context: LawCheckContext): string[] {
    const jsx = JsxSources.read(context);
    const violations = [...jsx.unread];
    for (const file of jsx.files) {
      const toggles = file.elements.filter(element => this.isJsxToggleWithoutState(file, element));
      const missing = toggles.filter(el => !el.hasSpread).map(el => el.line);
      const spread = toggles.filter(el => el.hasSpread).map(el => el.line);
      if (missing.length > 0) {
        violations.push(
          `${file.relative}: ${missing.length} disclosure button(s) toggling a panel/menu without aria-expanded at ${this.lines(missing)} — bind aria-expanded={open} so the state is announced.`
        );
      }
      if (spread.length > 0) {
        violations.push(
          `${file.relative}: ${spread.length} disclosure button(s) with a {...spread} and no aria-expanded written at ${this.lines(spread)} — whether the spread sets it cannot be read; write aria-expanded here.`
        );
      }
    }
    return violations;
  }

  private static isJsxToggleWithoutState(file: JsxFile, element: JsxElementInfo): boolean {
    if (!JsxSources.isIntrinsic(element, 'button')) return false;
    const onClick = jsxAttribute(element, 'onClick');
    if (!onClick || !DISCLOSURE_INTENT.test(onClick.value)) return false;
    if (this.setsALiteral(file, element)) return false;
    return !JsxSources.has(element, 'aria-expanded') && !JsxSources.has(element, 'aria-pressed');
  }

  /**
   * `onClick={() => setOpen(false)}` closes, `() => setOpen(true)` opens:
   * a button that sets a literal does not toggle, so it is no disclosure
   * control (an opener of a dialog takes aria-haspopup, not aria-expanded).
   */
  private static setsALiteral(file: JsxFile, element: JsxElementInfo): boolean {
    const ts = file.source.ts;
    for (const property of element.node.attributes.properties) {
      if (!ts.isJsxAttribute(property) || property.name.getText(file.source.sourceFile) !== 'onClick') {
        continue;
      }
      const initializer = property.initializer;
      const handler = initializer && ts.isJsxExpression(initializer) ? initializer.expression : undefined;
      if (!handler || !ts.isArrowFunction(handler) || !ts.isCallExpression(handler.body)) return false;
      const args = handler.body.arguments;
      return (
        args.length === 1 &&
        (args[0]?.kind === ts.SyntaxKind.TrueKeyword || args[0]?.kind === ts.SyntaxKind.FalseKeyword)
      );
    }
    return false;
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

/**
 * Disclosure Control ARIA State Law (advisory)
 * A button that shows/hides a panel or menu must expose `aria-expanded` so screen
 * readers announce the collapsed/expanded state. This is a low-precision heuristic
 * (advisory): it only flags buttons whose (click) handler clearly toggles
 * disclosure (toggle/expand/open/menu/dropdown/collapse) and that lack the state.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AccessibilityLawBase } from './accessibility-law-base';

export class DisclosureControlAriaStateLaw extends AccessibilityLawBase {
  // (click) handler text that strongly implies a disclosure toggle. Keywords are
  // matched as substrings (no word boundary) so camelCase handlers like
  // `toggleMenu()` / `isOpen` are caught; this is an advisory heuristic.
  private static readonly DISCLOSURE_INTENT =
    /\(click\)\s*=\s*["'][^"']*(toggle|expand|collaps|dropdown|menu|disclos|isopen|open)/i;

  /**
   * A button that exposes `aria-pressed` is a TOGGLE button (a pressed/unpressed
   * control — a theme switch, an active filter chip), not a disclosure. `toggle`
   * in its handler trips the disclosure keyword, but aria-pressed is the correct
   * ARIA for it and aria-expanded would be wrong. So its presence exempts the
   * button — a true disclosure (nav burger) uses aria-expanded, and is unaffected.
   */
  private static hasAriaPressed(tag: string): boolean {
    return (
      /\baria-pressed\b/.test(tag) ||
      /\[\s*(?:attr\.)?aria-pressed\s*\]/.test(tag)
    );
  }

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    for (const file of this.findTemplateFiles(projectRoot, context)) {
      const html = this.stripHtmlComments(this.readTemplate(file));
      const flagged = this.openingTags(html, 'button').filter(
        tag =>
          this.DISCLOSURE_INTENT.test(tag) &&
          !/\baria-expanded\b/.test(tag) &&
          !/\[\s*(?:attr\.)?aria-expanded\s*\]/.test(tag) &&
          !this.hasAriaPressed(tag)
      );
      if (flagged.length > 0) {
        violations.push(
          `${this.relative(projectRoot, file)}: ${
            flagged.length
          } disclosure button(s) toggling a panel/menu without [attr.aria-expanded] — add it so the state is announced.`
        );
      }
    }

    return this.createResult(
      violations,
      'Disclosure Control ARIA State',
      [
        'Bind [attr.aria-expanded] to the open/closed signal on the toggle button',
        'Add aria-haspopup / role="menu" when it opens a menu',
      ],
      context
    );
  }
}

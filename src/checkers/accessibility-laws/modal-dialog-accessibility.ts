/**
 * Modal Dialog Accessibility Law
 * Without a focus trap, focus escapes behind an open modal — keyboard and
 * screen-reader users reach the background (often credential/control surfaces).
 * Every dialog must either use the accessible `<t3-modal>` component or declare
 * role="dialog"/"alertdialog" + aria-modal="true" + a CDK focus trap.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AccessibilityLawBase } from './accessibility-law-base';

export class ModalDialogAccessibilityLaw extends AccessibilityLawBase {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    for (const file of this.findTemplateFiles(projectRoot, context)) {
      const relativePath = this.relative(projectRoot, file);
      const html = this.stripHtmlComments(this.readTemplate(file));

      const isModal =
        /-modal\.component\.html$/i.test(file.replace(/\\/g, '/')) ||
        /\bfixed\s+inset-0\b/.test(html);
      if (!isModal) continue;

      // Using the accessible shared component satisfies the law.
      if (/<t3-modal\b/.test(html)) continue;

      const missing: string[] = [];
      if (!/\brole\s*=\s*["'](dialog|alertdialog)["']/.test(html)) {
        missing.push('role="dialog"');
      }
      if (!/\baria-modal\s*=\s*["']true["']/.test(html)) {
        missing.push('aria-modal="true"');
      }
      if (!/\bcdkTrapFocus\b/.test(html)) {
        missing.push('CDK focus-trap (cdkTrapFocus)');
      }
      if (missing.length > 0) {
        violations.push(
          `${relativePath}: dialog without ${missing.join(
            ' + '
          )} — add them or use <t3-modal>.`
        );
      }
    }

    return this.createResult(
      violations,
      'Modal Dialog Accessibility',
      [
        'Use <t3-modal> (accessible by construction), or',
        'Add role="dialog" + aria-modal="true" + cdkTrapFocus to the dialog container',
      ],
      context
    );
  }
}

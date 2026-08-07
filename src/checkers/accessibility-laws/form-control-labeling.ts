/**
 * Form Control Labeling Law
 * A `placeholder` is NOT an accessible name (it vanishes on input). Every form
 * control must have a real label: an `id` (paired with `<label for>`), an
 * `aria-label`, or an `aria-labelledby`. Credential inputs without one are
 * unusable with a screen reader.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AccessibilityLawBase } from './accessibility-law-base';

export class FormControlLabelingLaw extends AccessibilityLawBase {
  // Control types that carry their own semantics / need no text label.
  private static readonly EXEMPT_TYPES =
    /\btype\s*=\s*["'](hidden|submit|button|reset|image)["']/i;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    for (const file of this.findTemplateFiles(projectRoot, context)) {
      const html = this.stripHtmlComments(this.readTemplate(file));
      let count = 0;
      for (const tag of [
        ...this.openingTags(html, 'input'),
        ...this.openingTags(html, 'select'),
        ...this.openingTags(html, 'textarea'),
      ]) {
        if (this.EXEMPT_TYPES.test(tag)) continue;
        const hasName =
          /\bid\s*=/.test(tag) ||
          /\baria-label\s*=/.test(tag) ||
          /\[\s*(?:attr\.)?aria-label\s*\]\s*=/.test(tag) ||
          /\baria-labelledby\s*=/.test(tag);
        if (!hasName) count++;
      }
      if (count > 0) {
        violations.push(
          `${this.relative(projectRoot, file)}: ${count} form control(s) without an accessible label (id/aria-label/aria-labelledby) — placeholder does not count.`
        );
      }
    }

    return this.createResult(
      violations,
      'Form Control Labeling',
      [
        'Associate a <label for> via id, or add aria-label / aria-labelledby',
        'Do not rely on placeholder as the accessible name',
      ],
      context
    );
  }
}

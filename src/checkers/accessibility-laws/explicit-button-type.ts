/**
 * Explicit Button Type Law
 * A `<button>` without an explicit `type` defaults to `type="submit"` — a latent
 * bug waiting for the day the button lands inside a `<form>`. Every native button
 * must declare its type (`button`/`submit`/`reset`) statically or via binding.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AccessibilityLawBase } from './accessibility-law-base';

export class ExplicitButtonTypeLaw extends AccessibilityLawBase {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    for (const file of this.findTemplateFiles(projectRoot, context)) {
      const html = this.stripHtmlComments(this.readTemplate(file));
      const missing = this.openingTags(html, 'button').filter(
        tag =>
          !/\btype\s*=/.test(tag) && // static type="…"
          !/\[\s*(?:attr\.)?type\s*\]\s*=/.test(tag) // [type]/[attr.type] binding
      );
      if (missing.length > 0) {
        violations.push(
          `${this.relative(projectRoot, file)}: ${
            missing.length
          } <button> without an explicit type (defaults to submit) — add type="button" (or submit/reset).`
        );
      }
    }

    return this.createResult(
      violations,
      'Explicit Button Type',
      [
        'Add type="button" to every non-submit <button>',
        'Or bind it: [type]="…" / [attr.type]="…"',
      ],
      context
    );
  }
}

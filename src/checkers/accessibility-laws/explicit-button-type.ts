/**
 * Explicit Button Type Law
 * A `<button>` without an explicit `type` defaults to `type="submit"` — a latent
 * bug waiting for the day the button lands inside a `<form>`. Every native button
 * must declare its type (`button`/`submit`/`reset`) statically or via binding.
 *
 * `ion-button` and `ion-fab-button` are not read: both default their `type`
 * property to "button" (@ionic/core 8.8.17 button.js:51, fab-button.js:48), so
 * the latent submit this law guards against does not exist for them.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AccessibilityLawBase } from './accessibility-law-base';
import { TemplateMarkup } from './template-markup';

export class ExplicitButtonTypeLaw extends AccessibilityLawBase {
  static check(context: LawCheckContext): LawResult {
    const { templates, unread } = this.readTemplates(context);
    const violations: string[] = [...unread];

    for (const template of templates) {
      const missing = template.document.elements
        .filter(el => el.tag === 'button' && !TemplateMarkup.has(el, 'type'))
        .map(el => el.line);
      if (missing.length > 0) {
        violations.push(
          `${template.relative}: ${missing.length} <button> without an explicit type (defaults to submit) at ${this.lines(missing)} — add type="button" (or submit/reset).`
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

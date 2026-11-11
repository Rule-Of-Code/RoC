/**
 * Explicit Button Type Law
 * A `<button>` without an explicit `type` defaults to `type="submit"` — a latent
 * bug waiting for the day the button lands inside a `<form>`. Every native button
 * must declare its type (`button`/`submit`/`reset`) statically or via binding.
 *
 * Read in templates (.html) and in JSX (.tsx/.jsx). A JSX `<button {...props}>`
 * with no `type` written is reported as not readable: the spread may set the
 * type or not, and this file cannot say which.
 *
 * `ion-button` and `ion-fab-button` are not read: both default their `type`
 * property to "button" (@ionic/core 8.8.17 button.js:51, fab-button.js:48), so
 * the latent submit this law guards against does not exist for them.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AccessibilityLawBase } from './accessibility-law-base';
import { JsxSources } from './jsx-sources';
import { TemplateMarkup } from './template-markup';

const DEFAULTS_TO_SUBMIT = 'defaults to submit';

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
          `${template.relative}: ${missing.length} <button> without an explicit type (${DEFAULTS_TO_SUBMIT}) at ${this.lines(missing)} — add type="button" (or submit/reset).`
        );
      }
    }
    violations.push(...this.checkJsx(context));

    return this.createResult(
      violations,
      'Explicit Button Type',
      [
        'Add type="button" to every non-submit <button>',
        'Or bind it: [type]="…" / [attr.type]="…" (JSX: type={…})',
      ],
      context
    );
  }

  private static checkJsx(context: LawCheckContext): string[] {
    const jsx = JsxSources.read(context);
    const violations = [...jsx.unread];
    for (const file of jsx.files) {
      const untyped = file.elements.filter(
        el => JsxSources.isIntrinsic(el, 'button') && !JsxSources.has(el, 'type')
      );
      const missing = untyped.filter(el => !el.hasSpread).map(el => el.line);
      const spread = untyped.filter(el => el.hasSpread).map(el => el.line);
      if (missing.length > 0) {
        violations.push(
          `${file.relative}: ${missing.length} <button> without an explicit type (${DEFAULTS_TO_SUBMIT}) at ${this.lines(missing)} — add type="button" (or submit/reset).`
        );
      }
      if (spread.length > 0) {
        violations.push(
          `${file.relative}: ${spread.length} <button {...spread}> with no type written at ${this.lines(spread)} — whether the spread sets it cannot be read; write type explicitly.`
        );
      }
    }
    return violations;
  }
}

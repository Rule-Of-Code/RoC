/**
 * Modal Dialog Accessibility Law
 * Without a focus trap, focus escapes behind an open modal — keyboard and
 * screen-reader users reach the background (often credential/control surfaces).
 * Every dialog must declare role="dialog"/"alertdialog" + aria-modal="true" + a
 * focus trap, or be rendered by something that provides all three:
 *
 * - a component the project names in
 *   `thresholds.accessibility.accessibleDialogComponents` (its shared,
 *   accessible-by-construction modal);
 * - Ionic's `ion-modal` — inline, or a component shown through
 *   `ModalController.create` (see IonicDialogReader), unless that
 *   presentation turns `focusTrap` off;
 * - in JSX, a native `<dialog>` opened with `showModal()` (see ModalDialogJsx).
 *
 * The focus trap is `cdkTrapFocus`, or an element or attribute the project
 * names in `thresholds.accessibility.focusTrapTokens`.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AccessibilityLawBase, type ReadTemplate } from './accessibility-law-base';
import {
  IonicDialogReader,
  templateKey,
  type IonicDialogs,
  type IonicPresentation,
} from './ionic-dialogs';
import { CONFIG_KEY, DIALOG_ROLES, ModalDialogJsx } from './modal-dialog-jsx';
import { TemplateMarkup, type MarkupDocument, type MarkupElement } from './template-markup';

const ROLE_DIALOG = 'role="dialog"';
const ARIA_MODAL = 'aria-modal="true"';
const FOCUS_TRAP = 'a focus trap (cdkTrapFocus)';

export class ModalDialogAccessibilityLaw extends AccessibilityLawBase {
  static check(context: LawCheckContext): LawResult {
    const { templates, unread } = this.readTemplates(context);
    const violations: string[] = [...unread];
    const settings = context.config.thresholds?.accessibility;
    const accessible = (settings?.accessibleDialogComponents ?? []).map(name =>
      name.toLowerCase()
    );
    const trapTokens = ['cdktrapfocus', ...(settings?.focusTrapTokens ?? [])].map(name =>
      name.toLowerCase()
    );

    let ionic: IonicDialogs | null = null;
    const presentationOf = (template: ReadTemplate): IonicPresentation | undefined => {
      ionic ??= IonicDialogReader.read(context, this.byPath(templates));
      return ionic.presented.get(templateKey(template.file));
    };

    for (const template of templates) {
      if (!this.isModal(template)) continue;
      const elements = template.document.elements;
      if (elements.some(el => accessible.includes(el.tag))) continue;

      const missing = this.missing(elements, trapTokens);
      if (missing.length === 0) continue;
      const presentation = presentationOf(template);
      const stillMissing = presentation
        ? missing.filter(item => item === FOCUS_TRAP && !presentation.focusTrap)
        : missing;
      if (stillMissing.length === 0) continue;
      violations.push(this.message(template, stillMissing, presentation, ionic));
    }
    violations.push(
      ...ModalDialogJsx.check(context, settings?.accessibleDialogComponents ?? [], [
        ...(settings?.focusTrapTokens ?? []),
      ])
    );

    return this.createResult(
      violations,
      'Modal Dialog Accessibility',
      [
        `Name your accessible shared modal component in ${CONFIG_KEY}, or`,
        'Add role="dialog" + aria-modal="true" + cdkTrapFocus to the dialog container',
        'Ionic: present it with ion-modal / ModalController (do not turn focusTrap off)',
      ],
      context
    );
  }

  private static byPath(templates: ReadTemplate[]): Map<string, MarkupDocument> {
    return new Map(templates.map(t => [t.file, t.document]));
  }

  /** A modal: a `-modal.component.html` file, or an element classed `fixed inset-0`. */
  private static isModal(template: ReadTemplate): boolean {
    if (/-modal\.component\.html$/i.test(template.file.replace(/\\/g, '/'))) return true;
    return template.document.elements.some(el => {
      const classes = TemplateMarkup.classes(el);
      return classes.includes('fixed') && classes.includes('inset-0');
    });
  }

  private static missing(elements: MarkupElement[], trapTokens: string[]): string[] {
    const ionModals = elements.filter(el => el.tag === 'ion-modal');
    const inlineIonModal = ionModals.length > 0;
    const ionTrapOff = ionModals.some(el => {
      const trap = TemplateMarkup.attribute(el, 'focusTrap');
      return trap !== undefined && (trap.value ?? '').trim() === 'false';
    });
    const missing: string[] = [];
    const hasRole = elements.some(el =>
      DIALOG_ROLES.includes((TemplateMarkup.staticValue(el, 'role') ?? '').trim())
    );
    if (!hasRole && !inlineIonModal) missing.push(ROLE_DIALOG);
    const hasAriaModal = elements.some(el => {
      const written = TemplateMarkup.attribute(el, 'aria-modal');
      return written !== undefined && (written.value ?? '').trim() === 'true';
    });
    if (!hasAriaModal && !inlineIonModal) missing.push(ARIA_MODAL);
    const hasTrap = elements.some(
      el =>
        trapTokens.includes(el.tag) ||
        trapTokens.some(token => TemplateMarkup.has(el, token))
    );
    if (!hasTrap && (!inlineIonModal || ionTrapOff)) missing.push(FOCUS_TRAP);
    return missing;
  }

  private static message(
    template: ReadTemplate,
    missing: string[],
    presentation: IonicPresentation | undefined,
    ionic: IonicDialogs | null
  ): string {
    if (presentation) {
      return `${template.relative}: presented by ${presentation.via} with focusTrap set to false and no focus trap of its own — keep ion-modal's focus trap or add cdkTrapFocus.`;
    }
    const unreadNote =
      ionic && ionic.unread.length > 0
        ? ` (whether ion-modal presents it could not be decided: ${ionic.unread.join('; ')})`
        : '';
    return `${template.relative}: dialog without ${missing.join(' + ')} — add them, present it with ion-modal / ModalController, or name your accessible dialog component in ${CONFIG_KEY}${unreadNote}.`;
  }
}

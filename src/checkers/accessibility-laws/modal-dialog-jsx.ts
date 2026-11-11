/**
 * Modal Dialog Accessibility in JSX.
 *
 * A dialog in a `.tsx`/`.jsx` file is an element that says it is one — a
 * native `<dialog>`, `role="dialog"`/`"alertdialog"`, `aria-modal` — or an
 * overlay classed `fixed inset-0`. It is compliant when:
 *
 * - it is (or sits inside) a component the project names in
 *   `thresholds.accessibility.accessibleDialogComponents`, matched as the tag
 *   is written (`Modal`, `Dialog.Content`); or
 * - it is a native `<dialog>` (or inside one) and the file calls
 *   `showModal()`: a modal `<dialog>` has the dialog role, is modal, and makes
 *   the rest of the page inert. `show()` and the `open` attribute do not; or
 * - the file has role="dialog"/"alertdialog", aria-modal true and a focus
 *   trap: an element or attribute named in
 *   `thresholds.accessibility.focusTrapTokens` (`FocusTrap`, `FocusLock`).
 */

import type { LawCheckContext } from '../../types/law.types';
import { jsxAttribute, type JsxElementInfo } from '../../utils/react/tsx-source';
import { JsxSources, type JsxFile } from './jsx-sources';

export const CONFIG_KEY = 'thresholds.accessibility.accessibleDialogComponents';
export const DIALOG_ROLES = ['dialog', 'alertdialog'];
const TRAP_KEY = 'thresholds.accessibility.focusTrapTokens';
const NATIVE_DIALOG = 'dialog';

export class ModalDialogJsx {
  static check(
    context: LawCheckContext,
    accessible: readonly string[],
    trapTokens: readonly string[]
  ): string[] {
    const jsx = JsxSources.read(context);
    const violations = [...jsx.unread];
    for (const file of jsx.files) {
      const dialogs = file.elements.filter(
        el => this.isDialog(el) && !this.insideAccessible(file, el, accessible)
      );
      if (dialogs.length === 0) continue;
      const missing = this.missing(file, dialogs, trapTokens);
      if (missing.length === 0) continue;
      const spread = dialogs.filter(el => el.hasSpread).map(el => `<${el.tag}> line ${el.line}`);
      const spreadNote =
        spread.length > 0 ? ` (the {...spread} on ${spread.join(', ')} could not be read)` : '';
      violations.push(
        `${file.relative}: dialog at line ${dialogs[0]?.line ?? 0} without ${missing.join(' + ')}${spreadNote} — open a native <dialog> with showModal(), add them, or name your accessible dialog component in ${CONFIG_KEY}.`
      );
    }
    return violations;
  }

  private static isDialog(element: JsxElementInfo): boolean {
    if (JsxSources.isIntrinsic(element, NATIVE_DIALOG)) return true;
    if (DIALOG_ROLES.includes(JsxSources.stringValue(element, 'role') ?? '')) return true;
    if (JsxSources.has(element, 'aria-modal')) return true;
    if (!JsxSources.isIntrinsic(element)) return false;
    const classes = (JsxSources.stringValue(element, 'className') ?? '').split(/\s+/);
    return classes.includes('fixed') && classes.includes('inset-0');
  }

  private static insideAccessible(
    file: JsxFile,
    element: JsxElementInfo,
    accessible: readonly string[]
  ): boolean {
    if (accessible.includes(element.tag)) return true;
    return JsxSources.ancestorTags(file.source, element).some(tag => accessible.includes(tag));
  }

  private static inNativeDialog(file: JsxFile, element: JsxElementInfo): boolean {
    return (
      JsxSources.isIntrinsic(element, NATIVE_DIALOG) ||
      JsxSources.ancestorTags(file.source, element).includes(NATIVE_DIALOG)
    );
  }

  private static missing(
    file: JsxFile,
    dialogs: JsxElementInfo[],
    trapTokens: readonly string[]
  ): string[] {
    const native = dialogs.filter(el => this.inNativeDialog(file, el));
    const missing: string[] = [];
    if (native.length > 0 && !JsxSources.callsMethod(file.source, 'showModal')) {
      missing.push('showModal() (a <dialog> opened with show() or the open attribute is not modal)');
    }
    if (native.length === dialogs.length) return missing;

    const elements = file.elements;
    if (!elements.some(el => DIALOG_ROLES.includes(JsxSources.stringValue(el, 'role') ?? ''))) {
      missing.push('role="dialog"');
    }
    if (!elements.some(el => this.isAriaModalTrue(el))) missing.push('aria-modal="true"');
    const trapped = elements.some(
      el => trapTokens.includes(el.tag) || el.attributes.some(a => trapTokens.includes(a.name))
    );
    if (!trapped) missing.push(`a focus trap (named in ${TRAP_KEY})`);
    return missing;
  }

  /** `aria-modal`, `aria-modal="true"` or `aria-modal={true}`. */
  private static isAriaModalTrue(element: JsxElementInfo): boolean {
    const written = jsxAttribute(element, 'aria-modal');
    if (!written) return false;
    return written.kind === 'bare' || written.value.trim() === 'true';
  }
}

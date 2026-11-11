/**
 * Form Control Labeling Law
 * A `placeholder` is NOT an accessible name (it vanishes on input). Every form
 * control must have a real label: an `id` (paired with `<label for>`), a
 * wrapping `<label>`, an `aria-label`, or an `aria-labelledby`. Credential
 * inputs without one are unusable with a screen reader.
 *
 * In JSX an `id` counts only when an element in the same file points at it
 * with `htmlFor`, so an orphan id is reported; a control with a `{...spread}`
 * and no name written is reported as not readable.
 *
 * Ionic form controls are custom elements, and each takes its name from its
 * own places (read in @ionic/core 8.8.17):
 * - ion-input / ion-textarea: the `label` property or a `slot="label"` child
 *   (input.js:15,440-451), or aria-* copied onto the inner native control.
 *   They render in light DOM (`scoped`), so a wrapping <label> reaches the
 *   inner control; an id on the host does not (the host is not labelable).
 * - ion-select: `label`, `slot="label"`, or aria-label — it copies ONLY
 *   aria-label to its inner button (select.js:221), so aria-labelledby on the
 *   host names nothing.
 * - ion-range: `label`, `slot="label"`, aria-label or aria-labelledby.
 * - ion-checkbox / ion-toggle / ion-radio: their default-slot text, or aria-*.
 *   They render in shadow DOM, so a wrapping <label> does not reach them.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { jsxAttribute, type JsxElementInfo } from '../../utils/react/tsx-source';
import { AccessibilityLawBase } from './accessibility-law-base';
import { JsxSources, type JsxFile } from './jsx-sources';
import { TemplateMarkup, type MarkupElement } from './template-markup';

const ARIA_LABEL = 'aria-label';
const ARIA_LABELLEDBY = 'aria-labelledby';
const NATIVE_CONTROLS = ['input', 'select', 'textarea'];

/** How each Ionic control can be named. */
interface IonicNaming {
  labelProperty: boolean;
  labelSlot: boolean;
  defaultSlot: boolean;
  wrappingLabel: boolean;
  ariaLabelledBy: boolean;
}

const IONIC_CONTROLS: Record<string, IonicNaming> = {
  'ion-input': { labelProperty: true, labelSlot: true, defaultSlot: false, wrappingLabel: true, ariaLabelledBy: true },
  'ion-textarea': { labelProperty: true, labelSlot: true, defaultSlot: false, wrappingLabel: true, ariaLabelledBy: true },
  'ion-select': { labelProperty: true, labelSlot: true, defaultSlot: false, wrappingLabel: false, ariaLabelledBy: false },
  'ion-range': { labelProperty: true, labelSlot: true, defaultSlot: false, wrappingLabel: false, ariaLabelledBy: true },
  'ion-checkbox': { labelProperty: false, labelSlot: false, defaultSlot: true, wrappingLabel: false, ariaLabelledBy: true },
  'ion-toggle': { labelProperty: false, labelSlot: false, defaultSlot: true, wrappingLabel: false, ariaLabelledBy: true },
  'ion-radio': { labelProperty: false, labelSlot: false, defaultSlot: true, wrappingLabel: false, ariaLabelledBy: true },
};

export class FormControlLabelingLaw extends AccessibilityLawBase {
  // Control types that carry their own semantics / need no text label.
  private static readonly EXEMPT_TYPES = /^(?:hidden|submit|button|reset|image)$/i;

  static check(context: LawCheckContext): LawResult {
    const { templates, unread } = this.readTemplates(context);
    const violations: string[] = [...unread];

    for (const template of templates) {
      const { native, ionic } = this.unnamed(template.document.elements);
      if (native.length > 0) {
        violations.push(
          `${template.relative}: ${native.length} form control(s) without an accessible label (id/wrapping <label>/aria-label/aria-labelledby) at ${this.lines(native)} — placeholder does not count.`
        );
      }
      if (ionic.length > 0) {
        violations.push(
          `${template.relative}: ${ionic.length} Ionic control(s) without an accessible name (${ionic.join(', ')}) — give it a label="…" or a slot="label" child (ion-input/textarea/select/range), visible slot text (ion-checkbox/toggle/radio), or aria-label.`
        );
      }
    }
    violations.push(...this.checkJsx(context));

    return this.createResult(
      violations,
      'Form Control Labeling',
      [
        'Associate a <label for> (JSX: <label htmlFor>) via id, wrap the control in a <label>, or add aria-label / aria-labelledby',
        'Ionic: label="…" or slot="label" on ion-input/ion-select/ion-textarea/ion-range; slot text on ion-checkbox/ion-toggle/ion-radio',
        'Do not rely on placeholder as the accessible name',
      ],
      context
    );
  }

  private static checkJsx(context: LawCheckContext): string[] {
    const jsx = JsxSources.read(context);
    const violations = [...jsx.unread];
    for (const file of jsx.files) {
      const found = this.unnamedInJsx(file);
      if (found.unnamed.length > 0) {
        violations.push(
          `${file.relative}: ${found.unnamed.length} form control(s) without an accessible label (<label htmlFor>/wrapping <label>/aria-label/aria-labelledby) at ${this.lines(found.unnamed)} — placeholder does not count.`
        );
      }
      if (found.orphans.length > 0) {
        violations.push(
          `${file.relative}: ${found.orphans.length} control id(s) that no htmlFor in this file points at (${found.orphans.join(', ')}) — add a <label htmlFor>, wrap the control in a <label>, or use aria-labelledby.`
        );
      }
      if (found.spread.length > 0) {
        violations.push(
          `${file.relative}: ${found.spread.length} form control(s) with a {...spread} and no label written at ${this.lines(found.spread)} — whether the spread names it cannot be read; write the label here.`
        );
      }
    }
    return violations;
  }

  /**
   * JSX controls without a name. An `id` names a control only when an
   * element in the same file points at it with `htmlFor` — the same literal,
   * or the same expression (`htmlFor={id}` … `id={id}`).
   */
  private static unnamedInJsx(file: JsxFile): {
    unnamed: number[];
    orphans: string[];
    spread: number[];
  } {
    const targets = new Set(
      file.elements.flatMap(el => {
        const htmlFor = jsxAttribute(el, 'htmlFor');
        return htmlFor ? [`${htmlFor.kind}:${htmlFor.value}`] : [];
      })
    );
    const result = { unnamed: [] as number[], orphans: [] as string[], spread: [] as number[] };
    for (const element of file.elements) {
      if (!this.isJsxControl(element) || this.jsxHasName(file, element)) continue;
      const id = jsxAttribute(element, 'id');
      if (id && targets.has(`${id.kind}:${id.value}`)) continue;
      if (element.hasSpread) result.spread.push(element.line);
      else if (id) result.orphans.push(`id ${id.kind === 'string' ? `"${id.value}"` : `{${id.value}}`} line ${element.line}`);
      else result.unnamed.push(element.line);
    }
    return result;
  }

  private static isJsxControl(element: JsxElementInfo): boolean {
    if (!NATIVE_CONTROLS.some(tag => JsxSources.isIntrinsic(element, tag))) return false;
    const type = JsxSources.stringValue(element, 'type');
    return type === undefined || !this.EXEMPT_TYPES.test(type);
  }

  private static jsxHasName(file: JsxFile, element: JsxElementInfo): boolean {
    return (
      JsxSources.has(element, ARIA_LABEL) ||
      JsxSources.has(element, ARIA_LABELLEDBY) ||
      JsxSources.ancestorTags(file.source, element).includes('label')
    );
  }

  /** Lines of unnamed native controls, and the unnamed Ionic controls. */
  private static unnamed(elements: MarkupElement[]): { native: number[]; ionic: string[] } {
    const native: number[] = [];
    const ionic: string[] = [];
    for (const element of elements) {
      if (NATIVE_CONTROLS.includes(element.tag)) {
        if (!this.nativeHasName(element)) native.push(element.line);
        continue;
      }
      const naming = IONIC_CONTROLS[element.tag];
      if (naming && !this.ionicHasName(element, naming)) {
        ionic.push(`<${element.tag}> line ${element.line}`);
      }
    }
    return { native, ionic };
  }

  private static nativeHasName(element: MarkupElement): boolean {
    const type = TemplateMarkup.staticValue(element, 'type');
    if (type !== undefined && this.EXEMPT_TYPES.test(type)) return true;
    return (
      TemplateMarkup.has(element, 'id') ||
      TemplateMarkup.has(element, ARIA_LABEL) ||
      TemplateMarkup.has(element, ARIA_LABELLEDBY) ||
      TemplateMarkup.ancestor(element, ['label']) !== null
    );
  }

  private static ionicHasName(element: MarkupElement, naming: IonicNaming): boolean {
    if (TemplateMarkup.has(element, ARIA_LABEL)) return true;
    if (naming.ariaLabelledBy && TemplateMarkup.has(element, ARIA_LABELLEDBY)) return true;
    if (naming.labelProperty && this.hasLabelProperty(element)) return true;
    if (
      naming.labelSlot &&
      TemplateMarkup.descendants(element).some(
        child => TemplateMarkup.staticValue(child, 'slot') === 'label'
      )
    ) {
      return true;
    }
    if (naming.defaultSlot && this.hasDefaultSlotContent(element)) return true;
    return naming.wrappingLabel && TemplateMarkup.ancestor(element, ['label']) !== null;
  }

  /** `label="Name"` (non-empty) or a bound `[label]`. */
  private static hasLabelProperty(element: MarkupElement): boolean {
    const written = TemplateMarkup.attribute(element, 'label');
    if (!written) return false;
    if (written.name.startsWith('[')) return true;
    return (written.value ?? '').trim() !== '';
  }

  /** Text, an interpolation, or a child element outside any named slot. */
  private static hasDefaultSlotContent(element: MarkupElement): boolean {
    if (element.text.trim() !== '') return true;
    return element.children.some(
      child => TemplateMarkup.staticValue(child, 'slot') === undefined
    );
  }
}

/**
 * Accessibility (a11y) Laws Data Module
 * Angular template accessibility laws (v7.2.0 — from a front-end governance audit,
 * dedup-verified new: RoC previously had ZERO a11y laws).
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';

/** The not-read limit every template law shares. */
const UNREADABLE_TEMPLATE =
  'A template whose markup cannot be read (an opening tag or a quoted value that never ends) is reported as not read.';

/** The JSX limit the JSX-reading laws share. */
const UNREADABLE_JSX =
  'JSX is read from .tsx/.jsx files only (JSX inside .js files is not seen); a file that does not parse, or that cannot be parsed because no typescript package can be loaded, is reported as not read.';

export const ACCESSIBILITY_LAWS: EnhancedConstitutionalLaw[] = [
  {
    // Pinned: the generated id came from the Angular-only description, and the
    // id is public (laws --json, the site). The description now covers JSX too.
    id: 'accessibility_dc4a588a',
    legacyId: 90,
    article: 'XI',
    subsection: '11.1',
    title: 'Accessibility Linting Enforcement',
    rationale:
      'The cheapest way to catch a11y regressions is to fail the lint, not the audit; a project with templates or JSX but no a11y lint rules ships broken markup unchecked. This law verifies the a11y lint rules are configured.',
    satisfiedBy: {
      angular: 'Add @angular-eslint/template to your ESLint config and enable the core a11y rules (click-events-have-key-events, label-has-associated-control, valid-aria, alt-text, role-has-required-aria).',
      react: 'Enable eslint-plugin-jsx-a11y recommended on all .tsx (jsxA11y.flatConfigs.recommended, or plugin:jsx-a11y/recommended); eslint-config-next alone leaves click-events-have-key-events and label-has-associated-control off.',
      ionic: 'Enable the same @angular-eslint template a11y rules; they are written for native HTML elements and do not know ion-* controls, which Form Control Labeling, Modal Dialog Accessibility and Disclosure Control ARIA State read instead.',
    },
    detectionLimits: [
      'For @angular-eslint it reads the ESLint config as raw text, so a flat config that pulls that plugin\'s recommended preset without naming each rule is flagged as missing all of them.',
      'A rule set to \'off\' still counts as present because severity is never inspected — only the rule name string is searched (an eslint-config-next rule switched off later is still credited).',
      'The Angular rules are asked for only where an .html file exists and @angular/core is declared; a non-Angular project\'s .html (a Vite index.html, public/*.html) is not asked for any a11y linter.',
      'The JSX rules (eslint-plugin-jsx-a11y alt-text, aria-props, click-events-have-key-events, label-has-associated-control, role-has-required-aria-props) are asked for where a non-test .tsx/.jsx file exists; a React app written only in .js files is not asked.',
      'The jsx-a11y recommended/strict preset is recognised as plugin:jsx-a11y/recommended|strict, or <binding>.flatConfigs|configs.recommended|strict where the binding is imported or required from eslint-plugin-jsx-a11y in that config file; a preset reached through a shared config package or a re-exported variable is not followed, and without a loadable typescript package the flat preset is not recognised (its rules are then reported missing).',
      'eslint-config-next is credited with registering jsx-a11y and enabling alt-text, aria-props and role-has-required-aria-props, as eslint-config-next 16.4.6 does (dist/index.js:176-191); it is recognised by the text eslint-config-next or next/core-web-vitals only, so a legacy extends: "next" is not recognised, and another version\'s rule list is not read.',
      'The @angular-eslint template a11y rules it asks for check native HTML elements; on ion-* elements they are silent, so a passing lint config says nothing about an Ionic app\'s ion-input or ion-button.',
    ],
    emoji: '♿',
    description:
      'Angular templates are linted by the @angular-eslint template a11y rule set, and JSX by eslint-plugin-jsx-a11y',
    priority: 'HIGH',
    category: 'ACCESSIBILITY',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'AccessibilityLintingEnforcementLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XI.11.1: Template accessibility linting not enforced',
    remediation:
      'Add @angular-eslint/eslint-plugin-template with the core a11y rules on error',
  },

  {
    // The id was generated from this law's first description, which named
    // one project's dialog component. It is frozen so configs and waivers
    // keyed by it keep working; the description below no longer names it.
    id: 'accessibility_af3bd6c4',
    legacyId: 91,
    article: 'XI',
    subsection: '11.2',
    title: 'Modal Dialog Accessibility',
    rationale:
      'A modal that does not announce itself as a dialog or trap focus is a keyboard-and-screen-reader trap. This law checks modal templates carry the dialog role, aria-modal and focus trapping, or are rendered by something that provides them.',
    satisfiedBy: {
      angular: 'Give modal templates role="dialog" (or alertdialog), aria-modal="true" and cdkTrapFocus; or name your shared accessible dialog component in thresholds.accessibility.accessibleDialogComponents, and a template that uses it is compliant.',
      react: 'Use a native <dialog> opened with showModal(), or a shared Modal that sets role="dialog", aria-modal="true", traps focus and returns it on close; name that component in thresholds.accessibility.accessibleDialogComponents and its focus-trap component in thresholds.accessibility.focusTrapTokens.',
      ionic: 'Use ion-modal / ModalController; it provides role="dialog", aria-modal and a focus trap. Do not set focusTrap to false without a replacement.',
    },
    detectionLimits: [
      'A template is only recognised as a modal if its filename ends -modal.component.html or an element has both the Tailwind classes fixed and inset-0 in a static class attribute, so a CDK-overlay or differently-classed modal is silently skipped.',
      'One element named in thresholds.accessibility.accessibleDialogComponents anywhere in a template exempts the whole template; the law trusts that component and does not read it.',
      'role, aria-modal and the focus trap are looked for anywhere in the template or JSX file, not on the same element, and focus return on close is not checked.',
      'For Angular it scans external .html only, so a modal written as an inline template: string in a .ts component is never seen, and a component with an inline template is not matched to ModalController.',
      'In JSX a dialog is a native <dialog>, an element with role="dialog"/"alertdialog" or aria-modal, or an intrinsic element with fixed and inset-0 in a literal className; a dialog built only from components, or classed through an expression, is not seen. Components named in accessibleDialogComponents are matched as written (Dialog.Content), with no import resolution.',
      'A native <dialog> counts as modal when its file calls any .showModal(); the call is not tied to that element. No focus-trap library is built in: in JSX a focus trap is only an element or attribute named in thresholds.accessibility.focusTrapTokens.',
      UNREADABLE_JSX,
      'ion-modal is recognised in two forms: an inline <ion-modal> (its own template, or the component whose selector is nested in it), and ModalController.create({ component: X }) with X a class identifier, in a file that imports ModalController from an @ionic/* package. A component passed through a variable, a lazy import(), or a wrapper service is not followed, and classes are matched by name, so two components with one class name are not told apart.',
      'That ion-modal sets role="dialog", aria-modal="true" and traps focus unless focusTrap is false is read from @ionic/core 8.8.17 (modal.js:140, 1188), not checked against the installed version; a focusTrap bound to an expression is taken as on.',
      'A template whose markup cannot be read (an opening tag or a quoted value that never ends) is reported as not read; ModalController detection needs the project\'s typescript package, and without it a modal that misses the attributes says so in its message.',
    ],
    emoji: '🪟',
    description:
      'Dialogs must declare role=dialog + aria-modal + focus-trap, or be rendered by an accessible dialog component',
    priority: 'HIGH',
    category: 'ACCESSIBILITY',
    stack: 'frontend',
    // Reads plain HTML too: a static site keeps it (#323).
    staticSiteHtml: true,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'ModalDialogAccessibilityLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XI.11.2: Inaccessible modal dialog',
    remediation:
      'Add role="dialog" + aria-modal="true" + cdkTrapFocus, present the dialog with ion-modal, or name your accessible dialog component in thresholds.accessibility.accessibleDialogComponents',
  },

  {
    id: generateLawId(
      'Form Control Labeling',
      'Form controls must have a real accessible label, not a placeholder',
      'accessibility'
    ),
    legacyId: 92,
    article: 'XI',
    subsection: '11.3',
    title: 'Form Control Labeling',
    rationale:
      'An input with no programmatic label is invisible to a screen reader — the user hears an unlabelled edit box. This law flags form controls lacking a label association.',
    satisfiedBy: {
      angular: 'Give every input/select/textarea an id tied to a <label for>, a wrapping <label>, or an aria-label / aria-labelledby; hidden and button-type inputs are exempt.',
      react: 'Every control has a <label htmlFor> matching its id, a wrapping <label>, or an aria-label / aria-labelledby.',
      ionic: 'Give every ion-input / ion-select / ion-textarea / ion-range a label (property or slot="label") or aria-label; give ion-checkbox / ion-toggle / ion-radio visible slot text.',
    },
    detectionLimits: [
      'In templates it treats any id attribute on a native control as "labelled" and never checks a matching <label for> exists, so an input with an orphan id passes — the label may live in a parent component\'s template, which it does not follow.',
      'formControlName or matInput are not recognised as labelling; a wrapping <label> is, without checking it has text.',
      'For Angular it reads external .html templates only (inline template: strings are not read).',
      'In JSX an id names a control only when an element in the same file has htmlFor with the same literal, or the same expression text (htmlFor={id} with id={id}); a label rendered by a parent component, or reached through a prop of another name, is not followed, so that control is reported as an orphan id.',
      'In JSX it judges intrinsic <input>/<select>/<textarea> only; a component (<Input>, <TextField>) is not followed into its definition, and an unnamed control with a {...spread} is reported as unreadable even when the spread does name it. The title attribute is not accepted as a name.',
      UNREADABLE_JSX,
      'Ionic controls are judged by @ionic/core 8.8.17\'s naming, read from its source, not inspected in a browser: label / slot="label" / aria-label / aria-labelledby on ion-input, ion-textarea and ion-range; label / slot="label" / aria-label on ion-select (it forwards only aria-label); default-slot content or aria-* on ion-checkbox, ion-toggle and ion-radio. Any slot content counts, even an icon with no text. The legacy <ion-label> sibling is not accepted (8.x ion-input does not read it).',
      'ion-searchbar is not read: its inner input always carries aria-label="search text" (searchbar.js:473), so it is never nameless — whether that generic name is good enough is not judged.',
      UNREADABLE_TEMPLATE,
    ],
    emoji: '🏷️',
    description:
      'Form controls must have a real accessible label (id/aria-label), not a placeholder',
    priority: 'HIGH',
    category: 'ACCESSIBILITY',
    stack: 'frontend',
    // Reads plain HTML too: a static site keeps it (#323).
    staticSiteHtml: true,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'FormControlLabelingLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XI.11.3: Form control without accessible label',
    remediation:
      'Associate a <label for> via id, or add aria-label / aria-labelledby',
  },

  {
    id: generateLawId(
      'Explicit Button Type',
      'Native buttons must declare an explicit type',
      'accessibility'
    ),
    legacyId: 93,
    article: 'XI',
    subsection: '11.4',
    title: 'Explicit Button Type',
    rationale:
      'A <button> with no type defaults to submit, which silently posts the nearest form — a classic accidental-submit bug. This law requires an explicit button type.',
    satisfiedBy: {
      angular: 'Set type="button" (or submit/reset), or bind [type] / [attr.type], on every button element.',
      react: 'Give every <button> an explicit type.',
      ionic: 'ion-button defaults to type="button"; set type="submit" on the one that submits.',
    },
    detectionLimits: [
      'It checks a type attribute is present but never validates the value.',
      'For Angular it scans external .html only, so a button inside an inline component template is not examined.',
      'In JSX it reads intrinsic <button> only; a component (<Button>) is not followed into its definition, and a <button {...props}> with no type written is reported as unreadable even when the spread does set it.',
      UNREADABLE_JSX,
      'ion-button and ion-fab-button are not read, by design: both default type to "button" (@ionic/core 8.8.17 button.js:51, fab-button.js:48), so they cannot submit by accident. A form that relies on an ion-button to submit without type="submit" is not seen.',
      UNREADABLE_TEMPLATE,
    ],
    emoji: '🔘',
    description:
      'Native <button> elements must declare an explicit type (defaults to submit)',
    priority: 'MEDIUM',
    category: 'ACCESSIBILITY',
    stack: 'frontend',
    // Reads plain HTML too: a static site keeps it (#323).
    staticSiteHtml: true,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'ExplicitButtonTypeLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XI.11.4: <button> without explicit type',
    remediation: 'Add type="button" (or submit/reset) to every native button',
  },

  {
    id: generateLawId(
      'Disclosure Control ARIA State',
      'Disclosure toggle buttons must expose aria-expanded',
      'accessibility'
    ),
    legacyId: 94,
    article: 'XI',
    subsection: '11.5',
    title: 'Disclosure Control ARIA State',
    rationale:
      'A toggle that expands a panel but never sets aria-expanded leaves a screen-reader user unsure whether it is open. This advisory, low-precision law flags likely disclosure buttons missing that state.',
    satisfiedBy: {
      angular: 'Add aria-expanded (static or [attr.aria-expanded]) to buttons whose click handler toggles, expands or collapses a region.',
      react: 'Bind aria-expanded to the open state on toggle buttons (aria-expanded={open}).',
      ionic: 'Use ion-accordion, which manages aria-expanded itself, or a native <button [attr.aria-expanded]> for the toggle: ion-button copies aria-expanded to its inner button only once, at load, and ion-item not at all.',
    },
    detectionLimits: [
      'Disclosure intent is guessed from substrings in the click-handler text (toggle, expand, menu, open), so a handler like openSettings() is a false positive while a non-keyword handler is missed.',
      'It looks at native <button>, ion-button and ion-item with a button attribute, with an Angular (click) binding, and at intrinsic JSX <button> with an onClick, so an <a role="button">, a directive, a component (<Button>), or a keydown-driven control is invisible.',
      'In JSX the handler is matched by its source text, so onClick={handlers.menu} is caught and onClick={onChange} is not; a handler that only sets a literal (() => setOpen(false), () => setOpen(true)) opens or closes rather than toggles and is skipped; a toggle with a {...spread} and no aria-expanded written is reported as unreadable.',
      UNREADABLE_JSX,
      'On ion-button and ion-item an aria-expanded is itself reported: read from @ionic/core 8.8.17, ion-button copies aria-* to its inner <button> once at load and watches only aria-checked, aria-label and aria-pressed (button.js:136 and its watchers); ion-item copies only aria-label (item.js:109). This is from the source, not a screen-reader test, and a later Ionic that watches aria-expanded makes it a false positive.',
      'A toggle inside ion-accordion is exempt without checking it is the accordion header.',
      'The author documents it as advisory and low-precision; it is a warning by default, and fails a gate only where warnings do.',
      UNREADABLE_TEMPLATE,
    ],
    emoji: '🔽',
    description:
      'Buttons that toggle a panel/menu must expose aria-expanded state',
    priority: 'LOW',
    category: 'ACCESSIBILITY',
    stack: 'frontend',
    // Reads plain HTML too: a static site keeps it (#323).
    staticSiteHtml: true,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'DisclosureControlAriaStateLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XI.11.5: Disclosure control without aria-expanded',
    remediation: 'Bind [attr.aria-expanded] to the open/closed state',
  },
];

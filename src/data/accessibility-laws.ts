/**
 * Accessibility (a11y) Laws Data Module
 * Angular template accessibility laws (v7.2.0 — from a front-end governance audit,
 * dedup-verified new: RoC previously had ZERO a11y laws).
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';

export const ACCESSIBILITY_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Accessibility Linting Enforcement',
      'Projects with Angular templates must enable the @angular-eslint template a11y rule set',
      'accessibility'
    ),
    legacyId: 90,
    article: 'XI',
    subsection: '11.1',
    title: 'Accessibility Linting Enforcement',
    rationale:
      'The cheapest way to catch a11y regressions is to fail the lint, not the audit; a project with templates but no template-a11y rules ships broken markup unchecked. This law verifies the a11y lint rules are configured.',
    satisfiedBy: { angular: 'Add @angular-eslint/template to your ESLint config and enable the core a11y rules (click-events-have-key-events, label-has-associated-control, valid-aria, alt-text, role-has-required-aria).' },
    detectionLimits: [
      'It reads the ESLint config as raw text, so a flat config that pulls the plugin\'s recommended preset without naming each rule is flagged as missing all of them.',
      'A rule set to \'off\' still counts as present because severity is never inspected — only the rule name string is searched.',
      'It looks specifically for @angular-eslint, so a non-Angular frontend with templates and its own a11y linter is flagged for lacking the Angular plugin.',
    ],
    emoji: '♿',
    description:
      'Projects with Angular templates must enable the @angular-eslint template a11y rule set',
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
    id: generateLawId(
      'Modal Dialog Accessibility',
      'Dialogs must use role=dialog + aria-modal + focus-trap, or the t3-modal component',
      'accessibility'
    ),
    legacyId: 91,
    article: 'XI',
    subsection: '11.2',
    title: 'Modal Dialog Accessibility',
    rationale:
      'A modal that does not announce itself as a dialog or trap focus is a keyboard-and-screen-reader trap. This law checks modal templates carry the dialog role, aria-modal and focus trapping.',
    satisfiedBy: { angular: 'Give modal templates role="dialog" (or alertdialog), aria-modal="true" and cdkTrapFocus; the project <t3-modal> component is treated as already compliant.' },
    detectionLimits: [
      'A template is only recognised as a modal if its filename ends -modal.component.html or it contains the Tailwind "fixed inset-0" pair, so a CDK-overlay or differently-classed modal is silently skipped.',
      'Any occurrence of <t3-modal in a file exempts the entire file from the checks.',
      'It scans external .html only, so a modal written as an inline template: string in a .ts component is never seen.',
    ],
    emoji: '🪟',
    description:
      'Dialogs must declare role=dialog + aria-modal + focus-trap, or use t3-modal',
    priority: 'HIGH',
    category: 'ACCESSIBILITY',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'ModalDialogAccessibilityLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XI.11.2: Inaccessible modal dialog',
    remediation:
      'Use <t3-modal> or add role="dialog" + aria-modal="true" + cdkTrapFocus',
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
    satisfiedBy: { angular: 'Give every input/select/textarea an id tied to a <label for>, or an aria-label / aria-labelledby; hidden and button-type inputs are exempt.' },
    detectionLimits: [
      'It treats any id= attribute as "labelled" and never checks a matching <label for> element exists, so an input with an orphan id passes.',
      'Angular patterns like a wrapping <label><input></label>, formControlName or matInput are not recognised as labelling.',
      'It reads external .html templates only and does no DOM relationship analysis, matching per opening tag.',
    ],
    emoji: '🏷️',
    description:
      'Form controls must have a real accessible label (id/aria-label), not a placeholder',
    priority: 'HIGH',
    category: 'ACCESSIBILITY',
    stack: 'frontend',
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
    satisfiedBy: { angular: 'Set type="button" (or submit/reset), or bind [type] / [attr.type], on every button element.' },
    detectionLimits: [
      'The type-present test matches data-type= as well, because the dash is a word boundary, so a button with data-type and no real type is wrongly treated as compliant.',
      'It checks a type attribute is present but never validates the value.',
      'It scans external .html only, so a button inside an inline component template is not examined.',
    ],
    emoji: '🔘',
    description:
      'Native <button> elements must declare an explicit type (defaults to submit)',
    priority: 'MEDIUM',
    category: 'ACCESSIBILITY',
    stack: 'frontend',
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
    satisfiedBy: { angular: 'Add aria-expanded (static or [attr.aria-expanded]) to buttons whose click handler toggles, expands or collapses a region.' },
    detectionLimits: [
      'Disclosure intent is guessed from substrings in the click-handler name (toggle, expand, menu, open), so a handler like openSettings() is a false positive while a non-keyword handler is missed.',
      'It only looks at native <button> with an Angular (click)= binding, so an <a role="button">, a directive, or a keydown-driven control is invisible.',
      'The author documents it as advisory and low-precision, yet a match still fails the gate.',
    ],
    emoji: '🔽',
    description:
      'Buttons that toggle a panel/menu must expose aria-expanded state',
    priority: 'LOW',
    category: 'ACCESSIBILITY',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'DisclosureControlAriaStateLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XI.11.5: Disclosure control without aria-expanded',
    remediation: 'Bind [attr.aria-expanded] to the open/closed state',
  },
];

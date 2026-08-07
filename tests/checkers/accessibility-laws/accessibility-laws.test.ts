/**
 * Tests for the v7.2.0 Accessibility (a11y) law batch.
 * Real temp-dir template fixtures (no mocks).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AccessibilityLintingEnforcementLaw } from '../../../src/checkers/accessibility-laws/accessibility-linting-enforcement';
import { DisclosureControlAriaStateLaw } from '../../../src/checkers/accessibility-laws/disclosure-control-aria-state';
import { ExplicitButtonTypeLaw } from '../../../src/checkers/accessibility-laws/explicit-button-type';
import { FormControlLabelingLaw } from '../../../src/checkers/accessibility-laws/form-control-labeling';
import { ModalDialogAccessibilityLaw } from '../../../src/checkers/accessibility-laws/modal-dialog-accessibility';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-a11y-'));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    const p = path.join(dir, name);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}
afterAll(() => {
  for (const dir of dirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});
const ctx = (root: string): LawCheckContext =>
  ({
    projectRoot: root,
    config: {
      project: { name: 't', root, componentPrefix: 'app', type: 'angular' },
      ignores: { global: [], tests: ['**/*.spec.ts'], build: [], design: [] },
      laws: { paretoMode: false, severity: {} },
      hooks: { preCommit: false, prePush: false, commitMsg: false },
      includes: { global: [] },
      excludes: {},
      reporting: {
        format: 'console',
        verbose: false,
        onlyFailures: false,
        scoring: false,
      },
      performance: { parallel: false, maxConcurrent: 3, cache: false },
      thresholds: {},
    },
  }) as LawCheckContext;
const V = (r: { violations?: string[] }): string =>
  (r.violations ?? []).join(' || ');

describe('ExplicitButtonTypeLaw', () => {
  it('flags a <button> without an explicit type', () => {
    const dir = fixture({ 'a.component.html': '<button (click)="x()">Go</button>\n' });
    expect(ExplicitButtonTypeLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes typed buttons and <t3-button>', () => {
    const dir = fixture({
      'ok.component.html':
        '<button type="button">A</button>\n<button [type]="t">B</button>\n<t3-button>C</t3-button>\n',
    });
    expect(ExplicitButtonTypeLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('FormControlLabelingLaw', () => {
  it('flags a placeholder-only input (no real label)', () => {
    const dir = fixture({
      'f.component.html': '<input placeholder="API key">\n',
    });
    expect(FormControlLabelingLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes labeled controls and exempt types', () => {
    const dir = fixture({
      'ok.component.html':
        '<input id="a">\n<input aria-label="b">\n<input type="hidden">\n',
    });
    expect(FormControlLabelingLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('ModalDialogAccessibilityLaw', () => {
  it('flags a modal overlay without role/aria-modal/focus-trap', () => {
    const dir = fixture({
      'x-modal.component.html': '<div class="fixed inset-0"><h2>Hi</h2></div>\n',
    });
    expect(ModalDialogAccessibilityLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes a fully marked dialog and <t3-modal>', () => {
    const dir = fixture({
      'm.component.html':
        '<div class="fixed inset-0" role="dialog" aria-modal="true" cdkTrapFocus></div>\n',
      'n-modal.component.html': '<t3-modal><p>hi</p></t3-modal>\n',
    });
    expect(ModalDialogAccessibilityLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('ignores non-modal templates', () => {
    const dir = fixture({ 'plain.component.html': '<div class="p-4">x</div>\n' });
    expect(ModalDialogAccessibilityLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('DisclosureControlAriaStateLaw', () => {
  it('flags a toggle button (camelCase) without aria-expanded', () => {
    const dir = fixture({
      'm.component.html': '<button (click)="toggleMenu()">Menu</button>\n',
    });
    expect(DisclosureControlAriaStateLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes toggles with aria-expanded and non-disclosure buttons', () => {
    const dir = fixture({
      'ok.component.html':
        '<button (click)="toggleMenu()" [attr.aria-expanded]="open()">M</button>\n<button (click)="save()">Save</button>\n',
    });
    expect(DisclosureControlAriaStateLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('does not treat an aria-pressed toggle button as a disclosure', () => {
    // A theme switch / filter chip is a TOGGLE (pressed/unpressed), not a
    // disclosure — aria-pressed is correct, aria-expanded would be wrong.
    const dir = fixture({
      'toggle.component.html':
        '<button (click)="toggleTheme()" [attr.aria-pressed]="isDark()">Theme</button>\n<button (click)="toggleFilter()" aria-pressed="true">All</button>\n',
    });
    expect(DisclosureControlAriaStateLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('AccessibilityLintingEnforcementLaw', () => {
  it('flags templates project whose ESLint lacks the a11y plugin', () => {
    const dir = fixture({
      'a.component.html': '<div>t</div>\n',
      'eslint.config.mjs': 'export default [{ rules: {} }];\n',
    });
    expect(AccessibilityLintingEnforcementLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes when the a11y plugin + core rules are configured', () => {
    const dir = fixture({
      'a.component.html': '<div>t</div>\n',
      'eslint.config.mjs':
        "import t from '@angular-eslint/eslint-plugin-template';\nexport default [{ rules: { 'click-events-have-key-events':'error','label-has-associated-control':'error','valid-aria':'error','alt-text':'error','role-has-required-aria':'error' } }];\n",
    });
    expect(AccessibilityLintingEnforcementLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('is N/A (passes) when the project has no templates', () => {
    const dir = fixture({ 'x.ts': 'const a = 1;\n' });
    expect(AccessibilityLintingEnforcementLaw.check(ctx(dir)).passed).toBe(true);
  });
});

/**
 * #12, P2 — the React guidance of the five accessibility frontend laws,
 * proved on a React + Vite project.
 *
 * Each case starts RED (the law reports the project) and goes GREEN by doing
 * exactly what `satisfiedBy.react` says, and checks that the card names the
 * construct used — an instruction that does not clear the finding is wrong,
 * however plausible it reads. A documented "not read" is pinned as such.
 */
import { AccessibilityLintingEnforcementLaw } from '../../src/checkers/accessibility-laws/accessibility-linting-enforcement';
import { DisclosureControlAriaStateLaw } from '../../src/checkers/accessibility-laws/disclosure-control-aria-state';
import { ExplicitButtonTypeLaw } from '../../src/checkers/accessibility-laws/explicit-button-type';
import { FormControlLabelingLaw } from '../../src/checkers/accessibility-laws/form-control-labeling';
import { ModalDialogAccessibilityLaw } from '../../src/checkers/accessibility-laws/modal-dialog-accessibility';
import { DEFAULT_CONFIG } from '../../src/config/types';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import type { LawCheckContext } from '../../src/types/law.types';
import { json, useTempProject } from './foreign-json-486.helpers';

/** The law card's `satisfiedBy.react` text. */
const reactGuidance = (title: string): string => {
  const law = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l => l.title === title);
  return law?.satisfiedBy?.react ?? '';
};

const project = useTempProject();
const { write } = project;

/** A React + Vite app, with any extra dev dependencies. */
const reactVite = (devDependencies: Record<string, string> = {}): void => {
  write(
    'package.json',
    json({
      name: 'app',
      version: '1.0.0',
      type: 'module',
      dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
      devDependencies: {
        vite: '^7.0.0',
        typescript: '^5.9.3',
        eslint: '^9.0.0',
        ...devDependencies,
      },
      scripts: { build: 'vite build', lint: 'eslint .' },
    })
  );
  write(
    'src/main.tsx',
    "import { createRoot } from 'react-dom/client';\nimport { App } from './App';\ncreateRoot(document.getElementById('root')!).render(<App />);\n"
  );
};

const component = (name: string, jsx: string, head = ''): string =>
  `${head}export function ${name}() {\n  return (\n    ${jsx}\n  );\n}\n`;

const violationsOf = (result: { violations?: unknown[] }): string =>
  ((result.violations ?? []) as string[]).join('\n');

describe('#12 P2 Accessibility Linting Enforcement — React', () => {
  it('the card names jsxA11y.flatConfigs.recommended', () => {
    expect(reactGuidance('Accessibility Linting Enforcement')).toMatch(
      /jsxA11y\.flatConfigs\.recommended/
    );
  });

  it('RED: a flat ESLint config without eslint-plugin-jsx-a11y', async () => {
    reactVite();
    write('src/App.tsx', component('App', '<h1>App</h1>'));
    write(
      'eslint.config.js',
      "import js from '@eslint/js';\nexport default [js.configs.recommended];\n"
    );
    const result = await AccessibilityLintingEnforcementLaw.check(
      project.context()
    );
    expect(result.passed).toBe(false);
    expect(violationsOf(result)).toMatch(/jsx-a11y/);
  });

  it('GREEN: jsxA11y.flatConfigs.recommended over the .tsx sources', async () => {
    reactVite({ 'eslint-plugin-jsx-a11y': '^6.10.0' });
    write('src/App.tsx', component('App', '<h1>App</h1>'));
    write(
      'eslint.config.js',
      [
        "import js from '@eslint/js';",
        "import jsxA11y from 'eslint-plugin-jsx-a11y';",
        'export default [',
        '  js.configs.recommended,',
        "  { files: ['**/*.tsx'], ...jsxA11y.flatConfigs.recommended },",
        '];',
        '',
      ].join('\n')
    );
    const result = await AccessibilityLintingEnforcementLaw.check(
      project.context()
    );
    expect(result.violations ?? []).toEqual([]);
    expect(result.passed).toBe(true);
  });
});

describe('#12 P2 Modal Dialog Accessibility — React', () => {
  const settings = (
    accessible: string[],
    traps: string[]
  ): LawCheckContext => ({
    projectRoot: project.root,
    config: {
      ...DEFAULT_CONFIG,
      thresholds: {
        ...DEFAULT_CONFIG.thresholds,
        accessibility: {
          accessibleDialogComponents: accessible,
          focusTrapTokens: traps,
        },
      },
    } as LawCheckContext['config'],
  });

  it('the card names <dialog> with showModal() and the two thresholds', () => {
    const text = reactGuidance('Modal Dialog Accessibility');
    expect(text).toMatch(/<dialog> opened with showModal\(\)/);
    expect(text).toMatch(/accessibleDialogComponents/);
    expect(text).toMatch(/focusTrapTokens/);
  });

  it('RED: a fixed inset-0 overlay with no dialog semantics', async () => {
    reactVite();
    write(
      'src/Confirm.tsx',
      component(
        'Confirm',
        '<div className="fixed inset-0"><p>Sure?</p><button type="button">OK</button></div>'
      )
    );
    const result = await ModalDialogAccessibilityLaw.check(project.context());
    expect(result.passed).toBe(false);
    expect(violationsOf(result)).toMatch(/src\/Confirm\.tsx: dialog at line/);
  });

  it('GREEN: a native <dialog> opened with showModal()', async () => {
    reactVite();
    write(
      'src/Confirm.tsx',
      [
        "import { useEffect, useRef } from 'react';",
        'export function Confirm() {',
        '  const ref = useRef<HTMLDialogElement>(null);',
        '  useEffect(() => ref.current?.showModal(), []);',
        '  return (',
        '    <dialog ref={ref}><p>Sure?</p><button type="button">OK</button></dialog>',
        '  );',
        '}',
        '',
      ].join('\n')
    );
    const result = await ModalDialogAccessibilityLaw.check(project.context());
    expect(result.violations ?? []).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('GREEN: a shared Modal with role, aria-modal and a focus trap named in the thresholds', async () => {
    reactVite({ 'focus-trap-react': '^11.0.0' });
    write(
      'src/Modal.tsx',
      [
        "import { FocusTrap } from 'focus-trap-react';",
        "import type { ReactNode } from 'react';",
        'export function Modal({ children }: { children: ReactNode }) {',
        '  return (',
        '    <FocusTrap>',
        '      <div className="fixed inset-0" role="dialog" aria-modal="true">{children}</div>',
        '    </FocusTrap>',
        '  );',
        '}',
        '',
      ].join('\n')
    );
    write(
      'src/Confirm.tsx',
      component(
        'Confirm',
        '<Modal><p>Sure?</p><button type="button">OK</button></Modal>',
        "import { Modal } from './Modal';\n"
      )
    );
    const result = await ModalDialogAccessibilityLaw.check(
      settings(['Modal'], ['FocusTrap'])
    );
    expect(result.violations ?? []).toEqual([]);
    expect(result.passed).toBe(true);
  });
});

describe('#12 P2 Form Control Labeling — React', () => {
  it('the card names <label htmlFor>, a wrapping <label> and aria-label', () => {
    const text = reactGuidance('Form Control Labeling');
    expect(text).toMatch(/<label htmlFor>/);
    expect(text).toMatch(/wrapping <label>/);
    expect(text).toMatch(/aria-label/);
  });

  it('RED: an input with no name', async () => {
    reactVite();
    write(
      'src/Search.tsx',
      component('Search', '<input type="search" placeholder="Search" />')
    );
    const result = await FormControlLabelingLaw.check(project.context());
    expect(result.passed).toBe(false);
    expect(violationsOf(result)).toMatch(/src\/Search\.tsx/);
  });

  it.each([
    [
      '<label htmlFor> matching its id',
      '<form><label htmlFor="q">Search</label><input id="q" type="search" /></form>',
    ],
    ['a wrapping <label>', '<label>Search <input type="search" /></label>'],
    ['an aria-label', '<input type="search" aria-label="Search" />'],
  ])('GREEN: %s', async (_how, jsx) => {
    reactVite();
    write('src/Search.tsx', component('Search', jsx));
    const result = await FormControlLabelingLaw.check(project.context());
    expect(result.violations ?? []).toEqual([]);
    expect(result.passed).toBe(true);
  });
});

describe('#12 P2 Explicit Button Type — React', () => {
  it('the card says to give every <button> an explicit type', () => {
    expect(reactGuidance('Explicit Button Type')).toMatch(
      /every <button> an explicit type/
    );
  });

  it('RED: a <button> without type', async () => {
    reactVite();
    write('src/Save.tsx', component('Save', '<button>Save</button>'));
    const result = await ExplicitButtonTypeLaw.check(project.context());
    expect(result.passed).toBe(false);
    expect(violationsOf(result)).toMatch(/src\/Save\.tsx/);
  });

  it('GREEN: <button type="button">', async () => {
    reactVite();
    write(
      'src/Save.tsx',
      component('Save', '<button type="button">Save</button>')
    );
    const result = await ExplicitButtonTypeLaw.check(project.context());
    expect(result.violations ?? []).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('documented limit: the same button in a .js file is not read', async () => {
    reactVite();
    write('src/Save.js', component('Save', '<button>Save</button>'));
    const result = await ExplicitButtonTypeLaw.check(project.context());
    expect(result.violations ?? []).toEqual([]);
  });
});

describe('#12 P2 Disclosure Control ARIA State — React', () => {
  const menu = (attributes: string): string =>
    [
      "import { useState } from 'react';",
      'export function Menu() {',
      '  const [open, setOpen] = useState(false);',
      '  return (',
      `    <button type="button" onClick={() => setOpen(o => !o)}${attributes}>Menu</button>`,
      '  );',
      '}',
      '',
    ].join('\n');

  it('the card says aria-expanded={open}', () => {
    expect(reactGuidance('Disclosure Control ARIA State')).toMatch(
      /aria-expanded=\{open\}/
    );
  });

  it('RED: a toggle button without aria-expanded', async () => {
    reactVite();
    write('src/Menu.tsx', menu(''));
    const result = await DisclosureControlAriaStateLaw.check(project.context());
    expect(result.passed).toBe(false);
    expect(violationsOf(result)).toMatch(/src\/Menu\.tsx/);
  });

  it('GREEN: aria-expanded={open} on the toggle', async () => {
    reactVite();
    write('src/Menu.tsx', menu(' aria-expanded={open}'));
    const result = await DisclosureControlAriaStateLaw.check(project.context());
    expect(result.violations ?? []).toEqual([]);
    expect(result.passed).toBe(true);
  });
});

/**
 * The five accessibility laws on JSX (#209): `.tsx`/`.jsx` is parsed with
 * TypeScript, a `{...spread}` that may hold the answer is reported as not
 * readable, and a file that does not parse is reported, never passed.
 */
import { AccessibilityLintingEnforcementLaw } from '../../../src/checkers/accessibility-laws/accessibility-linting-enforcement';
import { DisclosureControlAriaStateLaw } from '../../../src/checkers/accessibility-laws/disclosure-control-aria-state';
import { ExplicitButtonTypeLaw } from '../../../src/checkers/accessibility-laws/explicit-button-type';
import { FormControlLabelingLaw } from '../../../src/checkers/accessibility-laws/form-control-labeling';
import { ModalDialogAccessibilityLaw } from '../../../src/checkers/accessibility-laws/modal-dialog-accessibility';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const V = (r: { violations?: string[] }): string[] => r.violations ?? [];
const REACT = { 'package.json': manifest({ react: '^19.0.0', next: '^16.0.0' }) };
type Law = { check: typeof FormControlLabelingLaw.check };
const run = (law: Law, files: Record<string, string>, thresholds: Record<string, unknown> = {}) =>
  law.check(ctx(project({ ...REACT, ...files }), { thresholds }));
const component = (body: string) =>
  `export function C({ open, setOpen, id, props }: any) {\n  return (\n${body}\n  );\n}\n`;

describe('every JSX law reports a file it cannot parse', () => {
  const broken = { 'src/app/broken.tsx': 'export const A = () => <div><button>x</div>;\n' };
  it.each([
    ['FormControlLabeling', FormControlLabelingLaw],
    ['ExplicitButtonType', ExplicitButtonTypeLaw],
    ['DisclosureControlAriaState', DisclosureControlAriaStateLaw],
    ['ModalDialogAccessibility', ModalDialogAccessibilityLaw],
  ])('%s', (_name, law) => {
    const result = run(law, broken);
    expect(result.passed).toBe(false);
    expect(V(result)).toEqual([
      expect.stringMatching(/src\/app\/broken\.tsx: could not be parsed \(line 1: .*\) — its JSX was NOT read/),
    ]);
  });
});

describe('ExplicitButtonTypeLaw in JSX', () => {
  it('red: a multi-line <button> without type; a spread reported as unreadable', () => {
    const result = run(ExplicitButtonTypeLaw, {
      'src/app/page.tsx': component(
        [
          '    <form>',
          '      <button',
          '        className="primary"',
          '        onClick={() => setOpen(true)}',
          '      >',
          '        Save',
          '      </button>',
          '      <button {...props}>More</button>',
          '    </form>',
        ].join('\n')
      ),
    });
    expect(V(result)).toEqual([
      expect.stringContaining('src/app/page.tsx: 1 <button> without an explicit type (defaults to submit) at line 4'),
      expect.stringContaining('1 <button {...spread}> with no type written at line 10 — whether the spread sets it cannot be read'),
    ]);
  });

  it('green: literal, expression and post-spread types; components and strings are not buttons', () => {
    const result = run(ExplicitButtonTypeLaw, {
      'src/app/page.tsx': component(
        [
          '    <div title="<button>">',
          '      {/* <button>commented</button> */}',
          '      <button type="button">A</button>',
          '      <button type={kind}>B</button>',
          '      <button {...props} type="submit">C</button>',
          '      <Button>D</Button>',
          '    </div>',
        ].join('\n')
      ).replace('props }: any', 'props, kind }: any').replace('export function', "import { Button } from './b';\nexport function"),
    });
    expect(V(result)).toEqual([]);
    expect(result.passed).toBe(true);
  });
});

describe('FormControlLabelingLaw in JSX', () => {
  it('red: placeholder-only, orphan id, spread without a name', () => {
    const result = run(FormControlLabelingLaw, {
      'src/app/form.tsx': component(
        [
          '    <form>',
          '      <input placeholder="Email" />',
          '      <input id="phone" />',
          '      <label htmlFor="other">Other</label>',
          '      <textarea {...props} />',
          '    </form>',
        ].join('\n')
      ),
    });
    expect(V(result)).toEqual([
      expect.stringContaining('src/app/form.tsx: 1 form control(s) without an accessible label (<label htmlFor>/wrapping <label>/aria-label/aria-labelledby) at line 4'),
      expect.stringContaining('1 control id(s) that no htmlFor in this file points at (id "phone" line 5)'),
      expect.stringContaining('1 form control(s) with a {...spread} and no label written at line 7'),
    ]);
  });

  it('green: htmlFor literal and expression, wrapping label, aria-*, exempt types, a component label', () => {
    const result = run(FormControlLabelingLaw, {
      'src/app/form.tsx': component(
        [
          '    <form>',
          '      <label htmlFor="email">Email</label>',
          '      <input id="email" type="email" />',
          '      <Label htmlFor={id}>Name</Label>',
          '      <input id={id} />',
          '      <label>',
          '        Remember me',
          '        <input type="checkbox" />',
          '      </label>',
          '      <select aria-label="Size"><option>S</option></select>',
          '      <textarea aria-labelledby="notes-h" />',
          '      <input type="hidden" name="csrf" />',
          '      <input type="submit" value="Go" />',
          '      <Input placeholder="not intrinsic" />',
          '    </form>',
        ].join('\n')
      ),
    });
    expect(V(result)).toEqual([]);
  });
});

describe('DisclosureControlAriaStateLaw in JSX (advisory)', () => {
  it('red: an onClick that toggles open state without aria-expanded', () => {
    const result = run(DisclosureControlAriaStateLaw, {
      'src/app/menu.tsx': component(
        [
          '    <nav>',
          '      <button type="button" onClick={() => setOpen(!open)}>Menu</button>',
          '      <button type="button" onClick={toggleMenu} {...props}>More</button>',
          '    </nav>',
        ].join('\n')
      ),
    });
    expect(V(result)).toEqual([
      expect.stringContaining('src/app/menu.tsx: 1 disclosure button(s) toggling a panel/menu without aria-expanded at line 4'),
      expect.stringContaining('1 disclosure button(s) with a {...spread} and no aria-expanded written at line 5'),
    ]);
  });

  it('green: aria-expanded bound, aria-pressed toggle, non-disclosure handler, a closer/opener that sets a literal', () => {
    const result = run(DisclosureControlAriaStateLaw, {
      'src/app/menu.tsx': component(
        [
          '    <nav>',
          '      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>Menu</button>',
          '      <button type="button" aria-pressed={open} onClick={() => setOpen(!open)}>Dark</button>',
          '      <button type="button" onClick={() => save()}>Save</button>',
          '      <button type="button" onClick={() => setOpen(false)}>Close</button>',
          '      <button type="button" onClick={() => setOpen(true)}>Open dialog</button>',
          '    </nav>',
        ].join('\n')
      ),
    });
    expect(V(result)).toEqual([]);
  });
});

describe('ModalDialogAccessibilityLaw in JSX', () => {
  it('red: a role="dialog" overlay with no aria-modal and no focus trap', () => {
    const result = run(ModalDialogAccessibilityLaw, {
      'src/app/modal.tsx': component(
        '    <div className="fixed inset-0 bg-black/50">\n      <div role="dialog">Hi</div>\n    </div>'
      ),
    });
    expect(V(result)).toEqual([
      expect.stringContaining('src/app/modal.tsx: dialog at line 3 without aria-modal="true" + a focus trap (named in thresholds.accessibility.focusTrapTokens)'),
    ]);
  });

  it('red: a native <dialog> never opened with showModal()', () => {
    const result = run(ModalDialogAccessibilityLaw, {
      'src/app/modal.tsx': component('    <dialog open={open}>Hi</dialog>'),
    });
    expect(V(result)).toEqual([expect.stringContaining('without showModal()')]);
  });

  it('green: a native <dialog> opened with showModal()', () => {
    const result = run(ModalDialogAccessibilityLaw, {
      'src/app/modal.tsx':
        "import { useEffect, useRef } from 'react';\nexport function M() {\n  const ref = useRef<HTMLDialogElement>(null);\n  useEffect(() => ref.current?.showModal(), []);\n  return <dialog ref={ref}><form method=\"dialog\"><button type=\"submit\">Close</button></form></dialog>;\n}\n",
    });
    expect(V(result)).toEqual([]);
  });

  it('green: role + aria-modal + a configured focus-trap token', () => {
    const files = {
      'src/app/modal.tsx':
        "import FocusTrap from 'focus-trap-react';\n" +
        component('    <FocusTrap>\n      <div role="dialog" aria-modal="true">Hi</div>\n    </FocusTrap>'),
    };
    expect(run(ModalDialogAccessibilityLaw, files).passed).toBe(false);
    expect(
      V(run(ModalDialogAccessibilityLaw, files, { accessibility: { focusTrapTokens: ['FocusTrap'] } }))
    ).toEqual([]);
  });

  it('green: inside a configured accessible dialog component (matched as written)', () => {
    const files = {
      'src/app/modal.tsx':
        "import * as Dialog from './dialog';\n" +
        component('    <Dialog.Content>\n      <div role="dialog">Hi</div>\n    </Dialog.Content>'),
    };
    expect(run(ModalDialogAccessibilityLaw, files).passed).toBe(false);
    expect(
      V(run(ModalDialogAccessibilityLaw, files, { accessibility: { accessibleDialogComponents: ['Dialog.Content'] } }))
    ).toEqual([]);
  });

  it('a page with no dialog is not judged', () => {
    const result = run(ModalDialogAccessibilityLaw, {
      'src/app/page.tsx': component('    <main className="fixed top-0">x</main>'),
    });
    expect(V(result)).toEqual([]);
  });
});

describe('AccessibilityLintingEnforcementLaw on JSX', () => {
  const page = { 'src/app/page.tsx': component('    <main>x</main>') };

  it('red: .tsx with an ESLint config that does not load eslint-plugin-jsx-a11y', () => {
    const result = run(AccessibilityLintingEnforcementLaw, {
      ...page,
      'eslint.config.mjs': 'export default [{ rules: {} }];\n',
    });
    expect(V(result)).toEqual([
      expect.stringContaining('does not load eslint-plugin-jsx-a11y'),
    ]);
  });

  it('red: eslint-config-next alone leaves two core rules off', () => {
    const result = run(AccessibilityLintingEnforcementLaw, {
      ...page,
      'eslint.config.mjs':
        "import nextVitals from 'eslint-config-next/core-web-vitals';\nexport default [...nextVitals];\n",
    });
    expect(V(result)).toEqual([
      'eslint-plugin-jsx-a11y rules missing: click-events-have-key-events, label-has-associated-control — enable them, or use the plugin\'s recommended preset.',
    ]);
  });

  it.each([
    ['flat preset by name', "import jsxA11y from 'eslint-plugin-jsx-a11y';\nexport default [jsxA11y.flatConfigs.recommended];\n", 'eslint.config.mjs'],
    ['flat strict through require', "const a11y = require('eslint-plugin-jsx-a11y');\nmodule.exports = [a11y.flatConfigs.strict];\n", 'eslint.config.cjs'],
    ['legacy extends', '{ "extends": ["plugin:jsx-a11y/recommended"] }\n', '.eslintrc.json'],
    [
      'next + the two rules named',
      "import nextVitals from 'eslint-config-next/core-web-vitals';\nexport default [...nextVitals, { rules: { 'jsx-a11y/click-events-have-key-events': 'error', 'jsx-a11y/label-has-associated-control': 'error' } }];\n",
      'eslint.config.mjs',
    ],
  ])('green: %s', (_name, content, file) => {
    const result = run(AccessibilityLintingEnforcementLaw, { ...page, [file]: content });
    expect(V(result)).toEqual([]);
  });

  it('a preset of ANOTHER plugin does not count as jsx-a11y\'s', () => {
    const result = run(AccessibilityLintingEnforcementLaw, {
      ...page,
      'eslint.config.mjs':
        "import jsxA11y from 'eslint-plugin-jsx-a11y';\nimport react from 'eslint-plugin-react';\nexport default [{ plugins: { 'jsx-a11y': jsxA11y } }, react.configs.recommended];\n",
    });
    expect(V(result).join()).toContain('eslint-plugin-jsx-a11y rules missing: alt-text, aria-props');
  });

  it('an .html file in a project without Angular does not ask for @angular-eslint', () => {
    const result = run(AccessibilityLintingEnforcementLaw, {
      ...page,
      'public/index.html': '<!doctype html><html><body></body></html>\n',
      'eslint.config.mjs': "import jsxA11y from 'eslint-plugin-jsx-a11y';\nexport default [jsxA11y.flatConfigs.recommended];\n",
    });
    expect(V(result)).toEqual([]);
  });
});

/**
 * #607 — in a Vue project the template accessibility laws advise in Vue or
 * framework-neutral terms, not in Angular syntax: no `[attr.aria-expanded]`,
 * no `[type]="…"`, no `cdkTrapFocus` in their violations or recommendations.
 */
import { DisclosureControlAriaStateLaw } from '../../src/checkers/accessibility-laws/disclosure-control-aria-state';
import { ExplicitButtonTypeLaw } from '../../src/checkers/accessibility-laws/explicit-button-type';
import { ModalDialogAccessibilityLaw } from '../../src/checkers/accessibility-laws/modal-dialog-accessibility';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const DIALOG = [
  '<template>',
  '  <div class="fixed inset-0" role="dialog">',
  '    <button @click="open = !open">Menu</button>',
  '  </div>',
  '</template>',
  '',
].join('\n');

const vueProject = (): string =>
  project({
    'package.json': JSON.stringify({
      name: 'app',
      version: '1.0.0',
      dependencies: { vue: '^3.5.0' },
    }),
    'src/main.ts':
      "import { createApp } from 'vue';\nexport const app = createApp;\n",
    'src/components/MenuDialog.vue': DIALOG,
  });

const ANGULAR_SYNTAX = /\[attr\.|\[type\]|cdkTrapFocus/;

function said(result: LawResult): string[] {
  return [...(result.violations ?? []), ...(result.suggestions ?? [])];
}

const LAWS: Array<[string, (c: LawCheckContext) => LawResult]> = [
  ['Explicit Button Type', c => ExplicitButtonTypeLaw.check(c)],
  [
    'Disclosure Control ARIA State',
    c => DisclosureControlAriaStateLaw.check(c),
  ],
  ['Modal Dialog Accessibility', c => ModalDialogAccessibilityLaw.check(c)],
];

describe('#607 the a11y laws advise a Vue project without Angular syntax', () => {
  it.each(LAWS)('%s: a finding, and no Angular-only advice', (_name, check) => {
    const result = check(ctx(vueProject()));
    expect(result.violations?.length).toBeGreaterThan(0);
    for (const line of said(result)) expect(line).not.toMatch(ANGULAR_SYNTAX);
  });

  it('Disclosure Control ARIA State names Vue binding', () => {
    const result = DisclosureControlAriaStateLaw.check(ctx(vueProject()));
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^src[\\/]components[\\/]MenuDialog\.vue: 1 disclosure button\(s\) toggling a panel\/menu without an aria-expanded bound to the open state \(:aria-expanded\) at line 3 /
      ),
    ]);
  });

  it('Modal Dialog Accessibility points a Vue app at focusTrapTokens', () => {
    const result = ModalDialogAccessibilityLaw.check(ctx(vueProject()));
    expect(result.violations).toEqual([
      expect.stringContaining(
        'a focus trap (name yours in thresholds.accessibility.focusTrapTokens)'
      ),
    ]);
  });
});

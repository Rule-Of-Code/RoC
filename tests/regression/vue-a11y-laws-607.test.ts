/**
 * #607, P5 — the four template-reading accessibility laws read the
 * `<template>` of `.vue` single-file components, with Vue's bindings
 * (`:attr`, `v-bind:attr`) and events (`@click`, `v-on:click`):
 * Explicit Button Type, Form Control Labeling, Disclosure Control ARIA State
 * and Modal Dialog Accessibility. Markup written in the component's script is
 * not markup; none of the four gets the ".vue not read" note.
 */
import { DisclosureControlAriaStateLaw } from '../../src/checkers/accessibility-laws/disclosure-control-aria-state';
import { ExplicitButtonTypeLaw } from '../../src/checkers/accessibility-laws/explicit-button-type';
import { FormControlLabelingLaw } from '../../src/checkers/accessibility-laws/form-control-labeling';
import { ModalDialogAccessibilityLaw } from '../../src/checkers/accessibility-laws/modal-dialog-accessibility';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const COMPONENT = 'src/components/MenuDialog.vue';
const DIALOG = [
  '<template>', //                                                                     1
  '  <div class="fixed inset-0" role="dialog">', //                                    2
  '    <button @click="open = !open">Menu</button>', //                                3
  '    <button type="button" :aria-expanded="open" @click.stop="toggleMenu()">More</button>', // 4
  '    <button :type="kind">Save</button>', //                                         5
  '    <input v-model="name" placeholder="Name">', //                                  6
  '    <input :id="emailId" v-model="email">', //                                      7
  '    <button v-bind:type="kind" v-on:click="expand()" v-bind:aria-expanded="expanded">Details</button>', // 8
  '  </div>', //                                                                       9
  '</template>', //                                                                   10
  '<script setup lang="ts">', //                                                      11
  'const markup = \'<button @click="open = !open">x</button><input>\';', //            12
  '</script>', //                                                                     13
  '<style>button { color: red; }</style>', //                                         14
  '',
].join('\n');

function vueProject(extra: Record<string, string> = {}): string {
  return project({
    'package.json': JSON.stringify({
      name: 'app',
      version: '1.0.0',
      dependencies: { vue: '^3.5.0' },
    }),
    'src/main.ts':
      "import { createApp } from 'vue';\nexport const app = createApp;\n",
    [COMPONENT]: DIALOG,
    ...extra,
  });
}

async function judge(
  check: (c: LawCheckContext) => LawResult,
  context: LawCheckContext = ctx(vueProject())
): Promise<{ violations: string[]; unread: boolean }> {
  const { value, scope } = await runLawScope(() => check(context));
  return {
    violations: value.violations ?? [],
    unread: vueNotReadNote(scope, [COMPONENT]) !== null,
  };
}

const FILE = String.raw`^src[\\/]components[\\/]MenuDialog\.vue: `;

describe('#607 P5 the template accessibility laws read .vue components', () => {
  it('Explicit Button Type: the untyped button at line 3 only; :type and v-bind:type count', async () => {
    const r = await judge(c => ExplicitButtonTypeLaw.check(c));
    expect(r.violations).toEqual([
      expect.stringMatching(
        new RegExp(`${FILE}1 <button> without an explicit type .* at line 3 `)
      ),
    ]);
    expect(r.unread).toBe(false);
  });

  it('Form Control Labeling: the placeholder-only input at line 6; :id names the other', async () => {
    const r = await judge(c => FormControlLabelingLaw.check(c));
    expect(r.violations).toEqual([
      expect.stringMatching(
        new RegExp(
          `${FILE}1 form control\\(s\\) without an accessible label .* at line 6 `
        )
      ),
    ]);
    expect(r.unread).toBe(false);
  });

  it('Disclosure Control ARIA State: @click toggles without aria-expanded at line 3; :aria-expanded and v-bind:aria-expanded count', async () => {
    const r = await judge(c => DisclosureControlAriaStateLaw.check(c));
    expect(r.violations).toEqual([
      expect.stringMatching(new RegExp(`${FILE}1 disclosure button\\(s\\)`)),
    ]);
    expect(r.violations[0]).toMatch(/\bline 3\b/);
    expect(r.unread).toBe(false);
  });

  it('Modal Dialog Accessibility: role="dialog" is there; aria-modal and a focus trap are not', async () => {
    const r = await judge(c => ModalDialogAccessibilityLaw.check(c));
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0]).toMatch(new RegExp(FILE));
    expect(r.violations[0]).toContain('aria-modal="true"');
    expect(r.violations[0]).toContain('a focus trap');
    expect(r.violations[0]).not.toContain('role="dialog"');
    expect(r.unread).toBe(false);
  });

  it('Modal Dialog Accessibility: a Vue focus trap named in focusTrapTokens counts', async () => {
    const root = vueProject({
      'src/components/Trapped.vue':
        '<template>\n  <focus-trap>\n    <div class="fixed inset-0" role="dialog" :aria-modal="true"><p>Hi</p></div>\n  </focus-trap>\n</template>\n',
    });
    const context = ctx(root);
    context.config = {
      ...context.config,
      thresholds: {
        ...context.config.thresholds,
        accessibility: { focusTrapTokens: ['focus-trap'] },
      },
    };
    const r = await judge(c => ModalDialogAccessibilityLaw.check(c), context);
    expect(r.violations.filter(v => /Trapped\.vue/.test(v))).toEqual([]);
    // Control: without the token, the same component has no focus trap.
    const plain = await judge(
      c => ModalDialogAccessibilityLaw.check(c),
      ctx(root)
    );
    expect(plain.violations.filter(v => /Trapped\.vue/.test(v))).toEqual([
      expect.stringContaining('a focus trap'),
    ]);
  });
});

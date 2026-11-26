/**
 * #12 V0 — the `vue` key of `satisfiedBy`, and its first category:
 * accessibility.
 *
 * Each guidance text is proved on a Vue + Vite project: a component that
 * breaks the law fails, and the same component written the way
 * `satisfiedBy.vue` says passes, with no ".vue not read" note. A law that
 * does not read .vue (Accessibility Linting Enforcement: no rule set for Vue
 * templates) carries no `vue` key.
 *
 * The invariant at the end holds for every category written later: a law
 * that carries `satisfiedBy.vue` reads the .vue files of a Vue project.
 */
import { DisclosureControlAriaStateLaw } from '../../src/checkers/accessibility-laws/disclosure-control-aria-state';
import { ExplicitButtonTypeLaw } from '../../src/checkers/accessibility-laws/explicit-button-type';
import { FormControlLabelingLaw } from '../../src/checkers/accessibility-laws/form-control-labeling';
import { ModalDialogAccessibilityLaw } from '../../src/checkers/accessibility-laws/modal-dialog-accessibility';
import { buildLawsJson } from '../../src/cli/laws-json';
import { ACCESSIBILITY_LAWS } from '../../src/data/accessibility-laws';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import type { RuleOfCodeConfig } from '../../src/types';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const COMPONENT = 'src/components/Panel.vue';

/** A Vue 3 + Vite app, as `npm create vue` lays it out, with one component. */
function vueViteProject(template: string): string {
  return project({
    'package.json': JSON.stringify({
      name: 'vue-vite-app',
      version: '1.0.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build' },
      dependencies: { vue: '^3.5.13' },
      devDependencies: { vite: '^6.0.0', '@vitejs/plugin-vue': '^5.2.1' },
    }),
    'vite.config.ts': [
      "import { defineConfig } from 'vite';",
      "import vue from '@vitejs/plugin-vue';",
      'export default defineConfig({ plugins: [vue()] });',
    ].join('\n'),
    'index.html':
      '<!doctype html>\n<html lang="en"><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n',
    'src/main.ts': [
      "import { createApp } from 'vue';",
      "import App from './App.vue';",
      "createApp(App).mount('#app');",
    ].join('\n'),
    'src/App.vue': [
      '<template>',
      '  <Panel />',
      '</template>',
      '<script setup lang="ts">',
      "import Panel from './components/Panel.vue';",
      '</script>',
      '',
    ].join('\n'),
    [COMPONENT]: [
      '<template>',
      template,
      '</template>',
      '<script setup lang="ts">',
      "import { ref } from 'vue';",
      'const open = ref(false);',
      "const name = ref('');",
      'function toggleMenu() { open.value = !open.value; }',
      '</script>',
      '',
    ].join('\n'),
  });
}

/** The config a Vue project audits with, plus the given thresholds. */
function vueConfig(
  root: string,
  thresholds: Record<string, unknown> = {}
): LawCheckContext {
  const context = ctx(root, { thresholds });
  context.config.project.type = 'vue' as never;
  return context;
}

async function judge(
  check: (c: LawCheckContext) => LawResult,
  context: LawCheckContext
): Promise<{ passed: boolean; violations: string[]; unread: boolean }> {
  const { value, scope } = await runLawScope(() => check(context));
  return {
    passed: value.passed,
    violations: value.violations ?? [],
    unread: vueNotReadNote(scope, [COMPONENT, 'src/App.vue']) !== null,
  };
}

const vueGuidance = (title: string): string =>
  ACCESSIBILITY_LAWS.find(law => law.title === title)?.satisfiedBy?.vue ?? '';

describe('#12 V0: satisfiedBy.vue for accessibility, proved on a Vue + Vite app', () => {
  describe('Explicit Button Type', () => {
    it('the guidance names type="button" and :type', () => {
      expect(vueGuidance('Explicit Button Type')).toMatch(/type="button"/);
      expect(vueGuidance('Explicit Button Type')).toMatch(/:type/);
    });

    it('before: a <button> without a type fails', async () => {
      const r = await judge(
        c => ExplicitButtonTypeLaw.check(c),
        vueConfig(vueViteProject('  <button @click="save">Save</button>'))
      );
      expect(r.passed).toBe(false);
      expect(r.unread).toBe(false);
    });

    it('after: type="button" and :type pass', async () => {
      const r = await judge(
        c => ExplicitButtonTypeLaw.check(c),
        vueConfig(
          vueViteProject(
            [
              '  <button type="button" @click="save">Save</button>',
              '  <button :type="kind">Send</button>',
            ].join('\n')
          )
        )
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
      expect(r.unread).toBe(false);
    });
  });

  describe('Form Control Labeling', () => {
    it('before: an input named only by v-model and placeholder fails', async () => {
      const r = await judge(
        c => FormControlLabelingLaw.check(c),
        vueConfig(vueViteProject('  <input v-model="name" placeholder="Name">'))
      );
      expect(r.passed).toBe(false);
      expect(r.unread).toBe(false);
    });

    it('after: :id with <label for>, a wrapping <label>, aria-label and :aria-labelledby pass; a hidden input is exempt', async () => {
      const r = await judge(
        c => FormControlLabelingLaw.check(c),
        vueConfig(
          vueViteProject(
            [
              '  <label for="name">Name</label>',
              '  <input :id="\'name\'" v-model="name">',
              '  <label>Email <input v-model="email"></label>',
              '  <select aria-label="Country" v-model="country"></select>',
              '  <textarea :aria-labelledby="noteId" v-model="note"></textarea>',
              '  <input type="hidden" v-model="token">',
            ].join('\n')
          )
        )
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
      expect(r.unread).toBe(false);
    });
  });

  describe('Disclosure Control ARIA State', () => {
    it('before: a @click toggle without aria-expanded fails', async () => {
      const r = await judge(
        c => DisclosureControlAriaStateLaw.check(c),
        vueConfig(
          vueViteProject(
            '  <button type="button" @click="toggleMenu()">Menu</button>'
          )
        )
      );
      expect(r.passed).toBe(false);
      expect(r.unread).toBe(false);
    });

    it('after: :aria-expanded="open" passes, and a toggle button with aria-pressed needs none', async () => {
      const r = await judge(
        c => DisclosureControlAriaStateLaw.check(c),
        vueConfig(
          vueViteProject(
            [
              '  <button type="button" :aria-expanded="open" @click="toggleMenu()">Menu</button>',
              '  <button type="button" :aria-pressed="dark" @click="toggleTheme()">Dark</button>',
            ].join('\n')
          )
        )
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
      expect(r.unread).toBe(false);
    });
  });

  describe('Modal Dialog Accessibility', () => {
    const SHELL = (inner: string): string =>
      [
        '  <div v-if="open" class="fixed inset-0 bg-black/50">',
        inner,
        '  </div>',
      ].join('\n');

    it('before: a fixed inset-0 overlay without role, aria-modal or a trap fails', async () => {
      const r = await judge(
        c => ModalDialogAccessibilityLaw.check(c),
        vueConfig(vueViteProject(SHELL('    <p>Are you sure?</p>')))
      );
      expect(r.passed).toBe(false);
      expect(r.unread).toBe(false);
    });

    it('after: role="dialog" + aria-modal="true" inside <FocusTrap>, named in focusTrapTokens as written, passes', async () => {
      const r = await judge(
        c => ModalDialogAccessibilityLaw.check(c),
        vueConfig(
          vueViteProject(
            SHELL(
              [
                '    <FocusTrap :active="open">',
                '      <div role="dialog" aria-modal="true"><p>Are you sure?</p></div>',
                '    </FocusTrap>',
              ].join('\n')
            )
          ),
          { accessibility: { focusTrapTokens: ['FocusTrap'] } }
        )
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
      expect(r.unread).toBe(false);
    });

    it('control: the same trap not named in focusTrapTokens still fails', async () => {
      const r = await judge(
        c => ModalDialogAccessibilityLaw.check(c),
        vueConfig(
          vueViteProject(
            SHELL(
              [
                '    <FocusTrap :active="open">',
                '      <div role="dialog" aria-modal="true"><p>Are you sure?</p></div>',
                '    </FocusTrap>',
              ].join('\n')
            )
          )
        )
      );
      expect(r.passed).toBe(false);
    });

    it('after: a shared component named in accessibleDialogComponents passes', async () => {
      const r = await judge(
        c => ModalDialogAccessibilityLaw.check(c),
        vueConfig(
          vueViteProject(
            SHELL('    <AppDialog title="Confirm">Are you sure?</AppDialog>')
          ),
          { accessibility: { accessibleDialogComponents: ['AppDialog'] } }
        )
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
    });
  });

  it('Accessibility Linting Enforcement carries no vue key: it judges no Vue template', () => {
    expect(
      ACCESSIBILITY_LAWS.find(
        law => law.title === 'Accessibility Linting Enforcement'
      )?.satisfiedBy?.vue
    ).toBeUndefined();
  });

  it('laws --json: schemaVersion 4, vue in keys, in stackToKey.frontend and in projectTypeToKey', () => {
    const payload = buildLawsJson(ModularLawsRegistry.getAll(), {});
    expect(payload.schemaVersion).toBe(4);
    expect(payload.satisfiedByStacks.keys).toEqual([
      'typescript',
      'angular',
      'react',
      'vue',
      'python',
      'ionic',
      'capacitor',
    ]);
    expect(payload.satisfiedByStacks.stackToKey.frontend).toEqual([
      'angular',
      'react',
      'vue',
    ]);
    expect(payload.satisfiedByStacks.projectTypeToKey.vue).toBe('vue');
    expect(
      payload.laws
        .filter(law => law.satisfiedBy?.vue)
        .map(law => law.name)
        .sort()
    ).toEqual([
      'Disclosure Control ARIA State',
      'Explicit Button Type',
      'Form Control Labeling',
      'Modal Dialog Accessibility',
    ]);
  });
});

describe('#12 invariant: a law that carries satisfiedBy.vue reads .vue files', () => {
  const withVue = ModularLawsRegistry.getAll().filter(law =>
    buildLawsJson([law], {}).laws.some(
      serialized => serialized.satisfiedBy?.vue
    )
  );

  it('at least one law carries it', () => {
    expect(withVue.length).toBeGreaterThan(0);
  });

  it.each(withVue.map(law => [law.name, law] as const))(
    '%s: no ".vue not read" note on a Vue + Vite app',
    async (_name, law) => {
      const root = vueViteProject('  <button type="button">Ok</button>');
      const config = vueConfig(root).config as RuleOfCodeConfig;
      const { scope } = await runLawScope(() => law.check(root, config));
      expect(vueNotReadNote(scope, [COMPONENT, 'src/App.vue'])).toBeNull();
    }
  );
});

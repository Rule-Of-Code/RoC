/**
 * #12 — the i18n law reads Vue: vue-i18n is a recognised setup, and the
 * `<template>` of each `.vue` component is read for hardcoded text, as JSX is.
 *
 * Before: a Vue project was told "Missing Angular i18n configuration", its
 * templates were not read, and the law carried the ".vue not read" note.
 */
import { InternationalizationCompliancePolicyLaw } from '../../src/laws/documentation/internationalization-compliance-policy';
import type { LawCheckContext } from '../../src/types/law.types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const COMPONENT = 'src/components/Greeting.vue';

const sfc = (template: string, script = "import { ref } from 'vue';"): string =>
  [
    '<template>',
    template,
    '</template>',
    '',
    '<script setup lang="ts">',
    script,
    '</script>',
    '',
  ].join('\n');

/** A Vue 3 + Vite app; `i18n` adds vue-i18n, its messages and its plugin. */
function vueApp(component: string, i18n: boolean): string {
  return project({
    'package.json': JSON.stringify({
      name: 'vue-app',
      version: '0.0.0',
      type: 'module',
      dependencies: {
        vue: '^3.5.42',
        ...(i18n ? { 'vue-i18n': '^11.1.0' } : {}),
      },
      devDependencies: { vite: '^8.2.2', '@vitejs/plugin-vue': '^6.0.8' },
    }),
    'vite.config.ts':
      "import { defineConfig } from 'vite';\nimport vue from '@vitejs/plugin-vue';\nexport default defineConfig({ plugins: [vue()] });\n",
    'index.html':
      '<!doctype html><html lang="en"><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n',
    'src/main.ts': i18n
      ? [
          "import { createApp } from 'vue';",
          "import { createI18n } from 'vue-i18n';",
          "import App from './App.vue';",
          "import en from './locales/en.json';",
          "const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });",
          "createApp(App).use(i18n).mount('#app');",
        ].join('\n')
      : "import { createApp } from 'vue';\nimport App from './App.vue';\ncreateApp(App).mount('#app');\n",
    ...(i18n
      ? {
          'src/locales/en.json': JSON.stringify({
            greeting: { title: 'Welcome back', name: 'Your name' },
          }),
        }
      : {}),
    'src/App.vue': sfc(
      '  <Greeting />',
      "import Greeting from './components/Greeting.vue';"
    ),
    [COMPONENT]: component,
  });
}

async function judge(root: string): Promise<{
  passed: boolean;
  violations: string[];
  details: Array<{ file?: string; line?: number; message: string }>;
  note: boolean;
}> {
  const context: LawCheckContext = ctx(root);
  const { value, scope } = await runLawScope(() =>
    InternationalizationCompliancePolicyLaw.check(context)
  );
  return {
    passed: value.passed,
    violations: value.violations ?? [],
    details: value.violationDetails ?? [],
    note: vueNotReadNote(scope, ['src/App.vue', COMPONENT]) !== null,
  };
}

describe('#12 the i18n law reads Vue components', () => {
  it('without vue-i18n: the missing setup is named as Vue, and each hardcoded text is found at its line', async () => {
    const r = await judge(
      vueApp(
        sfc(
          [
            '  <section class="greeting">', //                        line 2
            '    <h1>Welcome back</h1>', //                            line 3
            '    <input v-model="name" placeholder="Your name">', //   line 4
            '    <p :title="tip">', //                                 line 5
            '      {{ count }}', //                                    line 6
            '      items in your cart', //                             line 7
            '    </p>', //                                             line 8
            '  </section>',
          ].join('\n')
        ),
        false
      )
    );
    expect(r.passed).toBe(false);
    expect(r.violations).toEqual(
      expect.arrayContaining([
        'Missing i18n configuration — no vue-i18n declared in any workspace package.json (nor an Angular i18n setup)',
        'Missing i18n translation files',
        `Hardcoded text found in Vue templates: 3 text(s), e.g. ${COMPONENT}:3 "Welcome back"; ${COMPONENT}:4 "Your name"; ${COMPONENT}:7 "items in your cart"`,
      ])
    );
    expect(r.details.filter(d => d.file === COMPONENT)).toEqual([
      {
        file: COMPONENT,
        line: 3,
        message: 'hardcoded Vue template text "Welcome back"',
      },
      {
        file: COMPONENT,
        line: 4,
        message: 'hardcoded Vue template text "Your name"',
      },
      {
        file: COMPONENT,
        line: 7,
        message: 'hardcoded Vue template text "items in your cart"',
      },
    ]);
    expect(r.note).toBe(false);
  });

  it('with vue-i18n: $t in mustaches, bound attributes, v-t and <i18n-t> pass', async () => {
    const r = await judge(
      vueApp(
        sfc(
          [
            '  <section class="greeting">',
            "    <h1>{{ $t('greeting.title') }}</h1>",
            '    <input v-model="name" :placeholder="t(\'greeting.name\')">',
            '    <p v-t="\'greeting.title\'"></p>',
            '    <i18n-t keypath="greeting.title" tag="p">',
            '      <template #name><strong>Ada</strong></template>',
            '    </i18n-t>',
            '    <span v-text="label">Fallback label</span>',
            '  </section>',
          ].join('\n'),
          "import { useI18n } from 'vue-i18n';\nconst { t } = useI18n();"
        ),
        true
      )
    );
    expect(r.violations).toEqual([]);
    expect(r.passed).toBe(true);
    expect(r.note).toBe(false);
  });

  it('text in the script or the style of a component is not template text', async () => {
    const r = await judge(
      vueApp(
        [
          '<template>',
          "  <h1>{{ $t('greeting.title') }}</h1>",
          '</template>',
          '<script setup lang="ts">',
          "const markup = '<h1>Welcome back to the shop</h1>';",
          '</script>',
          '<style>',
          'h1::after { content: "Hello there friend"; }',
          '</style>',
          '',
        ].join('\n'),
        true
      )
    );
    expect(r.violations).toEqual([]);
  });

  it('a template that cannot be read is reported, not passed', async () => {
    const r = await judge(
      vueApp(sfc('  <input placeholder="never closed>\n'), true)
    );
    expect(r.passed).toBe(false);
    expect(r.violations).toEqual([
      expect.stringMatching(
        /^src\/components\/Greeting\.vue: the <template> could not be read \(.+\) — its text was not checked for i18n$/
      ),
    ]);
  });

  it('control: a React project is still told about the React libraries', async () => {
    const root = project({
      'package.json': JSON.stringify({ dependencies: { react: '^19.0.0' } }),
      'src/App.tsx': 'export const App = () => <h1>Welcome back</h1>;\n',
    });
    const r = await judge(root);
    expect(r.violations[0]).toBe(
      'Missing i18n configuration — no next-intl or react-i18next declared in any workspace package.json (nor an Angular i18n setup)'
    );
  });
});

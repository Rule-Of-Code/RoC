/**
 * #12 V-i18n — satisfiedBy.vue for Internationalization (i18n) Compliance
 * Policy, now that the law recognises vue-i18n and reads .vue templates
 * (#693).
 *
 * Proved on a Vue 3 + Vite app and a Nuxt 3 app, with the config a real
 * audit reads (ConfigLoader): the app the text describes passes with no
 * ".vue not read" note; without vue-i18n, its message files and translated
 * template text it fails; one static attribute the text names still fails;
 * and a Nuxt app that declares @nuxtjs/i18n but not vue-i18n fails, as the
 * text says, until vue-i18n is declared too.
 */
import { InternationalizationCompliancePolicyLaw } from '../../src/laws/documentation/internationalization-compliance-policy';
import { ConfigLoader } from '../../src/config/loader';
import { DOCUMENTATION_LAWS } from '../../src/data/documentation-laws';
import type { LawCheckContext } from '../../src/types/law.types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const COMPONENT = 'src/components/Greeting.vue';
const MESSAGES = JSON.stringify({
  greeting: { title: 'Welcome back', email: 'Your email', more: 'Read more' },
});

/** A Vue 3 + Vite app, as `npm create vue` lays it out; `i18n` adds vue-i18n, its messages and its plugin. */
function vueViteProject(template: string[], i18n: boolean): string {
  return project({
    'package.json': JSON.stringify({
      name: 'vue-vite-app',
      version: '1.0.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build' },
      dependencies: {
        vue: '^3.5.13',
        ...(i18n ? { 'vue-i18n': '^11.1.0' } : {}),
      },
      devDependencies: { vite: '^6.0.0', '@vitejs/plugin-vue': '^5.2.1' },
    }),
    'vite.config.ts': [
      "import { defineConfig } from 'vite';",
      "import vue from '@vitejs/plugin-vue';",
      'export default defineConfig({ plugins: [vue()] });',
    ].join('\n'),
    'index.html':
      '<!doctype html>\n<html lang="en"><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n',
    'src/main.ts': i18n
      ? [
          "import { createApp } from 'vue';",
          "import { createI18n } from 'vue-i18n';",
          "import App from './App.vue';",
          "import en from './locales/en.json';",
          "const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });",
          "createApp(App).use(i18n).mount('#app');",
        ].join('\n')
      : [
          "import { createApp } from 'vue';",
          "import App from './App.vue';",
          "createApp(App).mount('#app');",
        ].join('\n'),
    ...(i18n ? { 'src/locales/en.json': MESSAGES } : {}),
    'src/App.vue': [
      '<template>',
      '  <Greeting />',
      '</template>',
      '<script setup lang="ts">',
      "import Greeting from './components/Greeting.vue';",
      '</script>',
      '',
    ].join('\n'),
    [COMPONENT]: [
      '<template>',
      '  <section>',
      ...template,
      '  </section>',
      '</template>',
      '<script setup lang="ts">',
      ...(i18n
        ? ["import { useI18n } from 'vue-i18n';", 'const { t } = useI18n();']
        : ["const email = '';"]),
      '</script>',
      '',
    ].join('\n'),
  });
}

/** The template the guidance describes: every user text through vue-i18n. */
const TRANSLATED = [
  "    <h1>{{ $t('greeting.title') }}</h1>",
  '    <input type="email" :placeholder="$t(\'greeting.email\')" :aria-label="$t(\'greeting.email\')">',
  '    <p v-t="\'greeting.more\'"></p>',
  '    <i18n-t keypath="greeting.title" tag="p"></i18n-t>',
];

/** A Nuxt 3 app with @nuxtjs/i18n, its messages in i18n/locales/. */
function nuxtProject(declaresVueI18n: boolean): string {
  return project({
    'package.json': JSON.stringify({
      name: 'nuxt-app',
      private: true,
      type: 'module',
      scripts: { dev: 'nuxt dev', build: 'nuxt build' },
      dependencies: {
        nuxt: '^3.15.0',
        vue: '^3.5.13',
        '@nuxtjs/i18n': '^9.1.0',
        ...(declaresVueI18n ? { 'vue-i18n': '^10.0.5' } : {}),
      },
    }),
    'nuxt.config.ts': [
      'export default defineNuxtConfig({',
      "  modules: ['@nuxtjs/i18n'],",
      "  i18n: { defaultLocale: 'en', locales: [{ code: 'en', file: 'en.json' }] },",
      '});',
    ].join('\n'),
    'i18n/locales/en.json': MESSAGES,
    'app.vue': '<template>\n  <NuxtPage />\n</template>\n',
    'pages/index.vue': [
      '<template>',
      "  <h1>{{ $t('greeting.title') }}</h1>",
      '</template>',
      '',
    ].join('\n'),
  });
}

/** The config a real audit reads. */
function auditConfig(root: string): LawCheckContext {
  return { projectRoot: root, config: ConfigLoader.load(root) };
}

async function judge(
  root: string
): Promise<{ passed: boolean; violations: string[]; unread: boolean }> {
  const context = auditConfig(root);
  expect(context.config.project.type).toBe('vue');
  const { value, scope } = await runLawScope(() =>
    InternationalizationCompliancePolicyLaw.check(context)
  );
  return {
    passed: value.passed,
    violations: value.violations ?? [],
    unread:
      vueNotReadNote(scope, [COMPONENT, 'src/App.vue', 'app.vue']) !== null,
  };
}

describe('#12 V-i18n: satisfiedBy.vue for the i18n law, proved on Vue + Vite and Nuxt apps', () => {
  it('the guidance names vue-i18n, @nuxtjs/i18n, the message files and the four template forms', () => {
    const text =
      DOCUMENTATION_LAWS.find(
        law => law.title === 'Internationalization (i18n) Compliance Policy'
      )?.satisfiedBy?.vue ?? '';
    expect(text).toMatch(/Declare vue-i18n in package\.json/);
    expect(text).toMatch(/@nuxtjs\/i18n declares vue-i18n too/);
    expect(text).toMatch(/src\/locales\/en\.json/);
    expect(text).toMatch(/\{\{ \$t\('…'\) \}\}/);
    expect(text).toMatch(/:placeholder/);
    expect(text).toMatch(/v-t or <i18n-t>/);
  });

  it('before: no vue-i18n, no message files, text written in the template fails on all three', async () => {
    const r = await judge(
      vueViteProject(
        [
          '    <h1>Welcome back</h1>',
          '    <input type="email" placeholder="Your email" v-model="email">',
        ],
        false
      )
    );
    expect(r.passed).toBe(false);
    const text = r.violations.join('\n');
    expect(text).toMatch(/no vue-i18n declared in any workspace package\.json/);
    expect(text).toMatch(/Missing i18n translation files/);
    expect(text).toMatch(/Greeting\.vue:\d+ "Welcome back"/);
    expect(text).toMatch(/Greeting\.vue:\d+ "Your email"/);
    expect(r.unread).toBe(false);
  });

  it('after: vue-i18n, src/locales/en.json, $t in mustaches and bindings, v-t and <i18n-t> pass', async () => {
    const r = await judge(vueViteProject(TRANSLATED, true));
    expect(r.violations).toEqual([]);
    expect(r.passed).toBe(true);
    expect(r.unread).toBe(false);
  });

  it('control: the same app with one static title the text names still fails, at its line', async () => {
    const r = await judge(
      vueViteProject(
        [
          ...TRANSLATED,
          '    <button type="button" title="Open settings">⚙</button>',
        ],
        true
      )
    );
    expect(r.passed).toBe(false);
    expect(r.violations.join('\n')).toMatch(
      /Greeting\.vue:\d+ "Open settings"/
    );
  });

  it('Nuxt, before: @nuxtjs/i18n without vue-i18n is not a recognised setup', async () => {
    const r = await judge(nuxtProject(false));
    expect(r.passed).toBe(false);
    expect(r.violations.join('\n')).toMatch(/no vue-i18n declared/);
  });

  it('Nuxt, after: vue-i18n declared beside @nuxtjs/i18n passes', async () => {
    const r = await judge(nuxtProject(true));
    expect(r.violations).toEqual([]);
    expect(r.passed).toBe(true);
    expect(r.unread).toBe(false);
  });
});

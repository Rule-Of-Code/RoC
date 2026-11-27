/**
 * #12 — satisfiedBy.vue for Primary Locale Font Preloaded. The law judges a
 * Vue project: it reads @font-face from stylesheets and from the <style>
 * blocks of .vue files, the locale from <html lang>, and the preload from a
 * <link rel="preload" as="font"> — on a Vue + Vite app, all in index.html
 * and the components.
 *
 * Proved on a Vue 3 + Vite app with the config a real audit reads
 * (ConfigLoader): the app without a preload fails at the face in App.vue, the
 * app the text describes passes with no ".vue not read" note, and a preload
 * without crossorigin is a finding. The limits the law names hold: Nuxt's
 * app.head and useHead() give no locale (judged nothing), and Vue I18n's
 * createI18n({ locale }) is not read — the locale judged is <html lang>'s.
 */
import { ConfigLoader } from '../../src/config/loader';
import { CLIENT_DEPLOY_LAWS } from '../../src/data/client-deploy-laws';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import type { RuleOfCodeConfig } from '../../src/types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const LAW = 'Primary Locale Font Preloaded';
const CYRILLIC = '/fonts/body-cyrillic.woff2';

/** App.vue with the face split by unicode-range in a <style lang="scss"> block. */
const APP_VUE = [
  '<template>',
  '  <RouterView />',
  '</template>',
  '',
  '<style lang="scss">',
  '// latin',
  '@font-face {',
  "  font-family: 'Body Sans';",
  "  src: url('/fonts/body-latin.woff2') format('woff2');",
  '  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+2000-206F;',
  '}',
  '// cyrillic',
  '@font-face {',
  "  font-family: 'Body Sans';",
  `  src: url('${CYRILLIC}') format('woff2');`,
  '  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;',
  '}',
  '</style>',
  '',
].join('\n');

const VUE_FILES = ['src/App.vue'];

const manifest = (dependencies: Record<string, string> = {}): string =>
  JSON.stringify({
    name: 'vue-vite-app',
    version: '1.0.0',
    private: true,
    type: 'module',
    dependencies: { vue: '^3.5.13', 'vue-router': '^4.5.0', ...dependencies },
    devDependencies: { vite: '^6.0.0', '@vitejs/plugin-vue': '^5.2.1' },
  });

const indexHtml = (htmlOpen: string, head = ''): string =>
  `<!doctype html>\n${htmlOpen}\n<head>\n${head}\n</head>\n<body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>\n</html>\n`;

const PRELOAD = `  <link rel="preload" as="font" type="font/woff2" href="${CYRILLIC}" crossorigin>`;

/** A create-vue app; `files` overrides or adds. */
const viteApp = (
  files: Record<string, string> = {}
): Record<string, string> => ({
  'package.json': manifest(),
  'vite.config.ts': [
    "import { defineConfig } from 'vite';",
    "import vue from '@vitejs/plugin-vue';",
    'export default defineConfig({ plugins: [vue()] });',
  ].join('\n'),
  'index.html': indexHtml('<html lang="bg">'),
  'src/main.ts': [
    "import { createApp } from 'vue';",
    "import App from './App.vue';",
    "createApp(App).mount('#app');",
  ].join('\n'),
  'src/App.vue': APP_VUE,
  ...files,
});

async function judge(files: Record<string, string>): Promise<{
  passed: boolean;
  message: string;
  violations: string[];
  noted: boolean;
}> {
  const root = project(files);
  const config: RuleOfCodeConfig = ConfigLoader.load(root);
  const law = ModularLawsRegistry.getAll().find(
    candidate => candidate.name === LAW
  );
  if (!law) throw new Error(`${LAW} is not in the registry`);
  const { value, scope } = await runLawScope(() => law.check(root, config));
  return {
    passed: value.passed,
    message: value.message ?? '',
    violations: value.violations ?? [],
    noted: vueNotReadNote(scope, VUE_FILES) !== null,
  };
}

const lawData = CLIENT_DEPLOY_LAWS.find(law => law.title === LAW);

describe('#12: satisfiedBy.vue for Primary Locale Font Preloaded, proved on a Vue + Vite app', () => {
  it('carries a vue text that names index.html, the preload with crossorigin and the .vue <style> blocks, with no advice to rewrite', () => {
    const vue = lawData?.satisfiedBy?.vue ?? '';
    expect(vue).toMatch(/^In index\.html \(Vite\): <html lang="…">/);
    expect(vue).toContain(
      '<link rel="preload" as="font" type="font/woff2" href="…" crossorigin>'
    );
    expect(vue).toMatch(/<style> blocks of \.vue files \(lang="scss" too\)/);
    expect(vue).not.toMatch(/not yet recognised|rewrite|instead of/);
  });

  it('names the Vue limits: Nuxt app.head, useHead() and createI18n({ locale }) are not yet recognised', () => {
    expect(lawData?.detectionLimits).toContain(
      "Vue: the locale and the preload are read from index.html (Vite). Nuxt's app.head in nuxt.config (htmlAttrs.lang, link), useHead() and Vue I18n's createI18n({ locale }) are not yet recognised: a Nuxt app with no .html document is judged nothing (no default locale found), and with createI18n the locale read is the one of <html lang>."
    );
  });

  it('before: lang="bg", no preload — a finding at the Cyrillic face in App.vue, with no ".vue not read" note', async () => {
    const r = await judge(viteApp());
    expect(r.passed).toBe(false);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0]).toMatch(
      /^src\/App\.vue:\d+: 'Body Sans' is split by unicode-range and its Cyrillic subset .*body-cyrillic\.woff2.* serves the app's locale 'bg' \(index\.html:2 \(<html lang="bg">\)\), but no <link rel="preload" as="font"> loads it/
    );
    expect(r.noted).toBe(false);
  });

  it('after: the preload with crossorigin in index.html passes, with no ".vue not read" note', async () => {
    const r = await judge(
      viteApp({ 'index.html': indexHtml('<html lang="bg">', PRELOAD) })
    );
    expect(r.violations).toEqual([]);
    expect(r.passed).toBe(true);
    expect(r.message).toMatch(/locale\(s\) bg/);
    expect(r.noted).toBe(false);
  });

  it('a preload without crossorigin is a finding', async () => {
    const r = await judge(
      viteApp({
        'index.html': indexHtml(
          '<html lang="bg">',
          PRELOAD.replace(' crossorigin', '')
        ),
      })
    );
    expect(r.passed).toBe(false);
    expect(r.violations.join('\n')).toMatch(
      /index\.html:\d+: the font preload of body-cyrillic\.woff2 .* has no crossorigin attribute/
    );
  });

  it('limit: Nuxt — locale and preload in nuxt.config app.head, no .html document → judged nothing (no default locale found)', async () => {
    const r = await judge({
      'package.json': manifest({ nuxt: '^3.15.0' }),
      'nuxt.config.ts': [
        'export default defineNuxtConfig({',
        '  app: {',
        '    head: {',
        "      htmlAttrs: { lang: 'bg' },",
        `      link: [{ rel: 'preload', as: 'font', type: 'font/woff2', href: '${CYRILLIC}', crossorigin: '' }],`,
        '    },',
        '  },',
        '});',
      ].join('\n'),
      'app.vue': APP_VUE.replace('<RouterView />', '<NuxtPage />'),
    });
    expect(r.passed).toBe(false);
    expect(r.violations.join('\n')).toMatch(
      /^found no default locale \(<html lang>, i18n\.sourceLocale, a LOCALE_ID provider, i18n\.defaultLocale\) — this law judged nothing/
    );
  });

  it('limit: useHead({ htmlAttrs: { lang } }) with no lang in index.html → judged nothing (no default locale found)', async () => {
    const r = await judge(
      viteApp({
        'index.html': indexHtml('<html>', PRELOAD),
        'src/App.vue': APP_VUE.replace(
          '<style lang="scss">',
          [
            '<script setup lang="ts">',
            "import { useHead } from '@unhead/vue';",
            "useHead({ htmlAttrs: { lang: 'bg' } });",
            '</script>',
            '',
            '<style lang="scss">',
          ].join('\n')
        ),
      })
    );
    expect(r.passed).toBe(false);
    expect(r.violations.join('\n')).toMatch(
      /^found no default locale .* — this law judged nothing/
    );
  });

  it('limit: createI18n({ locale: "bg" }) is not read — with <html lang="en"> the locale judged is en (Latin), so the missing Cyrillic preload is not a finding', async () => {
    const r = await judge(
      viteApp({
        'package.json': manifest({ 'vue-i18n': '^10.0.5' }),
        'index.html': indexHtml('<html lang="en">'),
        'src/main.ts': [
          "import { createApp } from 'vue';",
          "import { createI18n } from 'vue-i18n';",
          "import App from './App.vue';",
          "const i18n = createI18n({ legacy: false, locale: 'bg', messages: {} });",
          "createApp(App).use(i18n).mount('#app');",
        ].join('\n'),
      })
    );
    expect(r.violations).toEqual([]);
    expect(r.passed).toBe(true);
    expect(r.message).toMatch(/locale\(s\) en$/);
  });
});

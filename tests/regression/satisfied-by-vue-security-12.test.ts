/**
 * #12 V2 — satisfiedBy.vue for the two security laws that judge a Vue
 * project: Angular Security XSS Prevention Policy (reads a .vue file's
 * script) and Security Standards (XSS Prevention) Policy, the
 * Content-Security-Policy law (reads no .vue file and needs none: the policy
 * is declared in index.html, the hosting headers or a named config).
 *
 * Each guidance text is proved here: what it tells a Vue project to do
 * passes, the same project without it fails, and a control fails where the
 * text says the law does not accept it.
 */
import { ContentSecurityPolicyLaw } from '../../src/checkers/security-laws/content-security-policy';
import { XSSPreventionLaw } from '../../src/checkers/security-laws/xss-prevention';
import { SECURITY_LAWS } from '../../src/data/security-laws';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const COMPONENT = 'src/components/RichText.vue';
const CSP_META =
  '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'">';

/** index.html of a Vite app, with the given tags in its <head>. */
const viteIndex = (head = ''): string =>
  `<!doctype html>\n<html lang="en"><head>${head}</head><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n`;

/** A Vue 3 + Vite app, as `npm create vue` lays it out, plus the given files. */
function vueViteProject(
  files: Record<string, string>,
  index: string | null = viteIndex()
): string {
  return project({
    'package.json': JSON.stringify({
      name: 'vue-vite-app',
      version: '1.0.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build' },
      dependencies: { vue: '^3.5.13', dompurify: '^3.2.0' },
      devDependencies: { vite: '^6.0.0', '@vitejs/plugin-vue': '^5.2.1' },
    }),
    'vite.config.ts': [
      "import { defineConfig } from 'vite';",
      "import vue from '@vitejs/plugin-vue';",
      'export default defineConfig({ plugins: [vue()] });',
    ].join('\n'),
    ...(index === null ? {} : { 'index.html': index }),
    'src/main.ts': [
      "import { createApp } from 'vue';",
      "import App from './App.vue';",
      "createApp(App).mount('#app');",
    ].join('\n'),
    'src/App.vue': [
      '<template>',
      '  <RichText html="<b>hi</b>" />',
      '</template>',
      '<script setup lang="ts">',
      "import RichText from './components/RichText.vue';",
      '</script>',
      '',
    ].join('\n'),
    ...files,
  });
}

/** A component with a template ref, the given template body and the given lines in onMounted. */
function richText(mounted: string[], template = '  <div ref="box" />'): string {
  return [
    '<template>',
    template,
    '</template>',
    '<script setup lang="ts">',
    "import { computed, onMounted, ref } from 'vue';",
    "import DOMPurify from 'dompurify';",
    'const props = defineProps<{ html: string }>();',
    'const box = ref<HTMLElement | null>(null);',
    'const raw = computed(() => props.html);',
    'onMounted(() => {',
    '  if (!box.value) return;',
    ...mounted.map(line => `  ${line}`),
    '});',
    '</script>',
    '',
  ].join('\n');
}

/** A Nuxt 3 app: no index.html of its own, the CSP set in nuxt.config.ts. */
function nuxtProject(): string {
  return project({
    'package.json': JSON.stringify({
      name: 'nuxt-app',
      private: true,
      type: 'module',
      scripts: { dev: 'nuxt dev', build: 'nuxt build' },
      dependencies: { nuxt: '^3.15.0', vue: '^3.5.13' },
    }),
    'nuxt.config.ts': [
      'export default defineNuxtConfig({',
      '  routeRules: {',
      "    '/**': {",
      "      headers: { 'Content-Security-Policy': \"default-src 'self'\" },",
      '    },',
      '  },',
      '});',
    ].join('\n'),
    'app.vue': '<template>\n  <NuxtPage />\n</template>\n',
    'pages/index.vue': '<template>\n  <h1>Home</h1>\n</template>\n',
  });
}

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
  SECURITY_LAWS.find(law => law.title === title)?.satisfiedBy?.vue ?? '';

const xss = (c: LawCheckContext): LawResult => XSSPreventionLaw.check(c);
const csp = (c: LawCheckContext): LawResult =>
  ContentSecurityPolicyLaw.check(c);

describe('#12 V2: satisfiedBy.vue for security', () => {
  describe('Angular Security XSS Prevention Policy, on a Vue + Vite app', () => {
    const TITLE = 'Angular Security XSS Prevention Policy';

    it('the guidance names interpolation, DOMPurify.sanitize in the same statement, htmlSanitizers and v-html', () => {
      const text = vueGuidance(TITLE);
      expect(text).toMatch(/\{\{ \}\} interpolation/);
      expect(text).toMatch(/same statement: DOMPurify\.sanitize/);
      expect(text).toMatch(/thresholds\.security\.htmlSanitizers/);
      expect(text).toMatch(/does not read v-html/);
    });

    it('before: box.value.innerHTML = props.html in <script setup> fails, at the component', async () => {
      const r = await judge(
        xss,
        vueConfig(
          vueViteProject({
            [COMPONENT]: richText(['box.value.innerHTML = props.html;']),
          })
        )
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(/RichText\.vue/);
      expect(r.unread).toBe(false);
    });

    it('after: DOMPurify.sanitize in the same statement passes', async () => {
      const r = await judge(
        xss,
        vueConfig(
          vueViteProject({
            [COMPONENT]: richText([
              'box.value.innerHTML = DOMPurify.sanitize(props.html);',
            ]),
          })
        )
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
      expect(r.unread).toBe(false);
    });

    it('after: a sanitizer named in thresholds.security.htmlSanitizers passes', async () => {
      const r = await judge(
        xss,
        vueConfig(
          vueViteProject({
            [COMPONENT]: richText([
              'box.value.innerHTML = sanitizeHtml(props.html);',
            ]),
          }),
          { security: { htmlSanitizers: ['sanitizeHtml'] } }
        )
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
    });

    it('control: sanitized on an earlier line and assigned later still fails', async () => {
      const r = await judge(
        xss,
        vueConfig(
          vueViteProject({
            [COMPONENT]: richText([
              'const clean = DOMPurify.sanitize(props.html);',
              'box.value.innerHTML = clean;',
            ]),
          })
        )
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(/RichText\.vue/);
    });

    it('control: eval fails whatever surrounds it', async () => {
      const r = await judge(
        xss,
        vueConfig(
          vueViteProject({
            [COMPONENT]: richText(['eval(DOMPurify.sanitize(props.html));']),
          })
        )
      );
      expect(r.passed).toBe(false);
    });

    it('the limit the text names: v-html in the template is not read, sanitized or not', async () => {
      const r = await judge(
        xss,
        vueConfig(
          vueViteProject({
            [COMPONENT]: richText([], '  <div ref="box" v-html="raw" />'),
          })
        )
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
    });
  });

  describe('Security Standards (XSS Prevention) Policy (the CSP), on Vue projects', () => {
    const TITLE = 'Security Standards (XSS Prevention) Policy';

    it('the guidance names the root index.html, the three hosting files, nuxt.config.* and cspFiles', () => {
      const text = vueGuidance(TITLE);
      expect(text).toMatch(/root index\.html of a Vite app/);
      expect(text).toMatch(/firebase\.json, vercel\.json or netlify\.toml/);
      expect(text).toMatch(/nuxt\.config\.\*/);
      expect(text).toMatch(/thresholds\.security\.cspFiles/);
    });

    it('before: a Vite app whose index.html declares no CSP fails, naming index.html', async () => {
      const r = await judge(csp, vueConfig(vueViteProject({})));
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(
        /index\.html: no Content-Security-Policy/
      );
      expect(r.unread).toBe(false);
    });

    it('after: <meta http-equiv="Content-Security-Policy"> in the root index.html passes', async () => {
      const r = await judge(
        csp,
        vueConfig(vueViteProject({}, viteIndex(CSP_META)))
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
      expect(r.unread).toBe(false);
    });

    it('control: Content-Security-Policy-Report-Only in the meta tag still fails', async () => {
      const r = await judge(
        csp,
        vueConfig(
          vueViteProject(
            {},
            viteIndex(
              '<meta http-equiv="Content-Security-Policy-Report-Only" content="default-src \'self\'">'
            )
          )
        )
      );
      expect(r.passed).toBe(false);
    });

    it.each([
      [
        'firebase.json',
        JSON.stringify({
          hosting: {
            public: 'dist',
            headers: [
              {
                source: '**',
                headers: [
                  {
                    key: 'Content-Security-Policy',
                    value: "default-src 'self'",
                  },
                ],
              },
            ],
          },
        }),
      ],
      [
        'vercel.json',
        JSON.stringify({
          headers: [
            {
              source: '/(.*)',
              headers: [
                { key: 'Content-Security-Policy', value: "default-src 'self'" },
              ],
            },
          ],
        }),
      ],
      [
        'netlify.toml',
        [
          '[[headers]]',
          '  for = "/*"',
          '  [headers.values]',
          '    Content-Security-Policy = "default-src \'self\'"',
        ].join('\n'),
      ],
    ])(
      'after: the header in %s covers the Vite app, whose index.html has no meta tag',
      async (file, content) => {
        const r = await judge(
          csp,
          vueConfig(vueViteProject({ [file]: content }))
        );
        expect(r.violations).toEqual([]);
        expect(r.passed).toBe(true);
        expect(r.unread).toBe(false);
      }
    );

    it('Nuxt, after: no index.html, nuxt.config.ts named in thresholds.security.cspFiles passes', async () => {
      const r = await judge(
        csp,
        vueConfig(nuxtProject(), {
          security: { cspFiles: ['nuxt.config.ts'] },
        })
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
    });

    it('Nuxt, before: the same app without cspFiles fails as judged-nothing', async () => {
      const r = await judge(csp, vueConfig(nuxtProject()));
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(/this law judged nothing/);
    });
  });
});

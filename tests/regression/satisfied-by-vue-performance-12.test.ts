/**
 * #12 V-performance — satisfiedBy.vue for the seven performance laws that
 * judge a Vue project. Five read .vue files (Memory Leak Prevention,
 * Performance Standards, Core Web Vitals Compliance, Bundle Optimization
 * Strategy Policy, Performance Monitoring Policy); two judge the build and
 * its gates and need no .vue file (Bundle Size Optimization, Performance
 * Budget Compliance).
 *
 * Proved on a Vue 3 + Vite app laid out as create-vue does, with the config
 * a real audit reads (ConfigLoader): the default app fails, the app the texts
 * describe passes all seven with no ".vue not read" note, and the two limits
 * the texts name hold — a Vue Router lazy route alone is not credited as code
 * splitting, and @sentry/vue or app.config.errorHandler alone is not credited
 * as error tracking. The router stays idiomatic throughout: the texts say
 * what is recognised, they do not ask for code to be rewritten.
 */
import { ConfigLoader } from '../../src/config/loader';
import { PERFORMANCE_LAWS } from '../../src/data/performance-laws';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import type { RuleOfCodeConfig } from '../../src/types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const LAWS = [
  'Memory Leak Prevention',
  'Performance Standards',
  'Bundle Size Optimization',
  'Core Web Vitals Compliance',
  'Bundle Optimization Strategy Policy',
  'Performance Monitoring Policy',
  'Performance Budget Compliance',
] as const;
type LawName = (typeof LAWS)[number];

const VUE_FILES = [
  'src/App.vue',
  'src/views/HomeView.vue',
  'src/views/AboutView.vue',
];

/** The default create-vue app with Vue Router: idiomatic, no performance tooling. */
const BASE: Record<string, string> = {
  'vite.config.ts': [
    "import { defineConfig } from 'vite';",
    "import vue from '@vitejs/plugin-vue';",
    'export default defineConfig({ plugins: [vue()] });',
  ].join('\n'),
  'index.html':
    '<!doctype html>\n<html lang="en"><head></head><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n',
  'src/main.ts': [
    "import { createApp } from 'vue';",
    "import App from './App.vue';",
    "import { router } from './router';",
    "createApp(App).use(router).mount('#app');",
  ].join('\n'),
  'src/router.ts': [
    "import { createRouter, createWebHistory } from 'vue-router';",
    "import HomeView from './views/HomeView.vue';",
    'export const router = createRouter({',
    '  history: createWebHistory(),',
    '  routes: [',
    "    { path: '/', component: HomeView },",
    "    { path: '/about', component: () => import('./views/AboutView.vue') },",
    '  ],',
    '});',
  ].join('\n'),
  'src/App.vue': '<template>\n  <RouterView />\n</template>\n',
  'src/views/HomeView.vue':
    '<template>\n  <img src="/hero.webp" alt="Hero" width="800" height="400">\n</template>\n',
  'src/views/AboutView.vue': '<template>\n  <h1>About</h1>\n</template>\n',
};

const manifest = (
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>,
  extra: Record<string, unknown> = {}
): string =>
  JSON.stringify({
    name: 'vue-vite-app',
    version: '1.0.0',
    private: true,
    type: 'module',
    ...extra,
    dependencies: { vue: '^3.5.13', 'vue-router': '^4.5.0', ...dependencies },
    devDependencies: {
      vite: '^6.0.0',
      '@vitejs/plugin-vue': '^5.2.1',
      ...devDependencies,
    },
  });

/** main.ts of the described app; `errors` picks how errors are captured. */
const mainTs = (errors: 'listener' | 'sentry' | 'handler'): string =>
  [
    "import { createApp } from 'vue';",
    ...(errors === 'sentry' ? ["import * as Sentry from '@sentry/vue';"] : []),
    "import { onCLS, onINP, onLCP } from 'web-vitals';",
    "import App from './App.vue';",
    "import { router } from './router';",
    'const app = createApp(App);',
    ...(errors === 'sentry'
      ? ['Sentry.init({ app, dsn: import.meta.env.VITE_SENTRY_DSN });']
      : []),
    ...(errors === 'handler'
      ? ['app.config.errorHandler = err => console.error(err);']
      : []),
    ...(errors === 'listener'
      ? [
          "window.addEventListener('error', event => console.error(event.error));",
        ]
      : []),
    'onCLS(console.log);',
    'onINP(console.log);',
    'onLCP(console.log);',
    "app.use(router).mount('#app');",
  ].join('\n');

/** The app the texts describe; the router keeps its idiomatic lazy route. */
function describedFiles(
  errors: 'listener' | 'sentry' | 'handler' = 'listener',
  chartOnDemand = true
): Record<string, string> {
  return {
    ...BASE,
    'package.json': manifest(
      // @sentry/vue only where main.ts uses it: declaring it is error tracking (#12, (b)).
      {
        'web-vitals': '^4.2.4',
        ...(errors === 'sentry' ? { '@sentry/vue': '^8.47.0' } : {}),
      },
      {
        'size-limit': '^11.1.6',
        '@size-limit/preset-app': '^11.1.6',
        '@lhci/cli': '^0.14.0',
        sharp: '^0.33.5',
        'vite-plugin-image-optimizer': '^1.1.8',
        critters: '^0.0.25',
      },
      {
        scripts: {
          dev: 'vite',
          build: 'vite build',
          size: 'size-limit',
          lhci: 'lhci autorun',
        },
        'size-limit': [{ path: 'dist/assets/*.js', limit: '150 kB' }],
      }
    ),
    'vite.config.ts': [
      "import { defineConfig } from 'vite';",
      "import vue from '@vitejs/plugin-vue';",
      "import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';",
      'export default defineConfig({',
      '  plugins: [vue(), ViteImageOptimizer()],',
      "  build: { rollupOptions: { output: { manualChunks: { vendor: ['vue', 'vue-router'] } } } },",
      '});',
    ].join('\n'),
    'index.html': [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
      '</head>',
      '<body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>',
      '</html>',
      '',
    ].join('\n'),
    '.lighthouserc.json': JSON.stringify({
      ci: {
        collect: { staticDistDir: './dist' },
        assert: {
          assertions: {
            'categories:performance': ['error', { minScore: 0.9 }],
          },
        },
      },
    }),
    '.github/workflows/perf.yml': [
      'name: perf',
      'on: [push]',
      'jobs:',
      '  perf:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - run: npm ci',
      '      - run: npm run build',
      '      - run: npm run size',
      '      - run: npx lhci autorun',
      '      - name: notify',
      '        if: failure()',
      '        run: curl -X POST "$SLACK_WEBHOOK" -d "perf budget failed"',
    ].join('\n'),
    'firebase.json': JSON.stringify({
      hosting: {
        public: 'dist',
        headers: [
          {
            source: '/assets/**',
            headers: [
              {
                key: 'Cache-Control',
                value: 'public, max-age=31536000, immutable',
              },
            ],
          },
        ],
      },
    }),
    'src/main.ts': mainTs(errors),
    // The app's own chart module, loaded on demand (no heavy library declared).
    'src/charts/sales.ts':
      "export function drawSales(): void {\n  console.log('sales');\n}\n",
    'src/views/HomeView.vue': [
      '<template>',
      '  <img src="/hero.webp" alt="Hero" width="800" height="400" loading="lazy">',
      '  <button type="button" @click="showChart">Chart</button>',
      '</template>',
      '<script setup lang="ts">',
      "import { onBeforeUnmount, onMounted } from 'vue';",
      'let timer: ReturnType<typeof setInterval> | undefined;',
      'const onResize = (): void => undefined;',
      'onMounted(() => {',
      '  timer = setInterval(() => undefined, 1000);',
      "  window.addEventListener('resize', onResize);",
      '});',
      'onBeforeUnmount(() => {',
      '  clearInterval(timer);',
      "  window.removeEventListener('resize', onResize);",
      '});',
      ...(chartOnDemand
        ? [
            'function showChart(): void {',
            "  import('../charts/sales').then(({ drawSales }) => drawSales());",
            '}',
          ]
        : ['function showChart(): void {}']),
      '</script>',
      '',
    ].join('\n'),
  };
}

async function judge(
  files: Record<string, string>,
  name: LawName
): Promise<{ passed: boolean; violations: string[]; noted: boolean }> {
  const root = project(files);
  const config: RuleOfCodeConfig = ConfigLoader.load(root);
  expect(config.project.type).toBe('vue');
  const law = ModularLawsRegistry.getAll().find(
    candidate => candidate.name === name
  );
  if (!law) throw new Error(`${name} is not in the registry`);
  const { value, scope } = await runLawScope(() => law.check(root, config));
  return {
    passed: value.passed,
    violations: value.violations ?? [],
    noted: vueNotReadNote(scope, VUE_FILES) !== null,
  };
}

const vueGuidance = (name: LawName): string =>
  PERFORMANCE_LAWS.find(law => law.title === name)?.satisfiedBy?.vue ?? '';

describe('#12 V-performance: satisfiedBy.vue for the performance laws, proved on a Vue + Vite app', () => {
  it.each(LAWS.map(name => [name]))('%s carries a vue text', name => {
    expect(vueGuidance(name).length).toBeGreaterThan(0);
  });

  it('the texts name the remaining limits, without advice to rewrite the code; code splitting credits a Vue Router lazy route and defineAsyncComponent', () => {
    const strategy = vueGuidance('Bundle Optimization Strategy Policy');
    expect(strategy).toMatch(
      /a Vue Router lazy route `component: \(\) => import\(…\)` and defineAsyncComponent\(\(\) => import\(…\)\) count/
    );
    expect(strategy).not.toMatch(/not yet recognised/);
    const monitoring = vueGuidance('Performance Monitoring Policy');
    expect(monitoring).toMatch(
      /@sentry\/vue declared in package\.json \(as @sentry\/react is on React\), app\.config\.errorHandler set on the app createApp returns/
    );
    expect(monitoring).not.toMatch(/not yet recognised/);
    const bundleSize = vueGuidance('Bundle Size Optimization');
    expect(bundleSize).toMatch(
      /With a heavy library in package\.json \(lodash, moment, bootstrap, chart\.js, d3\), its lazy loading in a Vue app is not yet recognised/
    );
    expect(`${strategy} ${monitoring} ${bundleSize}`).not.toMatch(
      /m\.default|instead of/
    );
  });

  it.each(
    LAWS.filter(name => name !== 'Memory Leak Prevention').map(name => [name])
  )(
    'before: %s fails on the default create-vue app with Vue Router',
    async name => {
      const r = await judge(
        { ...BASE, 'package.json': manifest({}, {}) },
        name
      );
      expect(r.passed).toBe(false);
      expect(r.noted).toBe(false);
    }
  );

  it.each(LAWS.map(name => [name]))(
    'after: %s passes on the app the texts describe, with no ".vue not read" note',
    async name => {
      const r = await judge(describedFiles(), name);
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
      expect(r.noted).toBe(false);
    }
  );

  it('Memory Leak Prevention, before: the same view starting a timer and a listener it never releases fails, at the component', async () => {
    const files = describedFiles();
    files['src/views/HomeView.vue'] = [
      '<template>',
      '  <p>Clock</p>',
      '</template>',
      '<script setup lang="ts">',
      "import { onMounted } from 'vue';",
      'onMounted(() => {',
      '  setInterval(() => undefined, 1000);',
      "  window.addEventListener('resize', () => undefined);",
      '});',
      '</script>',
      '',
    ].join('\n');
    const r = await judge(files, 'Memory Leak Prevention');
    expect(r.passed).toBe(false);
    const text = r.violations.join('\n');
    expect(text).toMatch(
      /HomeView\.vue: setInterval\(\) without a matching clearInterval\(\)/
    );
    expect(text).toMatch(
      /HomeView\.vue: addEventListener\(\) without a matching removeEventListener\(\)/
    );
  });

  // Was a limit until the Vue reading of dynamic import() (#12, (a)): the
  // idiomatic router alone is now code splitting, as React.lazy is on React.
  it('the Vue Router lazy route alone (no import(…).then( anywhere) is credited as code splitting', async () => {
    const r = await judge(
      describedFiles('listener', false),
      'Bundle Optimization Strategy Policy'
    );
    expect(r.violations).toEqual([]);
    expect(r.passed).toBe(true);
    expect(r.noted).toBe(false);
  });

  // Was a limit until @sentry/vue joined the shared Sentry list (#12, (b)).
  it('@sentry/vue alone (Sentry.init, no window listener) is credited as error tracking', async () => {
    const r = await judge(
      describedFiles('sentry'),
      'Performance Monitoring Policy'
    );
    expect(r.violations).toEqual([]);
    expect(r.passed).toBe(true);
  });

  // Was a limit until app.config.errorHandler was read (#12, (b)).
  it('app.config.errorHandler alone (no Sentry, no window listener) is credited as error tracking', async () => {
    const r = await judge(
      describedFiles('handler'),
      'Performance Monitoring Policy'
    );
    expect(r.violations).toEqual([]);
    expect(r.passed).toBe(true);
  });

  // The limit the Bundle Size Optimization text names: with a heavy library
  // declared, the law looks for lazy loading in Angular routing and parsed
  // React source only, so a Vue app's on-demand import is not seen and the
  // .vue files are not read. Remove when that detector reads Vue (#12, (c)).
  it('limit: with chart.js declared and loaded on demand in a .vue script, Bundle Size Optimization reports it as not lazy-loaded and leaves .vue unread', async () => {
    const files = describedFiles();
    const manifestJson = JSON.parse(files['package.json'] ?? '{}') as {
      dependencies: Record<string, string>;
    };
    manifestJson.dependencies['chart.js'] = '^4.4.7';
    files['package.json'] = JSON.stringify(manifestJson);
    files['src/views/HomeView.vue'] = (
      files['src/views/HomeView.vue'] ?? ''
    ).replace(
      "import('../charts/sales').then(({ drawSales }) => drawSales());",
      "import('chart.js').then(({ Chart }) => console.log(Chart));"
    );
    expect(files['src/views/HomeView.vue']).toContain("import('chart.js')");
    const r = await judge(files, 'Bundle Size Optimization');
    expect(r.passed).toBe(false);
    expect(r.violations).toEqual([
      'Heavy dependencies (chart.js) detected without lazy loading',
    ]);
    expect(r.noted).toBe(true);
  });
});

/**
 * #12 (a) — VueDynamicImports: every dynamic import() in a Vue workspace's
 * sources, by the rule the React path uses (react-performance-source.ts,
 * callMeaning: a call whose callee is the `import` keyword), read from the
 * syntax tree and reported as `file:line import()`.
 *
 * Counted: a call in .ts and in a .vue `<script>` / `<script setup>` — a Vue
 * Router lazy route and defineAsyncComponent(() => import(…)) included. Not
 * counted: `import(` in a comment, in a string, in the template. A Vue
 * workspace declares vue or nuxt and neither react nor next, so React and
 * Angular projects are not scanned here and Bundle Optimization Strategy
 * judges them as before.
 */
import { BundleOptimizationStrategyLaw } from '../../src/laws/performance/bundle-optimization-strategy';
import { ConfigLoader } from '../../src/config/loader';
import type { LawCheckContext } from '../../src/types/law.types';
import {
  isVueWorkspace,
  VueDynamicImports,
} from '../../src/utils/vue/vue-dynamic-imports';
import { project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const manifest = (dependencies: Record<string, string>): string =>
  JSON.stringify({
    name: 'app',
    version: '1.0.0',
    private: true,
    type: 'module',
    dependencies,
  });

/** A component with a <script> and a <script setup>, and decoys in a comment, a string and the template. */
const PANEL = [
  '<template>',
  '  <button type="button" @click="open">Open</button>',
  '  <p>{{ "import(\'in-the-template\')" }}</p>',
  '</template>',
  '<script lang="ts">',
  "export const loader = () => import('./heavy');",
  '</script>',
  '<script setup lang="ts">',
  "import { defineAsyncComponent } from 'vue';",
  "// import('in-a-comment')",
  'const label = "import(\'in-a-string\')";',
  "const Chart = defineAsyncComponent(() => import('./Chart.vue'));",
  "function open(): void { void import('./dialog').then(m => m.show(label, Chart)); }",
  '</script>',
  '',
].join('\n');

const ROUTER = [
  "import { createRouter, createWebHistory } from 'vue-router';",
  'export const router = createRouter({',
  '  history: createWebHistory(),',
  "  routes: [{ path: '/about', component: () => import('../views/AboutView.vue') }],",
  '});',
  '',
].join('\n');

function auditContext(root: string): LawCheckContext {
  return { projectRoot: root, config: ConfigLoader.load(root) };
}

describe('#12 (a): VueDynamicImports reads dynamic import() in a Vue workspace', () => {
  it('counts import() in .ts and in a .vue <script> and <script setup>, at their lines; not in a comment, a string or the template', () => {
    const root = project({
      'package.json': manifest({ vue: '^3.5.13', 'vue-router': '^4.5.0' }),
      'src/components/Panel.vue': PANEL,
      'src/router/index.ts': ROUTER,
    });
    const evidence = VueDynamicImports.scan(auditContext(root));
    expect(evidence.applies).toBe(true);
    expect(evidence.unread).toEqual([]);
    expect([...evidence.dynamicImports].sort()).toEqual([
      'src/components/Panel.vue:12 import()',
      'src/components/Panel.vue:13 import()',
      'src/components/Panel.vue:6 import()',
      'src/router/index.ts:4 import()',
    ]);
  });

  it('a Nuxt app (nuxt declared, vue only transitive) is a Vue workspace', () => {
    const root = project({
      'package.json': manifest({ nuxt: '^3.15.0' }),
      'pages/index.vue': [
        '<template>',
        '  <Chart />',
        '</template>',
        '<script setup lang="ts">',
        "const Chart = defineAsyncComponent(() => import('~/components/Chart.vue'));",
        '</script>',
        '',
      ].join('\n'),
    });
    expect(isVueWorkspace(root)).toBe(true);
    expect(VueDynamicImports.scan(auditContext(root)).dynamicImports).toEqual([
      'pages/index.vue:5 import()',
    ]);
  });

  it.each([
    ['React (react declared, vue too)', { react: '^19.0.0', vue: '^3.5.13' }],
    ['Next', { next: '^15.0.0', react: '^19.0.0' }],
    ['Angular', { '@angular/core': '^20.0.0' }],
  ])('%s is not a Vue workspace: nothing is scanned', (_name, deps) => {
    const root = project({
      'package.json': manifest(deps),
      'src/router/index.ts': ROUTER,
    });
    expect(isVueWorkspace(root)).toBe(false);
    expect(VueDynamicImports.scan(auditContext(root))).toEqual({
      applies: false,
      dynamicImports: [],
      unread: [],
    });
  });
});

describe('#12 (a): Bundle Optimization Strategy credits it as code splitting on Vue only', () => {
  const codeSplittingMissing = async (
    files: Record<string, string>
  ): Promise<boolean> => {
    const root = project(files);
    const result = await BundleOptimizationStrategyLaw.check(
      auditContext(root)
    );
    return (result.violations ?? []).includes('Code splitting not configured');
  };

  it('Vue: the router lazy route alone is code splitting', async () => {
    expect(
      await codeSplittingMissing({
        'package.json': manifest({ vue: '^3.5.13', 'vue-router': '^4.5.0' }),
        'src/router/index.ts': ROUTER,
      })
    ).toBe(false);
  });

  it('Vue, control: a router with no dynamic import is not code splitting', async () => {
    expect(
      await codeSplittingMissing({
        'package.json': manifest({ vue: '^3.5.13', 'vue-router': '^4.5.0' }),
        'src/router/index.ts': ROUTER.replace(
          "() => import('../views/AboutView.vue')",
          'AboutView'
        ),
      })
    ).toBe(true);
  });

  // A .vue whose script cannot be parsed was not read: the law says so, as it
  // does for React source, and never treats it as inspected.
  const BROKEN = [
    '<template>',
    '  <p>Broken</p>',
    '</template>',
    '<script setup lang="ts">',
    "const Lazy = defineAsyncComponent(() => import('./Lazy.vue'));",
    'const broken = ;',
    '</script>',
    '',
  ].join('\n');

  const strategyViolations = async (
    files: Record<string, string>
  ): Promise<string[]> =>
    (await BundleOptimizationStrategyLaw.check(auditContext(project(files))))
      .violations ?? [];

  it('a .vue that cannot be parsed, holding the only import(), is named as not read (and there is no credit)', async () => {
    const violations = await strategyViolations({
      'package.json': manifest({ vue: '^3.5.13' }),
      'src/components/Broken.vue': BROKEN,
    });
    expect(violations).toContain('Code splitting not configured');
    expect(violations.join('\n')).toMatch(
      /NOT read.*src\/components\/Broken\.vue: could not be parsed/
    );
  });

  it('with a valid import() elsewhere: credited, and the broken .vue is still named as not read', async () => {
    const violations = await strategyViolations({
      'package.json': manifest({ vue: '^3.5.13', 'vue-router': '^4.5.0' }),
      'src/components/Broken.vue': BROKEN,
      'src/router/index.ts': ROUTER,
    });
    expect(violations).not.toContain('Code splitting not configured');
    expect(violations.join('\n')).toMatch(
      /NOT read.*src\/components\/Broken\.vue: could not be parsed/
    );
  });

  it('Angular, unchanged: the same router file in an Angular project is not credited by this path', async () => {
    expect(
      await codeSplittingMissing({
        'package.json': manifest({ '@angular/core': '^20.0.0' }),
        'src/router/index.ts': ROUTER,
      })
    ).toBe(true);
  });
});

/**
 * #12 V-testing — satisfiedBy.vue for the two testing laws that judge a Vue
 * project: Professional Component Testing Policy (reads .vue components and
 * their co-located tests, #694) and Performance Test Requirements (reads
 * perf specs and the root package.json; declared not about components, so it
 * needs no .vue file, like the Content-Security-Policy law).
 *
 * Proved on a Vue 3 + Vite app laid out as create-vue does, with the config
 * a real audit reads (ConfigLoader): what each text says passes, the same
 * app without it fails, and a control fails where the text says.
 */
import { ConfigLoader } from '../../src/config/loader';
import { TESTING_LAWS } from '../../src/data/testing-laws';
import { PerformanceTestRequirementsLaw } from '../../src/laws/testing/performance-test-requirements';
import { ProfessionalComponentTestingPolicyLaw } from '../../src/laws/testing/professional-component-testing-policy';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const COMPONENT = 'src/components/HelloWorld.vue';

/** A Vue 3 + Vite app with Vitest, as `npm create vue` lays it out, plus the given files and dev dependencies. */
function vueViteProject(
  files: Record<string, string>,
  devDependencies: Record<string, string> = {}
): string {
  return project({
    'package.json': JSON.stringify({
      name: 'vue-vite-app',
      version: '1.0.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build', 'test:unit': 'vitest' },
      dependencies: { vue: '^3.5.13' },
      devDependencies: {
        vite: '^6.0.0',
        '@vitejs/plugin-vue': '^5.2.1',
        vitest: '^3.0.0',
        '@vue/test-utils': '^2.4.6',
        ...devDependencies,
      },
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
      '  <HelloWorld msg="Hello" />',
      '</template>',
      '<script setup lang="ts">',
      "import HelloWorld from './components/HelloWorld.vue';",
      '</script>',
      '',
    ].join('\n'),
    [COMPONENT]: [
      '<template>',
      '  <h1>{{ msg }}</h1>',
      '</template>',
      '<script setup lang="ts">',
      'defineProps<{ msg: string }>();',
      '</script>',
      '',
    ].join('\n'),
    ...files,
  });
}

/** A spec that mounts `name` from `from` with @vue/test-utils, in two tests. */
const mountSpec = (name: string, from: string): string =>
  [
    "import { describe, it, expect } from 'vitest';",
    "import { mount } from '@vue/test-utils';",
    `import ${name} from '${from}';`,
    `describe('${name}', () => {`,
    "  it('renders', () => {",
    `    expect(mount(${name}, { props: { msg: 'Hi' } }).text()).toContain('Hi');`,
    '  });',
    "  it('renders another message', () => {",
    `    expect(mount(${name}, { props: { msg: 'Bye' } }).text()).toContain('Bye');`,
    '  });',
    '});',
  ].join('\n');

/** Both components tested the way the text says: sibling spec and __tests__/ spec. */
const BOTH_TESTED = {
  'src/App.spec.ts': mountSpec('App', './App.vue'),
  'src/components/__tests__/HelloWorld.spec.ts': mountSpec(
    'HelloWorld',
    '../HelloWorld.vue'
  ),
};

function auditConfig(root: string): LawCheckContext {
  return { projectRoot: root, config: ConfigLoader.load(root) };
}

async function judge(
  check: (c: LawCheckContext) => LawResult,
  root: string
): Promise<{ passed: boolean; violations: string[]; unread: boolean }> {
  const context = auditConfig(root);
  expect(context.config.project.type).toBe('vue');
  const { value, scope } = await runLawScope(() => check(context));
  return {
    passed: value.passed,
    violations: value.violations ?? [],
    unread: vueNotReadNote(scope, [COMPONENT, 'src/App.vue']) !== null,
  };
}

const vueGuidance = (title: string): string =>
  TESTING_LAWS.find(law => law.title === title)?.satisfiedBy?.vue ?? '';

describe('#12 V-testing: satisfiedBy.vue for the testing laws, proved on a Vue + Vite app', () => {
  describe('Professional Component Testing Policy', () => {
    const law = (c: LawCheckContext): LawResult =>
      ProfessionalComponentTestingPolicyLaw.check(c);

    it('the guidance names the sibling and __tests__/ spec, the mounting libraries and App.vue', () => {
      const text = vueGuidance('Professional Component Testing Policy');
      expect(text).toMatch(/X\.spec\.ts \(or __tests__\/X\.spec\.ts/);
      expect(text).toMatch(/@vue\/test-utils/);
      expect(text).toMatch(/@testing-library\/vue/);
      expect(text).toMatch(/App\.vue and icon components included/);
      expect(text).toMatch(/tests\/unit\/\) is not paired/);
    });

    it('before: components without tests fail, each named', async () => {
      const r = await judge(law, vueViteProject({}));
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(
        /2 Vue components missing a co-located \.spec\.ts \/ \.test\.ts/
      );
      expect(r.unread).toBe(false);
    });

    it('after: a sibling spec for App.vue and a __tests__/ spec for HelloWorld.vue, each mounting in two tests, pass', async () => {
      const r = await judge(law, vueViteProject(BOTH_TESTED));
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
      expect(r.unread).toBe(false);
    });

    it('control: the same specs under tests/unit/ are not paired', async () => {
      const r = await judge(
        law,
        vueViteProject({
          'tests/unit/App.spec.ts': mountSpec('App', '../../src/App.vue'),
          'tests/unit/HelloWorld.spec.ts': mountSpec(
            'HelloWorld',
            '../../src/components/HelloWorld.vue'
          ),
        })
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(/2 Vue components missing/);
    });

    it('control: a spec with two tests that never mounts is low quality', async () => {
      const r = await judge(
        law,
        vueViteProject({
          ...BOTH_TESTED,
          'src/App.spec.ts': [
            "import { it, expect } from 'vitest';",
            "it('adds', () => { expect(1 + 1).toBe(2); });",
            "it('subtracts', () => { expect(2 - 1).toBe(1); });",
          ].join('\n'),
        })
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(
        /1 Vue component tests do not mount the component/
      );
    });
  });

  describe('Performance Test Requirements', () => {
    const law = (c: LawCheckContext): LawResult =>
      PerformanceTestRequirementsLaw.check(c);
    const TOOLING = { 'size-limit': '^11.1.6', 'web-vitals': '^4.2.4' };
    const CHECKOUT_PERF = {
      'e2e/checkout.perf.spec.ts': [
        "import { test, expect } from '@playwright/test';",
        "test('checkout renders fast', async ({ page }) => {",
        '  const start = performance.now();',
        "  await page.goto('/checkout');",
        '  expect(performance.now() - start).toBeLessThan(2000);',
        '});',
      ].join('\n'),
    };

    it('the guidance names the perf spec, e2e/, size-limit / vite-bundle-analyzer, web-vitals and the root package.json', () => {
      const text = vueGuidance('Performance Test Requirements');
      expect(text).toMatch(/\*\.perf\.spec\.ts/);
      expect(text).toMatch(
        /e2e\/ \(the Playwright or Cypress directory create-vue generates\)/
      );
      expect(text).toMatch(/size-limit or vite-bundle-analyzer/);
      expect(text).toMatch(/web-vitals or Lighthouse/);
      expect(text).toMatch(/ROOT package\.json/);
    });

    it('before: no perf spec, no bundle-size or web-vitals tooling fails', async () => {
      const r = await judge(law, vueViteProject({}));
      expect(r.passed).toBe(false);
      const text = r.violations.join('\n');
      expect(text).toMatch(/No performance test files found/);
      expect(text).toMatch(/Bundle size testing not implemented/);
      expect(text).toMatch(/Core Web Vitals testing not implemented/);
    });

    it('after: e2e/checkout.perf.spec.ts with page.goto and a toBeLessThan budget, size-limit and web-vitals in the root package.json, passes', async () => {
      const r = await judge(law, vueViteProject(CHECKOUT_PERF, TOOLING));
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
    });

    it('after: vite-bundle-analyzer counts as bundle-size tooling', async () => {
      const r = await judge(
        law,
        vueViteProject(CHECKOUT_PERF, {
          'vite-bundle-analyzer': '^0.15.2',
          'web-vitals': '^4.2.4',
        })
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
    });

    it('control: the tooling declared only in a workspace package.json is not read', async () => {
      const r = await judge(
        law,
        vueViteProject({
          ...CHECKOUT_PERF,
          'packages/web/package.json': JSON.stringify({
            name: 'web',
            devDependencies: TOOLING,
          }),
        })
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(
        /Bundle size testing not implemented/
      );
    });
  });
});

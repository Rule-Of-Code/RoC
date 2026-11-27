/**
 * #12 — Professional Component Testing Policy reads Vue components: a `.vue`
 * file is a component, its test is the sibling `X.spec.ts` / `X.test.ts` or
 * `__tests__/X.spec.ts` (create-vue's layout), and a quality test mounts the
 * component with @vue/test-utils or @testing-library/vue and asserts, in at
 * least two tests. Each file behind a count is a violationDetail, as for
 * React (#43).
 *
 * Before: a Vue project had "no component files", the law judged nothing,
 * and it carried the ".vue not read" note.
 */
import { ProfessionalComponentTestingPolicyLaw } from '../../src/laws/testing/professional-component-testing-policy';
import type { LawCheckContext } from '../../src/types/law.types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const GREETING = 'src/components/Greeting.vue';
const COUNTER = 'src/components/Counter.vue';
const COUNTER_TEST = 'src/components/__tests__/Counter.spec.ts';

const component = (text: string): string =>
  `<template>\n  <p>{{ ${JSON.stringify(text)} }}</p>\n</template>\n<script setup lang="ts">\nconst n = 1;\n</script>\n`;

const VTU_TWO_TESTS = (name: string): string =>
  [
    "import { describe, it, expect } from 'vitest';",
    "import { mount } from '@vue/test-utils';",
    `import ${name} from '../${name}.vue';`,
    `describe('${name}', () => {`,
    "  it('renders', () => {",
    `    expect(mount(${name}).text()).toContain('1');`,
    '  });',
    "  it('renders a paragraph', () => {",
    `    expect(mount(${name}).find('p').exists()).toBe(true);`,
    '  });',
    '});',
    '',
  ].join('\n');

function vueApp(files: Record<string, string>): string {
  return project({
    'package.json': JSON.stringify({
      name: 'vue-app',
      version: '0.0.0',
      type: 'module',
      dependencies: { vue: '^3.5.42' },
      devDependencies: {
        vite: '^8.2.2',
        '@vitejs/plugin-vue': '^6.0.8',
        vitest: '^4.1.11',
        '@vue/test-utils': '^2.5.0',
      },
    }),
    'vite.config.ts':
      "import { defineConfig } from 'vite';\nimport vue from '@vitejs/plugin-vue';\nexport default defineConfig({ plugins: [vue()] });\n",
    'src/main.ts':
      "import { createApp } from 'vue';\nimport Greeting from './components/Greeting.vue';\ncreateApp(Greeting).mount('#app');\n",
    [GREETING]: component('Hello'),
    [COUNTER]: component('Count'),
    ...files,
  });
}

async function judge(root: string): Promise<{
  violations: string[];
  details: Array<{ file?: string; message: string }>;
  judgedNothing: boolean;
  note: boolean;
}> {
  const context: LawCheckContext = ctx(root);
  const { value, scope } = await runLawScope(() =>
    ProfessionalComponentTestingPolicyLaw.check(context)
  );
  return {
    violations: value.violations ?? [],
    details: value.violationDetails ?? [],
    judgedNothing: value.judgedNothing === true,
    note: vueNotReadNote(scope, [GREETING, COUNTER]) !== null,
  };
}

describe('#12 Professional Component Testing Policy reads Vue components', () => {
  it('red: a component without a test and a one-test spec in __tests__ are reported, each as a detail', async () => {
    const r = await judge(
      vueApp({
        [COUNTER_TEST]: [
          "import { it, expect } from 'vitest';",
          "import { mount } from '@vue/test-utils';",
          "import Counter from '../Counter.vue';",
          "it('renders', () => { expect(mount(Counter).text()).toContain('1'); });",
          '',
        ].join('\n'),
      })
    );
    expect(r.judgedNothing).toBe(false);
    expect(r.violations).toEqual([
      `1 Vue components missing a co-located .spec.ts / .test.ts (e.g. ${GREETING})`,
      `1 Vue component tests do not mount the component with @vue/test-utils or @testing-library/vue and assert, in at least two tests (e.g. ${COUNTER_TEST})`,
    ]);
    expect(r.details).toEqual([
      { file: GREETING, message: 'Vue component without a co-located test' },
      {
        file: COUNTER_TEST,
        message:
          'Vue component test that does not mount it and assert in two tests',
      },
    ]);
    expect(r.note).toBe(false);
  });

  it('green: a sibling spec with @vue/test-utils and one in __tests__ with @testing-library/vue', async () => {
    const r = await judge(
      vueApp({
        'src/components/Greeting.spec.ts': VTU_TWO_TESTS('Greeting').replace(
          "'../Greeting.vue'",
          "'./Greeting.vue'"
        ),
        [COUNTER_TEST]: [
          "import { test, expect } from 'vitest';",
          "import { render, screen } from '@testing-library/vue';",
          "import Counter from '../Counter.vue';",
          "test('shows the count', () => { render(Counter); expect(screen.getByText('1')).toBeTruthy(); });",
          "test('is a paragraph', () => { render(Counter); expect(screen.getByText('1').tagName).toBe('P'); });",
          '',
        ].join('\n'),
      })
    );
    expect(r.violations).toEqual([]);
    expect(r.judgedNothing).toBe(false);
    expect(r.note).toBe(false);
  });

  it('a test that mounts nothing from a Vue testing library is low quality, even with mount( in a comment', async () => {
    const r = await judge(
      vueApp({
        'src/components/Greeting.spec.ts': [
          "import { it, expect } from 'vitest';",
          "// import { mount } from '@vue/test-utils'; mount(Greeting)",
          "it('adds', () => { expect(1 + 1).toBe(2); });",
          "it('adds again', () => { expect(2 + 2).toBe(4); });",
          '',
        ].join('\n'),
        [COUNTER_TEST]: VTU_TWO_TESTS('Counter'),
      })
    );
    expect(r.violations).toEqual([
      '1 Vue component tests do not mount the component with @vue/test-utils or @testing-library/vue and assert, in at least two tests (e.g. src/components/Greeting.spec.ts)',
    ]);
  });
});

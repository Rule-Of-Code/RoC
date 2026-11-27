/**
 * #12 V-Stores — satisfiedBy.vue for Stores In Data Access, now that the law
 * recognises Pinia's defineStore and reads .vue files (#692).
 *
 * Proved on a Vue 3 + Vite app laid out as create-vue does (stores in
 * src/stores/, views in src/views/, no feature directory): the default
 * layout judges nothing until the feature layer is named; with it named, a
 * store defined in a view fails, the same store in src/stores/ used from the
 * view passes with no ".vue not read" note, and a mention of defineStore that
 * is not a call does not count.
 */
import { StoresInDataAccessLaw } from '../../src/checkers/fe-architecture-laws/stores-in-data-access';
import { ConfigLoader } from '../../src/config/loader';
import { FE_ARCHITECTURE_LAWS } from '../../src/data/fe-architecture-laws';
import type { LawCheckContext } from '../../src/types/law.types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const VIEW = 'src/views/CounterView.vue';
/** The project's own config file, naming the feature layer as the guidance says. */
const VIEWS_LAYER = {
  'ruleofcode.config.json': JSON.stringify({
    thresholds: { frontend: { featureLayers: ['src/views/**'] } },
  }),
};

/** A Vue 3 + Vite + Pinia app, as `npm create vue -- --pinia` lays it out, plus the given files. */
function vueViteProject(files: Record<string, string>): string {
  return project({
    'package.json': JSON.stringify({
      name: 'vue-vite-app',
      version: '1.0.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build' },
      dependencies: { vue: '^3.5.13', pinia: '^2.3.0' },
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
      "import { createPinia } from 'pinia';",
      "import App from './App.vue';",
      "createApp(App).use(createPinia()).mount('#app');",
    ].join('\n'),
    'src/App.vue': [
      '<template>',
      '  <CounterView />',
      '</template>',
      '<script setup lang="ts">',
      "import CounterView from './views/CounterView.vue';",
      '</script>',
      '',
    ].join('\n'),
    ...files,
  });
}

const STORE_BODY = [
  "export const useCounterStore = defineStore('counter', () => {",
  '  const count = ref(0);',
  '  function increment() { count.value++; }',
  '  return { count, increment };',
  '});',
];

/** The counter store, as create-vue generates it, in its own .ts module. */
const COUNTER_STORE = [
  "import { ref } from 'vue';",
  "import { defineStore } from 'pinia';",
  ...STORE_BODY,
].join('\n');

/** A view that uses the store from src/stores/. */
const VIEW_USING_STORE = [
  '<template>',
  '  <button type="button" @click="counter.increment()">{{ counter.count }}</button>',
  '</template>',
  '<script setup lang="ts">',
  "import { useCounterStore } from '../stores/counter';",
  'const counter = useCounterStore();',
  '</script>',
  '',
].join('\n');

/** The config a real audit reads: ConfigLoader over the project's ruleofcode.config.json. */
function vueConfig(root: string): LawCheckContext {
  return { projectRoot: root, config: ConfigLoader.load(root) };
}

async function judge(
  context: LawCheckContext
): Promise<{ passed: boolean; violations: string[]; unread: boolean }> {
  expect(context.config.project.type).toBe('vue');
  const { value, scope } = await runLawScope(() =>
    StoresInDataAccessLaw.check(context)
  );
  return {
    passed: value.passed,
    violations: value.violations ?? [],
    unread: vueNotReadNote(scope, [VIEW, 'src/App.vue']) !== null,
  };
}

describe('#12 V-Stores: satisfiedBy.vue for Stores In Data Access, proved on a Vue + Vite + Pinia app', () => {
  it('the guidance names defineStore, src/stores/, featureLayers and a create-vue example', () => {
    const text =
      FE_ARCHITECTURE_LAWS.find(law => law.title === 'Stores In Data Access')
        ?.satisfiedBy?.vue ?? '';
    expect(text).toMatch(/defineStore from pinia/);
    expect(text).toMatch(/src\/stores\//);
    expect(text).toMatch(/thresholds\.frontend\.featureLayers/);
    expect(text).toMatch(/src\/views\/\*\*/);
    expect(text).toMatch(/until then the law judges nothing/);
  });

  it('the default create-vue layout has no feature directory: the law judges nothing', async () => {
    const r = await judge(
      vueConfig(
        vueViteProject({
          'src/stores/counter.ts': COUNTER_STORE,
          [VIEW]: VIEW_USING_STORE,
        })
      )
    );
    expect(r.passed).toBe(false);
    expect(r.violations.join('\n')).toMatch(/this law judged nothing/);
  });

  it('before, the layer named: a store defined in a view’s <script setup> fails, at its line', async () => {
    const r = await judge(
      vueConfig(
        vueViteProject({
          ...VIEWS_LAYER,
          [VIEW]: [
            '<template>',
            '  <button type="button" @click="counter.increment()">{{ counter.count }}</button>',
            '</template>',
            '<script setup lang="ts">',
            "import { ref } from 'vue';",
            "import { defineStore } from 'pinia';",
            ...STORE_BODY.map(line => line.replace('export ', '')),
            'const counter = useCounterStore();',
            '</script>',
            '',
          ].join('\n'),
        })
      )
    );
    expect(r.passed).toBe(false);
    expect(r.violations.join('\n')).toMatch(
      /CounterView\.vue:\d+: defineStore \(Pinia\) defined in the feature layer/
    );
    expect(r.unread).toBe(false);
  });

  it('after: the store in src/stores/counter.ts, used from the view, passes', async () => {
    const r = await judge(
      vueConfig(
        vueViteProject({
          ...VIEWS_LAYER,
          'src/stores/counter.ts': COUNTER_STORE,
          [VIEW]: VIEW_USING_STORE,
        })
      )
    );
    expect(r.violations).toEqual([]);
    expect(r.passed).toBe(true);
    expect(r.unread).toBe(false);
  });

  it('decoy: defineStore named in a comment of a view that imports pinia is not a store', async () => {
    const r = await judge(
      vueConfig(
        vueViteProject({
          ...VIEWS_LAYER,
          'src/stores/counter.ts': COUNTER_STORE,
          [VIEW]: [
            '<template>',
            '  <p>{{ counter.count }}</p>',
            '</template>',
            '<script setup lang="ts">',
            "import { storeToRefs } from 'pinia';",
            "import { useCounterStore } from '../stores/counter';",
            '// the store itself is made by defineStore in src/stores/counter.ts',
            'const counter = storeToRefs(useCounterStore());',
            '</script>',
            '',
          ].join('\n'),
        })
      )
    );
    expect(r.violations).toEqual([]);
    expect(r.passed).toBe(true);
  });
});

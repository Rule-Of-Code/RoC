/**
 * #12 — Memory Leak Prevention reads Vue components: a .vue file's script is
 * judged like an Angular component's (setInterval without clearInterval,
 * addEventListener without removeEventListener), and the advice names
 * onBeforeUnmount() / onUnmounted(), not ngOnDestroy().
 *
 * Before: .vue files were not read — a component that never cleared its
 * interval passed — and the law carried the ".vue not read" note.
 */
import { MemoryManagementLaw } from '../../src/checkers/performance-laws/memory-management';
import type { LawCheckContext } from '../../src/types/law.types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const CLOCK = 'src/components/LiveClock.vue';

function vueApp(clock: string): string {
  return project({
    'package.json': JSON.stringify({
      name: 'vue-app',
      version: '0.0.0',
      type: 'module',
      dependencies: { vue: '^3.5.42' },
      devDependencies: { vite: '^8.2.2', '@vitejs/plugin-vue': '^6.0.8' },
    }),
    'vite.config.ts':
      "import { defineConfig } from 'vite';\nimport vue from '@vitejs/plugin-vue';\nexport default defineConfig({ plugins: [vue()] });\n",
    'index.html':
      '<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n',
    'src/main.ts':
      "import { createApp } from 'vue';\nimport App from './App.vue';\ncreateApp(App).mount('#app');\n",
    'src/App.vue':
      '<template>\n  <LiveClock />\n</template>\n<script setup lang="ts">\nimport LiveClock from \'./components/LiveClock.vue\';\n</script>\n',
    [CLOCK]: clock,
  });
}

async function judge(root: string): Promise<{
  passed: boolean;
  violations: string[];
  note: boolean;
}> {
  const context: LawCheckContext = ctx(root);
  const { value, scope } = await runLawScope(() =>
    MemoryManagementLaw.check(context)
  );
  return {
    passed: value.passed,
    violations: value.violations ?? [],
    note: vueNotReadNote(scope, ['src/App.vue', CLOCK]) !== null,
  };
}

const LEAKING = [
  '<template>',
  '  <time>{{ now }}</time>',
  '</template>',
  '<script setup lang="ts">',
  "import { onMounted, ref } from 'vue';",
  'const now = ref(new Date());',
  'const onResize = () => { now.value = new Date(); };',
  'onMounted(() => {',
  '  setInterval(() => { now.value = new Date(); }, 1000);',
  "  window.addEventListener('resize', onResize);",
  '});',
  '</script>',
  '',
].join('\n');

const CLEANED = [
  '<template>',
  '  <time>{{ now }}</time>',
  '</template>',
  '<script setup lang="ts">',
  "import { onBeforeUnmount, onMounted, ref } from 'vue';",
  'const now = ref(new Date());',
  'const onResize = () => { now.value = new Date(); };',
  'let timer: ReturnType<typeof setInterval> | undefined;',
  'onMounted(() => {',
  '  timer = setInterval(() => { now.value = new Date(); }, 1000);',
  "  window.addEventListener('resize', onResize);",
  '});',
  'onBeforeUnmount(() => {',
  '  clearInterval(timer);',
  "  window.removeEventListener('resize', onResize);",
  '});',
  '</script>',
  '',
].join('\n');

describe('#12 Memory Leak Prevention reads Vue components', () => {
  it('a component that never clears its interval or removes its listener is reported, with Vue teardown advice', async () => {
    const r = await judge(vueApp(LEAKING));
    expect(r.passed).toBe(false);
    expect(r.violations).toEqual([
      `${CLOCK}: setInterval() without a matching clearInterval() — clear the interval in onBeforeUnmount() / onUnmounted().`,
      `${CLOCK}: addEventListener() without a matching removeEventListener() — remove the listener in onBeforeUnmount() / onUnmounted().`,
    ]);
    expect(r.note).toBe(false);
  });

  it('the same component releasing both in onBeforeUnmount passes', async () => {
    const r = await judge(vueApp(CLEANED));
    expect(r.violations).toEqual([]);
    expect(r.passed).toBe(true);
    expect(r.note).toBe(false);
  });

  it('a timer named in the template or the style is not code', async () => {
    const r = await judge(
      vueApp(
        [
          '<template>',
          '  <p>Use setInterval() and addEventListener() with care.</p>',
          '</template>',
          '<script setup lang="ts">',
          "const label = 'clock';",
          '</script>',
          '<style>',
          '/* addEventListener( setInterval( */',
          '</style>',
          '',
        ].join('\n')
      )
    );
    expect(r.violations).toEqual([]);
  });
});

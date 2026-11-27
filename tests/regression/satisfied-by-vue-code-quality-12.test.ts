/**
 * #12 V1 — satisfiedBy.vue for the code-quality laws that run on every Vue
 * project and read its .vue files: Observable Cleanup Requirements and Web
 * Storage Encapsulation.
 *
 * Each guidance text is proved on a Vue 3 + Vite app: a component that breaks
 * the law fails, and the same code written the way `satisfiedBy.vue` says
 * passes, with no ".vue not read" note. A control holds each text to what it
 * says the detector does not accept.
 */
import { ObservableCleanupLaw } from '../../src/checkers/code-quality-laws/observable-cleanup';
import { WebStorageEncapsulationLaw } from '../../src/checkers/code-quality-laws/web-storage-encapsulation';
import { CODE_QUALITY_LAWS } from '../../src/data/code-quality-laws';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const COMPONENT = 'src/components/Clock.vue';

/** A Vue 3 + Vite app, as `npm create vue` lays it out, with rxjs and the given files. */
function vueViteProject(files: Record<string, string>): string {
  return project({
    'package.json': JSON.stringify({
      name: 'vue-vite-app',
      version: '1.0.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build' },
      dependencies: { vue: '^3.5.13', rxjs: '^7.8.1' },
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
      "import App from './App.vue';",
      "createApp(App).mount('#app');",
    ].join('\n'),
    'src/App.vue': [
      '<template>',
      '  <Clock />',
      '</template>',
      '<script setup lang="ts">',
      "import Clock from './components/Clock.vue';",
      '</script>',
      '',
    ].join('\n'),
    ...files,
  });
}

/** A single-file component with the given <script setup> lines. */
function component(script: string[]): string {
  return [
    '<template>',
    '  <p>{{ now }}</p>',
    '</template>',
    '<script setup lang="ts">',
    ...script,
    '</script>',
    '',
  ].join('\n');
}

function vueConfig(root: string): LawCheckContext {
  const context = ctx(root);
  context.config.project.type = 'vue' as never;
  return context;
}

async function judge(
  check: (c: LawCheckContext) => LawResult,
  root: string
): Promise<{ passed: boolean; violations: string[]; unread: boolean }> {
  const { value, scope } = await runLawScope(() => check(vueConfig(root)));
  return {
    passed: value.passed,
    violations: value.violations ?? [],
    unread: vueNotReadNote(scope, [COMPONENT, 'src/App.vue']) !== null,
  };
}

const vueGuidance = (title: string): string =>
  CODE_QUALITY_LAWS.find(law => law.title === title)?.satisfiedBy?.vue ?? '';

describe('#12 V1: satisfiedBy.vue for code quality, proved on a Vue + Vite app', () => {
  describe('Observable Cleanup Requirements', () => {
    const observable = (c: LawCheckContext): LawResult =>
      ObservableCleanupLaw.check(c);

    it('the guidance names onUnmounted, onScopeDispose and take(1)', () => {
      const text = vueGuidance('Observable Cleanup Requirements');
      expect(text).toMatch(/onUnmounted\(\(\) => sub\.unsubscribe\(\)\)/);
      expect(text).toMatch(/onScopeDispose/);
      expect(text).toMatch(/take\(1\)/);
    });

    it('before: a subscription in <script setup> with no cleanup fails', async () => {
      const r = await judge(
        observable,
        vueViteProject({
          [COMPONENT]: component([
            "import { ref } from 'vue';",
            "import { interval } from 'rxjs';",
            'const now = ref(0);',
            'interval(1000).subscribe(tick => { now.value = tick; });',
          ]),
        })
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(/Clock\.vue/);
      expect(r.unread).toBe(false);
    });

    it('after: onUnmounted(() => sub.unsubscribe()) in the component passes', async () => {
      const r = await judge(
        observable,
        vueViteProject({
          [COMPONENT]: component([
            "import { onUnmounted, ref } from 'vue';",
            "import { interval } from 'rxjs';",
            'const now = ref(0);',
            'const sub = interval(1000).subscribe(tick => { now.value = tick; });',
            'onUnmounted(() => sub.unsubscribe());',
          ]),
        })
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
      expect(r.unread).toBe(false);
    });

    it('after: a composable with onScopeDispose, and take(1) for a one-shot value, pass', async () => {
      const r = await judge(
        observable,
        vueViteProject({
          'src/composables/useTicker.ts': [
            "import { onScopeDispose, ref } from 'vue';",
            "import { interval } from 'rxjs';",
            'export function useTicker() {',
            '  const now = ref(0);',
            '  const sub = interval(1000).subscribe(tick => { now.value = tick; });',
            '  onScopeDispose(() => sub.unsubscribe());',
            '  return now;',
            '}',
          ].join('\n'),
          [COMPONENT]: component([
            "import { ref } from 'vue';",
            "import { take } from 'rxjs';",
            "import { config$ } from '../config';",
            "import { useTicker } from '../composables/useTicker';",
            'const now = useTicker();',
            "const title = ref('');",
            'config$.pipe(take(1)).subscribe(c => { title.value = c.title; });',
          ]),
        })
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
      expect(r.unread).toBe(false);
    });

    it('control: the cleanup in another file than the subscription still fails (the detector looks per file)', async () => {
      const r = await judge(
        observable,
        vueViteProject({
          'src/composables/useCleanup.ts': [
            "import { onUnmounted } from 'vue';",
            "import type { Unsubscribable } from 'rxjs';",
            'export function useCleanup(sub: Unsubscribable) {',
            '  onUnmounted(() => sub.unsubscribe());',
            '}',
          ].join('\n'),
          [COMPONENT]: component([
            "import { ref } from 'vue';",
            "import { interval } from 'rxjs';",
            "import { useCleanup } from '../composables/useCleanup';",
            'const now = ref(0);',
            'useCleanup(interval(1000).subscribe(tick => { now.value = tick; }));',
          ]),
        })
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(/Clock\.vue/);
    });
  });

  describe('Web Storage Encapsulation', () => {
    const storage = (c: LawCheckContext): LawResult =>
      WebStorageEncapsulationLaw.check(c);

    it('the guidance names *.service.ts and says composables and Pinia stores are flagged', () => {
      const text = vueGuidance('Web Storage Encapsulation');
      expect(text).toMatch(/\*\.service\.ts/);
      expect(text).toMatch(/composable/);
      expect(text).toMatch(/Pinia/);
    });

    it('before: localStorage called in <script setup> fails', async () => {
      const r = await judge(
        storage,
        vueViteProject({
          [COMPONENT]: component([
            "import { ref } from 'vue';",
            "const now = ref(localStorage.getItem('last-seen') ?? '');",
            "localStorage.setItem('last-seen', 'seen');",
          ]),
        })
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(/Clock\.vue: 2 direct/);
      expect(r.unread).toBe(false);
    });

    it('after: the calls in a *.service.ts module, called from the component, pass', async () => {
      const r = await judge(
        storage,
        vueViteProject({
          'src/services/last-seen.service.ts': [
            "const KEY = 'last-seen';",
            'export function readLastSeen(): string {',
            "  try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; }",
            '}',
            'export function writeLastSeen(value: string): void {',
            '  try { localStorage.setItem(KEY, value); } catch { /* storage blocked */ }',
            '}',
          ].join('\n'),
          [COMPONENT]: component([
            "import { ref } from 'vue';",
            "import { readLastSeen, writeLastSeen } from '../services/last-seen.service';",
            'const now = ref(readLastSeen());',
            "writeLastSeen('seen');",
          ]),
        })
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
      expect(r.unread).toBe(false);
    });

    it('control: the same calls in a composable and in a Pinia store file are still flagged', async () => {
      const r = await judge(
        storage,
        vueViteProject({
          'src/composables/useLastSeen.ts': [
            'export function useLastSeen(): string {',
            "  return localStorage.getItem('last-seen') ?? '';",
            '}',
          ].join('\n'),
          'src/stores/session.ts': [
            "import { defineStore } from 'pinia';",
            "export const useSessionStore = defineStore('session', {",
            "  actions: { clear() { sessionStorage.removeItem('token'); } },",
            '});',
          ].join('\n'),
          [COMPONENT]: component([
            "import { useLastSeen } from '../composables/useLastSeen';",
            'const now = useLastSeen();',
          ]),
        })
      );
      expect(r.passed).toBe(false);
      const text = r.violations.join('\n');
      expect(text).toMatch(/useLastSeen\.ts/);
      expect(text).toMatch(/session\.ts/);
    });
  });
});

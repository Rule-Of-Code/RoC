/**
 * #12 V3 — satisfiedBy.vue for the five FE architecture laws that run on
 * every Vue project and read its .vue files: Requires Spec, No Layout
 * Transition, No Hostname Gating, Defensive Array Coercion and No Passthrough
 * Cast. (Stores In Data Access follows its Pinia detector, #692.)
 *
 * Each guidance text is proved on a Vue 3 + Vite app: a project that breaks
 * the law fails, the same project written the way `satisfiedBy.vue` says
 * passes with no ".vue not read" note, and a control fails (or a stated limit
 * holds) where the text says so. The layer laws are also run on the default
 * create-vue layout, which has no feature or data-access directory: they
 * judge nothing until the layer is named, as their texts say.
 */
import { DefensiveArrayCoercionLaw } from '../../src/checkers/fe-architecture-laws/defensive-array-coercion';
import { NoHostnameGatingLaw } from '../../src/checkers/fe-architecture-laws/no-hostname-gating';
import { NoLayoutTransitionLaw } from '../../src/checkers/fe-architecture-laws/no-layout-transition';
import { NoPassthroughCastLaw } from '../../src/checkers/fe-architecture-laws/no-passthrough-cast';
import { RequiresSpecLaw } from '../../src/checkers/fe-architecture-laws/requires-spec';
import { FE_ARCHITECTURE_LAWS } from '../../src/data/fe-architecture-laws';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const COMPONENT = 'src/components/Panel.vue';
const API_LAYER = { frontend: { dataAccessLayers: ['src/api/**'] } };

/** A Vue 3 + Vite app, as `npm create vue` lays it out, plus the given files. */
function vueViteProject(files: Record<string, string>): string {
  return project({
    'package.json': JSON.stringify({
      name: 'vue-vite-app',
      version: '1.0.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build' },
      dependencies: { vue: '^3.5.13', axios: '^1.7.9' },
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
      '  <Panel />',
      '</template>',
      '<script setup lang="ts">',
      "import Panel from './components/Panel.vue';",
      '</script>',
      '',
    ].join('\n'),
    ...files,
  });
}

/** A single-file component: template lines, <script setup> lines, <style scoped> lines. */
function sfc(
  template: string[],
  script: string[],
  style: string[] = []
): string {
  return [
    '<template>',
    ...template,
    '</template>',
    '<script setup lang="ts">',
    ...script,
    '</script>',
    ...(style.length > 0 ? ['<style scoped>', ...style, '</style>'] : []),
    '',
  ].join('\n');
}

/** A component over 200 lines, counted over the whole file. */
const LONG_COMPONENT = sfc(
  Array.from({ length: 205 }, (_, i) => `  <p>row ${i}</p>`),
  ["const total = 'basket';"]
);

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
  FE_ARCHITECTURE_LAWS.find(law => law.title === title)?.satisfiedBy?.vue ?? '';

describe('#12 V3: satisfiedBy.vue for FE architecture, proved on a Vue + Vite app', () => {
  describe('Requires Spec', () => {
    const law = (c: LawCheckContext): LawResult => RequiresSpecLaw.check(c);
    const BASKET = 'src/features/cart/Basket.vue';

    it('the guidance names the layer, the whole-file count, the sibling test and __tests__', () => {
      const text = vueGuidance('Requires Spec');
      expect(text).toMatch(/featureLayers \/ dataAccessLayers/);
      expect(text).toMatch(/whole file, template, script and style/);
      expect(text).toMatch(/Basket\.vue next to Basket\.spec\.ts/);
      expect(text).toMatch(
        /__tests__\/ folder create-vue generates is not credited/
      );
    });

    it('before: a 200+ line component in the feature layer without a test fails', async () => {
      const r = await judge(
        law,
        vueConfig(vueViteProject({ [BASKET]: LONG_COMPONENT }))
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(
        /Basket\.vue: \d+ LOC \(> 200\) but has no co-located/
      );
      expect(r.unread).toBe(false);
    });

    it('after: Basket.spec.ts beside Basket.vue passes', async () => {
      const r = await judge(
        law,
        vueConfig(
          vueViteProject({
            [BASKET]: LONG_COMPONENT,
            'src/features/cart/Basket.spec.ts':
              "import { it } from 'vitest';\nit('renders', () => {});\n",
          })
        )
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
      expect(r.unread).toBe(false);
    });

    it('control: the test in __tests__/ beside it is not credited', async () => {
      const r = await judge(
        law,
        vueConfig(
          vueViteProject({
            [BASKET]: LONG_COMPONENT,
            'src/features/cart/__tests__/Basket.spec.ts':
              "import { it } from 'vitest';\nit('renders', () => {});\n",
          })
        )
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(/Basket\.vue/);
    });

    it('a short component whose script writes X-Control-Pass needs a test too', async () => {
      const r = await judge(
        law,
        vueConfig(
          vueViteProject({
            'src/features/cart/Pay.vue': sfc(
              ['  <button type="button" @click="pay">Pay</button>'],
              [
                "const token = 'from-the-gate';",
                "function pay() { return fetch('/api/pay', { method: 'POST', headers: { 'X-Control-Pass': token } }); }",
              ]
            ),
          })
        )
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(
        /Pay\.vue: money-adjacent write service/
      );
    });

    it('the default create-vue layout has no feature layer: the law judges nothing', async () => {
      const r = await judge(
        law,
        vueConfig(vueViteProject({ [COMPONENT]: LONG_COMPONENT }))
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(/this law judged nothing/);
    });
  });

  describe('No Layout Transition', () => {
    const law = (c: LawCheckContext): LawResult =>
      NoLayoutTransitionLaw.check(c);
    const panel = (style: string[], template = ['  <div>Panel</div>']) =>
      sfc(template, ["const open = 'yes';"], style);

    it('the guidance names <style>, <Transition> classes and the unread :style / inline style', () => {
      const text = vueGuidance('No Layout Transition');
      expect(text).toMatch(/<style> \(scoped or not\)/);
      expect(text).toMatch(/<Transition>/);
      expect(text).toMatch(
        /:style binding or an inline style attribute is not read/
      );
    });

    it('before: a <Transition> class animating height in <style scoped> fails, at its line', async () => {
      const r = await judge(
        law,
        vueConfig(
          vueViteProject({
            [COMPONENT]: panel([
              '.slide-enter-active, .slide-leave-active {',
              '  transition: height 0.3s ease;',
              '}',
            ]),
          })
        )
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(
        /Panel\.vue:\d+: transition animates a layout property \(height\)/
      );
      expect(r.unread).toBe(false);
    });

    it('after: transform and opacity pass', async () => {
      const r = await judge(
        law,
        vueConfig(
          vueViteProject({
            [COMPONENT]: panel([
              '.slide-enter-active, .slide-leave-active {',
              '  transition: transform 0.3s ease, opacity 0.3s ease;',
              '}',
            ]),
          })
        )
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
      expect(r.unread).toBe(false);
    });

    it('the limit the text names: an inline style attribute in the template is not read', async () => {
      const r = await judge(
        law,
        vueConfig(
          vueViteProject({
            [COMPONENT]: panel(
              [],
              ['  <div style="transition: height 0.3s">Panel</div>']
            ),
          })
        )
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
    });
  });

  describe('No Hostname Gating', () => {
    const law = (c: LawCheckContext): LawResult => NoHostnameGatingLaw.check(c);
    const panel = (script: string[]) =>
      sfc(['  <p v-if="demo">Demo</p>'], script);

    it('the guidance names import.meta.env.DEV and location.hostname', () => {
      const text = vueGuidance('No Hostname Gating');
      expect(text).toMatch(/import\.meta\.env\.DEV/);
      expect(text).toMatch(/not on location\.hostname/);
    });

    it('before: comparing location.hostname in <script setup> fails, at its line', async () => {
      const r = await judge(
        law,
        vueConfig(
          vueViteProject({
            [COMPONENT]: panel([
              "const demo = location.hostname === 'localhost';",
            ]),
          })
        )
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(
        /Panel\.vue:\d+: feature gating via location\.hostname/
      );
      expect(r.unread).toBe(false);
    });

    it('after: import.meta.env.DEV passes', async () => {
      const r = await judge(
        law,
        vueConfig(
          vueViteProject({
            [COMPONENT]: panel(['const demo = import.meta.env.DEV;']),
          })
        )
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
      expect(r.unread).toBe(false);
    });

    it('decoy: reading the hostname without comparing it passes', async () => {
      const r = await judge(
        law,
        vueConfig(
          vueViteProject({
            [COMPONENT]: panel([
              'const host = location.hostname;',
              'const demo = import.meta.env.DEV && host.length > 0;',
            ]),
          })
        )
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
    });
  });

  describe('Defensive Array Coercion', () => {
    const law = (c: LawCheckContext): LawResult =>
      DefensiveArrayCoercionLaw.check(c);
    const orders = (body: string): Record<string, string> => ({
      'src/api/orders.ts': [
        'export interface RawOrders { items: unknown }',
        'export function toOrders(r: RawOrders) {',
        `  return ${body};`,
        '}',
      ].join('\n'),
    });

    it('the guidance names Array.isArray, ?? [] and dataAccessLayers with a create-vue example', () => {
      const text = vueGuidance('Defensive Array Coercion');
      expect(text).toMatch(/Array\.isArray\(x\) \? x : \[\]/);
      expect(text).toMatch(/\?\? \[\] is not enough/);
      expect(text).toMatch(/thresholds\.frontend\.dataAccessLayers/);
      expect(text).toMatch(/src\/api\/\*\*/);
    });

    it('before, the layer unnamed: the default create-vue layout judges nothing', async () => {
      const r = await judge(
        law,
        vueConfig(vueViteProject(orders('r.items.map(i => i)')))
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(/this law judged nothing/);
    });

    it('before, the layer named: r.items.map on a Raw* parameter fails', async () => {
      const r = await judge(
        law,
        vueConfig(vueViteProject(orders('r.items.map(i => i)')), API_LAYER)
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(
        /orders\.ts:\d+: unguarded array method on r\.items/
      );
      expect(r.unread).toBe(false);
    });

    it('after: (Array.isArray(r.items) ? r.items : []).map passes', async () => {
      const r = await judge(
        law,
        vueConfig(
          vueViteProject(
            orders('(Array.isArray(r.items) ? r.items : []).map(i => i)')
          ),
          API_LAYER
        )
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
      expect(r.unread).toBe(false);
    });

    it('control: (r.items ?? []).map still fails', async () => {
      const r = await judge(
        law,
        vueConfig(
          vueViteProject(orders('(r.items ?? []).map(i => i)')),
          API_LAYER
        )
      );
      expect(r.passed).toBe(false);
    });
  });

  describe('No Passthrough Cast', () => {
    const law = (c: LawCheckContext): LawResult =>
      NoPassthroughCastLaw.check(c);
    const USER = 'export interface User { id: string }';

    it('the guidance names res.json(), unknown, axios.get<RawUser>() and dataAccessLayers', () => {
      const text = vueGuidance('No Passthrough Cast');
      expect(text).toMatch(/in a \.vue script as in a \.ts module/);
      expect(text).toMatch(/read it as unknown/);
      expect(text).toMatch(/axios\.get<RawUser>\(\)/);
      expect(text).toMatch(/src\/api\/\*\*/);
    });

    it('before: (await res.json()) as User in the named layer fails', async () => {
      const r = await judge(
        law,
        vueConfig(
          vueViteProject({
            'src/api/users.ts': [
              USER,
              'export async function loadUser(): Promise<User> {',
              "  const res = await fetch('/api/user');",
              '  return (await res.json()) as User;',
              '}',
            ].join('\n'),
          }),
          API_LAYER
        )
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(
        /users\.ts:\d+: the body of res\.json\(\) is relabelled as User/
      );
      expect(r.unread).toBe(false);
    });

    it('before: the same cast in a .vue component in the layer fails too', async () => {
      const r = await judge(
        law,
        vueConfig(
          vueViteProject({
            'src/api/UserCard.vue': sfc(
              ['  <p>{{ user.id }}</p>'],
              [
                'interface User { id: string }',
                "const res = await fetch('/api/user');",
                'const user = (await res.json()) as User;',
              ]
            ),
          }),
          API_LAYER
        )
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(
        /UserCard\.vue:\d+: the body of res\.json\(\) is relabelled as User/
      );
    });

    it('after: the body read as unknown and parsed passes; so does axios.get<RawUser>()', async () => {
      const r = await judge(
        law,
        vueConfig(
          vueViteProject({
            'src/api/users.ts': [
              "import axios from 'axios';",
              USER,
              'export interface RawUser { id?: unknown }',
              'export function parseUser(body: unknown): User {',
              "  if (typeof body === 'object' && body !== null && 'id' in body) return { id: String(body.id) };",
              "  throw new Error('not a user');",
              '}',
              'export async function loadUser(): Promise<User> {',
              "  const res = await fetch('/api/user');",
              '  const body: unknown = await res.json();',
              '  return parseUser(body);',
              '}',
              'export async function loadUserWithAxios(): Promise<User> {',
              "  const { data } = await axios.get<RawUser>('/api/user');",
              '  return parseUser(data);',
              '}',
            ].join('\n'),
          }),
          API_LAYER
        )
      );
      expect(r.violations).toEqual([]);
      expect(r.passed).toBe(true);
      expect(r.unread).toBe(false);
    });

    it('control: axios.get<User>() is reported like a cast', async () => {
      const r = await judge(
        law,
        vueConfig(
          vueViteProject({
            'src/api/users.ts': [
              "import axios from 'axios';",
              USER,
              "export const loadUser = () => axios.get<User>('/api/user');",
            ].join('\n'),
          }),
          API_LAYER
        )
      );
      expect(r.passed).toBe(false);
      expect(r.violations.join('\n')).toMatch(/http\.get<User>/);
    });
  });
});

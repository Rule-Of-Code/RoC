/**
 * #12 — Stores In Data Access recognises Pinia: a `defineStore` imported from
 * `pinia` and called in the feature layer is a store defined in the wrong
 * place, in a `.ts` file or in the script of a `.vue` component. A `.vue`
 * file is read by its script, so template text is not code.
 *
 * Before: Pinia was not recognised (a store in the feature layer passed), and
 * the law did not scan `.vue` files and carried the ".vue not read" note.
 */
import { StoresInDataAccessLaw } from '../../src/checkers/fe-architecture-laws/stores-in-data-access';
import type { LawCheckContext } from '../../src/types/law.types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const LAYERS = {
  thresholds: {
    frontend: {
      featureLayers: ['src/features/**'],
      dataAccessLayers: ['src/stores/**'],
    },
  },
};

const CART_STORE = [
  "import { defineStore } from 'pinia';",
  "import { ref } from 'vue';",
  "export const useCartStore = defineStore('cart', () => {",
  '  const items = ref<string[]>([]);',
  '  return { items };',
  '});',
  '',
].join('\n');

const CART_VIEW = [
  '<template>',
  '  <ul><li v-for="item in cart.items" :key="item">{{ item }}</li></ul>',
  '</template>',
  '<script setup lang="ts">',
  "import { useCartStore } from '@/stores/cart';",
  'const cart = useCartStore();',
  '</script>',
  '',
].join('\n');

function vueApp(files: Record<string, string>): string {
  return project({
    'package.json': JSON.stringify({
      name: 'vue-app',
      version: '0.0.0',
      type: 'module',
      dependencies: { vue: '^3.5.42', pinia: '^4.0.3' },
      devDependencies: { vite: '^8.2.2', '@vitejs/plugin-vue': '^6.0.8' },
    }),
    'vite.config.ts':
      "import { defineConfig } from 'vite';\nimport vue from '@vitejs/plugin-vue';\nexport default defineConfig({ plugins: [vue()] });\n",
    'src/main.ts':
      "import { createApp } from 'vue';\nimport { createPinia } from 'pinia';\nimport App from './App.vue';\ncreateApp(App).use(createPinia()).mount('#app');\n",
    'src/App.vue':
      '<template>\n  <CartView />\n</template>\n<script setup lang="ts">\nimport CartView from \'./features/cart/CartView.vue\';\n</script>\n',
    ...files,
  });
}

async function judge(root: string): Promise<{
  violations: string[];
  note: boolean;
}> {
  const context: LawCheckContext = ctx(root, LAYERS);
  const { value, scope } = await runLawScope(() =>
    StoresInDataAccessLaw.check(context)
  );
  return {
    violations: value.violations ?? [],
    note:
      vueNotReadNote(scope, [
        'src/App.vue',
        'src/features/cart/CartView.vue',
      ]) !== null,
  };
}

describe('#12 Stores In Data Access recognises Pinia', () => {
  it('red: defineStore in the feature layer (.ts) is reported at its line', async () => {
    const r = await judge(
      vueApp({
        'src/features/cart/cartStore.ts': CART_STORE,
        'src/features/cart/CartView.vue': CART_VIEW.replace(
          '@/stores/cart',
          './cartStore'
        ),
      })
    );
    expect(r.violations).toEqual([
      'src/features/cart/cartStore.ts:3: defineStore (Pinia) defined in the feature layer — move it to the data-access layer',
    ]);
    expect(r.note).toBe(false);
  });

  it('red: defineStore in the script of a feature .vue component, aliased, is reported at its line in the file', async () => {
    const r = await judge(
      vueApp({
        'src/features/cart/CartView.vue': [
          '<template>',
          '  <p>{{ cart.items.length }}</p>',
          '</template>',
          '<script setup lang="ts">',
          "import { defineStore as store } from 'pinia';",
          "const useCart = store('cart', { state: () => ({ items: [] as string[] }) });",
          'const cart = useCart();',
          '</script>',
          '',
        ].join('\n'),
      })
    );
    expect(r.violations).toEqual([
      'src/features/cart/CartView.vue:6: defineStore (Pinia) defined in the feature layer — move it to the data-access layer',
    ]);
    expect(r.note).toBe(false);
  });

  it('green: the store in the data-access layer, consumed by the feature component', async () => {
    const r = await judge(
      vueApp({
        'src/stores/cart.ts': CART_STORE,
        'src/features/cart/CartView.vue': CART_VIEW,
      })
    );
    expect(r.violations).toEqual([]);
    expect(r.note).toBe(false);
  });

  it('green: defineStore named in template text or a string is not a store', async () => {
    const r = await judge(
      vueApp({
        'src/stores/cart.ts': CART_STORE,
        'src/features/cart/CartView.vue': [
          '<template>',
          "  <code>import { defineStore } from 'pinia'; defineStore('x', {})</code>",
          '</template>',
          '<script setup lang="ts">',
          'const hint = "defineStore(\'cart\', {}) lives in src/stores";',
          '</script>',
          '',
        ].join('\n'),
      })
    );
    expect(r.violations).toEqual([]);
  });

  it('green: a defineStore that is not Pinia is not a store', async () => {
    const r = await judge(
      vueApp({
        'src/features/cart/CartView.vue': CART_VIEW.replace(
          '@/stores/cart',
          './local'
        ),
        'src/features/cart/local.ts':
          "import { defineStore } from './my-registry';\nexport const useCartStore = defineStore('cart');\n",
      })
    );
    expect(r.violations).toEqual([]);
  });
});

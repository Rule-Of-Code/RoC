/**
 * #12 (b) — error tracking and production monitoring on a Vue app.
 *
 * b2: @sentry/vue is in the shared Sentry list, so declaring it counts as
 * error tracking for Performance Monitoring Policy and as a monitoring
 * service for Performance Budget Compliance — as @sentry/react always has.
 * Controls: the same app without it is still reported.
 */
import { ConfigLoader } from '../../src/config/loader';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const POLICY = 'Performance Monitoring Policy';
const BUDGET = 'Performance Budget Compliance';
const NO_ERROR_TRACKING = 'Performance error tracking not configured';
const NO_PROD_MONITORING =
  'Production performance budget monitoring not configured';

/** A Vue 3 + Vite app; `sentry` declares @sentry/vue and initialises it in main.ts. */
function vueApp(sentry: boolean): string {
  return project({
    'package.json': JSON.stringify({
      name: 'vue-vite-app',
      version: '1.0.0',
      private: true,
      type: 'module',
      dependencies: {
        vue: '^3.5.13',
        ...(sentry ? { '@sentry/vue': '^8.47.0' } : {}),
      },
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
      ...(sentry ? ["import * as Sentry from '@sentry/vue';"] : []),
      "import App from './App.vue';",
      'const app = createApp(App);',
      ...(sentry
        ? ['Sentry.init({ app, dsn: import.meta.env.VITE_SENTRY_DSN });']
        : []),
      "app.mount('#app');",
    ].join('\n'),
    'src/App.vue': '<template>\n  <p>Hello</p>\n</template>\n',
  });
}

async function violationsOf(name: string, root: string): Promise<string[]> {
  const law = ModularLawsRegistry.getAll().find(
    candidate => candidate.name === name
  );
  if (!law) throw new Error(`${name} is not in the registry`);
  const config = ConfigLoader.load(root);
  expect(config.project.type).toBe('vue');
  return (await law.check(root, config)).violations ?? [];
}

describe('#12 (b2): @sentry/vue counts, as @sentry/react does', () => {
  it('Performance Monitoring Policy: @sentry/vue declared and initialised is error tracking', async () => {
    expect(await violationsOf(POLICY, vueApp(true))).not.toContain(
      NO_ERROR_TRACKING
    );
  });

  it('Performance Monitoring Policy, control: without it, error tracking is still reported', async () => {
    expect(await violationsOf(POLICY, vueApp(false))).toContain(
      NO_ERROR_TRACKING
    );
  });

  it('Performance Budget Compliance: @sentry/vue declared is production monitoring', async () => {
    expect(await violationsOf(BUDGET, vueApp(true))).not.toContain(
      NO_PROD_MONITORING
    );
  });

  it('Performance Budget Compliance, control: without it, production monitoring is still reported', async () => {
    expect(await violationsOf(BUDGET, vueApp(false))).toContain(
      NO_PROD_MONITORING
    );
  });
});

/**
 * #607, P7 — six laws read `.vue` single-file components: Naming Convention
 * Enforcement (identifiers in the script), Performance Monitoring Policy,
 * Performance Monitoring Standards and Performance Standards (web-vitals and
 * error handlers in the script), Core Web Vitals Compliance (`loading="lazy"`
 * in the template) and Bundle Optimization Strategy Policy (`import().then(`
 * in the script). An `App.vue` that measures web vitals, registers an error
 * handler, lazy-loads an image and splits code by hand: each law sees it and
 * gets no ".vue not read" note. Calls written only in a template are not code.
 */
import { NamingConventionEnforcementLaw } from '../../src/checkers/code-quality-laws/naming-convention-enforcement';
import { BundleOptimizationStrategyLaw } from '../../src/laws/performance/bundle-optimization-strategy';
import { CoreWebVitalsComplianceLaw } from '../../src/laws/performance/core-web-vitals-compliance';
import { PerformanceMonitoringPolicyLaw } from '../../src/laws/performance/performance-monitoring-policy';
import { PerformanceMonitoringStandardsLaw } from '../../src/laws/performance/performance-monitoring-standards';
import { PerformanceStandardsLaw } from '../../src/laws/performance/performance-standards';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const APP = 'src/App.vue';
const APP_VUE = [
  '<template>',
  '  <img src="/hero.jpg" loading="lazy" alt="hero">',
  '</template>',
  '<script setup lang="ts">',
  "import { onLCP, onINP, onCLS } from 'web-vitals';",
  'onLCP(console.log); onINP(console.log); onCLS(console.log);',
  "window.addEventListener('error', e => console.error(e));",
  'const user_name = 1;',
  "function Load_Data() { return import('./Big.vue').then(m => m.default); }",
  'void user_name; void Load_Data;',
  '</script>',
  '',
].join('\n');

/** Calls only in the template; a clean script. */
const TEMPLATE_ONLY = [
  '<template>',
  '  <button @click="load().then(show)">{{ $t(\'more\') }} {{ Format_Date(when) }}</button>',
  '</template>',
  '<script setup lang="ts">',
  'const when = 1;',
  'void when;',
  '</script>',
  '',
].join('\n');

function vueProject(app: string): string {
  return project({
    'package.json': JSON.stringify({
      name: 'app',
      version: '1.0.0',
      dependencies: { vue: '^3.5.0', 'web-vitals': '^4.2.0' },
      devDependencies: { typescript: '^5.9.3', vite: '^7.0.0' },
    }),
    'src/main.ts':
      "import { createApp } from 'vue';\nexport const app = createApp;\n",
    [APP]: app,
  });
}

async function judge(
  check: (c: LawCheckContext) => LawResult | Promise<LawResult>,
  app = APP_VUE
): Promise<{ violations: string[]; unread: boolean }> {
  const { value, scope } = await runLawScope(() => check(ctx(vueProject(app))));
  return {
    violations: value.violations ?? [],
    unread: vueNotReadNote(scope, [APP]) !== null,
  };
}

const NAMING = /naming convention violations found/;

describe('#607 P7 performance and naming laws read .vue components', () => {
  it('Naming Convention Enforcement: identifiers in the script; template calls are not declarations', async () => {
    const r = await judge(c => NamingConventionEnforcementLaw.check(c));
    expect(r.violations).toEqual(
      expect.arrayContaining([expect.stringMatching(NAMING)])
    );
    expect(r.unread).toBe(false);
    const control = await judge(
      c => NamingConventionEnforcementLaw.check(c),
      TEMPLATE_ONLY
    );
    expect(control.violations.filter(v => NAMING.test(v))).toEqual([]);
  });

  it('Performance Monitoring Policy: web vitals and the error handler in the component count', async () => {
    const r = await judge(c => PerformanceMonitoringPolicyLaw.check(c));
    expect(r.violations).not.toContain(
      'Core Web Vitals monitoring not implemented'
    );
    expect(r.violations).not.toContain(
      'Performance error tracking not configured'
    );
    expect(r.unread).toBe(false);
  });

  it('Performance Monitoring Standards: the component measures real users', async () => {
    const r = await judge(c => PerformanceMonitoringStandardsLaw.check(c));
    expect(r.violations).not.toContain('Real User Monitoring not configured');
    expect(r.unread).toBe(false);
  });

  it('Performance Standards: web-vitals is declared and measured in the component', async () => {
    const r = await judge(c => PerformanceStandardsLaw.check(c));
    expect(
      r.violations.filter(v => /web-vitals is declared but no metric/.test(v))
    ).toEqual([]);
    expect(r.unread).toBe(false);
  });

  it('Core Web Vitals Compliance: loading="lazy" in the template is lazy loading', async () => {
    const r = await judge(c => CoreWebVitalsComplianceLaw.check(c));
    expect(r.violations).not.toContain(
      'Image optimization not configured (WebP, lazy loading)'
    );
    expect(r.unread).toBe(false);
  });

  it('Bundle Optimization Strategy Policy: import().then( in the script splits code; in a template handler it does not', async () => {
    const r = await judge(c => BundleOptimizationStrategyLaw.check(c));
    expect(r.violations).not.toContain('Code splitting not configured');
    expect(r.unread).toBe(false);
    const control = await judge(
      c => BundleOptimizationStrategyLaw.check(c),
      TEMPLATE_ONLY
    );
    expect(control.violations).toContain('Code splitting not configured');
  });
});

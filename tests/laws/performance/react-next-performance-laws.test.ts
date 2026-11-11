/**
 * The six performance laws on React / Next.js / Vite projects (#211, #205).
 *
 * Each law used to read only Angular and webpack configuration, so a correct
 * Next app could not pass, and some checks passed on a word ("bundle",
 * "performance") anywhere in a file. These fixtures prove both directions:
 * a plain Next app is told only what it has NOT declared, it passes once it
 * declares it, and a declaration that is fake — a comment, an unrun config,
 * an import never called, an opt-out — does not count.
 */
import { BundleSizeOptimizationLaw } from '../../../src/checkers/performance-laws/bundle-size-optimization';
import { BundleOptimizationStrategyLaw } from '../../../src/laws/performance/bundle-optimization-strategy';
import { CoreWebVitalsComplianceLaw } from '../../../src/laws/performance/core-web-vitals-compliance';
import { PerformanceBudgetComplianceLaw } from '../../../src/laws/performance/performance-budget-compliance';
import { PerformanceMonitoringPolicyLaw } from '../../../src/laws/performance/performance-monitoring-policy';
import { PerformanceStandardsLaw } from '../../../src/laws/performance/performance-standards';
import type { LawResult } from '../../../src/types/law.types';
import * as tsxSource from '../../../src/utils/react/tsx-source';
import {
  DECLARED_NEXT,
  type Files,
  nextManifest,
  PLAIN_NEXT,
} from '../../checkers/next-app-fixture';
import { ctx, project, removeProjects } from '../../checkers/toolkit-fixture';

const run = async (
  law: { check(c: ReturnType<typeof ctx>): LawResult | Promise<LawResult> },
  files: Files
): Promise<LawResult> => law.check(ctx(project(files)));

const mentions = (result: LawResult, text: string): boolean =>
  (result.violations ?? []).some(v => v.includes(text));

afterEach(() => {
  jest.restoreAllMocks();
  removeProjects();
});

describe('Performance Standards on Next.js', () => {
  it('a plain Next app is told only what it has not declared', async () => {
    const result = await run(PerformanceStandardsLaw, PLAIN_NEXT);
    expect(result.violations).toEqual([
      'Lighthouse performance configuration not found',
      'Performance budgets not configured',
      'Core Web Vitals monitoring not implemented',
    ]);
  });

  it('passes once the app declares a Lighthouse gate, a size-limit budget and Web Vitals reporting', async () => {
    const result = await run(PerformanceStandardsLaw, DECLARED_NEXT);
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('fails a Next app that turns minification off, or image optimization off, or exports statically', async () => {
    const minifyOff = await run(PerformanceStandardsLaw, {
      ...DECLARED_NEXT,
      'next.config.ts': 'export default { experimental: { turbopackMinify: false } };',
    });
    expect(minifyOff.violations).toEqual(['Bundle optimization not properly configured']);

    const unoptimized = await run(PerformanceStandardsLaw, {
      ...DECLARED_NEXT,
      'next.config.ts': 'export default { images: { unoptimized: true } };',
    });
    expect(unoptimized.violations).toEqual(['Image optimization strategy not implemented']);

    const exported = await run(PerformanceStandardsLaw, {
      ...DECLARED_NEXT,
      'next.config.ts': "export default { output: 'export' };",
    });
    expect(exported.violations).toEqual(['Browser caching strategy not implemented']);
  });

  it('cannot read the source → says so, and does not pass', async () => {
    jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    const result = await run(PerformanceStandardsLaw, DECLARED_NEXT);
    expect(result.passed).toBe(false);
    expect(mentions(result, 'NOT read')).toBe(true);
    expect(mentions(result, 'Core Web Vitals monitoring not implemented')).toBe(true);
  });
});

describe('Bundle Size Optimization on Next.js', () => {
  it('a plain Next app is not asked for a webpack config — only for an analyzer', async () => {
    const result = await run(BundleSizeOptimizationLaw, PLAIN_NEXT);
    expect(result.violations).toEqual(['No bundle analysis script found']);
  });

  it('passes with `next experimental-analyze`, and with @next/bundle-analyzer wired into next.config', async () => {
    expect((await run(BundleSizeOptimizationLaw, DECLARED_NEXT)).passed).toBe(true);
    const wrapped = await run(BundleSizeOptimizationLaw, {
      ...PLAIN_NEXT,
      'package.json': nextManifest({ analyze: 'ANALYZE=true next build' }),
      'next.config.mjs': [
        "import bundleAnalyzer from '@next/bundle-analyzer';",
        "const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });",
        'export default withBundleAnalyzer({});',
      ].join('\n'),
    });
    expect(wrapped.passed).toBe(true);
  });

  it('heavy libraries need lazy loading; next/dynamic counts without `.then`', async () => {
    const heavy = { ...DECLARED_NEXT, 'package.json': nextManifest({ analyze: 'next analyze' }, { 'chart.js': '^4' }) };
    const eager = await run(BundleSizeOptimizationLaw, heavy);
    expect(eager.violations).toEqual(['Heavy dependencies (chart.js) detected without lazy loading']);

    const lazy = await run(BundleSizeOptimizationLaw, {
      ...heavy,
      'src/app/chart.tsx': "import dynamic from 'next/dynamic';\nexport default dynamic(() => import('./chart-impl'));",
    });
    expect(lazy.passed).toBe(true);
  });
});

describe('Core Web Vitals Compliance on Next.js', () => {
  it('a plain Next app: budgets and Lighthouse only — hints, images, caching come from Next', async () => {
    const result = await run(CoreWebVitalsComplianceLaw, PLAIN_NEXT);
    expect(result.violations).toEqual([
      'Lighthouse performance configuration not found',
      'Performance budgets not configured',
    ]);
  });

  it('passes once declared', async () => {
    expect((await run(CoreWebVitalsComplianceLaw, DECLARED_NEXT)).violations).toEqual([]);
  });

  it('resource hints: a font with preload: false is none; a <link rel="preconnect"> in the layout is one', async () => {
    const noHints = {
      ...DECLARED_NEXT,
      'src/app/layout.tsx': [
        "import { Geist } from 'next/font/google';",
        "const geist = Geist({ subsets: ['latin'], preload: false });",
        '// <link rel="preload"> intentionally removed',
        'export default function RootLayout({ children }: { children: React.ReactNode }) {',
        '  return <html lang="en"><body>{children}</body></html>;',
        '}',
      ].join('\n'),
    };
    expect((await run(CoreWebVitalsComplianceLaw, noHints)).violations).toEqual([
      'Missing critical resource hints (preload/prefetch)',
    ]);

    const preconnect = {
      ...noHints,
      'src/app/layout.tsx': noHints['src/app/layout.tsx']!.replace(
        '<html lang="en">',
        '<html lang="en"><head><link rel="preconnect" href="https://cdn.example.com" /></head>'
      ),
    };
    expect((await run(CoreWebVitalsComplianceLaw, preconnect)).violations).toEqual([]);
  });
});

describe('Bundle Optimization Strategy on Next.js and Vite', () => {
  it('a plain Next app: route splitting, minification, tree-shaking and chunking come from Next', async () => {
    const result = await run(BundleOptimizationStrategyLaw, PLAIN_NEXT);
    expect(result.violations).toEqual([
      'Critical CSS extraction not configured',
      'Bundle analysis tools not setup',
    ]);
  });

  it('passes once the app declares optimizeCss and an analyzer', async () => {
    expect((await run(BundleOptimizationStrategyLaw, DECLARED_NEXT)).violations).toEqual([]);
  });

  it('turning minification off is read from next.config', async () => {
    const result = await run(BundleOptimizationStrategyLaw, {
      ...DECLARED_NEXT,
      'next.config.ts':
        'export default { experimental: { optimizeCss: true, turbopackMinify: false } };',
    });
    expect(result.violations).toEqual(['Minification and compression not optimized']);
  });

  it('a Vite app must declare its chunk groups', async () => {
    const vite = (config: string): Files => ({
      'package.json': JSON.stringify({
        scripts: { build: 'vite build', size: 'size-limit' },
        dependencies: { react: '19.3.0', critters: '^0.0.25' },
        devDependencies: { vite: '^8.0.0', typescript: '^5' },
        'size-limit': [{ path: 'dist/assets/*.js', limit: '200 kB' }],
      }),
      'vite.config.ts': config,
      'src/main.tsx': "import { lazy } from 'react';\nexport const Page = lazy(() => import('./page'));",
    });
    const plain = await run(BundleOptimizationStrategyLaw, vite('export default {};'));
    expect(plain.violations).toEqual(['Vendor chunk optimization not configured']);
    const chunked = await run(
      BundleOptimizationStrategyLaw,
      vite("export default { build: { rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom'] } } } } };")
    );
    expect(chunked.violations).toEqual([]);
  });
});

describe('Performance Monitoring Policy on Next.js', () => {
  it('@sentry/nextjs is error tracking, and useReportWebVitals is RUM and Web Vitals monitoring', async () => {
    const result = await run(PerformanceMonitoringPolicyLaw, {
      ...PLAIN_NEXT,
      'package.json': nextManifest({}, { '@sentry/nextjs': '^10.0.0' }),
      'src/app/web-vitals.tsx': DECLARED_NEXT['src/app/web-vitals.tsx']!,
    });
    expect(result.violations).toEqual([
      'Performance budget not configured',
      'Performance alerts not configured',
      'Performance dashboards not configured',
    ]);
  });

  it('a monorepo app: the SDK declared in apps/web is found through its import', async () => {
    const result = await run(PerformanceMonitoringPolicyLaw, {
      'package.json': JSON.stringify({ private: true, workspaces: ['apps/*'] }),
      'apps/web/package.json': nextManifest({}, { '@sentry/react': '^10.0.0' }),
      'apps/web/instrumentation-client.ts': "import * as Sentry from '@sentry/react';\nSentry.init({});",
      'apps/web/src/app/page.tsx': 'export default function P() { return null; }',
    });
    expect(mentions(result, 'Performance error tracking not configured')).toBe(false);
  });

  it('passes once the app declares budget, alerting and a dashboard', async () => {
    expect((await run(PerformanceMonitoringPolicyLaw, DECLARED_NEXT)).violations).toEqual([]);
  });

  it('a Lighthouse or size-limit config that nothing runs is not a budget', async () => {
    const result = await run(PerformanceMonitoringPolicyLaw, {
      ...DECLARED_NEXT,
      'package.json': nextManifest({}, { '@sentry/nextjs': '^10.0.0' }),
    });
    expect(result.violations).toEqual(['Performance budget not configured']);
  });

  it('a plain Next app fails every sub-check it has not declared', async () => {
    const result = await run(PerformanceMonitoringPolicyLaw, PLAIN_NEXT);
    expect(result.violations).toHaveLength(6);
  });
});

describe('Performance Budget Compliance on Next.js', () => {
  it('a plain Next app is not asked for Angular or webpack budgets', async () => {
    const result = await run(PerformanceBudgetComplianceLaw, PLAIN_NEXT);
    expect(result.violations).toEqual([
      'No enforced performance budget: declare webpack performance hints, Lighthouse assertions, or a size-limit check, run by a script or CI',
      'Bundle size monitoring not implemented',
      'CI/CD performance gates not configured (no hosted CI, and no git hook runs a budget tool)',
      'Production performance budget monitoring not configured',
    ]);
  });

  it('passes with one size-limit budget, run by a git hook where there is no hosted CI', async () => {
    expect((await run(PerformanceBudgetComplianceLaw, DECLARED_NEXT)).violations).toEqual([]);
  });

  it('a size-limit config nothing runs is not a budget, and a comment in CI is not a gate', async () => {
    const result = await run(PerformanceBudgetComplianceLaw, {
      ...DECLARED_NEXT,
      'package.json': nextManifest({}, { '@sentry/nextjs': '^10.0.0' }),
      '.husky/pre-push': '# size-limit lighthouse performance budget\nnpm test\n',
      '.lighthouserc.json': '{}',
    });
    expect(result.violations).toEqual([
      'No enforced performance budget: declare webpack performance hints, Lighthouse assertions, or a size-limit check, run by a script or CI',
      'Bundle size monitoring not implemented',
      'CI/CD performance gates not configured (no hosted CI, and no git hook runs a budget tool)',
    ]);
  });

  it('with hosted CI, the gate must be in CI — a git hook does not count', async () => {
    const result = await run(PerformanceBudgetComplianceLaw, {
      ...DECLARED_NEXT,
      '.github/workflows/ci.yml': 'jobs:\n  b:\n    steps:\n      - run: npm ci && npm run build\n',
    });
    expect(result.violations).toEqual(['CI/CD performance gates not configured']);
  });
});

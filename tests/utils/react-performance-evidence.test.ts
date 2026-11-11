/**
 * The shared readers behind the performance laws' React / Next.js / Vite
 * support (#211): a config file read as syntax, what next.config and
 * vite.config turn on and off, the evidence React source writes, and the
 * budget gates. Each is proven both ways — what counts, and the fake that
 * must not (a comment, an unrun config, an import never called, an opt-out).
 */
import { PerformanceBudgetGates } from '../../src/utils/performance-budget-gates';
import { JsConfigSource } from '../../src/utils/react/js-config-source';
import { ReactPerformanceSource } from '../../src/utils/react/react-performance-source';
import * as tsxSource from '../../src/utils/react/tsx-source';
import { WebBundlerConfig } from '../../src/utils/react/web-bundler-config';
import { type Files, PLAIN_NEXT } from '../checkers/next-app-fixture';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterEach(() => {
  jest.restoreAllMocks();
  removeProjects();
});

describe('JsConfigSource — a config file read as syntax', () => {
  it('sees written values, never a word in a comment', () => {
    const root = project({
      'next.config.js': [
        '// minimize: false, output: export, optimizeCss: true',
        'module.exports = { images: { unoptimized: true } };',
      ].join('\n'),
    });
    const read = JsConfigSource.read(root, `${root}/next.config.js`);
    expect(read.source).not.toBeNull();
    const source = read.source!;
    expect(JsConfigSource.hasBoolean(source, 'unoptimized', true)).toBe(true);
    expect(JsConfigSource.hasBoolean(source, 'minimize', false)).toBe(false);
    expect(JsConfigSource.valuesOf(source, 'optimizeCss')).toHaveLength(0);
  });

  it('resolves require() and ESM bindings, including a curried require', () => {
    const root = project({
      'next.config.js': [
        "const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });",
        'module.exports = withBundleAnalyzer({});',
      ].join('\n'),
    });
    const source = JsConfigSource.read(root, `${root}/next.config.js`).source!;
    const names = JsConfigSource.importedNames(source, '@next/bundle-analyzer');
    expect(names).toEqual(['withBundleAnalyzer']);
    expect(JsConfigSource.callsOf(source, names)).toEqual([2]);
  });
});

describe('WebBundlerConfig — what next.config / vite.config turn on and off', () => {
  it('a plain Next app built by `next build` optimizes, serves, and routes', () => {
    const report = WebBundlerConfig.inspect(project(PLAIN_NEXT));
    expect(report.unread).toEqual([]);
    expect(report.apps).toHaveLength(1);
    const [app] = report.apps;
    expect(app).toMatchObject({
      kind: 'next',
      builds: true,
      minifyOff: null,
      staticExport: false,
      hasRouter: true,
    });
  });

  it.each([
    ["experimental: { turbopackMinify: false }", 'experimental.turbopackMinify'],
    ['experimental: { turbopackMinify: { client: false } }', 'experimental.turbopackMinify'],
    ['webpack(config) { config.optimization.minimize = false; return config; }', 'optimization.minimize = false'],
  ])('reads a minification opt-out: %s', (body, where) => {
    const report = WebBundlerConfig.inspect(
      project({ ...PLAIN_NEXT, 'next.config.js': `module.exports = { ${body} };` })
    );
    expect(report.apps[0]?.minifyOff).toBe(where);
    expect(WebBundlerConfig.optimizingBuilds(report)).toHaveLength(0);
  });

  it('reads output export, unoptimized images, optimizeCss, Cache-Control headers', () => {
    const report = WebBundlerConfig.inspect(
      project({
        ...PLAIN_NEXT,
        'next.config.mjs': [
          'export default {',
          "  output: 'export',",
          '  images: { unoptimized: true },',
          '  experimental: { optimizeCss: true },',
          "  async headers() { return [{ source: '/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }] }]; },",
          '};',
        ].join('\n'),
        'next.config.ts': '',
      })
    );
    // Next's own order (js, mjs, ts, mts): the .mjs file is the one read.
    expect(report.apps[0]).toMatchObject({
      staticExport: true,
      imagesUnoptimized: true,
      optimizeCss: true,
      cacheControlHeaders: true,
    });
  });

  it('a Vite app counts only when something runs `vite build`', () => {
    const vite = (scripts: Record<string, string>, config: string): Files => ({
      'package.json': JSON.stringify({ scripts, devDependencies: { vite: '^8.0.0' } }),
      'vite.config.ts': config,
    });
    expect(
      WebBundlerConfig.inspect(project(vite({ build: 'tsc -b && vite build' }, 'export default {};'))).apps[0]
        ?.builds
    ).toBe(true);
    expect(
      WebBundlerConfig.inspect(project(vite({ test: 'vitest' }, 'export default {};'))).apps[0]?.builds
    ).toBe(false);
    const chunked = WebBundlerConfig.inspect(
      project(
        vite(
          { build: 'vite build' },
          "export default { build: { rollupOptions: { output: { manualChunks: { react: ['react'] } } } } };"
        )
      )
    );
    expect(chunked.apps[0]?.manualChunks).toBe(true);
  });

  it('a config it cannot parse is reported, and never vouches for the build', () => {
    jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    const report = WebBundlerConfig.inspect(project(PLAIN_NEXT));
    expect(report.unread).toHaveLength(1);
    expect(report.unread[0]).toContain('next.config.ts');
    expect(WebBundlerConfig.optimizingBuilds(report)).toHaveLength(0);
  });
});

describe('ReactPerformanceSource — evidence from the parse', () => {
  it('counts next/dynamic without `.then`, React.lazy, lazy and import()', () => {
    const root = project({
      ...PLAIN_NEXT,
      'src/app/chart.tsx': [
        "import dynamic from 'next/dynamic';",
        "const Chart = dynamic(() => import('./heavy-chart'));",
        'export default Chart;',
      ].join('\n'),
      'src/app/lazy.tsx': [
        "import React, { lazy } from 'react';",
        "export const A = React.lazy(() => import('./a'));",
        "export const B = lazy(() => import('./b'));",
      ].join('\n'),
    });
    const evidence = ReactPerformanceSource.scan(ctx(root));
    const labels = evidence.dynamicImports.map(entry => entry.split(' ').slice(1).join(' '));
    expect(labels).toEqual(
      expect.arrayContaining(['next/dynamic', 'React.lazy', 'import()'])
    );
    expect(evidence.dynamicImports.filter(e => e.endsWith('React.lazy'))).toHaveLength(2);
  });

  it('a Web Vitals report is a CALL — an import alone or a comment is not', () => {
    const imported = ReactPerformanceSource.scan(
      ctx(
        project({
          ...PLAIN_NEXT,
          'src/app/vitals.tsx': [
            '// useReportWebVitals(onLCP) — TODO',
            "import { useReportWebVitals } from 'next/web-vitals';",
            "import { onLCP } from 'web-vitals';",
            'export const keep = [useReportWebVitals, onLCP];',
          ].join('\n'),
        })
      )
    );
    expect(imported.webVitalsReports).toEqual([]);

    const called = ReactPerformanceSource.scan(
      ctx(
        project({
          ...PLAIN_NEXT,
          'src/app/vitals.ts': "import * as vitals from 'web-vitals';\nvitals.onINP(console.log);",
        })
      )
    );
    expect(called.webVitalsReports).toEqual(['src/app/vitals.ts:2 web-vitals onINP']);
  });

  it('reads next/image, lazy <img>, <link> hints, next/font and react-dom preloads', () => {
    const evidence = ReactPerformanceSource.scan(
      ctx(
        project({
          ...PLAIN_NEXT,
          'src/app/extra.tsx': [
            "import { preconnect } from 'react-dom';",
            "import localFont from 'next/font/local';",
            "const mono = localFont({ src: './mono.woff2', preload: false });",
            "preconnect('https://cdn.example.com');",
            'export const X = () => <><img src="/a.png" loading="lazy" alt="" /><link rel="dns-prefetch" href="//api.example.com" /></>;',
          ].join('\n'),
        })
      )
    );
    expect(evidence.optimizedImages).toHaveLength(2);
    // The priority image is eager; only the second one is lazy, plus the <img>.
    expect(evidence.lazyImages).toHaveLength(2);
    expect(evidence.lazyImages).toEqual(
      expect.arrayContaining([
        'src/app/extra.tsx:5 <img loading="lazy">',
        'src/app/page.tsx:6 lazy <Image>',
      ])
    );
    const hints = evidence.resourceHints.join('\n');
    expect(hints).toContain('react-dom preconnect');
    expect(hints).toContain('<link rel="dns-prefetch">');
    expect(hints).toContain('src/app/layout.tsx:2 next/font preload');
    // `preload: false` is not a hint.
    expect(hints).not.toContain('src/app/extra.tsx:3');
  });

  it('does not run on a project that declares neither react nor next', () => {
    const evidence = ReactPerformanceSource.scan(
      ctx(
        project({
          'package.json': JSON.stringify({ dependencies: { '@angular/core': '^20.0.0' } }),
          'src/app/x.tsx': "import dynamic from 'next/dynamic'; dynamic(() => import('y'));",
        })
      )
    );
    expect(evidence.applies).toBe(false);
    expect(evidence.dynamicImports).toEqual([]);
  });

  it('files it cannot parse are returned as unread', () => {
    jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    const evidence = ReactPerformanceSource.scan(ctx(project(PLAIN_NEXT)));
    expect(evidence.unread).toHaveLength(1);
    expect(evidence.unread[0]).toContain('NOT read');
  });
});

describe('PerformanceBudgetGates — an enforced budget and the gate that runs it', () => {
  const sizeLimitConfig = JSON.stringify([{ path: 'dist/*.js', limit: '10 kB' }]);

  it('size-limit counts with a limit AND something that runs it', () => {
    expect(
      PerformanceBudgetGates.enforcedSizeLimit(
        project({
          'package.json': JSON.stringify({ scripts: { size: 'size-limit' } }),
          '.size-limit.json': sizeLimitConfig,
        })
      )
    ).toContain('size-limit (.size-limit.json; run by script "size")');
    // declared, not run
    expect(
      PerformanceBudgetGates.enforcedSizeLimit(
        project({ 'package.json': '{}', '.size-limit.json': sizeLimitConfig })
      )
    ).toBeNull();
    // run, no limit
    expect(
      PerformanceBudgetGates.enforcedSizeLimit(
        project({
          'package.json': JSON.stringify({
            scripts: { size: 'size-limit' },
            'size-limit': [{ path: 'dist/*.js' }],
          }),
        })
      )
    ).toBeNull();
  });

  it('a CI comment or step name is not a gate; a step that runs the tool is', () => {
    const ciWords = project({
      'package.json': JSON.stringify({ scripts: { build: 'next build' } }),
      '.github/workflows/ci.yml': [
        'jobs:',
        '  build:',
        '    steps:',
        '      # performance budget: lighthouse + size-limit, TODO',
        '      - name: Performance budget (size-limit)',
        '        run: npm run build',
      ].join('\n'),
    });
    expect(PerformanceBudgetGates.budgetGates(ciWords)).toEqual({ hostedCi: true, gates: [] });

    const ciRuns = project({
      'package.json': JSON.stringify({ scripts: { size: 'size-limit' } }),
      '.github/workflows/ci.yml': 'jobs:\n  b:\n    steps:\n      - run: npm run size\n',
      '.husky/pre-push': 'npm run size\n',
    });
    const status = PerformanceBudgetGates.budgetGates(ciRuns);
    expect(status.gates).toEqual([
      'CI .github/workflows/ci.yml runs size-limit (via script "size")',
    ]);
  });

  it('Lighthouse assertions count only when run — a `# lighthouse` CI comment does not wire them', () => {
    const files: Files = {
      'package.json': JSON.stringify({ scripts: { build: 'next build' } }),
      '.lighthouserc.json': JSON.stringify({
        ci: { assert: { assertions: { 'categories:performance': ['error', { minScore: 0.9 }] } } },
      }),
      '.github/workflows/ci.yml':
        'jobs:\n  b:\n    steps:\n      # TODO: lighthouse / lhci autorun\n      - name: Lighthouse\n        run: npm run build\n',
    };
    expect(PerformanceBudgetGates.enforcedLighthouse(project(files))).toBeNull();
    const wired = project({
      ...files,
      '.github/workflows/ci.yml': 'jobs:\n  b:\n    steps:\n      - run: npx @lhci/cli autorun\n',
    });
    expect(PerformanceBudgetGates.enforcedLighthouse(wired)).toContain('a CI step runs it');
  });

  it('a git hook counts only where there is no hosted CI', () => {
    const local = project({
      'package.json': JSON.stringify({ scripts: { size: 'size-limit' } }),
      '.husky/pre-push': '# run the budget\nnpm run size\n',
    });
    expect(PerformanceBudgetGates.budgetGates(local)).toEqual({
      hostedCi: false,
      gates: ['.husky/pre-push runs size-limit (via script "size")'],
    });
  });

  it('the Angular build is a gate only when its budgets declare maximumError', () => {
    const angular = (maximum: string): string =>
      project({
        'package.json': JSON.stringify({ scripts: { build: 'ng build' } }),
        'angular.json': JSON.stringify({
          projects: {
            app: {
              architect: {
                build: {
                  builder: '@angular/build:application',
                  configurations: {
                    production: { budgets: [{ type: 'initial', [maximum]: '1mb' }] },
                  },
                },
              },
            },
          },
        }),
        '.gitlab-ci.yml': 'build:\n  script:\n    - npm run build\n',
      });
    expect(PerformanceBudgetGates.budgetGates(angular('maximumError')).gates).toEqual([
      'CI .gitlab-ci.yml runs the Angular build (maximumError budgets) (via script "build")',
    ]);
    expect(PerformanceBudgetGates.budgetGates(angular('maximumWarning')).gates).toEqual([]);
  });
});

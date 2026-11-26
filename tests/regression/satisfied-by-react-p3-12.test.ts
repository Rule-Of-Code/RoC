/**
 * #12, P3 — the React guidance of the performance frontend laws, proved on a
 * React + Vite project.
 *
 * Each case starts RED (the law reports the project) and goes GREEN by doing
 * exactly what `satisfiedBy.react` says — on Vite, where the card had said
 * only what a Next app does — and checks that the card names the construct
 * used. An instruction that does not clear the finding is wrong, however
 * plausible it reads.
 */
import { NoLayoutTransitionLaw } from '../../src/checkers/fe-architecture-laws/no-layout-transition';
import { PrimaryLocaleFontPreloadedLaw } from '../../src/checkers/client-deploy-laws/primary-locale-font-preloaded';
import { BundleSizeOptimizationLaw } from '../../src/checkers/performance-laws/bundle-size-optimization';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { BundleOptimizationStrategyLaw } from '../../src/laws/performance/bundle-optimization-strategy';
import { CoreWebVitalsComplianceLaw } from '../../src/laws/performance/core-web-vitals-compliance';
import { PerformanceBudgetComplianceLaw } from '../../src/laws/performance/performance-budget-compliance';
import { PerformanceMonitoringPolicyLaw } from '../../src/laws/performance/performance-monitoring-policy';
import { PerformanceStandardsLaw } from '../../src/laws/performance/performance-standards';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';
import { json, useTempProject } from './foreign-json-486.helpers';

/** The law card's `satisfiedBy.react` text. */
const reactGuidance = (title: string): string => {
  const law = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l => l.title === title);
  return law?.satisfiedBy?.react ?? '';
};

const project = useTempProject();
const { write } = project;

/** What the GREEN cases add to package.json. */
interface Manifest {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

let manifest: Manifest;
let mainLines: string[];
let headTags: string[];

const writeManifest = (): void =>
  write(
    'package.json',
    json({ name: 'app', version: '1.0.0', type: 'module', ...manifest })
  );

const writeMain = (): void =>
  write(
    'src/main.tsx',
    [
      ...mainLines.filter(l => l.startsWith('import')),
      "import { createRoot } from 'react-dom/client';",
      "import { App } from './App';",
      ...mainLines.filter(l => !l.startsWith('import')),
      "createRoot(document.getElementById('root')!).render(<App />);",
      '',
    ].join('\n')
  );

const writeIndex = (lang = 'en'): void =>
  write(
    'index.html',
    `<!doctype html>\n<html lang="${lang}">\n<head>\n<meta charset="UTF-8" />\n${headTags.join('\n')}\n<title>App</title>\n</head>\n<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>\n`
  );

/** A React + Vite app: vite build with the defaults, one component. */
const reactVite = (): void => {
  manifest = {
    dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
    devDependencies: {
      vite: '^7.0.0',
      '@vitejs/plugin-react': '^5.0.0',
      typescript: '^5.9.3',
    },
    scripts: { build: 'vite build' },
  };
  mainLines = [];
  headTags = [];
  writeManifest();
  writeMain();
  writeIndex();
  write(
    'vite.config.ts',
    "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n"
  );
  write('src/App.tsx', 'export function App() {\n  return <h1>Hi</h1>;\n}\n');
};

/** The steps the cards name, each as a React + Vite project writes it. */
const step = {
  /** Lighthouse CI from a script, with performance assertions. */
  lighthouse(): void {
    manifest.devDependencies['@lhci/cli'] = '^0.15.0';
    manifest.scripts.lhci = 'lhci autorun';
    writeManifest();
    write(
      '.lighthouserc.json',
      json({
        ci: {
          collect: { staticDistDir: 'dist' },
          assert: {
            assertions: {
              'categories:performance': ['error', { minScore: 0.9 }],
            },
          },
        },
      })
    );
  },
  /** A size-limit check with a limit, run by a script. */
  sizeLimit(): void {
    manifest.devDependencies['size-limit'] = '^11.0.0';
    manifest.devDependencies['@size-limit/preset-app'] = '^11.0.0';
    manifest.scripts.size = 'size-limit';
    writeManifest();
    write(
      '.size-limit.json',
      json([{ path: 'dist/assets/*.js', limit: '200 kB' }])
    );
  },
  /** A CI step that runs the budget. */
  ci(): void {
    write(
      '.github/workflows/ci.yml',
      'name: ci\non: [push]\njobs:\n  perf:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm ci\n      - run: npm run build\n      - run: npm run size\n'
    );
  },
  /** web-vitals reporting from main.tsx. */
  webVitals(): void {
    manifest.dependencies['web-vitals'] = '^5.0.0';
    writeManifest();
    mainLines.push(
      "import { onCLS, onINP, onLCP } from 'web-vitals';",
      'onCLS(console.log);',
      'onINP(console.log);',
      'onLCP(console.log);'
    );
    writeMain();
  },
  /** @sentry/react initialised in main.tsx. */
  sentry(): void {
    manifest.dependencies['@sentry/react'] = '^9.0.0';
    writeManifest();
    mainLines.push(
      "import * as Sentry from '@sentry/react';",
      'Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN });'
    );
    writeMain();
  },
  /** sharp, the image tool vite-plugin-image-optimizer runs. */
  imageTool(): void {
    manifest.devDependencies.sharp = '^0.34.0';
    manifest.devDependencies['vite-plugin-image-optimizer'] = '^2.0.0';
    writeManifest();
  },
  /** Cache-Control on the hashed assets in firebase.json. */
  cacheControl(): void {
    write(
      'firebase.json',
      json({
        hosting: {
          public: 'dist',
          headers: [
            {
              source: '/assets/**',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            },
          ],
        },
      })
    );
  },
  /** An image with loading="lazy". */
  lazyImage(): void {
    write(
      'src/App.tsx',
      'export function App() {\n  return <img src="/hero.webp" alt="Hero" loading="lazy" width="800" height="400" />;\n}\n'
    );
  },
  /** <link rel="preconnect"> in the Vite index.html. */
  preconnect(): void {
    headTags.push('<link rel="preconnect" href="https://fonts.example.com" />');
    writeIndex();
  },
  /** A bundle analyzer run from a script. */
  analyzer(): void {
    manifest.devDependencies['source-map-explorer'] = '^2.5.3';
    manifest.scripts.analyze = 'source-map-explorer dist/assets/*.js';
    writeManifest();
  },
  /** A heavy component loaded with React.lazy. */
  reactLazy(): void {
    write(
      'src/Chart.tsx',
      'export default function Chart() {\n  return <p>chart</p>;\n}\n'
    );
    write(
      'src/App.tsx',
      "import { lazy, Suspense } from 'react';\nconst Chart = lazy(() => import('./Chart'));\nexport function App() {\n  return <Suspense fallback={null}><Chart /></Suspense>;\n}\n"
    );
  },
  /** manualChunks groups in vite.config. */
  manualChunks(): void {
    write(
      'vite.config.ts',
      "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({\n  plugins: [react()],\n  build: { rollupOptions: { output: { manualChunks: { vendor: ['react', 'react-dom'] } } } },\n});\n"
    );
  },
  /** critters, a critical-CSS tool, declared. */
  critters(): void {
    manifest.devDependencies.critters = '^0.0.25';
    writeManifest();
  },
};

type Check = (context: LawCheckContext) => LawResult | Promise<LawResult>;

const judge = async (check: Check): Promise<LawResult> =>
  check(project.context());

const expectRed = async (check: Check, finding: RegExp): Promise<void> => {
  const result = await judge(check);
  expect(result.passed).toBe(false);
  expect((result.violations ?? []).join('\n')).toMatch(finding);
};

const expectGreen = async (check: Check): Promise<void> => {
  const result = await judge(check);
  expect(result.violations ?? []).toEqual([]);
  expect(result.passed).toBe(true);
};

describe('#12 P3 Performance Standards — React + Vite', () => {
  const check: Check = ctx => PerformanceStandardsLaw.check(ctx);

  it('the card names, for Vite, an image tool and Cache-Control or a service worker', () => {
    const text = reactGuidance('Performance Standards');
    expect(text).toMatch(/On Vite, declare an image tool \(sharp/);
    expect(text).toMatch(/Cache-Control \(firebase\.json hosting headers/);
  });

  it('RED: a bare Vite app', async () => {
    reactVite();
    await expectRed(check, /Image optimization strategy not implemented/);
  });

  it('GREEN: Lighthouse, size-limit, web-vitals, sharp and Cache-Control', async () => {
    reactVite();
    step.lighthouse();
    step.sizeLimit();
    step.webVitals();
    step.imageTool();
    step.cacheControl();
    await expectGreen(check);
  });
});

describe('#12 P3 Bundle Size Optimization — React + Vite', () => {
  const check: Check = ctx => BundleSizeOptimizationLaw.check(ctx);

  it('the card names vite build, source-map-explorer and React.lazy', () => {
    const text = reactGuidance('Bundle Size Optimization');
    expect(text).toMatch(/vite build/);
    expect(text).toMatch(/source-map-explorer/);
    expect(text).toMatch(/React\.lazy/);
  });

  it('RED: no bundle analyzer', async () => {
    reactVite();
    await expectRed(check, /No bundle analysis script found/);
  });

  it('GREEN: an analyzer script and React.lazy', async () => {
    reactVite();
    step.analyzer();
    step.reactLazy();
    await expectGreen(check);
  });
});

describe('#12 P3 Core Web Vitals Compliance — React + Vite', () => {
  const check: Check = ctx => CoreWebVitalsComplianceLaw.check(ctx);

  it('the card names index.html on Vite and Cache-Control or a service worker', () => {
    const text = reactGuidance('Core Web Vitals Compliance');
    expect(text).toMatch(/in the root layout \(index\.html on Vite\)/);
    expect(text).toMatch(/on Vite, serve them with Cache-Control/);
  });

  it('RED: a bare Vite app', async () => {
    reactVite();
    await expectRed(check, /Missing critical resource hints/);
  });

  it('RED: everything but a resource hint', async () => {
    reactVite();
    step.lighthouse();
    step.sizeLimit();
    step.lazyImage();
    step.cacheControl();
    await expectRed(check, /Missing critical resource hints/);
  });

  it('GREEN: Lighthouse, size-limit, a lazy image, a preconnect in index.html, Cache-Control', async () => {
    reactVite();
    step.lighthouse();
    step.sizeLimit();
    step.lazyImage();
    step.preconnect();
    step.cacheControl();
    await expectGreen(check);
  });
});

describe('#12 P3 Bundle Optimization Strategy Policy — React + Vite', () => {
  const check: Check = ctx => BundleOptimizationStrategyLaw.check(ctx);

  it('the card names, for Vite, manualChunks and a critical-CSS tool', () => {
    const text = reactGuidance('Bundle Optimization Strategy Policy');
    expect(text).toMatch(/On Vite, declare manualChunks/);
    expect(text).toMatch(
      /critical-CSS tool \(critters, critical or penthouse\)/
    );
  });

  it('RED: a bare Vite app', async () => {
    reactVite();
    await expectRed(check, /Critical CSS extraction not configured/);
  });

  it('GREEN: React.lazy, manualChunks, critters and an analyzer', async () => {
    reactVite();
    step.reactLazy();
    step.manualChunks();
    step.critters();
    step.analyzer();
    await expectGreen(check);
  });
});

describe('#12 P3 Performance Monitoring Policy — React + Vite', () => {
  const check: Check = ctx => PerformanceMonitoringPolicyLaw.check(ctx);

  it('the card names the dashboard files the law finds', () => {
    const text = reactGuidance('Performance Monitoring Policy');
    expect(text).toMatch(/\.lighthouserc\.json \/ \.lighthouserc\.js/);
    expect(text).toMatch(/dashboard\.json, grafana\.json/);
  });

  it('RED: a bare Vite app', async () => {
    reactVite();
    await expectRed(check, /Performance dashboards not configured/);
  });

  it('documented limit: lighthouserc.json without the dot is an alert, not a dashboard', async () => {
    reactVite();
    step.webVitals();
    step.sentry();
    step.sizeLimit();
    step.lighthouse();
    const fs = await import('fs');
    const path = await import('path');
    fs.renameSync(
      path.join(project.root, '.lighthouserc.json'),
      path.join(project.root, 'lighthouserc.json')
    );
    const result = await judge(check);
    expect(result.violations).toEqual([
      'Performance dashboards not configured',
    ]);
  });

  it('GREEN: web-vitals and Sentry in main.tsx, size-limit, .lighthouserc.json with assertions', async () => {
    reactVite();
    step.webVitals();
    step.sentry();
    step.sizeLimit();
    step.lighthouse();
    await expectGreen(check);
  });
});

describe('#12 P3 Performance Budget Compliance — React + Vite', () => {
  const check: Check = ctx => PerformanceBudgetComplianceLaw.check(ctx);

  it('the card names size-limit, a CI step and Web Vitals reporting', () => {
    const text = reactGuidance('Performance Budget Compliance');
    expect(text).toMatch(/size-limit check with a limit/);
    expect(text).toMatch(/CI step/);
  });

  it('RED: a bare Vite app', async () => {
    reactVite();
    await expectRed(check, /No enforced performance budget/);
  });

  it('GREEN: size-limit run by a script and a CI step, web-vitals', async () => {
    reactVite();
    step.sizeLimit();
    step.ci();
    step.webVitals();
    await expectGreen(check);
  });
});

describe('#12 P3 No Layout Transition — React + Vite', () => {
  const check: Check = ctx => NoLayoutTransitionLaw.check(ctx);

  it('the card says transform and opacity in .css/.scss', () => {
    expect(reactGuidance('No Layout Transition')).toMatch(
      /Animate transform and opacity/
    );
  });

  it('RED: a transition on width', async () => {
    reactVite();
    write('src/Card.module.css', '.card { transition: width 0.2s; }\n');
    await expectRed(check, /src\/Card\.module\.css:1/);
  });

  it('GREEN: the transition on transform and opacity', async () => {
    reactVite();
    write(
      'src/Card.module.css',
      '.card { transition: transform 0.2s, opacity 0.2s; }\n'
    );
    await expectGreen(check);
  });
});

describe('#12 P3 Primary Locale Font Preloaded — React + Vite', () => {
  const check: Check = ctx => PrimaryLocaleFontPreloadedLaw.check(ctx);
  const fonts = (): void =>
    write(
      'src/fonts.css',
      "@font-face { font-family: Inter; src: url(/fonts/inter-latin.woff2) format('woff2'); unicode-range: U+0000-00FF; }\n@font-face { font-family: Inter; src: url(/fonts/inter-cyrillic.woff2) format('woff2'); unicode-range: U+0400-045F; }\n"
    );

  it('the card names <link rel="preload" as="font"> in index.html', () => {
    expect(reactGuidance('Primary Locale Font Preloaded')).toMatch(
      /index\.html: a <link rel="preload" as="font"/
    );
  });

  it('RED: <html lang="bg"> and its Cyrillic subset not preloaded', async () => {
    reactVite();
    fonts();
    writeIndex('bg');
    await expectRed(check, /Cyrillic subset/);
  });

  it('GREEN: index.html preloads the Cyrillic subset', async () => {
    reactVite();
    fonts();
    headTags.push(
      '<link rel="preload" as="font" href="/fonts/inter-cyrillic.woff2" type="font/woff2" crossorigin />'
    );
    writeIndex('bg');
    await expectGreen(check);
  });
});

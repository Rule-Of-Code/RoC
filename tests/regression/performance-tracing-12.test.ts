/**
 * #12 (b4) — Performance Monitoring Standards' tracing check: a Sentry SDK
 * initialised with tracesSampleRate / tracesSampler / tracePropagationTargets
 * (tracingOrigins on older SDKs), read from the syntax tree in every source
 * file that mentions `@sentry/`.
 *
 * Where Sentry's guides put the init — an `instrument` file imported first
 * (React), `main.js` / `main.ts` (Vue), `instrumentation-client.ts`,
 * `sentry.server.config.ts`, `sentry.edge.config.ts` (Next.js) — is found
 * without a list of paths, and so are older or custom places
 * (`sentry.client.config.ts`, `src/main.tsx`). Decoys do not count: an init
 * without a tracing option (that is error tracking, judged by Performance
 * Monitoring Policy), an init in a comment, `@sentry/` only in a comment, an
 * init from another module, and the `@angular/fire/performance` import the
 * former substring check took for tracing.
 */
import { ConfigLoader } from '../../src/config/loader';
import { PerformanceMonitoringStandardsLaw } from '../../src/laws/performance/performance-monitoring-standards';
import { sentryTracingInits } from '../../src/laws/performance/performance-monitoring/services/performance-tracing';
import { project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const TRACING = 'Performance tracing not configured';

const manifest = (dependencies: Record<string, string>): string =>
  JSON.stringify({
    name: 'app',
    version: '1.0.0',
    private: true,
    dependencies,
  });

const init = (module: string, options: string, binding = 'Sentry'): string =>
  [
    `import * as ${binding} from '${module}';`,
    `${binding}.init({ dsn: 'https://key@o0.ingest.sentry.io/0', ${options} });`,
  ].join('\n');

function tracingFiles(files: Record<string, string>): string[] {
  const root = project(files);
  return sentryTracingInits(root, ConfigLoader.load(root)).files;
}

describe('#12 (b4): performance tracing is a Sentry init with a tracing option', () => {
  it.each([
    [
      'React: an instrument file imported first (Sentry React guide)',
      { react: '^19.0.0', '@sentry/react': '^8.47.0' },
      'src/instrument.ts',
      init('@sentry/react', 'tracesSampleRate: 1.0'),
    ],
    [
      'React: init in src/main.tsx',
      { react: '^19.0.0', '@sentry/react': '^8.47.0' },
      'src/main.tsx',
      init('@sentry/react', 'tracePropagationTargets: [/^\\/api/]'),
    ],
    [
      'Vue: main.js (Sentry Vue guide)',
      { vue: '^3.5.13', '@sentry/vue': '^8.47.0' },
      'src/main.js',
      init('@sentry/vue', 'tracesSampleRate: 0.2'),
    ],
    [
      'Next: instrumentation-client.ts (Sentry Next.js guide)',
      { next: '^15.0.0', '@sentry/nextjs': '^8.47.0' },
      'instrumentation-client.ts',
      init('@sentry/nextjs', 'tracesSampleRate: 0.1'),
    ],
    [
      'Next: src/sentry.server.config.ts',
      { next: '^15.0.0', '@sentry/nextjs': '^8.47.0' },
      'src/sentry.server.config.ts',
      init('@sentry/nextjs', 'tracesSampler: () => 0.1'),
    ],
    [
      'Next, older SDK: sentry.client.config.ts, a named init import',
      { next: '^14.0.0', '@sentry/nextjs': '^7.120.0' },
      'sentry.client.config.ts',
      "import { init } from '@sentry/nextjs';\ninit({ tracingOrigins: ['localhost'] });",
    ],
    [
      'Angular: src/main.ts',
      { '@angular/core': '^20.0.0', '@sentry/angular': '^8.47.0' },
      'src/main.ts',
      init('@sentry/angular', 'tracesSampleRate: 1.0'),
    ],
    [
      'Node service: require("@sentry/node")',
      { express: '^4.21.0', '@sentry/node': '^8.47.0' },
      'src/instrument.js',
      "const Sentry = require('@sentry/node');\nSentry.init({ dsn: 'x', tracesSampleRate: 1.0 });",
    ],
  ])('%s → traced', (_name, deps, file, code) => {
    expect(
      tracingFiles({ 'package.json': manifest(deps), [file]: code })
    ).toEqual([file]);
  });

  it.each([
    [
      'init without a tracing option (error tracking only)',
      init('@sentry/react', 'environment: "prod"'),
    ],
    [
      'init only in a comment',
      "import * as Sentry from '@sentry/react';\n// Sentry.init({ tracesSampleRate: 1.0 });\nexport const ready = Boolean(Sentry);",
    ],
    [
      '@sentry/ only in a comment',
      '// see @sentry/react: Sentry.init({ tracesSampleRate: 1 })\nexport const nothing = 1;',
    ],
    [
      'init from another module',
      "import * as Sentry from './sentry-shim';\nSentry.init({ tracesSampleRate: 1.0 });",
    ],
    [
      'the @angular/fire/performance import the substring check took for tracing',
      "import { getPerformance } from '@angular/fire/performance';\nimport * as Sentry from '@sentry/angular';\nSentry.init({ dsn: 'x' });\nexport const perf = getPerformance;",
    ],
  ])('decoy: %s → not traced', (_name, code) => {
    expect(
      tracingFiles({
        'package.json': manifest({ '@sentry/react': '^8.47.0' }),
        'src/main.ts': code,
      })
    ).toEqual([]);
  });

  it('a test file is not production evidence', () => {
    expect(
      tracingFiles({
        'package.json': manifest({ '@sentry/react': '^8.47.0' }),
        'src/main.spec.ts': init('@sentry/react', 'tracesSampleRate: 1.0'),
      })
    ).toEqual([]);
  });
});

describe('#12 (b4): the law says what it asks, and names what it could not read', () => {
  const standards = async (
    files: Record<string, string>
  ): Promise<string[]> => {
    const root = project(files);
    const result = await PerformanceMonitoringStandardsLaw.check({
      projectRoot: root,
      config: ConfigLoader.load(root),
    });
    return result.violations ?? [];
  };

  it('no tracing init: the violation names the options it looks for', async () => {
    const violations = await standards({
      'package.json': manifest({ vue: '^3.5.13', '@sentry/vue': '^8.47.0' }),
      'src/main.ts': init('@sentry/vue', 'environment: "prod"'),
    });
    expect(violations.join('\n')).toMatch(
      /Performance tracing not configured: no Sentry\.init with tracesSampleRate \/ tracesSampler \/ tracePropagationTargets/
    );
  });

  it('a tracing init: no tracing violation', async () => {
    const violations = await standards({
      'package.json': manifest({ vue: '^3.5.13', '@sentry/vue': '^8.47.0' }),
      'src/main.ts': init('@sentry/vue', 'tracesSampleRate: 0.2'),
    });
    expect(violations.join('\n')).not.toMatch(new RegExp(TRACING));
  });

  it('a file that imports Sentry and does not parse is named as not read', async () => {
    const violations = await standards({
      'package.json': manifest({
        react: '^19.0.0',
        '@sentry/react': '^8.47.0',
      }),
      'src/instrument.ts':
        "import * as Sentry from '@sentry/react';\nSentry.init({ tracesSampleRate: 1.0 \n",
    });
    expect(violations.join('\n')).toMatch(new RegExp(TRACING));
    expect(violations.join('\n')).toMatch(
      /NOT read.*src\/instrument\.ts: could not be parsed/
    );
  });
});

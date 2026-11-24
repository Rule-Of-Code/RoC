/**
 * Tests for BundleOptimizationStrategyLaw (main law file)
 *
 * Tests for bundle optimization strategy coordination and result building,
 * on real project fixtures: a project configured for all six analyses (lazy
 * routes, Angular build optimization, sideEffects, vendor chunk, bundle
 * analysis tools), the same project with one piece removed, and an empty
 * project, where every analysis fails.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BundleOptimizationStrategyLaw } from '../../../src/laws/performance/bundle-optimization-strategy';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-bundle-opt-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

const config = FileUtils.getMinimalDefaultConfig();
const contextFor = (files: Record<string, string>): LawCheckContext => ({
  projectRoot: project(files),
  config,
});
const check = (files: Record<string, string>) =>
  BundleOptimizationStrategyLaw.check(contextFor(files));

const ROUTES = 'src/app/app.routes.ts';
/** A project every one of the six analyses accepts. */
const CONFIGURED: Record<string, string> = {
  'angular.json': JSON.stringify({
    projects: {
      app: {
        architect: {
          build: {
            builder: '@angular-devkit/build-angular:browser',
            options: {
              optimization: {
                scripts: true,
                styles: { minify: true, inlineCritical: true },
              },
              namedChunks: true,
              commonChunk: true,
              vendorChunk: true,
            },
          },
        },
      },
    },
  }),
  'package.json': JSON.stringify({
    name: 'app',
    sideEffects: false,
    devDependencies: {
      'webpack-bundle-analyzer': '^4.0.0',
      'source-map-explorer': '^2.0.0',
    },
  }),
  'tsconfig.json': JSON.stringify({
    compilerOptions: { module: 'esnext', target: 'es2020' },
  }),
  [ROUTES]: `export const routes = [
  { path: 'home', loadChildren: () => import('./home/home.module') },
  { path: 'about', loadComponent: () => import('./about/about.component') }
];
`,
};
const { [ROUTES]: _routes, ...WITHOUT_LAZY_ROUTES } = CONFIGURED;

const ALL_SIX = [
  'Code splitting not configured',
  'Tree shaking not enabled',
  'Minification and compression not optimized',
  'Critical CSS extraction not configured',
  'Vendor chunk optimization not configured',
  'Bundle analysis tools not setup',
];

describe('BundleOptimizationStrategyLaw - Main Law', () => {
  describe('check method', () => {
    it('should return LawResult with expected structure', () => {
      const result = check({});

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('fixable');
      expect(result).toHaveProperty('config');
    });

    it('should have score between 0 and 100', () => {
      const result = check({});

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return fixable as true', () => {
      expect(check({}).fixable).toBe(true);
    });

    it('should include context config in result', () => {
      const context = contextFor({});
      const result = BundleOptimizationStrategyLaw.check(context);
      expect(result.config).toEqual(context.config);
    });

    it('should return violations as array', () => {
      expect(Array.isArray(check({}).violations)).toBe(true);
    });

    it('should return suggestions as array', () => {
      expect(Array.isArray(check({}).suggestions)).toBe(true);
    });
  });

  describe('runAllAnalyses', () => {
    it('should pass when all analyses pass', () => {
      const result = check(CONFIGURED);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.violations).toHaveLength(0);
      expect(result.message).toBe(
        'Bundle optimization strategy properly implemented'
      );
    });

    it('should fail with violations when code splitting is not configured', () => {
      const result = check(WITHOUT_LAZY_ROUTES);

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual(['Code splitting not configured']);
      expect(result.score).toBeLessThan(100);
    });

    it('should accumulate multiple violations when multiple analyses fail', () => {
      const result = check({});

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual(ALL_SIX);
      expect(result.suggestions).toHaveLength(6);
      // Total penalties: 20+15+15+12+10+18 = 90, so minimum score is 10
      expect(result.score).toBe(10);
    });

    it('should calculate correct score based on penalties', () => {
      // Code splitting penalty is 20
      expect(check(WITHOUT_LAZY_ROUTES).score).toBe(80);
    });
  });

  describe('buildResult', () => {
    it('should return passed true when no violations', () => {
      const result = check(CONFIGURED);

      expect(result.passed).toBe(true);
      expect(result.message).toBe(
        'Bundle optimization strategy properly implemented'
      );
    });

    it('should join violations in message when there are violations', () => {
      const result = check({});

      expect(result.message).toBe(
        `Bundle optimization issues found: ${ALL_SIX.join(', ')}`
      );
    });

    it('should not go below the sum of the six penalties', () => {
      // Every analysis fails: 100 - 90.
      expect(check({}).score).toBe(10);
    });

    it('should include details array', () => {
      const result = check({});

      expect(result.details).toEqual(ALL_SIX);
    });
  });
});

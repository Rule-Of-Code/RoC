import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PerformanceBudgetPolicyAnalyzerService } from '../../src/laws/performance/performance-monitoring-policy/services/performance-budget-policy.analyzer';
import { PerformanceBudgetAnalyzerService } from '../../src/laws/performance/performance-monitoring/services/performance-budget.analyzer';
import { BundleOptimizationAnalyzer } from '../../src/laws/performance/performance-standards/services/bundle-optimization.analyzer';
import { AngularBudgetAnalyzerService } from '../../src/laws/performance/performance-budget-compliance/services/angular-budget.analyzer';
import { ResourceHintsAnalyzerService } from '../../src/laws/performance/core-web-vitals-compliance/services/resource-hints.analyzer';

/**
 * Four performance laws reported as absent three things that were present, and
 * two of them were contradicted by other laws in the same audit run — same
 * repository, same commit. That is the shape 7.20.0 fixed for branch naming,
 * repeated in the performance family.
 */
describe('the performance family agrees with itself', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  /** An Nx workspace with budgets where Nx actually puts them. */
  const nxProjectWithBudgets = (): void => {
    write('nx.json', '{}');
    write(
      'apps/web/project.json',
      JSON.stringify({
        name: 'web',
        targets: {
          build: {
            executor: '@angular/build:application',
            options: { outputPath: 'dist/apps/web' },
            configurations: {
              production: {
                budgets: [
                  {
                    type: 'initial',
                    maximumWarning: '500kb',
                    maximumError: '1mb',
                  },
                  {
                    type: 'anyComponentStyle',
                    maximumWarning: '4kb',
                    maximumError: '8kb',
                  },
                ],
              },
              development: { optimization: false },
            },
          },
        },
      })
    );
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-perf-'));
    write('package.json', '{"name":"w","version":"1.0.0"}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  /**
   * One repository declares its budgets once. Every law that asks about budgets
   * must get the same answer, or the audit contradicts itself in one run.
   */
  describe('budgets declared once are seen by every law that asks', () => {
    it('all three budget readers agree on an Nx workspace', () => {
      nxProjectWithBudgets();

      expect(
        PerformanceBudgetPolicyAnalyzerService.checkPerformanceBudget(root)
          .configured
      ).toBe(true);
      expect(
        PerformanceBudgetAnalyzerService.checkPerformanceBudget(root).configured
      ).toBe(true);
      // The reader that was already right, kept as the reference.
      expect(AngularBudgetAnalyzerService.analyze(root).configured).toBe(true);
    });

    // The red control: no budgets anywhere is still reported, by all of them.
    it('all three agree when there are no budgets', () => {
      write('nx.json', '{}');
      write(
        'apps/web/project.json',
        JSON.stringify({ name: 'web', targets: { build: { options: {} } } })
      );

      expect(
        PerformanceBudgetPolicyAnalyzerService.checkPerformanceBudget(root)
          .configured
      ).toBe(false);
      expect(
        PerformanceBudgetAnalyzerService.checkPerformanceBudget(root).configured
      ).toBe(false);
      expect(AngularBudgetAnalyzerService.analyze(root).configured).toBe(false);
    });
  });

  /**
   * `performance-standards` demanded a literal `"optimization": true`. The
   * esbuild `application` builder optimises production by default, so a correct
   * modern project does not write it — and this law then contradicted
   * `bundle-optimization-strategy-policy`, which passed the same repository.
   */
  describe('bundle optimization does not demand webpack-era keys', () => {
    it('accepts an esbuild project that controls size with budgets', () => {
      nxProjectWithBudgets();

      expect(BundleOptimizationAnalyzer.analyze(root)).toEqual([]);
    });

    it('still reports a project with neither optimization nor budgets', () => {
      write('nx.json', '{}');
      write(
        'apps/web/project.json',
        JSON.stringify({
          name: 'web',
          targets: { build: { executor: 'custom:builder', options: {} } },
        })
      );

      expect(BundleOptimizationAnalyzer.analyze(root)).toEqual([
        'Bundle optimization not properly configured',
      ]);
    });
  });

  /**
   * A preload hint for a content-hashed asset cannot exist in source: the
   * filename does not exist until the bundler has run. Reading only
   * `src/index.html` finds zero on every correctly built project that preloads
   * its own fonts — the more careful the project, the more certain the finding.
   */
  describe('resource hints are read from what ships', () => {
    const HASHED_PRELOAD =
      '<html><head><link rel="preload" as="font" href="IBMPlexSerif-a1b2c3.woff2" crossorigin></head></html>';

    it('finds hints stamped into the build output after bundling', () => {
      nxProjectWithBudgets();
      write('apps/web/src/index.html', '<html><head><title>x</title></head></html>');
      write('dist/apps/web/browser/index.html', HASHED_PRELOAD);

      expect(ResourceHintsAnalyzerService.analyze(root).hasHints).toBe(true);
    });

    it('honours an outputPath the build config declares', () => {
      write('nx.json', '{}');
      write(
        'apps/web/project.json',
        JSON.stringify({
          name: 'web',
          targets: {
            build: { options: { outputPath: { base: 'build/site' } } },
          },
        })
      );
      write('apps/web/src/index.html', '<html><head></head></html>');
      write('build/site/browser/index.html', HASHED_PRELOAD);

      expect(ResourceHintsAnalyzerService.analyze(root).hasHints).toBe(true);
    });

    it('still reads hints written by hand in source', () => {
      write(
        'src/index.html',
        '<html><head><link rel="preconnect" href="https://fonts.example"></head></html>'
      );

      expect(ResourceHintsAnalyzerService.analyze(root).hasHints).toBe(true);
    });

    // The red control: no hints in either place is still a finding.
    it('still reports a project with hints in neither source nor output', () => {
      nxProjectWithBudgets();
      write('apps/web/src/index.html', '<html><head><title>x</title></head></html>');
      write('dist/apps/web/browser/index.html', '<html><head></head></html>');

      expect(ResourceHintsAnalyzerService.analyze(root).hasHints).toBe(false);
    });
  });
});

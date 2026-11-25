/**
 * BundleOptimizationStrategyAnalyzerService — the coordinator the Bundle
 * Optimization Strategy law calls. Each analyze* method hands the project to
 * its specialised analyzer; addViolation records a finding with its
 * suggestion and penalty. Tested on real temporary projects, no mocks.
 */
import { BundleOptimizationStrategyTypesConstants as C } from '../../../src/laws/performance/bundle-optimization-strategy/constants';
import { BundleOptimizationStrategyAnalyzerService as Coordinator } from '../../../src/laws/performance/bundle-optimization-strategy/services/analyzer.service';
import { BundleAnalysisAnalyzerService } from '../../../src/laws/performance/bundle-optimization-strategy/services/bundle-analysis.analyzer';
import { CodeSplittingAnalyzerService } from '../../../src/laws/performance/bundle-optimization-strategy/services/code-splitting.analyzer';
import { CriticalCSSAnalyzerService } from '../../../src/laws/performance/bundle-optimization-strategy/services/critical-css.analyzer';
import { MinificationAnalyzerService } from '../../../src/laws/performance/bundle-optimization-strategy/services/minification.analyzer';
import { TreeShakingAnalyzerService } from '../../../src/laws/performance/bundle-optimization-strategy/services/tree-shaking.analyzer';
import { VendorChunkAnalyzerService } from '../../../src/laws/performance/bundle-optimization-strategy/services/vendor-chunk.analyzer';
import { FileUtils } from '../../../src/utils/file-utils';
import { project, removeProjects } from '../../checkers/toolkit-fixture';

const config = FileUtils.getMinimalDefaultConfig();

/** An Angular project whose production build sets the bundle options. */
const OPTIMISED_ANGULAR = {
  'package.json': JSON.stringify({
    name: 'app',
    dependencies: { '@angular/core': '^18.0.0' },
    devDependencies: { 'webpack-bundle-analyzer': '^4.10.0' },
    scripts: { analyze: 'webpack-bundle-analyzer dist/stats.json' },
  }),
  'angular.json': JSON.stringify({
    projects: {
      app: {
        architect: {
          build: {
            configurations: {
              production: {
                optimization: {
                  scripts: true,
                  styles: { inlineCritical: true },
                },
                vendorChunk: true,
                buildOptimizer: true,
              },
            },
          },
        },
      },
    },
  }),
  'src/app/app.routes.ts':
    "export const routes = [{ path: 'a', loadComponent: () => import('./a').then(m => m.A) }];\n",
};

afterEach(removeProjects);

describe('BundleOptimizationStrategyAnalyzerService', () => {
  it.each([
    ['an empty project', {}],
    ['an Angular project with the bundle options set', OPTIMISED_ANGULAR],
  ])(
    'hands %s to each specialised analyzer and returns its result',
    (_name, files) => {
      const root = project(files as Record<string, string>);

      expect(Coordinator.analyzeCodeSplitting(root, config)).toEqual(
        CodeSplittingAnalyzerService.analyze(root, config)
      );
      expect(Coordinator.analyzeTreeShaking(root)).toEqual(
        TreeShakingAnalyzerService.analyze(root)
      );
      expect(Coordinator.analyzeMinification(root)).toEqual(
        MinificationAnalyzerService.analyze(root)
      );
      expect(Coordinator.analyzeCriticalCSS(root)).toEqual(
        CriticalCSSAnalyzerService.analyze(root)
      );
      expect(Coordinator.analyzeVendorChunk(root)).toEqual(
        VendorChunkAnalyzerService.analyze(root)
      );
      expect(Coordinator.analyzeBundleAnalysis(root, config)).toEqual(
        BundleAnalysisAnalyzerService.analyze(root, config)
      );
    }
  );

  it('finds nothing configured in an empty project', () => {
    const root = project({});

    expect(Coordinator.analyzeTreeShaking(root).isEnabled).toBe(false);
    expect(Coordinator.analyzeVendorChunk(root).isOptimized).toBe(false);
    expect(Coordinator.analyzeBundleAnalysis(root, config).isSetup).toBe(false);
  });

  it('addViolation records the finding and its suggestion and takes the penalty', () => {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const score = Coordinator.addViolation(violations, suggestions, 100, {
      violation: 'CODE_SPLITTING_NOT_CONFIGURED',
      suggestion: 'CODE_SPLITTING_SUGGESTION',
      penalty: 'CODE_SPLITTING',
    });

    expect(violations).toEqual([
      C.VIOLATION_MESSAGES.CODE_SPLITTING_NOT_CONFIGURED,
    ]);
    expect(suggestions).toEqual([
      C.SUGGESTION_MESSAGES.CODE_SPLITTING_SUGGESTION,
    ]);
    expect(score).toBe(100 - C.SCORE_PENALTIES.CODE_SPLITTING);
  });
});

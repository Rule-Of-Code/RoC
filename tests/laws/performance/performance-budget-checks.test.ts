/**
 * Tests for PerformanceBudgetComplianceCheckConstants
 *
 * Tests budget types, config keys, score deductions, and helper methods.
 */
import { PerformanceBudgetComplianceCheckConstants } from '../../../src/laws/performance/performance-budget-compliance/constants/checks';

describe('PerformanceBudgetComplianceCheckConstants', () => {
  describe('BUDGET_TYPES', () => {
    it('should have INITIAL type', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.BUDGET_TYPES.INITIAL
      ).toBe('initial');
    });

    it('should have ANY_COMPONENT_STYLE type', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.BUDGET_TYPES
          .ANY_COMPONENT_STYLE
      ).toBe('anyComponentStyle');
    });

    it('should have BUNDLE type', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.BUDGET_TYPES.BUNDLE
      ).toBe('bundle');
    });
  });

  describe('WEBPACK_PERFORMANCE_KEYS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(
          PerformanceBudgetComplianceCheckConstants.WEBPACK_PERFORMANCE_KEYS
        )
      ).toBe(true);
    });

    it('should contain performance: key', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.WEBPACK_PERFORMANCE_KEYS
      ).toContain('performance:');
    });

    it('should contain performance space key', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.WEBPACK_PERFORMANCE_KEYS
      ).toContain('performance ');
    });
  });

  describe('WEBPACK_CONFIG_KEYS', () => {
    it('should have MAX_ASSET_SIZE key', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.WEBPACK_CONFIG_KEYS
          .MAX_ASSET_SIZE
      ).toBe('maxAssetSize');
    });

    it('should have MAX_ENTRYPOINT_SIZE key', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.WEBPACK_CONFIG_KEYS
          .MAX_ENTRYPOINT_SIZE
      ).toBe('maxEntrypointSize');
    });

    it('should have HINTS key', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.WEBPACK_CONFIG_KEYS.HINTS
      ).toBe('hints:');
    });
  });

  describe('LIGHTHOUSE_CONFIG_KEYS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(
          PerformanceBudgetComplianceCheckConstants.LIGHTHOUSE_CONFIG_KEYS
        )
      ).toBe(true);
    });

    it('should contain assert key', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.LIGHTHOUSE_CONFIG_KEYS
      ).toContain('assert');
    });

    it('should contain budget key', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.LIGHTHOUSE_CONFIG_KEYS
      ).toContain('budget');
    });

    it('should contain minScore key', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.LIGHTHOUSE_CONFIG_KEYS
      ).toContain('minScore');
    });

    it('should contain maxNumericValue key', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.LIGHTHOUSE_CONFIG_KEYS
      ).toContain('maxNumericValue');
    });
  });

  describe('BUNDLE_TOOLS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(PerformanceBudgetComplianceCheckConstants.BUNDLE_TOOLS)
      ).toBe(true);
    });

    it('should contain webpack-bundle-analyzer', () => {
      expect(PerformanceBudgetComplianceCheckConstants.BUNDLE_TOOLS).toContain(
        'webpack-bundle-analyzer'
      );
    });

    it('should contain BundleSizeAnalyzer', () => {
      expect(PerformanceBudgetComplianceCheckConstants.BUNDLE_TOOLS).toContain(
        'BundleSizeAnalyzer'
      );
    });

    it('should contain bundlesize', () => {
      expect(PerformanceBudgetComplianceCheckConstants.BUNDLE_TOOLS).toContain(
        'bundlesize'
      );
    });

    it('should contain source-map-explorer', () => {
      expect(PerformanceBudgetComplianceCheckConstants.BUNDLE_TOOLS).toContain(
        'source-map-explorer'
      );
    });
  });

  describe('MONITORING_SERVICES', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(
          PerformanceBudgetComplianceCheckConstants.MONITORING_SERVICES
        )
      ).toBe(true);
    });

    it('should contain web-vitals', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.MONITORING_SERVICES
      ).toContain('web-vitals');
    });

    it('should contain @sentry/browser', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.MONITORING_SERVICES
      ).toContain('@sentry/browser');
    });

    it('should contain @sentry/angular', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.MONITORING_SERVICES
      ).toContain('@sentry/angular');
    });

    it('should contain firebase', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.MONITORING_SERVICES
      ).toContain('firebase');
    });
  });

  describe('SCORE_DEDUCTIONS', () => {
    it('should have ANGULAR deduction of 25', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.SCORE_DEDUCTIONS.ANGULAR
      ).toBe(25);
    });

    it('should have WEBPACK deduction of 20', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.SCORE_DEDUCTIONS.WEBPACK
      ).toBe(20);
    });

    it('should have LIGHTHOUSE deduction of 20', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.SCORE_DEDUCTIONS.LIGHTHOUSE
      ).toBe(20);
    });

    it('should have BUNDLE deduction of 15', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.SCORE_DEDUCTIONS.BUNDLE
      ).toBe(15);
    });

    it('should have CI_CD deduction of 10', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.SCORE_DEDUCTIONS.CI_CD
      ).toBe(10);
    });

    it('should have MONITORING deduction of 10', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.SCORE_DEDUCTIONS.MONITORING
      ).toBe(10);
    });

    it('should have total deductions equal to 100', () => {
      const total =
        PerformanceBudgetComplianceCheckConstants.SCORE_DEDUCTIONS.ANGULAR +
        PerformanceBudgetComplianceCheckConstants.SCORE_DEDUCTIONS.WEBPACK +
        PerformanceBudgetComplianceCheckConstants.SCORE_DEDUCTIONS.LIGHTHOUSE +
        PerformanceBudgetComplianceCheckConstants.SCORE_DEDUCTIONS.BUNDLE +
        PerformanceBudgetComplianceCheckConstants.SCORE_DEDUCTIONS.CI_CD +
        PerformanceBudgetComplianceCheckConstants.SCORE_DEDUCTIONS.MONITORING;
      expect(total).toBe(100);
    });
  });

  describe('hasWebpackPerformance', () => {
    it('should return true for performance: content', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.hasWebpackPerformance(
          'module.exports = { performance: { hints: "warning" } }'
        )
      ).toBe(true);
    });

    it('should return true for performance space content', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.hasWebpackPerformance(
          'performance = {}'
        )
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.hasWebpackPerformance(
          'module.exports = { entry: "./src/index.js" }'
        )
      ).toBe(false);
    });
  });

  describe('hasWebpackHints', () => {
    it('should return true for hints: warning', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.hasWebpackHints(
          'hints: "warning"'
        )
      ).toBe(true);
    });

    it('should return true for hints: error', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.hasWebpackHints(
          'hints: "error"'
        )
      ).toBe(true);
    });

    it('should return false for hints: false', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.hasWebpackHints(
          'hints: false'
        )
      ).toBe(false);
    });

    it('should return false for no hints', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.hasWebpackHints(
          'maxAssetSize: 500000'
        )
      ).toBe(false);
    });
  });

  describe('hasLighthouseBudget', () => {
    it('should return true for assert key', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.hasLighthouseBudget(
          'assert: { performance: { minScore: 0.9 } }'
        )
      ).toBe(true);
    });

    it('should return true for budget key', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.hasLighthouseBudget(
          'budget: { resourceCounts: [] }'
        )
      ).toBe(true);
    });

    it('should return true for minScore key', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.hasLighthouseBudget(
          'minScore: 0.9'
        )
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.hasLighthouseBudget(
          'module.exports = {}'
        )
      ).toBe(false);
    });
  });

  describe('getScoreDeduction', () => {
    it('should return 25 for angular', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.getScoreDeduction('angular')
      ).toBe(25);
    });

    it('should return 20 for webpack', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.getScoreDeduction('webpack')
      ).toBe(20);
    });

    it('should return 20 for lighthouse', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.getScoreDeduction(
          'lighthouse'
        )
      ).toBe(20);
    });

    it('should return 15 for bundle', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.getScoreDeduction('bundle')
      ).toBe(15);
    });

    it('should return 10 for ci_cd', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.getScoreDeduction('ci_cd')
      ).toBe(10);
    });

    it('should return 10 for monitoring', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.getScoreDeduction(
          'monitoring'
        )
      ).toBe(10);
    });

    it('should return 0 for unknown check type', () => {
      expect(
        PerformanceBudgetComplianceCheckConstants.getScoreDeduction('unknown')
      ).toBe(0);
    });
  });
});

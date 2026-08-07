/**
 * Tests for PerformanceBudgetPolicyConstants
 */
import { PerformanceBudgetPolicyConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/performance-budget-policy.constants';

describe('PerformanceBudgetPolicyConstants', () => {
  describe('ANGULAR_BUDGET_FILE', () => {
    it('should be angular.json', () => {
      expect(PerformanceBudgetPolicyConstants.ANGULAR_BUDGET_FILE).toBe(
        'angular.json'
      );
    });
  });

  describe('ANGULAR_BUDGET_PATTERN', () => {
    it('should be budgets', () => {
      expect(PerformanceBudgetPolicyConstants.ANGULAR_BUDGET_PATTERN).toBe(
        'budgets'
      );
    });
  });

  describe('LIGHTHOUSE_CONFIG_FILES', () => {
    it('should include .lighthouserc.js', () => {
      expect(
        PerformanceBudgetPolicyConstants.LIGHTHOUSE_CONFIG_FILES
      ).toContain('.lighthouserc.js');
    });

    it('should include .lighthouserc.json', () => {
      expect(
        PerformanceBudgetPolicyConstants.LIGHTHOUSE_CONFIG_FILES
      ).toContain('.lighthouserc.json');
    });

    it('should include lighthouse.config.js', () => {
      expect(
        PerformanceBudgetPolicyConstants.LIGHTHOUSE_CONFIG_FILES
      ).toContain('lighthouse.config.js');
    });
  });

  describe('LIGHTHOUSE_BUDGET_PATTERNS', () => {
    it('should include budget', () => {
      expect(
        PerformanceBudgetPolicyConstants.LIGHTHOUSE_BUDGET_PATTERNS
      ).toContain('budget');
    });

    it('should include assert', () => {
      expect(
        PerformanceBudgetPolicyConstants.LIGHTHOUSE_BUDGET_PATTERNS
      ).toContain('assert');
    });
  });

  describe('WEBPACK_CONFIG_FILE', () => {
    it('should be webpack.config.js', () => {
      expect(PerformanceBudgetPolicyConstants.WEBPACK_CONFIG_FILE).toBe(
        'webpack.config.js'
      );
    });
  });

  describe('WEBPACK_PERFORMANCE_PATTERNS', () => {
    it('should include performance', () => {
      expect(
        PerformanceBudgetPolicyConstants.WEBPACK_PERFORMANCE_PATTERNS
      ).toContain('performance');
    });

    it('should include maxAssetSize', () => {
      expect(
        PerformanceBudgetPolicyConstants.WEBPACK_PERFORMANCE_PATTERNS
      ).toContain('maxAssetSize');
    });

    it('should include maxEntrypointSize', () => {
      expect(
        PerformanceBudgetPolicyConstants.WEBPACK_PERFORMANCE_PATTERNS
      ).toContain('maxEntrypointSize');
    });
  });

  describe('isLighthouseConfigFile()', () => {
    it('should return true for .lighthouserc.js', () => {
      expect(
        PerformanceBudgetPolicyConstants.isLighthouseConfigFile(
          '.lighthouserc.js'
        )
      ).toBe(true);
    });

    it('should return true for .lighthouserc.json', () => {
      expect(
        PerformanceBudgetPolicyConstants.isLighthouseConfigFile(
          '.lighthouserc.json'
        )
      ).toBe(true);
    });

    it('should return true for lighthouse.config.js', () => {
      expect(
        PerformanceBudgetPolicyConstants.isLighthouseConfigFile(
          'lighthouse.config.js'
        )
      ).toBe(true);
    });

    it('should return true for path containing lighthouse config', () => {
      expect(
        PerformanceBudgetPolicyConstants.isLighthouseConfigFile(
          'config/.lighthouserc.js'
        )
      ).toBe(true);
    });

    it('should return false for unrelated file', () => {
      expect(
        PerformanceBudgetPolicyConstants.isLighthouseConfigFile('package.json')
      ).toBe(false);
    });
  });

  describe('hasAngularBudgets()', () => {
    it('should return true for content with budgets', () => {
      const content = '{ "budgets": [] }';
      expect(PerformanceBudgetPolicyConstants.hasAngularBudgets(content)).toBe(
        true
      );
    });

    it('should return false for content without budgets', () => {
      expect(
        PerformanceBudgetPolicyConstants.hasAngularBudgets(
          '{ "architect": {} }'
        )
      ).toBe(false);
    });
  });

  describe('hasWebpackPerformanceConfig()', () => {
    it('should return true for content with performance and maxAssetSize', () => {
      const content = 'performance: { maxAssetSize: 250000 }';
      expect(
        PerformanceBudgetPolicyConstants.hasWebpackPerformanceConfig(content)
      ).toBe(true);
    });

    it('should return true for content with performance and maxEntrypointSize', () => {
      const content = 'performance: { maxEntrypointSize: 500000 }';
      expect(
        PerformanceBudgetPolicyConstants.hasWebpackPerformanceConfig(content)
      ).toBe(true);
    });

    it('should return false for content with only performance', () => {
      expect(
        PerformanceBudgetPolicyConstants.hasWebpackPerformanceConfig(
          'performance: {}'
        )
      ).toBe(false);
    });

    it('should return false for content with only maxAssetSize', () => {
      expect(
        PerformanceBudgetPolicyConstants.hasWebpackPerformanceConfig(
          'maxAssetSize: 250000'
        )
      ).toBe(false);
    });
  });
});

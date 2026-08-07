/**
 * Tests for PerformanceBudgetPolicyConstants
 *
 * Tests performance budget configuration detection.
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
    it('should be an array of strings', () => {
      expect(
        Array.isArray(PerformanceBudgetPolicyConstants.LIGHTHOUSE_CONFIG_FILES)
      ).toBe(true);
    });

    it('should contain .lighthouserc.js', () => {
      expect(
        PerformanceBudgetPolicyConstants.LIGHTHOUSE_CONFIG_FILES
      ).toContain('.lighthouserc.js');
    });

    it('should contain .lighthouserc.json', () => {
      expect(
        PerformanceBudgetPolicyConstants.LIGHTHOUSE_CONFIG_FILES
      ).toContain('.lighthouserc.json');
    });

    it('should contain lighthouse.config.js', () => {
      expect(
        PerformanceBudgetPolicyConstants.LIGHTHOUSE_CONFIG_FILES
      ).toContain('lighthouse.config.js');
    });
  });

  describe('LIGHTHOUSE_BUDGET_PATTERNS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(
          PerformanceBudgetPolicyConstants.LIGHTHOUSE_BUDGET_PATTERNS
        )
      ).toBe(true);
    });

    it('should contain budget', () => {
      expect(
        PerformanceBudgetPolicyConstants.LIGHTHOUSE_BUDGET_PATTERNS
      ).toContain('budget');
    });

    it('should contain assert', () => {
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
    it('should be an array of strings', () => {
      expect(
        Array.isArray(
          PerformanceBudgetPolicyConstants.WEBPACK_PERFORMANCE_PATTERNS
        )
      ).toBe(true);
    });

    it('should contain performance', () => {
      expect(
        PerformanceBudgetPolicyConstants.WEBPACK_PERFORMANCE_PATTERNS
      ).toContain('performance');
    });

    it('should contain maxAssetSize', () => {
      expect(
        PerformanceBudgetPolicyConstants.WEBPACK_PERFORMANCE_PATTERNS
      ).toContain('maxAssetSize');
    });

    it('should contain maxEntrypointSize', () => {
      expect(
        PerformanceBudgetPolicyConstants.WEBPACK_PERFORMANCE_PATTERNS
      ).toContain('maxEntrypointSize');
    });
  });

  describe('isLighthouseConfigFile', () => {
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

    it('should return true for full paths', () => {
      expect(
        PerformanceBudgetPolicyConstants.isLighthouseConfigFile(
          'config/.lighthouserc.js'
        )
      ).toBe(true);
    });

    it('should return false for non-lighthouse files', () => {
      expect(
        PerformanceBudgetPolicyConstants.isLighthouseConfigFile('package.json')
      ).toBe(false);
    });

    it('should return false for similar but different files', () => {
      expect(
        PerformanceBudgetPolicyConstants.isLighthouseConfigFile('lighthouse.ts')
      ).toBe(false);
    });
  });

  describe('hasAngularBudgets', () => {
    it('should return true when budgets is present', () => {
      const content =
        '{ "budgets": [{ "type": "initial", "maximumWarning": "2mb" }] }';
      expect(PerformanceBudgetPolicyConstants.hasAngularBudgets(content)).toBe(
        true
      );
    });

    it('should return false when budgets is not present', () => {
      const content = '{ "projects": { "app": {} } }';
      expect(PerformanceBudgetPolicyConstants.hasAngularBudgets(content)).toBe(
        false
      );
    });

    it('should return false for empty content', () => {
      expect(PerformanceBudgetPolicyConstants.hasAngularBudgets('')).toBe(
        false
      );
    });
  });

  describe('hasWebpackPerformanceConfig', () => {
    it('should return true when performance and maxAssetSize are present', () => {
      const content =
        'module.exports = { performance: { maxAssetSize: 500000 } }';
      expect(
        PerformanceBudgetPolicyConstants.hasWebpackPerformanceConfig(content)
      ).toBe(true);
    });

    it('should return true when performance and maxEntrypointSize are present', () => {
      const content =
        'module.exports = { performance: { maxEntrypointSize: 500000 } }';
      expect(
        PerformanceBudgetPolicyConstants.hasWebpackPerformanceConfig(content)
      ).toBe(true);
    });

    it('should return true when all patterns are present', () => {
      const content =
        'performance: { maxAssetSize: 500000, maxEntrypointSize: 500000 }';
      expect(
        PerformanceBudgetPolicyConstants.hasWebpackPerformanceConfig(content)
      ).toBe(true);
    });

    it('should return false when only performance is present', () => {
      const content = 'performance: { hints: "warning" }';
      expect(
        PerformanceBudgetPolicyConstants.hasWebpackPerformanceConfig(content)
      ).toBe(false);
    });

    it('should return false when performance is not present', () => {
      const content = 'module.exports = { entry: "./src/index.js" }';
      expect(
        PerformanceBudgetPolicyConstants.hasWebpackPerformanceConfig(content)
      ).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(
        PerformanceBudgetPolicyConstants.hasWebpackPerformanceConfig('')
      ).toBe(false);
    });
  });
});

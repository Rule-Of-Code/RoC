/**
 * Tests for PerformanceBudgetConstants
 *
 * Covers:
 * - BUDGET_CONFIG_FILE_PATTERNS
 * - BUDGET_CONFIGURATION_PATTERNS
 * - ANGULAR_BUDGET_FILE
 * - ANGULAR_BUDGET_PATTERN
 * - isBudgetConfigFile()
 * - hasBudgetConfiguration()
 */
import { PerformanceBudgetConstants } from '../../../src/laws/performance/performance-monitoring/constants/performance-budget.constants';

describe('PerformanceBudgetConstants', () => {
  describe('BUDGET_CONFIG_FILE_PATTERNS', () => {
    it('should be a non-empty array', () => {
      expect(
        Array.isArray(PerformanceBudgetConstants.BUDGET_CONFIG_FILE_PATTERNS)
      ).toBe(true);
      expect(
        PerformanceBudgetConstants.BUDGET_CONFIG_FILE_PATTERNS.length
      ).toBeGreaterThan(0);
    });

    it('should include lighthouse.config.js', () => {
      expect(PerformanceBudgetConstants.BUDGET_CONFIG_FILE_PATTERNS).toContain(
        'lighthouse.config.js'
      );
    });

    it('should include config/lighthouse.config.js', () => {
      expect(PerformanceBudgetConstants.BUDGET_CONFIG_FILE_PATTERNS).toContain(
        'config/lighthouse.config.js'
      );
    });

    it('should include .lighthouserc.json', () => {
      expect(PerformanceBudgetConstants.BUDGET_CONFIG_FILE_PATTERNS).toContain(
        '.lighthouserc.json'
      );
    });

    it('should include performance-budget.json', () => {
      expect(PerformanceBudgetConstants.BUDGET_CONFIG_FILE_PATTERNS).toContain(
        'performance-budget.json'
      );
    });

    it('should include webpack.config.js', () => {
      expect(PerformanceBudgetConstants.BUDGET_CONFIG_FILE_PATTERNS).toContain(
        'webpack.config.js'
      );
    });

    it('should have exactly 5 patterns', () => {
      expect(
        PerformanceBudgetConstants.BUDGET_CONFIG_FILE_PATTERNS.length
      ).toBe(5);
    });
  });

  describe('BUDGET_CONFIGURATION_PATTERNS', () => {
    it('should be a non-empty array', () => {
      expect(
        Array.isArray(PerformanceBudgetConstants.BUDGET_CONFIGURATION_PATTERNS)
      ).toBe(true);
      expect(
        PerformanceBudgetConstants.BUDGET_CONFIGURATION_PATTERNS.length
      ).toBeGreaterThan(0);
    });

    it('should include budget', () => {
      expect(
        PerformanceBudgetConstants.BUDGET_CONFIGURATION_PATTERNS
      ).toContain('budget');
    });

    it('should include performanceBudget', () => {
      expect(
        PerformanceBudgetConstants.BUDGET_CONFIGURATION_PATTERNS
      ).toContain('performanceBudget');
    });

    it('should include maxAssetSize', () => {
      expect(
        PerformanceBudgetConstants.BUDGET_CONFIGURATION_PATTERNS
      ).toContain('maxAssetSize');
    });

    it('should include maxEntrypointSize', () => {
      expect(
        PerformanceBudgetConstants.BUDGET_CONFIGURATION_PATTERNS
      ).toContain('maxEntrypointSize');
    });

    it('should have exactly 4 patterns', () => {
      expect(
        PerformanceBudgetConstants.BUDGET_CONFIGURATION_PATTERNS.length
      ).toBe(4);
    });
  });

  describe('ANGULAR_BUDGET_FILE', () => {
    it('should be angular.json', () => {
      expect(PerformanceBudgetConstants.ANGULAR_BUDGET_FILE).toBe(
        'angular.json'
      );
    });
  });

  describe('ANGULAR_BUDGET_PATTERN', () => {
    it('should be budgets', () => {
      expect(PerformanceBudgetConstants.ANGULAR_BUDGET_PATTERN).toBe('budgets');
    });
  });

  describe('isBudgetConfigFile()', () => {
    it('should return true for lighthouse.config.js', () => {
      expect(
        PerformanceBudgetConstants.isBudgetConfigFile('lighthouse.config.js')
      ).toBe(true);
    });

    it('should return true for config/lighthouse.config.js', () => {
      expect(
        PerformanceBudgetConstants.isBudgetConfigFile(
          'config/lighthouse.config.js'
        )
      ).toBe(true);
    });

    it('should return true for .lighthouserc.json', () => {
      expect(
        PerformanceBudgetConstants.isBudgetConfigFile('.lighthouserc.json')
      ).toBe(true);
    });

    it('should return true for performance-budget.json', () => {
      expect(
        PerformanceBudgetConstants.isBudgetConfigFile('performance-budget.json')
      ).toBe(true);
    });

    it('should return true for webpack.config.js', () => {
      expect(
        PerformanceBudgetConstants.isBudgetConfigFile('webpack.config.js')
      ).toBe(true);
    });

    it('should return true for path containing pattern', () => {
      expect(
        PerformanceBudgetConstants.isBudgetConfigFile(
          'src/config/lighthouse.config.js'
        )
      ).toBe(true);
    });

    it('should return false for unrelated files', () => {
      expect(
        PerformanceBudgetConstants.isBudgetConfigFile('package.json')
      ).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(PerformanceBudgetConstants.isBudgetConfigFile('')).toBe(false);
    });
  });

  describe('hasBudgetConfiguration()', () => {
    it('should return true for content with budget', () => {
      expect(
        PerformanceBudgetConstants.hasBudgetConfiguration('budget: 100')
      ).toBe(true);
    });

    it('should return true for content with performanceBudget', () => {
      expect(
        PerformanceBudgetConstants.hasBudgetConfiguration(
          'performanceBudget: {}'
        )
      ).toBe(true);
    });

    it('should return true for content with maxAssetSize', () => {
      expect(
        PerformanceBudgetConstants.hasBudgetConfiguration(
          'maxAssetSize: 250000'
        )
      ).toBe(true);
    });

    it('should return true for content with maxEntrypointSize', () => {
      expect(
        PerformanceBudgetConstants.hasBudgetConfiguration(
          'maxEntrypointSize: 500000'
        )
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        PerformanceBudgetConstants.hasBudgetConfiguration('const x = 1;')
      ).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(PerformanceBudgetConstants.hasBudgetConfiguration('')).toBe(false);
    });

    it('should handle multiline content', () => {
      const content = `
        module.exports = {
          performanceBudget: {
            maxAssetSize: 250000,
            maxEntrypointSize: 500000
          }
        };
      `;
      expect(PerformanceBudgetConstants.hasBudgetConfiguration(content)).toBe(
        true
      );
    });
  });
});

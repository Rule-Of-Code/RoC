/**
 * @fileoverview Tests for performance-analysis-configuration.ts
 * @description Tests for Performance Analysis configuration utilities
 */

import { FileUtils } from '../../src/utils/file-utils';
import { PerformanceAnalysisConfiguration } from '../../src/utils/performance/performance-analysis/performance-analysis-configuration';

describe('utils/performance/performance-analysis/performance-analysis-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('perf-analysis-config-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('SEVERITY constants', () => {
    it('should have HIGH severity constant', () => {
      expect(PerformanceAnalysisConfiguration.SEVERITY.HIGH).toBe('high');
    });

    it('should have MEDIUM severity constant', () => {
      expect(PerformanceAnalysisConfiguration.SEVERITY.MEDIUM).toBe('medium');
    });

    it('should have LOW severity constant', () => {
      expect(PerformanceAnalysisConfiguration.SEVERITY.LOW).toBe('low');
    });

    it('should have exactly 3 severity levels', () => {
      const severities = Object.keys(PerformanceAnalysisConfiguration.SEVERITY);
      expect(severities).toHaveLength(3);
    });
  });

  describe('ISSUE_TYPES constants', () => {
    it('should have LIFECYCLE issue type', () => {
      expect(PerformanceAnalysisConfiguration.ISSUE_TYPES.LIFECYCLE).toBe(
        'lifecycle'
      );
    });

    it('should have DOM issue type', () => {
      expect(PerformanceAnalysisConfiguration.ISSUE_TYPES.DOM).toBe('dom');
    });

    it('should have EVENTS issue type', () => {
      expect(PerformanceAnalysisConfiguration.ISSUE_TYPES.EVENTS).toBe(
        'events'
      );
    });

    it('should have OBSERVABLES issue type', () => {
      expect(PerformanceAnalysisConfiguration.ISSUE_TYPES.OBSERVABLES).toBe(
        'observables'
      );
    });

    it('should have TIMERS issue type', () => {
      expect(PerformanceAnalysisConfiguration.ISSUE_TYPES.TIMERS).toBe(
        'timers'
      );
    });

    it('should have ANALYSIS_ERROR issue type', () => {
      expect(PerformanceAnalysisConfiguration.ISSUE_TYPES.ANALYSIS_ERROR).toBe(
        'analysis_error'
      );
    });

    it('should have exactly 6 issue types', () => {
      const types = Object.keys(PerformanceAnalysisConfiguration.ISSUE_TYPES);
      expect(types).toHaveLength(6);
    });
  });

  describe('SCORE constants', () => {
    it('should have PERFECT score of 100', () => {
      expect(PerformanceAnalysisConfiguration.SCORE.PERFECT).toBe(100);
    });

    it('should have MIN score of 0', () => {
      expect(PerformanceAnalysisConfiguration.SCORE.MIN).toBe(0);
    });

    it('should have HIGH_SEVERITY_PENALTY of 20', () => {
      expect(PerformanceAnalysisConfiguration.SCORE.HIGH_SEVERITY_PENALTY).toBe(
        20
      );
    });

    it('should have MEDIUM_SEVERITY_PENALTY of 10', () => {
      expect(
        PerformanceAnalysisConfiguration.SCORE.MEDIUM_SEVERITY_PENALTY
      ).toBe(10);
    });

    it('should have LOW_SEVERITY_PENALTY of 5', () => {
      expect(PerformanceAnalysisConfiguration.SCORE.LOW_SEVERITY_PENALTY).toBe(
        5
      );
    });

    it('should have exactly 5 score constants', () => {
      const scores = Object.keys(PerformanceAnalysisConfiguration.SCORE);
      expect(scores).toHaveLength(5);
    });
  });

  describe('RECOMMENDATIONS constants', () => {
    it('should have LIFECYCLE recommendation', () => {
      expect(PerformanceAnalysisConfiguration.RECOMMENDATIONS.LIFECYCLE).toBe(
        'Optimize component lifecycle methods for better performance'
      );
    });

    it('should have DOM recommendation', () => {
      expect(PerformanceAnalysisConfiguration.RECOMMENDATIONS.DOM).toBe(
        'Optimize DOM references and queries for better performance'
      );
    });

    it('should have EVENTS recommendation', () => {
      expect(PerformanceAnalysisConfiguration.RECOMMENDATIONS.EVENTS).toBe(
        'Review event listeners for potential memory leaks'
      );
    });

    it('should have OBSERVABLES recommendation', () => {
      expect(PerformanceAnalysisConfiguration.RECOMMENDATIONS.OBSERVABLES).toBe(
        'Fix observable subscription memory leaks'
      );
    });

    it('should have TIMERS recommendation', () => {
      expect(PerformanceAnalysisConfiguration.RECOMMENDATIONS.TIMERS).toBe(
        'Clean up timer functions to prevent memory leaks'
      );
    });

    it('should have ANALYSIS_ERROR recommendation', () => {
      expect(
        PerformanceAnalysisConfiguration.RECOMMENDATIONS.ANALYSIS_ERROR
      ).toBe('Fix performance analysis errors before proceeding');
    });

    it('should have BUDGETS recommendation', () => {
      expect(PerformanceAnalysisConfiguration.RECOMMENDATIONS.BUDGETS).toBe(
        'Set up performance budgets for key metrics'
      );
    });

    it('should have MONITORING recommendation', () => {
      expect(PerformanceAnalysisConfiguration.RECOMMENDATIONS.MONITORING).toBe(
        'Implement continuous performance monitoring'
      );
    });

    it('should have REGRESSION_TESTS recommendation', () => {
      expect(
        PerformanceAnalysisConfiguration.RECOMMENDATIONS.REGRESSION_TESTS
      ).toBe('Add performance regression tests');
    });

    it('should have CI_CD_INTEGRATION recommendation', () => {
      expect(
        PerformanceAnalysisConfiguration.RECOMMENDATIONS.CI_CD_INTEGRATION
      ).toBe('Integrate performance checks in CI/CD pipeline');
    });

    it('should have AUTOMATED_ALERTS recommendation', () => {
      expect(
        PerformanceAnalysisConfiguration.RECOMMENDATIONS.AUTOMATED_ALERTS
      ).toBe('Set up automated performance alerts');
    });

    it('should have BASELINE_COMPARISON recommendation', () => {
      expect(
        PerformanceAnalysisConfiguration.RECOMMENDATIONS.BASELINE_COMPARISON
      ).toBe('Add performance baseline comparisons');
    });

    it('should have exactly 12 recommendations', () => {
      const recommendations = Object.keys(
        PerformanceAnalysisConfiguration.RECOMMENDATIONS
      );
      expect(recommendations).toHaveLength(12);
    });
  });

  describe('SUCCESS_MESSAGE constant', () => {
    it('should have success message', () => {
      expect(PerformanceAnalysisConfiguration.SUCCESS_MESSAGE).toBe(
        'Performance analysis completed successfully with no issues found'
      );
    });
  });

  describe('ERROR_MESSAGES constants', () => {
    it('should have ANALYSIS_FAILED message', () => {
      expect(
        PerformanceAnalysisConfiguration.ERROR_MESSAGES.ANALYSIS_FAILED
      ).toBe('Performance analysis failed');
    });

    it('should have ANALYSIS_ENCOUNTERED_ERRORS message', () => {
      expect(
        PerformanceAnalysisConfiguration.ERROR_MESSAGES
          .ANALYSIS_ENCOUNTERED_ERRORS
      ).toBe('Performance analysis encountered errors');
    });

    it('should have exactly 2 error messages', () => {
      const messages = Object.keys(
        PerformanceAnalysisConfiguration.ERROR_MESSAGES
      );
      expect(messages).toHaveLength(2);
    });
  });

  describe('getSeverityForType', () => {
    it('should return high severity for DOM type', () => {
      const result = PerformanceAnalysisConfiguration.getSeverityForType('dom');
      expect(result).toBe('high');
    });

    it('should return high severity for OBSERVABLES type', () => {
      const result =
        PerformanceAnalysisConfiguration.getSeverityForType('observables');
      expect(result).toBe('high');
    });

    it('should return high severity for ANALYSIS_ERROR type', () => {
      const result =
        PerformanceAnalysisConfiguration.getSeverityForType('analysis_error');
      expect(result).toBe('high');
    });

    it('should return medium severity for LIFECYCLE type', () => {
      const result =
        PerformanceAnalysisConfiguration.getSeverityForType('lifecycle');
      expect(result).toBe('medium');
    });

    it('should return medium severity for EVENTS type', () => {
      const result =
        PerformanceAnalysisConfiguration.getSeverityForType('events');
      expect(result).toBe('medium');
    });

    it('should return medium severity for TIMERS type', () => {
      const result =
        PerformanceAnalysisConfiguration.getSeverityForType('timers');
      expect(result).toBe('medium');
    });

    it('should return undefined for unknown type', () => {
      const result =
        PerformanceAnalysisConfiguration.getSeverityForType('unknown');
      expect(result).toBeUndefined();
    });
  });

  describe('getPerformanceConfig', () => {
    it('should return a config object', () => {
      const config = PerformanceAnalysisConfiguration.getPerformanceConfig();
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should return a valid RuleOfCodeConfig', () => {
      const config = PerformanceAnalysisConfiguration.getPerformanceConfig();
      expect(config).toHaveProperty('laws');
      expect(config).toHaveProperty('project');
      expect(config).toHaveProperty('reporting');
    });
  });

  describe('calculateScore', () => {
    it('should return 100 for no issues', () => {
      const score = PerformanceAnalysisConfiguration.calculateScore(0, 0, 0);
      expect(score).toBe(100);
    });

    it('should subtract 20 points per high severity issue', () => {
      const score = PerformanceAnalysisConfiguration.calculateScore(1, 0, 0);
      expect(score).toBe(80);
    });

    it('should subtract 10 points per medium severity issue', () => {
      const score = PerformanceAnalysisConfiguration.calculateScore(0, 1, 0);
      expect(score).toBe(90);
    });

    it('should subtract 5 points per low severity issue', () => {
      const score = PerformanceAnalysisConfiguration.calculateScore(0, 0, 1);
      expect(score).toBe(95);
    });

    it('should handle multiple high severity issues', () => {
      const score = PerformanceAnalysisConfiguration.calculateScore(3, 0, 0);
      expect(score).toBe(40);
    });

    it('should handle multiple medium severity issues', () => {
      const score = PerformanceAnalysisConfiguration.calculateScore(0, 5, 0);
      expect(score).toBe(50);
    });

    it('should handle multiple low severity issues', () => {
      const score = PerformanceAnalysisConfiguration.calculateScore(0, 0, 10);
      expect(score).toBe(50);
    });

    it('should handle mixed severity issues', () => {
      const score = PerformanceAnalysisConfiguration.calculateScore(1, 2, 3);
      // 100 - 20 - 20 - 15 = 45
      expect(score).toBe(45);
    });

    it('should not go below 0', () => {
      const score = PerformanceAnalysisConfiguration.calculateScore(10, 10, 10);
      expect(score).toBe(0);
    });

    it('should return 0 for extreme high count', () => {
      const score = PerformanceAnalysisConfiguration.calculateScore(100, 0, 0);
      expect(score).toBe(0);
    });
  });

  describe('generateSummary', () => {
    it('should return success message for no issues', () => {
      const summary = PerformanceAnalysisConfiguration.generateSummary(
        0,
        0,
        0,
        100
      );
      expect(summary).toBe(PerformanceAnalysisConfiguration.SUCCESS_MESSAGE);
    });

    it('should mention high-severity issues', () => {
      const summary = PerformanceAnalysisConfiguration.generateSummary(
        1,
        1,
        0,
        80
      );
      expect(summary).toContain('high-severity issue');
    });

    it('should mention medium-severity issues', () => {
      const summary = PerformanceAnalysisConfiguration.generateSummary(
        1,
        0,
        1,
        90
      );
      expect(summary).toContain('medium-severity issue');
    });

    it('should mention low-severity issues', () => {
      const summary = PerformanceAnalysisConfiguration.generateSummary(
        2,
        0,
        0,
        90
      );
      expect(summary).toContain('low-severity issue');
    });

    it('should include score in summary', () => {
      const summary = PerformanceAnalysisConfiguration.generateSummary(
        1,
        1,
        0,
        80
      );
      expect(summary).toContain('Score: 80/100');
    });

    it('should pluralize correctly for multiple high-severity issues', () => {
      const summary = PerformanceAnalysisConfiguration.generateSummary(
        3,
        3,
        0,
        40
      );
      expect(summary).toContain('high-severity issues');
    });

    it('should pluralize correctly for single issue', () => {
      const summary = PerformanceAnalysisConfiguration.generateSummary(
        1,
        1,
        0,
        80
      );
      expect(summary).toContain('1 high-severity issue');
      expect(summary).not.toContain('1 high-severity issues');
    });

    it('should handle all severity levels in one summary', () => {
      const summary = PerformanceAnalysisConfiguration.generateSummary(
        6,
        2,
        3,
        35
      );
      expect(summary).toContain('high-severity');
      expect(summary).toContain('medium-severity');
      expect(summary).toContain('low-severity');
    });

    it('should format summary as performance analysis message', () => {
      const summary = PerformanceAnalysisConfiguration.generateSummary(
        1,
        1,
        0,
        80
      );
      expect(summary).toContain('Performance analysis found');
    });
  });
});

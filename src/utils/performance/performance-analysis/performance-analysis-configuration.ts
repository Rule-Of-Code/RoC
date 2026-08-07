/**
 * Performance Analysis Configuration
 * Centralized config, severity mappings and helper methods
 * RULE 1: Eliminates hardcoded RuleOfCodeConfig objects
 */

import type { RuleOfCodeConfig } from '../../../config/types';
import { ConfigFileUtils } from '../../config-file-utils';

export class PerformanceAnalysisConfiguration {
  static readonly SEVERITY = {
    HIGH: 'high' as const,
    MEDIUM: 'medium' as const,
    LOW: 'low' as const,
  };

  static readonly ISSUE_TYPES = {
    LIFECYCLE: 'lifecycle',
    DOM: 'dom',
    EVENTS: 'events',
    OBSERVABLES: 'observables',
    TIMERS: 'timers',
    ANALYSIS_ERROR: 'analysis_error',
  } as const;

  static readonly SCORE = {
    PERFECT: 100,
    MIN: 0,
    HIGH_SEVERITY_PENALTY: 20,
    MEDIUM_SEVERITY_PENALTY: 10,
    LOW_SEVERITY_PENALTY: 5,
  } as const;

  static readonly RECOMMENDATIONS = {
    LIFECYCLE: 'Optimize component lifecycle methods for better performance',
    DOM: 'Optimize DOM references and queries for better performance',
    EVENTS: 'Review event listeners for potential memory leaks',
    OBSERVABLES: 'Fix observable subscription memory leaks',
    TIMERS: 'Clean up timer functions to prevent memory leaks',
    ANALYSIS_ERROR: 'Fix performance analysis errors before proceeding',
    BUDGETS: 'Set up performance budgets for key metrics',
    MONITORING: 'Implement continuous performance monitoring',
    REGRESSION_TESTS: 'Add performance regression tests',
    CI_CD_INTEGRATION: 'Integrate performance checks in CI/CD pipeline',
    AUTOMATED_ALERTS: 'Set up automated performance alerts',
    BASELINE_COMPARISON: 'Add performance baseline comparisons',
  } as const;

  static readonly SUCCESS_MESSAGE =
    'Performance analysis completed successfully with no issues found';

  /**
   * Error message constants - RULE 1: Eliminates hardcoded error strings
   */
  static readonly ERROR_MESSAGES = {
    ANALYSIS_FAILED: 'Performance analysis failed',
    ANALYSIS_ENCOUNTERED_ERRORS: 'Performance analysis encountered errors',
  } as const;

  /**
   * RULE 2: Helper to eliminate duplicate pluralization logic
   */
  private static pluralize(word: string, count: number): string {
    return `${count} ${word}${count > 1 ? 's' : ''}`;
  }

  /**
   * Maps issue type to severity
   * RULE 1: Centralized severity mapping
   */
  static getSeverityForType(
    type: string
  ): 'high' | 'low' | 'medium' | undefined {
    // RULE 2: Direct constants usage instead of property access
    const severityMap: Record<string, 'high' | 'low' | 'medium'> = {
      [this.ISSUE_TYPES.DOM]: 'high',
      [this.ISSUE_TYPES.OBSERVABLES]: 'high',
      [this.ISSUE_TYPES.ANALYSIS_ERROR]: 'high',
      [this.ISSUE_TYPES.LIFECYCLE]: 'medium',
      [this.ISSUE_TYPES.EVENTS]: 'medium',
      [this.ISSUE_TYPES.TIMERS]: 'medium',
    };

    return severityMap[type];
  }

  /**
   * RULE 2: Helper for creating minimal performance config when needed
   */
  static getPerformanceConfig(): RuleOfCodeConfig {
    return ConfigFileUtils.getMinimalDefaultConfig();
  }

  /**
   * Calculates performance score based on issues
   * RULE 1: Centralized scoring logic
   */
  static calculateScore(
    highCount: number,
    mediumCount: number,
    lowCount: number
  ): number {
    let score = this.SCORE.PERFECT;
    score -= highCount * this.SCORE.HIGH_SEVERITY_PENALTY;
    score -= mediumCount * this.SCORE.MEDIUM_SEVERITY_PENALTY;
    score -= lowCount * this.SCORE.LOW_SEVERITY_PENALTY;

    return Math.max(this.SCORE.MIN, score);
  }

  /**
   * Generates summary message
   * RULE 1: Centralized summary generation
   */
  static generateSummary(
    totalIssues: number,
    highSeverity: number,
    mediumSeverity: number,
    score: number
  ): string {
    if (totalIssues === 0) {
      return this.SUCCESS_MESSAGE;
    }

    const parts: string[] = [];
    if (highSeverity > 0) {
      parts.push(this.pluralize('high-severity issue', highSeverity));
    }
    if (mediumSeverity > 0) {
      parts.push(this.pluralize('medium-severity issue', mediumSeverity));
    }

    const lowSeverity = totalIssues - highSeverity - mediumSeverity;
    if (lowSeverity > 0) {
      parts.push(this.pluralize('low-severity issue', lowSeverity));
    }

    const issueText = parts.join(', ');
    return `Performance analysis found ${issueText} (Score: ${score}/100)`;
  }
}

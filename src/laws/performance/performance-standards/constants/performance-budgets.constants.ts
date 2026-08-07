import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * Performance Budgets Constants
 *
 * Single Responsibility: Performance budget configuration validation rules
 */
export class PerformanceBudgetsConstants {
  static readonly ANGULAR_BUDGET_PATTERNS: string[] = [
    'budgets',
    'maximumError',
  ];

  static readonly WEBPACK_PERFORMANCE_PATTERNS: string[] = [
    'performance',
    'maxAssetSize',
  ];

  static readonly ANGULAR_BUDGET_MARKERS = [
    'budgets',
    'maximumError',
    'maximumWarning',
  ];

  static readonly WEBPACK_BUDGET_MARKERS = [
    'performance',
    'maxAssetSize',
    'maxEntrypointSize',
  ];

  /**
   * Check if Angular configuration has budgets
   */
  static hasAngularBudgets(content: string): boolean {
    return PatternMatchingUtils.hasAnyPattern(
      content,
      this.ANGULAR_BUDGET_PATTERNS
    );
  }

  /**
   * Check if Webpack configuration has performance settings
   */
  static hasWebpackPerformance(content: string): boolean {
    return PatternMatchingUtils.hasAnyPattern(
      content,
      this.WEBPACK_PERFORMANCE_PATTERNS
    );
  }
}

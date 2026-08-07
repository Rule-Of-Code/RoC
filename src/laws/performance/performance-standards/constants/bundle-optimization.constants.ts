import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * Bundle Optimization Constants
 *
 * Single Responsibility: Bundle optimization configuration validation rules
 */
export class BundleOptimizationConstants {
  static readonly ANGULAR_OPTIMIZATION_PATTERNS: string[] = [
    '"optimization": true',
    '"buildOptimizer": true',
    '"optimization": {', // Nx/Angular detailed optimization config
  ];

  static readonly WEBPACK_OPTIMIZATION_MARKERS = [
    'optimization',
    'minimize',
    'minimizer',
  ];

  static readonly WEBPACK_OPTIMIZATION_PATTERNS: string[] = [
    'optimization',
    'minimize',
  ];

  /**
   * Check if Angular configuration has optimization enabled
   */
  static hasAngularOptimization(content: string): boolean {
    return PatternMatchingUtils.hasAnyPattern(
      content,
      this.ANGULAR_OPTIMIZATION_PATTERNS
    );
  }

  /**
   * Check if Webpack configuration has optimization
   */
  static hasWebpackOptimization(content: string): boolean {
    return PatternMatchingUtils.hasAnyPattern(
      content,
      this.WEBPACK_OPTIMIZATION_PATTERNS
    );
  }
}

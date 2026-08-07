/**
 * PerformanceBudgetComplianceCheckConstants
 *
 * Configuration for budget checks and scoring.
 */
export class PerformanceBudgetComplianceCheckConstants {
  // Budget types
  static readonly BUDGET_TYPES = {
    INITIAL: 'initial',
    ANY_COMPONENT_STYLE: 'anyComponentStyle',
    BUNDLE: 'bundle',
  };

  // Webpack hints
  static readonly WEBPACK_PERFORMANCE_KEYS = ['performance:', 'performance '];

  static readonly WEBPACK_CONFIG_KEYS = {
    MAX_ASSET_SIZE: 'maxAssetSize',
    MAX_ENTRYPOINT_SIZE: 'maxEntrypointSize',
    HINTS: 'hints:',
  };

  // Lighthouse config keys
  static readonly LIGHTHOUSE_CONFIG_KEYS = [
    'assert',
    'budget',
    'categories',
    'category',
    'minScore',
    'maxNumericValue',
    'resource-summary',
    'total-byte-weight',
  ];

  // Bundle analysis tools
  static readonly BUNDLE_TOOLS = [
    'webpack-bundle-analyzer',
    'BundleSizeAnalyzer',
    'bundlesize',
    'bundle-buddy',
    'source-map-explorer',
  ];

  // Monitoring services
  static readonly MONITORING_SERVICES = [
    'web-vitals',
    '@sentry/browser',
    '@sentry/angular',
    '@newrelic/browser',
    'firebase',
  ];

  // Score deductions
  static readonly SCORE_DEDUCTIONS = {
    ANGULAR: 25,
    WEBPACK: 20,
    LIGHTHOUSE: 20,
    BUNDLE: 15,
    CI_CD: 10,
    MONITORING: 10,
  };

  /**
   * Check if Webpack config has performance settings
   */
  static hasWebpackPerformance(content: string): boolean {
    return this.WEBPACK_PERFORMANCE_KEYS.some(key => content.includes(key));
  }

  /**
   * Check if Webpack config has hints
   */
  static hasWebpackHints(content: string): boolean {
    return (
      content.includes(this.WEBPACK_CONFIG_KEYS.HINTS) &&
      !content.includes('hints: false')
    );
  }

  /**
   * Check if Lighthouse config has budget
   */
  static hasLighthouseBudget(content: string): boolean {
    return this.LIGHTHOUSE_CONFIG_KEYS.some(key => content.includes(key));
  }

  /**
   * Get score deduction for check type
   */
  static getScoreDeduction(checkType: string): number {
    const key = checkType.toUpperCase() as keyof typeof this.SCORE_DEDUCTIONS;
    return this.SCORE_DEDUCTIONS[key] || 0;
  }
}

/**
 * PerformanceBudgetComplianceFileDiscoveryConstants
 *
 * Configuration for finding and identifying performance budget files.
 */
export class PerformanceBudgetComplianceFileDiscoveryConstants {
  // Configuration file patterns
  static readonly CONFIG_FILE_PATTERNS = {
    ANGULAR_JSON: 'angular.json',
    WEBPACK_CONFIG: ['webpack.config.js', 'webpack.prod.js'],
    LIGHTHOUSE: [
      '.lighthouserc.js',
      '.lighthouserc.json',
      'lighthouse.config.js',
      'lighthouserc.json',
    ],
    CI_CD: {
      GITHUB: '.github/workflows',
      GITLAB: '.gitlab-ci.yml',
      BITBUCKET: 'bitbucket-pipelines.yml',
    },
  };

  // Performance keywords
  static readonly PERFORMANCE_KEYWORDS = [
    'lighthouse',
    'BundleSizeAnalyzer',
    'bundlesize',
    'performance',
    'budget',
  ];

  // Monitoring keywords
  static readonly MONITORING_KEYWORDS = [
    'SENTRY_DSN',
    'NEWRELIC_',
    'DATADOG_',
    'performance',
  ];

  /**
   * Check if content has performance keywords
   */
  static hasPerformanceKeywords(content: string): boolean {
    return this.PERFORMANCE_KEYWORDS.some(keyword =>
      content.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if content has monitoring keywords
   */
  static hasMonitoringKeywords(content: string): boolean {
    return this.MONITORING_KEYWORDS.some(keyword => content.includes(keyword));
  }
}

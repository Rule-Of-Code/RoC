/**
 * Performance Budget Constants
 *
 * Single Responsibility: Performance budget configuration validation
 */
export class PerformanceBudgetConstants {
  static readonly BUDGET_CONFIG_FILE_PATTERNS: string[] = [
    'lighthouse.config.js',
    'config/lighthouse.config.js',
    '.lighthouserc.json',
    'performance-budget.json',
    'webpack.config.js',
  ];

  static readonly BUDGET_CONFIGURATION_PATTERNS: string[] = [
    'budget',
    'performanceBudget',
    'maxAssetSize',
    'maxEntrypointSize',
  ];

  static readonly ANGULAR_BUDGET_FILE = 'angular.json';

  static readonly ANGULAR_BUDGET_PATTERN = 'budgets';

  static isBudgetConfigFile(filename: string): boolean {
    return this.BUDGET_CONFIG_FILE_PATTERNS.some(pattern =>
      filename.includes(pattern)
    );
  }

  static hasBudgetConfiguration(content: string): boolean {
    return this.BUDGET_CONFIGURATION_PATTERNS.some(pattern =>
      content.includes(pattern)
    );
  }
}

/**
 * Performance Budget Policy Constants
 *
 * Single Responsibility: Performance budget configuration detection
 */
export class PerformanceBudgetPolicyConstants {
  static readonly ANGULAR_BUDGET_FILE = 'angular.json';

  static readonly ANGULAR_BUDGET_PATTERN = 'budgets';

  static readonly LIGHTHOUSE_CONFIG_FILES: string[] = [
    '.lighthouserc.js',
    '.lighthouserc.json',
    'lighthouse.config.js',
  ];

  static readonly LIGHTHOUSE_BUDGET_PATTERNS: string[] = ['budget', 'assert'];

  static readonly WEBPACK_CONFIG_FILE = 'webpack.config.js';

  static readonly WEBPACK_PERFORMANCE_PATTERNS: string[] = [
    'performance',
    'maxAssetSize',
    'maxEntrypointSize',
  ];

  static isLighthouseConfigFile(filename: string): boolean {
    return this.LIGHTHOUSE_CONFIG_FILES.some(file => filename.includes(file));
  }

  static hasAngularBudgets(content: string): boolean {
    return content.includes(this.ANGULAR_BUDGET_PATTERN);
  }

  static hasWebpackPerformanceConfig(content: string): boolean {
    return (
      content.includes('performance') &&
      (content.includes('maxAssetSize') ||
        content.includes('maxEntrypointSize'))
    );
  }
}

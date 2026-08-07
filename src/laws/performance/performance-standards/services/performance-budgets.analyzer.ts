import { FileUtils, PathOperations } from '../../../../utils';
import { PerformanceBudgetsConstants } from '../constants';

/**
 * Performance Budgets Analyzer
 *
 * Single Responsibility: Analyzing performance budget configuration
 */
export class PerformanceBudgetsAnalyzer {
  static analyze(projectRoot: string): string[] {
    const violations: string[] = [];

    // Check Angular budgets
    const angularJsonPath = PathOperations.join(projectRoot, 'angular.json');
    if (FileUtils.exists(angularJsonPath)) {
      try {
        const content = FileUtils.readFile(angularJsonPath, {
          encoding: 'utf8',
        });
        if (PerformanceBudgetsConstants.hasAngularBudgets(content)) {
          return violations;
        }
      } catch (_error) {
        // Continue
      }
    }

    // Check Webpack configuration
    const webpackConfigs = ['webpack.config.js', 'config/webpack.config.js'];

    for (const webpackConfig of webpackConfigs) {
      const fullPath = PathOperations.join(projectRoot, webpackConfig);
      const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });
      if (
        content &&
        PerformanceBudgetsConstants.hasWebpackPerformance(content)
      ) {
        return violations;
      }
    }

    violations.push('Performance budgets not configured');
    return violations;
  }
}

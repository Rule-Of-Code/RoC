import { FileUtils, PathOperations } from '../../../../utils';
import { NxWorkspace } from '../../../../utils/nx-workspace';
import { PerformanceBudgetsConstants } from '../constants';

/**
 * Performance Budgets Analyzer
 *
 * Single Responsibility: Analyzing performance budget configuration
 */
export class PerformanceBudgetsAnalyzer {
  static analyze(projectRoot: string): string[] {
    const violations: string[] = [];

    // Angular budgets — from the root `angular.json` AND every monorepo
    // `project.json`. Nx does not use angular.json: per-project configuration
    // lives in `apps/<name>/project.json`, and that is where the budgets are.
    // Looking one file over reported real, build-failing budgets as missing.
    try {
      const buildConfig = NxWorkspace.getBuildConfigContent(projectRoot);
      if (
        buildConfig &&
        PerformanceBudgetsConstants.hasAngularBudgets(buildConfig)
      ) {
        return violations;
      }
    } catch (_error) {
      // Continue
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

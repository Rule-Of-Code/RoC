import { FileSystemOperations } from '../../../../utils/file-system-operations';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { PerformanceBudgetPolicyConstants } from '../constants/performance-budget-policy.constants';

/**
 * Performance Budget Policy Analyzer Service
 *
 * Single Responsibility: Analyze performance budget configuration
 */
export class PerformanceBudgetPolicyAnalyzerService {
  static checkPerformanceBudget(projectRoot: string): {
    configured: boolean;
    budgetSources: string[];
  } {
    const budgetSources: string[] = [];

    this.addAngularBudgetsIfPresent(projectRoot, budgetSources);
    this.addLighthouseBudgetsIfPresent(projectRoot, budgetSources);
    this.addWebpackBudgetsIfPresent(projectRoot, budgetSources);

    return {
      configured: budgetSources.length > 0,
      budgetSources,
    };
  }

  private static addAngularBudgetsIfPresent(
    projectRoot: string,
    budgetSources: string[]
  ): void {
    const angularJsonPath = PathOperations.join(
      projectRoot,
      PerformanceBudgetPolicyConstants.ANGULAR_BUDGET_FILE
    );

    if (!FileUtils.exists(angularJsonPath)) return;

    try {
      const angularJson = FileSystemOperations.readJsonFile(angularJsonPath);
      const content = JSON.stringify(angularJson);
      if (content.includes('budgets') && content.includes('maximumError')) {
        budgetSources.push('Angular CLI budgets');
      }
    } catch {
      // Ignore parsing errors
    }
  }

  private static addLighthouseBudgetsIfPresent(
    projectRoot: string,
    budgetSources: string[]
  ): void {
    for (const configFile of PerformanceBudgetPolicyConstants.LIGHTHOUSE_CONFIG_FILES) {
      const fullPath = PathOperations.join(projectRoot, configFile);
      if (!FileUtils.exists(fullPath)) continue;

      try {
        const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });
        const hasBudget =
          PerformanceBudgetPolicyConstants.LIGHTHOUSE_BUDGET_PATTERNS.some(
            pattern => content.includes(pattern)
          );

        if (hasBudget) {
          budgetSources.push('Lighthouse CI');
          break;
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  private static addWebpackBudgetsIfPresent(
    projectRoot: string,
    budgetSources: string[]
  ): void {
    const webpackConfig = PathOperations.join(
      projectRoot,
      PerformanceBudgetPolicyConstants.WEBPACK_CONFIG_FILE
    );

    if (!FileUtils.exists(webpackConfig)) return;

    try {
      const content = FileUtils.readFile(webpackConfig, { encoding: 'utf8' });
      if (
        PerformanceBudgetPolicyConstants.hasWebpackPerformanceConfig(content)
      ) {
        budgetSources.push('Webpack performance');
      }
    } catch {
      // Ignore read errors
    }
  }
}

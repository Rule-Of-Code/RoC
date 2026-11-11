import { FileSystemOperations } from '../../../../utils/file-system-operations';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import type { RuleOfCodeConfig } from '../../../../config/types';
import { AngularBundleConfig } from '../../../../utils/angular-bundle-config';
import { PerformanceBudgetGates } from '../../../../utils/performance-budget-gates';
import { PerformanceBudgetPolicyConstants } from '../constants/performance-budget-policy.constants';

/**
 * Performance Budget Policy Analyzer Service
 *
 * Single Responsibility: Analyze performance budget configuration
 */
export class PerformanceBudgetPolicyAnalyzerService {
  static checkPerformanceBudget(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): {
    configured: boolean;
    budgetSources: string[];
  } {
    const budgetSources: string[] = [];

    // A size-limit check or Lighthouse assertions — counted only when a
    // script or CI step RUNS them. This accepted any .lighthouserc file
    // containing "budget" or "assert", which a file nothing executes satisfies.
    budgetSources.push(...PerformanceBudgetGates.enforcedBudgets(projectRoot, config));

    this.addAngularBudgetsIfPresent(projectRoot, budgetSources);
    this.addWebpackBudgetsIfPresent(projectRoot, budgetSources);

    return {
      configured: budgetSources.length > 0,
      budgetSources,
    };
  }

  /**
   * Asked of the shared reader, which looks across the whole workspace.
   *
   * This read only a ROOT `angular.json`. An Nx workspace declares its budgets
   * in `apps/<name>/project.json` and has no root angular.json at all, so a
   * project whose build fails on a 4kb component-style ceiling was told its
   * performance budget was not configured — while a sibling law read the same
   * budgets and passed. Two laws, opposite verdicts, one audit run.
   */
  private static addAngularBudgetsIfPresent(
    projectRoot: string,
    budgetSources: string[]
  ): void {
    if (AngularBundleConfig.hasBudgets(projectRoot)) {
      budgetSources.push('Angular CLI budgets');
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

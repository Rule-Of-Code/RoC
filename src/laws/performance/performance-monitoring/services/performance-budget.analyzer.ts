import { AngularBundleConfig } from '../../../../utils/angular-bundle-config';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { PerformanceBudgetConstants } from '../constants/performance-budget.constants';

/**
 * Performance Budget Analyzer Service
 *
 * Single Responsibility: Analyze performance budget configuration
 */
export class PerformanceBudgetAnalyzerService {
  static checkPerformanceBudget(projectRoot: string): {
    configured: boolean;
  } {
    // Check budget files
    for (const budgetFile of PerformanceBudgetConstants.BUDGET_CONFIG_FILE_PATTERNS) {
      const fullPath = PathOperations.join(projectRoot, budgetFile);
      if (FileUtils.exists(fullPath)) {
        try {
          const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });
          if (PerformanceBudgetConstants.hasBudgetConfiguration(content)) {
            return { configured: true };
          }
        } catch {
          // Ignore file read errors
        }
      }
    }

    // Angular budgets, asked of the shared reader rather than of a root
    // `angular.json`. An Nx workspace declares them in
    // `apps/<name>/project.json` and has no root angular.json, so a build that
    // fails on its own budgets was reported as having none — while a sibling
    // law read the same file and passed.
    if (AngularBundleConfig.hasBudgets(projectRoot)) {
      return { configured: true };
    }

    return { configured: false };
  }
}

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

    // Check Angular CLI performance budgets
    const angularJsonPath = PathOperations.join(
      projectRoot,
      PerformanceBudgetConstants.ANGULAR_BUDGET_FILE
    );
    if (FileUtils.exists(angularJsonPath)) {
      try {
        const content = FileUtils.readFile(angularJsonPath, {
          encoding: 'utf8',
        });
        if (
          content.includes(PerformanceBudgetConstants.ANGULAR_BUDGET_PATTERN)
        ) {
          return { configured: true };
        }
      } catch {
        // Ignore errors
      }
    }

    return { configured: false };
  }
}

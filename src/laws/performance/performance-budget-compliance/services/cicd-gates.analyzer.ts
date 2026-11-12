import type { RuleOfCodeConfig } from '../../../../types/law.types';
import { PerformanceBudgetGates } from '../../../../utils/performance-budget-gates';

/**
 * CICDPerformanceGatesAnalyzerService
 *
 * Responsibility:
 * - Find the gate that enforces a performance budget: a CI step, or — where
 *   the project has no hosted CI — a git hook.
 *
 * This used to pass when a workflow contained any of `lighthouse`, `budget`,
 * `performance` ANYWHERE, case-insensitively — a comment, a job name, the
 * word in a URL. Now comments and step names are removed and the remaining
 * commands must RUN a budget tool (lhci, size-limit, bundlesize, bundlewatch),
 * directly or through package scripts, or run the Angular build when its
 * budgets declare `maximumError` (that build fails on a breach). Every CI
 * provider the shared CI reader knows, and `pathMappings.cicdConfig`, are read.
 */
export class CICDPerformanceGatesAnalyzerService {
  static analyze(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { configured: boolean; pipelines: string[]; hostedCi: boolean } {
    const status = PerformanceBudgetGates.budgetGates(projectRoot, config);
    return {
      configured: status.gates.length > 0,
      pipelines: status.gates,
      hostedCi: status.hostedCi,
    };
  }
}

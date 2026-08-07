import type { RuleOfCodeConfig } from '../../../config/types';
import { AutomatedReviewToolsAnalyzerValidation } from './automated-review-tools-analyzer-validation';

/**
 * Automated Review Tools Analyzer
 * Specialized utility for analyzing automated code review tools and CI/CD integration
 */
export class AutomatedReviewToolsAnalyzer {
  /**
   * Check for automated review tools
   */
  static checkAutomatedReviewTools(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return AutomatedReviewToolsAnalyzerValidation.executeAutomatedReviewToolsAnalysisWorkflow(
      projectRoot,
      config
    );
  }

  /**
   * Detect pre-commit hooks configuration
   * Public utility for detecting husky, pre-commit configs, and git hooks
   */
  static detectPreCommitHooks(projectRoot: string): boolean {
    return AutomatedReviewToolsAnalyzerValidation.detectPreCommitHooks(
      projectRoot
    );
  }
}

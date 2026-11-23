import { NgRxAnalysisUtilities } from './shared-ngrx-utilities';

/**
 * NgRx Results Processor
 * SRP: Responsible only for processing and analyzing NgRx analysis results
 */
export class NgRxResultsProcessor {
  /**
   * Severity configuration
   */
  static readonly SEVERITY_CONFIG = NgRxAnalysisUtilities.SEVERITY_CONFIG;

  /**
   * Calculate severity based on violation count
   */
  static calculateSeverity = NgRxAnalysisUtilities.calculateSeverity;

  /**
   * Count issues matching a category
   * RULE 2: Optimized with utility method to eliminate duplicate pattern
   */
  static countIssuesByCategory = NgRxAnalysisUtilities.countIssuesByCategory;

  /**
   * Generate comprehensive setup analysis summary
   * RULE 2: Optimized with cached values and helper method to eliminate duplicate calculations
   */
  static getSetupAnalysisSummary =
    NgRxAnalysisUtilities.getSetupAnalysisSummary;
}

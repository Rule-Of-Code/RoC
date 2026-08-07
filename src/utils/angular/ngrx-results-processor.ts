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
   * RULE 2: Utility for case-insensitive string matching - eliminates duplicate toLowerCase().includes() pattern
   */
  private static readonly matchesCategoryIgnoreCase =
    NgRxAnalysisUtilities.matchesCategoryIgnoreCase;

  /**
   * Count issues matching a category
   * RULE 2: Optimized with utility method to eliminate duplicate pattern
   */
  static countIssuesByCategory = NgRxAnalysisUtilities.countIssuesByCategory;

  /**
   * RULE 2: Helper to calculate all setup area issues at once - eliminates duplicate array operations
   */
  private static readonly calculateSetupAreas =
    NgRxAnalysisUtilities.calculateSetupAreas;

  /**
   * Generate comprehensive setup analysis summary
   * RULE 2: Optimized with cached values and helper method to eliminate duplicate calculations
   */
  static getSetupAnalysisSummary =
    NgRxAnalysisUtilities.getSetupAnalysisSummary;
}

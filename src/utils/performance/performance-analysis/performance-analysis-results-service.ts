/**
 * Performance Analysis Results Service
 * Specialized service for processing and formatting performance analysis results
 * RULE 2: Extracted from main service to improve result processing modularity
 */

import { StringTemplateUtils } from '../../string-template-utils';
import { PerformanceAnalysisConfiguration } from './performance-analysis-configuration';
import { PerformanceAnalysisHelpersService } from './performance-analysis-helpers-service';
import type { PerformanceAnalysisResult } from './performance-analysis-service';

/**
 * Helper to safely convert unknown errors to strings
 * RULE 2: Simple error handling pattern consistent with RuleOfCode codebase
 */
function errorToString(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export class PerformanceAnalysisResultsService {
  private static readonly config = PerformanceAnalysisConfiguration;

  /**
   * Helper: Apply error message placeholder to template
   * RULE 2: Centralized message templating for error messages
   */
  private static applyErrorMessagePlaceholder(
    template: string,
    errorMessage: string
  ): string {
    return StringTemplateUtils.formatNamedTemplate(template, { errorMessage });
  }

  /**
   * Helper: Build error message with template and error info
   * RULE 2: Consolidates error message construction with safe error extraction
   */
  private static buildErrorMessage(template: string, error: unknown): string {
    const errorMessage = errorToString(error);
    return this.applyErrorMessagePlaceholder(template, errorMessage);
  }

  static calculateAnalysisResult(
    issues: PerformanceAnalysisResult['issues'],
    recommendations: string[]
  ): PerformanceAnalysisResult {
    // RULE 2: Use helper method instead of duplicated severity counting logic
    const counts =
      PerformanceAnalysisHelpersService.countIssuesBySeverity(issues);

    // Use Configuration's score calculation (RULE 1)
    const score = this.config.calculateScore(
      counts.high,
      counts.medium,
      counts.low
    );

    const hasPerformanceIssues = counts.total > 0;
    // Use Configuration's summary generation (RULE 1)
    const summary = this.config.generateSummary(
      counts.total,
      counts.high,
      counts.medium,
      score
    );

    return {
      score,
      issues,
      recommendations,
      hasPerformanceIssues,
      summary,
    };
  }

  static createErrorResult(error: unknown): PerformanceAnalysisResult {
    // RULE 1: Use Configuration for error handling and messages
    // RULE 2: Use helper method for safe error message construction
    return {
      score: this.config.SCORE.MIN,
      issues: [
        {
          type: this.config.ISSUE_TYPES.ANALYSIS_ERROR,
          severity: this.config.SEVERITY.HIGH,
          message: this.buildErrorMessage(
            `${this.config.ERROR_MESSAGES.ANALYSIS_FAILED}: {errorMessage}`,
            error
          ),
        },
      ],
      recommendations: [this.config.RECOMMENDATIONS.ANALYSIS_ERROR],
      hasPerformanceIssues: true,
      summary: this.config.ERROR_MESSAGES.ANALYSIS_ENCOUNTERED_ERRORS,
    };
  }
}

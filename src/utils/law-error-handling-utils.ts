import type { LawResult, RuleOfCodeConfig } from '../types/law.types';

/**
 * Error Handling Utilities for Law Checks
 *
 * Provides standardized error handling for law checks
 */
export class LawErrorHandlingUtils {
  /**
   * Create a failure result from an error
   *
   * @param error - The error that occurred
   * @param lawName - Name of the law that failed
   * @param config - Rule of code configuration
   * @returns Standardized failure result
   */
  static createErrorResult(
    error: unknown,
    lawName: string,
    config: RuleOfCodeConfig
  ): LawResult {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return {
      passed: false,
      message: `Failed to check ${lawName}`,
      details: [errorMessage],
      violations: [errorMessage],
      suggestions: [],
      score: 0,
      fixable: false,
      config,
    };
  }

  /**
   * Create a failure result with custom message
   *
   * @param error - The error that occurred
   * @param customMessage - Custom failure message
   * @param config - Rule of code configuration
   * @returns Standardized failure result
   */
  static createCustomErrorResult(
    error: unknown,
    customMessage: string,
    config: RuleOfCodeConfig
  ): LawResult {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return {
      passed: false,
      message: customMessage,
      details: [errorMessage],
      violations: [errorMessage],
      suggestions: [],
      score: 0,
      fixable: false,
      config,
    };
  }
}

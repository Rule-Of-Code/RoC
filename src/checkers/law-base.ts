import type { LawCheckContext, LawResult } from '../types/law.types';

/**
 * Base class for all law implementations
 * Provides common functionality for creating law results
 */
export class LawBase {
  /**
   * Create a law result from violations and recommendations
   */
  static createResult(
    violations: string[],
    lawName: string,
    _category: string,
    recommendations: string[],
    context: LawCheckContext
  ): LawResult {
    const score =
      violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 10);

    return {
      lawName: lawName.toLowerCase().replace(/\s+/g, '-'),
      passed: score >= 100,
      message:
        score >= 100
          ? `${lawName} compliance verified`
          : `${violations.length} ${lawName} violations found`,
      violations,
      suggestions: violations.length > 0 ? recommendations : [],
      score,
      config: context.config,
    };
  }

  /**
   * Create error result for law check failure
   * Consolidates common error handling pattern
   */
  static createErrorResult(
    checkerName: string,
    error: unknown,
    context: LawCheckContext
  ): LawResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      passed: false,
      score: 0,
      message: `❌ ${checkerName} error: ${errorMessage}`,
      details: [],
      violations: [],
      suggestions: ['Check project structure and dependencies'],
      config: context.config,
    };
  }

  /**
   * RULE 2: Build standard law result with details spread
   * Consolidates duplicate result object construction pattern
   */
  static buildDetailedResult(options: {
    passed: boolean;
    message: string;
    violations: string[];
    suggestions: string[];
    score: number;
    context: LawCheckContext;
  }): LawResult {
    const { passed, message, violations, suggestions, score, context } =
      options;
    return {
      passed,
      message,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score: Math.max(0, score),
      config: context.config,
    };
  }
}

import type { LawCheckContext, LawResult } from '../types/law.types';

/**
 * Law Result Utility
 * Centralizes LawResult creation to eliminate code duplication across law checkers
 */
export class LawResultUtils {
  /**
   * Create standardized LawResult with flexible options
   */
  static createResult(options: {
    violations: string[];
    suggestions?: string[];
    context: LawCheckContext;
    lawName?: string;
    customMessage?: string;
    scoreMultiplier?: number;
    fixable?: boolean;
    metrics?: Record<string, unknown>;
  }): LawResult {
    const {
      violations,
      suggestions = [],
      context,
      lawName,
      customMessage,
      scoreMultiplier = 10,
      fixable = violations.length > 0,
      metrics = {},
    } = options;

    const totalViolations = violations.length;
    const uniqueSuggestions = Array.from(new Set(suggestions));

    // Calculate score with configurable multiplier
    const score =
      totalViolations === 0
        ? 100
        : Math.max(0, 100 - totalViolations * scoreMultiplier);

    // Generate message - use custom message if provided, otherwise standard format
    let message: string;
    if (customMessage) {
      message = customMessage;
    } else if (lawName) {
      message =
        score >= 100
          ? `${lawName} compliance verified`
          : `${totalViolations} ${lawName} violations found`;
    } else {
      message =
        score >= 100
          ? 'Law compliance verified'
          : `${totalViolations} violations found`;
    }

    const result: LawResult = {
      passed: score >= 100,
      message,
      violations,
      suggestions: uniqueSuggestions,
      score,
      fixable,
      config: context.config,
    };

    // Add optional properties if provided
    if (lawName) {
      result.lawName = lawName;
    }

    if (Object.keys(metrics).length > 0) {
      result.metrics = {
        totalViolations,
        ...metrics,
      };
    }

    return result;
  }
}

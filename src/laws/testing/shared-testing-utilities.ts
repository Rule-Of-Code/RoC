import { TestingLawBase } from '../../checkers/testing-laws/testing-law-base';
import type { RuleOfCodeConfig } from '../../config/types';
import type { LawResult } from '../../types/law.types';

/**
 * Testing Law Utilities
 * Shared utilities for testing law implementations
 */
export interface CreateTestResultOptions<T = unknown> {
  lawName: string;
  violations: string[];
  suggestions: string[];
  score: number;
  analysisData: T;
  config: RuleOfCodeConfig;
  messageGenerator: (violations: string[], analysisData: T) => string;
}

export class TestingLawUtilities {
  /**
   * Creates standard test result with common structure
   */
  static createTestResult<T>(options: CreateTestResultOptions<T>): LawResult {
    const {
      violations,
      suggestions,
      score,
      analysisData,
      config,
      messageGenerator,
    } = options;
    // A law fails on its VIOLATIONS, never on its score. Deciding passed from the
    // score produced the worst artifact this tool exists to kill: a deduction that
    // lowers score WITHOUT adding a violation returned passed:false with an EMPTY
    // violation list AND a green "✅ Excellent" message — a check-mark on a failing
    // verdict, with nothing listed to fix (BE's F2 class). The score stays
    // informational; the message is already keyed off the violation count.
    const finalScore = Math.max(0, score);
    return {
      passed: violations.length === 0,
      message: messageGenerator(violations, analysisData),
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score: finalScore,
      fixable: true,
      config,
    };
  }

  /**
   * Creates error result for testing laws
   */
  static createTestingErrorResult(
    lawName: string,
    error: unknown,
    config: RuleOfCodeConfig
  ): LawResult {
    return TestingLawBase.createTestingErrorResult(lawName, error, config);
  }

  /**
   * Standard score reduction and violation pattern
   */
  static processViolation(options: {
    violations: string[];
    suggestions: string[];
    score: number;
    violationMessage: string;
    suggestionMessage?: string;
    scoreReduction?: number;
  }): number {
    const {
      violations,
      suggestions,
      score,
      violationMessage,
      suggestionMessage,
      scoreReduction = 10,
    } = options;
    violations.push(violationMessage);
    if (suggestionMessage) {
      suggestions.push(suggestionMessage);
    }
    return score - scoreReduction;
  }
}

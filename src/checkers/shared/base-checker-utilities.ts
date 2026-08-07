/**
 * Base Checker Utilities
 * Common patterns shared across all law checkers
 */

import type { LawResult, RuleOfCodeConfig } from '../../types/law.types';
import { ConfigFileUtils } from '../../utils/config-file-utils';

export interface CreateStandardLawResultOptions {
  violations: string[];
  suggestions: string[];
  successMessage: string;
  failureMessageSuffix: string;
  baseScore?: number;
  scoreDeduction?: number;
  config?: RuleOfCodeConfig;
}

export class BaseCheckerUtilities {
  /**
   * Creates a standardized law result
   */
  static createStandardLawResult(
    options: CreateStandardLawResultOptions
  ): LawResult {
    const {
      violations,
      suggestions,
      successMessage,
      failureMessageSuffix,
      baseScore = 100,
      scoreDeduction = 12,
      config,
    } = options;

    const score =
      violations.length === 0
        ? baseScore
        : Math.max(0, baseScore - violations.length * scoreDeduction);

    return {
      passed: score >= 100,
      message:
        score >= 100
          ? successMessage
          : `${violations.length} ${failureMessageSuffix}`,
      violations,
      suggestions: violations.length > 0 ? suggestions : [],
      score,
      fixable: violations.length > 0,
      config: config ?? ConfigFileUtils.getMinimalDefaultConfig(),
    };
  }

  /**
   * Common error handling pattern
   */
  static handleCheckError(
    checkName: string,
    error: unknown,
    violations: string[],
    suggestions: string[],
    contextMessage?: string
  ): void {
    violations.push(
      `${checkName} check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    suggestions.push(
      contextMessage ?? `Ensure ${checkName} is properly configured`
    );
  }

  /**
   * Common try-catch check pattern
   */
  static executeCheckWithErrorHandling<T>(
    checkName: string,
    checkFunction: () => T,
    violations: string[],
    suggestions: string[],
    contextMessage?: string
  ): T | null {
    try {
      return checkFunction();
    } catch (error) {
      this.handleCheckError(
        checkName,
        error,
        violations,
        suggestions,
        contextMessage
      );
      return null;
    }
  }
}

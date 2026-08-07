/**
 * ResultBuilder Utility
 * Centralized builder for creating consistent LawResult objects
 * Eliminates duplication across base-checker and sacred-law-base
 */

import type { RuleOfCodeConfig } from '../config/types';
import type { LawResult } from '../types/law.types';

export interface ResultBuilderOptions {
  violations: string[];
  title: string;
  type: string;
  suggestions?: string[];
  config: RuleOfCodeConfig;
  lawName?: string;
  metrics?: Record<string, unknown>;
}

/**
 * Centralized builder for creating LawResult objects
 * Provides consistent structure and formatting across all checkers
 */
export class ResultBuilder {
  /**
   * Create a LawResult with proper structure
   * - Violations included in details
   * - Suggestions included in details
   * - Score calculated based on violations count
   * - Fixable set based on suggestions availability
   */
  static create(options: ResultBuilderOptions): LawResult {
    const {
      violations,
      title,
      type,
      suggestions = [],
      config,
      lawName,
      metrics,
    } = options;

    const passed = violations.length === 0;
    const score = passed ? 100 : Math.max(0, 100 - violations.length * 10);

    // Combine violations and suggestions for details
    const details = [...violations, ...suggestions];

    if (passed) {
      return {
        lawName,
        passed: true,
        message: `✅ ${type} verified - ${title}`,
        details:
          details.length > 0 ? details : [`${type} is properly configured`],
        score,
        fixable: false,
        suggestions,
        violations,
        config,
        metrics,
      };
    } else {
      return {
        lawName,
        passed: false,
        message: `❌ ${violations.length} ${type} violation${violations.length !== 1 ? 's' : ''} in ${title}`,
        details,
        score,
        fixable: suggestions.length > 0,
        suggestions,
        violations,
        config,
        metrics,
      };
    }
  }

  /**
   * Create error result for exceptional cases
   */
  static createError(
    title: string,
    error: Error | string,
    config: RuleOfCodeConfig
  ): LawResult {
    const message = error instanceof Error ? error.message : String(error);

    return {
      passed: false,
      message: `❌ Error checking ${title}: ${message}`,
      details: [message],
      score: 0,
      fixable: false,
      violations: [message],
      suggestions: [],
      config,
    };
  }
}

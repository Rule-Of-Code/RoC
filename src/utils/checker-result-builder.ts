/**
 * Checker Method Result Utilities
 * Consolidates duplicate patterns for returning violations and suggestions
 */

export interface CheckerResult {
  violations: string[];
  suggestions: string[];
  scoreDeduction?: number;
}

export class CheckerResultBuilder {
  /**
   * Creates an empty checker result with proper structure
   */
  static createEmpty(scoreDeduction = 0): CheckerResult {
    return {
      violations: [],
      suggestions: [],
      ...(scoreDeduction > 0 && { scoreDeduction }),
    };
  }

  /**
   * Creates a result with violations and suggestions
   */
  static create(
    violations: string[] = [],
    suggestions: string[] = [],
    scoreDeduction?: number
  ): CheckerResult {
    return {
      violations,
      suggestions,
      ...(scoreDeduction && { scoreDeduction }),
    };
  }

  /**
   * Combines multiple results into one
   */
  static combine(...results: CheckerResult[]): CheckerResult {
    const combined: CheckerResult = {
      violations: [],
      suggestions: [],
    };

    let totalScoreDeduction = 0;

    for (const result of results) {
      combined.violations.push(...result.violations);
      combined.suggestions.push(...result.suggestions);
      if (result.scoreDeduction) {
        totalScoreDeduction += result.scoreDeduction;
      }
    }

    if (totalScoreDeduction > 0) {
      combined.scoreDeduction = totalScoreDeduction;
    }

    return combined;
  }

  /**
   * Merges violations and suggestions from multiple sources
   */
  static merge(
    target: CheckerResult,
    ...sources: CheckerResult[]
  ): CheckerResult {
    for (const source of sources) {
      target.violations.push(...source.violations);
      target.suggestions.push(...source.suggestions);
      if (source.scoreDeduction && target.scoreDeduction) {
        target.scoreDeduction += source.scoreDeduction;
      } else if (source.scoreDeduction) {
        target.scoreDeduction = source.scoreDeduction;
      }
    }
    return target;
  }

  /**
   * Adds violations to result
   */
  static addViolations(
    result: CheckerResult,
    ...violations: string[]
  ): CheckerResult {
    result.violations.push(...violations);
    return result;
  }

  /**
   * Adds suggestions to result
   */
  static addSuggestions(
    result: CheckerResult,
    ...suggestions: string[]
  ): CheckerResult {
    result.suggestions.push(...suggestions);
    return result;
  }

  /**
   * Adds both violations and suggestions
   */
  static add(
    result: CheckerResult,
    violations: string[],
    suggestions: string[]
  ): CheckerResult {
    result.violations.push(...violations);
    result.suggestions.push(...suggestions);
    return result;
  }

  /**
   * Checks if result has any violations
   */
  static hasViolations(result: CheckerResult): boolean {
    return result.violations.length > 0;
  }

  /**
   * Gets violation count
   */
  static getViolationCount(result: CheckerResult): number {
    return result.violations.length;
  }

  /**
   * Gets suggestion count
   */
  static getSuggestionCount(result: CheckerResult): number {
    return result.suggestions.length;
  }

  /**
   * Removes duplicate violations and suggestions
   */
  static dedup(result: CheckerResult): CheckerResult {
    return {
      ...result,
      violations: Array.from(new Set(result.violations)),
      suggestions: Array.from(new Set(result.suggestions)),
    };
  }
}

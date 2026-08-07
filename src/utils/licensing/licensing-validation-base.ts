/**
 * Base class for licensing validation utilities
 * Consolidates common patterns across dependency and project license validators
 * - Initialization of violations, suggestions, scoring
 * - Score calculation patterns
 * - Common validation result structure
 */
export abstract class LicensingValidationBase {
  /**
   * RULE 2: Generic validation initialization helper
   * Eliminates duplicate pattern across 2+ licensing validators
   * Returns standard validation result structure with scoring config
   */
  protected static initializeValidation(baseScore: number): {
    violations: string[];
    suggestions: string[];
    score: number;
  } {
    return {
      violations: [],
      suggestions: [],
      score: baseScore,
    };
  }

  /**
   * Helper to finalize validation results with score penalty
   */
  protected static applyScorePenalty(
    violations: string[],
    currentScore: number,
    penalty: number,
    maxPenalty: number
  ): number {
    return currentScore - Math.min(maxPenalty, violations.length * penalty);
  }
}

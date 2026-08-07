import type { LawCheckContext, LawResult } from '../../types/law.types';

/**
 * Shared security law result builder
 * Provides common pattern for creating LawResult objects from violations and suggestions
 */
export class SecurityLawResultBuilder {
  /**
   * Create a law result from violations and suggestions
   */
  static createResult(
    violations: string[],
    lawName: string,
    suggestions: string[],
    context: LawCheckContext
  ): LawResult {
    const score =
      violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 10);

    return {
      lawName,
      passed: score >= 100,
      message:
        score >= 100
          ? `${lawName} compliance verified`
          : `${violations.length} ${lawName} violations found`,
      violations,
      suggestions,
      score,
      config: context.config,
    };
  }
}

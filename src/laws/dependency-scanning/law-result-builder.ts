import type { LawCheckContext, LawResult } from '../../types/law.types';

/**
 * Law Result Builder
 * Consolidates common result building pattern for dependency scanning laws
 * Eliminates duplication of try-catch and result object creation
 */
export class LawResultBuilder {
  /**
   * Build successful law result from analysis data
   */
  static buildSuccess(
    passed: boolean,
    score: number,
    message: string,
    details: string[],
    context: LawCheckContext
  ): LawResult {
    return {
      passed,
      score: Math.max(0, score),
      message,
      details,
      violations: details,
      suggestions: details.map(d => `Fix: ${d}`),
      config: context.config,
    };
  }

  /**
   * Build error law result from caught exception
   */
  static buildError(
    error: unknown,
    errorPrefix: string,
    context: LawCheckContext,
    suggestion: string
  ): LawResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      passed: false,
      score: 0,
      message: `❌ ${errorPrefix} error: ${errorMessage}`,
      details: [],
      violations: [],
      suggestions: [suggestion],
      config: context.config,
    };
  }
}

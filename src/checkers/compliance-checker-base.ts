import type { LawCheckContext, LawResult } from '../types/law.types';
import { LawBase } from './law-base';

/**
 * Base checker for security/compliance validators
 * Provides common pattern for running analysis and generating results
 */
export abstract class ComplianceCheckerBase {
  /**
   * Run the analysis and generate result
   */
  protected abstract runAnalysis(
    projectRoot: string,
    context: LawCheckContext
  ): {
    score: number;
    details: string[];
    message: string;
  };

  /**
   * Default handler for check execution
   */
  protected executeCheck(context: LawCheckContext): LawResult {
    try {
      const { projectRoot } = context;
      const analysis = this.runAnalysis(projectRoot, context);

      return {
        passed: analysis.score >= this.getPassThreshold(),
        score: Math.max(0, analysis.score),
        message: analysis.message,
        details: analysis.details,
        violations: analysis.details,
        suggestions: analysis.details.map(d => `Fix: ${d}`),
        config: context.config,
      };
    } catch (error: unknown) {
      return LawBase.createErrorResult(this.getCheckerName(), error, context);
    }
  }

  /**
   * Override to provide checker-specific pass threshold
   */
  protected getPassThreshold(): number {
    return 80;
  }

  /**
   * Override to provide checker name for error messages
   */
  protected getCheckerName(): string {
    return 'Checker';
  }

  /**
   * Override to provide checker-specific error suggestions
   */
  protected getErrorSuggestions(): string[] {
    return ['Check configuration and retry'];
  }
}

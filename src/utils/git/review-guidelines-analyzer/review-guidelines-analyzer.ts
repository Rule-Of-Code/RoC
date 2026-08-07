import type { RuleOfCodeConfig } from '../../../config/types';
import { ReviewGuidelinesAnalyzerValidation } from './review-guidelines-analyzer-validation';
/**
 * Review Guidelines Analyzer
 * Specialized utility for analyzing code review guidelines and documentation
 */
export class ReviewGuidelinesAnalyzer {
  /**
   * Check for code review guidelines
   */
  static checkReviewGuidelines(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return ReviewGuidelinesAnalyzerValidation.validateReviewGuidelines(
      projectRoot,
      _config
    );
  }
}

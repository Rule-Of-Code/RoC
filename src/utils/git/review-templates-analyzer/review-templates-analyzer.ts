import type { RuleOfCodeConfig } from '../../../config/types';
import { ReviewTemplatesAnalyzerValidation } from './review-templates-analyzer-validation';
/**
 * Review Templates Analyzer
 * Specialized utility for analyzing code review templates and PR templates
 */
export class ReviewTemplatesAnalyzer {
  /**
   * Check for review templates
   */
  static checkReviewTemplates(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return ReviewTemplatesAnalyzerValidation.validateReviewTemplates(
      projectRoot,
      _config
    );
  }
}

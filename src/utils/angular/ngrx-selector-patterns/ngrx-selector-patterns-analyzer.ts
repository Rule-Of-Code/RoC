import type { RuleOfCodeConfig } from '../../../config/types';
import { NgRxSelectorPatternsValidation } from './ngrx-selector-patterns-validation';

/**
 * NgRx Selector Patterns Analyzer
 * Specialized utility for analyzing NgRx selector implementation patterns
 */
export class NgRxSelectorPatternsAnalyzer {
  /**
   * Check for proper selector patterns
   */
  static checkSelectorPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return NgRxSelectorPatternsValidation.executeAnalysisWorkflow(
      projectRoot,
      config
    );
  }
}

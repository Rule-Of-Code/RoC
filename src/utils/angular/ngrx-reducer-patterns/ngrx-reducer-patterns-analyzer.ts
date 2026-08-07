import type { RuleOfCodeConfig } from '../../../config/types';
import { NgRxReducerPatternsValidation } from './ngrx-reducer-patterns-validation';

/**
 * NgRx Reducer Patterns Analyzer
 * Specialized utility for analyzing NgRx reducer implementation patterns
 */
export class NgRxReducerPatternsAnalyzer {
  /**
   * Check for proper reducer patterns
   */
  static checkReducerPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return NgRxReducerPatternsValidation.executeAnalysisWorkflow(
      projectRoot,
      config
    );
  }
}

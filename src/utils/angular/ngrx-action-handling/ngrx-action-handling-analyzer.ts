import type { RuleOfCodeConfig } from '../../../config/types';
import { NgRxActionHandlingValidationPatterns } from './ngrx-action-handling-validation-patterns';
/**
 * NgRx Action Handling Analyzer
 * Specialized utility for analyzing action handling patterns in NgRx reducers
 */
export class NgRxActionHandlingAnalyzer {
  /**
   * Check for proper action handling patterns
   */
  static checkActionHandling(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return NgRxActionHandlingValidationPatterns.validateAllActionHandlingPatterns(
      projectRoot,
      config
    );
  }
}

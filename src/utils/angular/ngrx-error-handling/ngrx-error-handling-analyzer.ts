import type { RuleOfCodeConfig } from '../../../config/types';
import { NgRxErrorHandlingValidationPatterns } from './ngrx-error-handling-validation-patterns';
/**
 * NgRx Error Handling Analyzer
 * Specialized utility for analyzing error handling patterns in NgRx effects
 */
export class NgRxErrorHandlingAnalyzer {
  /**
   * Check error handling patterns
   */
  static checkErrorHandling(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    return NgRxErrorHandlingValidationPatterns.validateAllErrorHandlingPatterns(
      projectRoot,
      config
    );
  }
}

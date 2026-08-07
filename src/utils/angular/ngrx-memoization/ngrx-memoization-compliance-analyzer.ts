import type { RuleOfCodeConfig } from '../../../config/types';
import { NgRxMemoizationValidationPatterns } from './ngrx-memoization-validation-patterns';
/**
 * NgRx Memoization Compliance Analyzer
 * Specialized utility for analyzing NgRx selector memoization compliance
 */
export class NgRxMemoizationComplianceAnalyzer {
  /**
   * Check for memoization compliance
   */
  static checkMemoizationCompliance(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
      projectRoot,
      config
    );
  }
}

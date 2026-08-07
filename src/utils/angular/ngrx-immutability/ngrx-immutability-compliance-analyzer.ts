import type { RuleOfCodeConfig } from '../../../config/types';
import { NgRxImmutabilityValidationPatterns } from './ngrx-immutability-validation-patterns';
/**
 * NgRx Immutability Compliance Analyzer
 * Specialized utility for analyzing immutability compliance in NgRx reducers
 */
export class NgRxImmutabilityComplianceAnalyzer {
  /**
   * Check for immutability compliance in reducers
   */
  static checkImmutabilityCompliance(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return NgRxImmutabilityValidationPatterns.validateAllImmutabilityPatterns(
      projectRoot,
      config
    );
  }
}

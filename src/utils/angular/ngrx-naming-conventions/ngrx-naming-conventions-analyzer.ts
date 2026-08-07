import type { RuleOfCodeConfig } from '../../../config/types';
import { NgRxNamingConventionsValidationPatterns } from './ngrx-naming-conventions-validation-patterns';
/**
 * NgRx Naming Conventions Analyzer
 * Specialized utility for analyzing NgRx naming convention compliance
 */
export class NgRxNamingConventionsAnalyzer {
  /**
   * Check naming conventions in NgRx files
   */
  static checkNamingConventions(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
      projectRoot,
      config
    );
  }
}

import type { RuleOfCodeConfig } from '../../../config/types';
import { NgRxFileOrganizationValidationPatterns } from './ngrx-file-organization-validation-patterns';

/**
 * NgRx File Organization Analyzer
 * Specialized utility for analyzing NgRx file organization patterns
 */
export class NgRxFileOrganizationAnalyzer {
  /**
   * Check file organization in NgRx features
   */
  static checkFileOrganization(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return NgRxFileOrganizationValidationPatterns.validateAllFileOrganizationPatterns(
      projectRoot,
      config
    );
  }
}

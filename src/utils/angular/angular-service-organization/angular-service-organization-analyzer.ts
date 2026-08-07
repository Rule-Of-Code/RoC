import type { RuleOfCodeConfig } from '../../../config/types';
import type { AngularAnalysisResult } from '../../result-interfaces';
import { AngularServiceOrganizationValidationPatterns } from './angular-service-organization-validation-patterns';
/**
 * Angular Service Organization Analyzer
 * Specialized utility for analyzing Angular service organization patterns
 */
export class AngularServiceOrganizationAnalyzer {
  /**
   * Check service organization patterns
   */
  static checkServiceOrganization(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): AngularAnalysisResult {
    return AngularServiceOrganizationValidationPatterns.validateAllServiceOrganizationPatterns(
      projectRoot,
      config
    );
  }
}

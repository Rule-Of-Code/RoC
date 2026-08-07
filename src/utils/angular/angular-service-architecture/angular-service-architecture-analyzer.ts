import type { RuleOfCodeConfig } from '../../../config/types';
import { AngularServiceArchitectureValidationPatterns } from './angular-service-architecture-validation-patterns';
/**
 * Angular Service Architecture Analyzer
 * Specialized utility for analyzing Angular service architecture patterns
 */
export class AngularServiceArchitectureAnalyzer {
  /**
   * Check service architecture patterns
   */
  static checkServiceArchitecture(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return AngularServiceArchitectureValidationPatterns.validateAllServicePatterns(
      projectRoot,
      config
    );
  }
}

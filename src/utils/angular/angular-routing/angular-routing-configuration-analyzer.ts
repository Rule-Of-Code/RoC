import type { RuleOfCodeConfig } from '../../../config/types';
import type { AngularAnalysisResult } from '../../result-interfaces';
import { AngularRoutingValidationPatterns } from './angular-routing-validation-patterns';
/**
 * Angular Routing Configuration Analyzer
 * Specialized utility for analyzing Angular routing configuration patterns
 */
export class AngularRoutingConfigurationAnalyzer {
  /**
   * Check for routing configuration
   */
  static checkRoutingConfiguration(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): AngularAnalysisResult {
    return AngularRoutingValidationPatterns.validateAllRoutingPatterns(
      projectRoot,
      config
    );
  }
}

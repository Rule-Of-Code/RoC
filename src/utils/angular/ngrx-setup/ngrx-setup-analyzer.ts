import type { RuleOfCodeConfig } from '../../../config/types';
import { NgRxSetupValidation } from './ngrx-setup-validation';

/**
 * NgRx Setup Analyzer
 * Specialized utility for analyzing NgRx setup and configuration
 */
export class NgRxSetupAnalyzer {
  /**
   * Check for NgRx setup
   */
  static checkNgRxSetup(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return NgRxSetupValidation.executeAnalysisWorkflow(projectRoot, config);
  }
}

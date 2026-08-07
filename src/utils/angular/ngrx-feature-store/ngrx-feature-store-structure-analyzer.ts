import type { RuleOfCodeConfig } from '../../../config/types';
import { NgRxFeatureStoreValidationPatterns } from './ngrx-feature-store-validation-patterns';
/**
 * NgRx Feature Store Structure Analyzer
 * Specialized utility for analyzing NgRx feature store directory structure
 */
export class NgRxFeatureStoreStructureAnalyzer {
  /**
   * Check for proper feature store structure
   */
  static checkFeatureStoreStructure(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return NgRxFeatureStoreValidationPatterns.validateAllFeatureStorePatterns(
      projectRoot,
      config
    );
  }
}

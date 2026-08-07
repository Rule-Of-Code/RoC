/**
 * Data Storage Security Analyzer
 * Clean facade for data storage security analysis
 * Delegates to Configuration and ValidationPatterns
 */

import type { RuleOfCodeConfig } from '../../../types/law.types';
import { DataStorageSecurityConfiguration as Config } from './data-storage-security-configuration';
import { DataStorageSecurityValidationPatterns as ValidationPatterns } from './data-storage-security-validation-patterns';

export class DataStorageSecurityAnalyzer {
  /**
   * Check data storage security for a project
   */
  static checkDataStorageSecurity(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const result = ValidationPatterns.validateDataStorageSecurity(
      projectRoot,
      config
    );
    return {
      violations: result.violations,
      suggestions: result.suggestions,
    };
  }

  /**
   * Get data storage recommendations
   */
  static getDataStorageRecommendations(): string[] {
    return [...Config.RECOMMENDATIONS];
  }
}

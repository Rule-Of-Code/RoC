/**
 * Dependency Scanning Analyzer
 * Clean facade for dependency scanning analysis
 */

import type { RuleOfCodeConfig } from '../../../types/law.types';
import {
  DependencyScanningConfiguration as Config,
  type DependencyScanningResult,
} from './dependency-scanning-configuration';
import { DependencyScanningValidationPatterns } from './dependency-scanning-validation-patterns';

// Re-export types for backward compatibility
export type { DependencyScanningResult };

export class DependencyScanningAnalyzer {
  /**
   * Check dependency scanning configuration and security
   */
  static checkDependencyScanning(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): DependencyScanningResult {
    return DependencyScanningValidationPatterns.validateDependencyScanning(
      projectRoot,
      config
    );
  }

  /**
   * Get dependency scanning recommendations
   */
  static getDependencyScanningRecommendations(): readonly string[] {
    return Config.RECOMMENDATIONS;
  }
}

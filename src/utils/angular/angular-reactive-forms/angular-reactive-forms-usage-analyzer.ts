import type { RuleOfCodeConfig } from '../../../config/types';
import { AngularReactiveFormsValidationPatterns } from './angular-reactive-forms-validation-patterns';
/**
 * Angular Reactive Forms Usage Analyzer
 * Specialized utility for analyzing reactive forms implementation patterns
 */
export class AngularReactiveFormsUsageAnalyzer {
  /**
   * Check for reactive forms usage patterns
   */
  static checkReactiveFormsUsage(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return AngularReactiveFormsValidationPatterns.validateAllReactiveFormsPatterns(
      projectRoot,
      config
    );
  }
}

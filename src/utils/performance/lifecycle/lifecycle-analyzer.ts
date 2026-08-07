import type { RuleOfCodeConfig } from '../../../config/types';
import { LifecycleConfiguration } from './lifecycle-configuration';
import { LifecycleValidationPatterns } from './lifecycle-validation-patterns';

/**
 * Lifecycle Analyzer
 * Specialized utility for analyzing Angular lifecycle management
 * Meta-dogfooding: Delegates to ValidationPatterns (RULE 1 & RULE 2 applied)
 */
export class LifecycleAnalyzer {
  /**
   * Check for proper lifecycle management
   * RULE 1: 100% coverage - delegates to ValidationPatterns
   */
  // TODO (Sprint 10): Use config to customize lifecycle hook detection patterns based on project requirements
  static checkLifecycleManagement(
    content: string,
    _config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    return LifecycleValidationPatterns.validateLifecycleManagement(content);
  }

  /**
   * Get lifecycle patterns for analysis
   * RULE 1: 100% coverage - uses Configuration directly
   */
  static getLifecyclePatterns(): string[] {
    return [...LifecycleConfiguration.RECOMMENDATIONS];
  }

  /**
   * Analyze OnDestroy implementation
   * RULE 1: 100% coverage - delegates to ValidationPatterns
   * RULE 2: Pre-computes patterns to avoid duplicate analysis
   */
  static analyzeOnDestroyImplementation(content: string): {
    hasOnDestroy: boolean;
    hasCleanupCode: boolean;
    cleanupActions: string[];
    missingCleanups: string[];
  } {
    const patterns = LifecycleConfiguration.analyzeLifecyclePatterns(content);
    return LifecycleValidationPatterns.analyzeOnDestroyImplementation(
      content,
      patterns
    );
  }

  /**
   * Generate cleanup suggestions
   * RULE 1: 100% coverage - delegates to ValidationPatterns
   * DOGFOODING: Eliminates {} as RuleOfCodeConfig hack
   */
  static generateCleanupSuggestions(content: string): string[] {
    return LifecycleValidationPatterns.generateCleanupSuggestionsPublic(
      content
    );
  }
}

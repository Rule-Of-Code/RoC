import { ESLintNamingConfigValidation } from './eslint-naming-config-validation';

/**
 * ESLint Naming Configuration Analyzer
 * Specialized utility for analyzing ESLint naming convention configuration
 */
export class ESLintNamingConfigAnalyzer {
  /**
   * Check naming convention configuration
   */
  static checkNamingConventionConfig(
    projectRoot: string,
    config: Record<string, unknown> = {}
  ): {
    violations: string[];
    suggestions: string[];
  } {
    return ESLintNamingConfigValidation.validateNamingConventionConfig(
      projectRoot,
      config
    );
  }
}

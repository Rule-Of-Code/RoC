import type { RuleOfCodeConfig } from '../../../config/types';
import { CodeNamingValidation } from './code-naming-validation';

/**
 * Code Naming Analyzer
 * Specialized utility for analyzing code naming patterns and conventions
 */
export class CodeNamingAnalyzer {
  /**
   * Analyze code naming patterns in TypeScript files
   */
  static analyzeCodeNaming(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    return CodeNamingValidation.validateCodeNamingPatterns(projectRoot, config);
  }
}

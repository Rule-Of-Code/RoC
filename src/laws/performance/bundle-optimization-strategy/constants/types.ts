/**
 * BundleOptimizationStrategyTypesConstants
 *
 * Responsibility:
 * - Define types and interfaces for bundle optimization analysis
 * - Define configuration thresholds and requirements
 */

/**
 * Build optimization configuration
 */
export interface BuildOptions {
  optimization?: OptimizationConfig | boolean;
  [key: string]: boolean | number | object | string | undefined;
}

/**
 * Optimization configuration details
 */
export interface OptimizationConfig {
  scripts?: boolean;
  styles?: boolean;
  fonts?: boolean;
  [key: string]: boolean | object | undefined;
}

/**
 * Angular JSON project structure
 */
export interface AngularJsonProject {
  architect?: {
    build?: {
      configurations?: Record<string, BuildOptions>;
      options?: BuildOptions;
    };
  };
}

/**
 * Angular JSON structure
 */
export interface AngularJson {
  projects?: Record<string, AngularJsonProject>;
}

/**
 * Package JSON structure
 */
export interface PackageJsonFile {
  type?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * JSON read result wrapper
 */
export interface JsonReadResult<T> {
  data: T | null;
  success: boolean;
}

/**
 * Violation configuration for score calculation
 */
export interface ViolationConfig {
  violation: keyof typeof BundleOptimizationStrategyTypesConstants.VIOLATION_MESSAGES;
  suggestion: keyof typeof BundleOptimizationStrategyTypesConstants.SUGGESTION_MESSAGES;
  penalty: keyof typeof BundleOptimizationStrategyTypesConstants.SCORE_PENALTIES;
}

/**
 * BundleOptimizationStrategyTypesConstants
 */
export class BundleOptimizationStrategyTypesConstants {
  /**
   * Violation messages
   */
  static readonly VIOLATION_MESSAGES = {
    CODE_SPLITTING_NOT_CONFIGURED: 'Code splitting not configured',
    TREE_SHAKING_NOT_CONFIGURED: 'Tree shaking not enabled',
    MINIFICATION_NOT_CONFIGURED: 'Minification and compression not optimized',
    CRITICAL_CSS_NOT_CONFIGURED: 'Critical CSS extraction not configured',
    VENDOR_CHUNK_NOT_CONFIGURED: 'Vendor chunk optimization not configured',
    BUNDLE_ANALYSIS_NOT_CONFIGURED: 'Bundle analysis tools not setup',
  } as const;

  /**
   * Suggestion messages
   */
  static readonly SUGGESTION_MESSAGES = {
    CODE_SPLITTING_SUGGESTION:
      'Implement route-based code splitting with lazy loading',
    TREE_SHAKING_SUGGESTION:
      'Enable tree shaking in webpack/Angular build configuration',
    MINIFICATION_SUGGESTION:
      'Configure minification for scripts, styles, and fonts',
    CRITICAL_CSS_SUGGESTION:
      'Setup critical CSS extraction for above-the-fold content',
    VENDOR_CHUNK_SUGGESTION: 'Configure vendor chunk separation strategy',
    BUNDLE_ANALYSIS_SUGGESTION:
      'Install bundle analysis tools (webpack-bundle-analyzer, etc)',
  } as const;

  /**
   * Score penalties for violations
   */
  static readonly SCORE_PENALTIES = {
    CODE_SPLITTING: 20,
    TREE_SHAKING: 15,
    MINIFICATION: 15,
    CRITICAL_CSS: 12,
    VENDOR_CHUNK: 10,
    BUNDLE_ANALYSIS: 18,
  } as const;
}

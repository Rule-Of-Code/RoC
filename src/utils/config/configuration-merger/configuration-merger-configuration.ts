import type { RuleOfCodeConfig } from '../../../config/types';

/**
 * ConfigurationMergerConfiguration
 * Centralized configuration management for configuration merging operations
 */
export class ConfigurationMergerConfiguration {
  private static readonly Config = ConfigurationMergerConfiguration;

  /**
   * Default ignore patterns (RULE 1: 100% internal coverage)
   */
  static readonly DEFAULT_IGNORE_PATTERNS = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.git/**',
    '**/.nx/**',
  ] as readonly string[];

  /**
   * Optimized ignore patterns (RULE 1: 100% internal coverage, deduplication)
   */
  static readonly OPTIMIZED_IGNORE_PATTERNS = [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
  ] as readonly string[];

  /**
   * High-value constitutional laws for Pareto optimization (RULE 1: 100% internal coverage)
   */
  static readonly HIGH_VALUE_LAWS = [
    'typescript-strict-mode',
    'no-console-statements',
    'test-coverage-constitutional-standard',
    'single-responsibility-principle',
    'dependency-injection-purity',
  ] as readonly string[];

  /**
   * Pareto optimization description
   */
  static readonly PARETO_DESCRIPTION =
    '20% of laws that provide 80% of value' as const;

  /**
   * Merge validation rules (RULE 1: 100% internal coverage)
   */
  static readonly MERGE_VALIDATION_RULES = {
    validateRequiredFields: true,
    applyDefaults: true,
    optimizePerformance: true,
  } as const;

  /**
   * Deep merge configuration (RULE 1: 100% internal coverage)
   */
  static readonly DEEP_MERGE_CONFIG = {
    preserveArrays: true,
    mergeObjects: true,
    skipNullValues: true,
  } as const;

  /**
   * Check if a value should be deep merged (RULE 2: Caching)
   */
  static shouldDeepMerge(value: unknown): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Apply default ignore patterns to configuration (RULE 2: Caching)
   */
  static shouldApplyDefaultIgnore(
    config: RuleOfCodeConfig,
    pattern: string
  ): boolean {
    const patterns = this.DEFAULT_IGNORE_PATTERNS;
    return (
      !config.ignores.global.includes(pattern) && !patterns.includes(pattern)
    );
  }

  /**
   * Check if law should be enabled by default (RULE 2: Caching)
   */
  static shouldEnableLawByDefault(lawName: string): boolean {
    const laws = this.HIGH_VALUE_LAWS;
    return laws.includes(lawName);
  }
}

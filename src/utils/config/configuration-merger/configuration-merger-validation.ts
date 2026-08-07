import type { RuleOfCodeConfig } from '../../../config/types';
import { ConfigurationMergerConfiguration } from './configuration-merger-configuration';

type ConfigObject = Record<string, unknown>;

/**
 * ConfigurationMergerValidation
 * Comprehensive configuration merging and validation workflow
 */
export class ConfigurationMergerValidation {
  /**
   * Execute complete configuration merging workflow
   */
  static executeMergeConfigsWorkflow(
    defaultConfig: RuleOfCodeConfig,
    ...configs: Array<Partial<RuleOfCodeConfig> | null>
  ): RuleOfCodeConfig {
    let mergedConfig = { ...defaultConfig };

    for (const config of configs) {
      if (config) {
        mergedConfig = this.deepMerge(mergedConfig, config) as RuleOfCodeConfig;
      }
    }

    return this.validateConfig(mergedConfig);
  }

  /**
   * Deep merge two objects with configuration-based rules
   */
  private static deepMerge(
    target: ConfigObject,
    source: ConfigObject
  ): ConfigObject {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (sourceValue === null) {
        continue;
      }

      if (ConfigurationMergerConfiguration.shouldDeepMerge(sourceValue)) {
        const targetObj =
          targetValue && typeof targetValue === 'object'
            ? (targetValue as ConfigObject)
            : {};
        result[key] = this.deepMerge(targetObj, sourceValue as ConfigObject);
      } else {
        result[key] = sourceValue;
      }
    }

    return result;
  }

  /**
   * Validate and ensure required fields in configuration
   */
  private static validateConfig(config: RuleOfCodeConfig): RuleOfCodeConfig {
    config = this.applyDefaultIgnores(config);
    return config;
  }

  /**
   * Apply default ignore patterns with deduplication
   */
  private static applyDefaultIgnores(
    config: RuleOfCodeConfig
  ): RuleOfCodeConfig {
    const defaultIgnorePatterns =
      ConfigurationMergerConfiguration.DEFAULT_IGNORE_PATTERNS;

    for (const ignore of defaultIgnorePatterns) {
      if (
        ConfigurationMergerConfiguration.shouldApplyDefaultIgnore(
          config,
          ignore
        )
      ) {
        config.ignores.global.push(ignore);
      }
    }

    return config;
  }

  /**
   * Execute Pareto optimization workflow for configuration.
   * NOTE: this must never create/mutate `laws.enabled` — silently turning a
   * no-allowlist config into an allowlist collapses the law set to whatever
   * keys happen to match (the v7.5.1 zero-laws-checked P0).
   */
  static executeParetoOptimizationWorkflow(config: RuleOfCodeConfig): void {
    // Optimize ignore patterns for performance
    this.optimizeIgnorePatterns(config);
  }

  /**
   * Optimize ignore patterns for performance with deduplication
   */
  private static optimizeIgnorePatterns(config: RuleOfCodeConfig): void {
    const optimizedIgnorePatterns =
      ConfigurationMergerConfiguration.OPTIMIZED_IGNORE_PATTERNS;

    // Apply deduplication with optimized patterns
    const combinedIgnores = [
      ...config.ignores.global,
      ...optimizedIgnorePatterns,
    ];
    const optimizedIgnores = Array.from(new Set(combinedIgnores));
    config.ignores.global = optimizedIgnores;
  }
}

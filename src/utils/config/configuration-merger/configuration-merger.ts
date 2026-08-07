import type { RuleOfCodeConfig } from '../../../config/types';
import { ConfigurationMergerValidation } from './configuration-merger-validation';

/**
 * Configuration Merger
 * Specialized utility for merging multiple configuration sources
 */
export class ConfigurationMerger {
  static mergeConfigs(
    defaultConfig: RuleOfCodeConfig,
    ...configs: Array<Partial<RuleOfCodeConfig> | null>
  ): RuleOfCodeConfig {
    return ConfigurationMergerValidation.executeMergeConfigsWorkflow(
      defaultConfig,
      ...configs
    );
  }

  static applyParetoOptimization(config: RuleOfCodeConfig): void {
    ConfigurationMergerValidation.executeParetoOptimizationWorkflow(config);
  }
}

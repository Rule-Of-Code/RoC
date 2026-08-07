/**
 * Configuration Loader for RuleOfCode
 *
 * Streamlined loader that delegates to specialized configuration utilities.
 * Follows Single Responsibility Principle by orchestrating specialized components.
 *
 * Handles loading and merging of configuration from multiple sources
 */

import { FileUtils } from '../utils';
import {
  ConfigurationFileLoader,
  ConfigurationMerger,
  ProjectTypeDetector,
} from '../utils/config';
import type { RuleOfCodeConfig } from './types';
import { ANGULAR_CONFIG, DEFAULT_CONFIG, REACT_CONFIG } from './types';

export class ConfigLoader {
  /**
   * Load complete configuration from all sources.
   * An explicit configPath (--config) replaces file discovery and is a hard
   * error when missing or unparseable — never a silent fallback to defaults.
   */
  static load(projectRoot: string, configPath?: string): RuleOfCodeConfig {
    // Start with default configuration
    let baseConfig = { ...DEFAULT_CONFIG };

    // Detect project type and apply type-specific defaults - delegated to detector
    const projectType = ProjectTypeDetector.detectProjectType(projectRoot);
    const typeDefaults = this.getTypeDefaults(projectType);
    if (typeDefaults) {
      baseConfig = ConfigurationMerger.mergeConfigs(baseConfig, typeDefaults);
    }

    // Load from various sources - delegated to file loader
    const packageJsonConfig =
      ConfigurationFileLoader.loadFromPackageJson(projectRoot);
    const fileConfig = configPath
      ? ConfigurationFileLoader.loadFromExplicitPath(projectRoot, configPath)
      : ConfigurationFileLoader.loadFromConfigFile(projectRoot);
    const envConfig = ConfigurationFileLoader.loadFromEnvironment();

    // Merge all configurations - delegated to merger
    const mergedConfig = ConfigurationMerger.mergeConfigs(
      baseConfig,
      packageJsonConfig,
      fileConfig,
      envConfig
    );

    // Apply optimizations - delegated to merger
    ConfigurationMerger.applyParetoOptimization(mergedConfig);

    return mergedConfig;
  }

  /**
   * Synchronous config loading method
   * Properly merges project config with defaults - project config takes precedence
   */
  static loadConfig(projectRoot: string): RuleOfCodeConfig {
    // Start with default configuration as base
    const defaultConfig = FileUtils.getMinimalDefaultConfig();

    // Try to find existing config in project hierarchy
    const projectConfig = FileUtils.findConfig(projectRoot);

    if (projectConfig) {
      // Merge: defaults first, then project config (project takes precedence)
      const mergedConfig = ConfigurationMerger.mergeConfigs(
        defaultConfig,
        projectConfig
      );

      // Ensure project root is set correctly
      return {
        ...mergedConfig,
        project: {
          ...mergedConfig.project,
          root: projectRoot,
        },
      };
    }

    // Fallback to default config if no config file found
    return {
      ...defaultConfig,
      project: {
        ...defaultConfig.project,
        root: projectRoot,
      },
    };
  }

  /**
   * Get type-specific default configuration
   */
  private static getTypeDefaults(
    projectType: string | null
  ): Partial<RuleOfCodeConfig> | null {
    switch (projectType) {
      case 'angular':
        return ANGULAR_CONFIG;
      case 'react':
        return REACT_CONFIG;
      case null:
        return null;
      default:
        return null;
    }
  }

  /**
   * Generate comprehensive configuration documentation
   */
  static generateComprehensiveConfig(config: RuleOfCodeConfig): string {
    const sections = [];

    sections.push('# RuleOfCode Configuration');
    sections.push('# Generated comprehensive configuration\n');

    // Global settings
    sections.push('## Global Settings');
    sections.push(`Enabled Laws: ${Object.keys(config.laws).length}`);
    sections.push(`Global Ignores: ${config.ignores.global.length}`);
    sections.push(`Global Includes: ${config.includes?.global?.length ?? 0}\n`);

    // Laws configuration
    if (Object.keys(config.laws).length > 0) {
      sections.push('## Enabled Laws');
      for (const [lawId, lawConfig] of Object.entries(config.laws)) {
        const status =
          typeof lawConfig === 'object' &&
          'enabled' in lawConfig &&
          lawConfig.enabled
            ? '✅'
            : '❌';
        sections.push(`${status} ${lawId}`);
      }
      sections.push('');
    }

    // Ignore patterns
    if (config.ignores.global.length > 0) {
      sections.push('## Ignore Patterns');
      config.ignores.global.forEach(pattern => {
        sections.push(`- ${pattern}`);
      });
      sections.push('');
    }

    return sections.join('\n');
  }
}

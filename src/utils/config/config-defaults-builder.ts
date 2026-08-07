/**
 * Configuration Defaults Builder
 * Consolidates common default configuration patterns used across multiple modules
 */

import type { RuleOfCodeConfig } from '../../config/types';

/**
 * Default configuration values for each section
 */
const DEFAULT_PROJECT = {
  name: 'temp',
  root: '',
  componentPrefix: 'app',
  type: 'generic' as const,
};
const DEFAULT_IGNORES = {
  global: [] as string[],
  tests: [] as string[],
  build: [] as string[],
  design: [] as string[],
};
const DEFAULT_LAWS = { paretoMode: false, severity: {} };
const DEFAULT_HOOKS = { preCommit: false, prePush: false, commitMsg: false };
const DEFAULT_INCLUDES = { global: [] as string[] };
const DEFAULT_EXCLUDES = { global: [] as string[] };
const DEFAULT_REPORTING = {
  format: 'console' as const,
  verbose: false,
  onlyFailures: false,
  scoring: false,
};
const DEFAULT_PERFORMANCE = {
  parallel: false,
  maxConcurrent: 3,
  // Opt-in: caching a compliance gate risks reporting a stale PASSED.
  cache: false,
  incremental: true,
};

export class ConfigDefaultsBuilder {
  /**
   * Creates a minimal valid RuleOfCodeConfig with common defaults
   * Used by testing, security scanning, and other utilities
   */
  static createDefaultConfig(
    overrides?: Partial<RuleOfCodeConfig>
  ): RuleOfCodeConfig {
    const o = overrides ?? {};
    return this.buildConfig(o);
  }

  /**
   * Builds the configuration object by merging defaults with overrides
   */
  private static buildConfig(o: Partial<RuleOfCodeConfig>): RuleOfCodeConfig {
    const excludesOverride = (o.excludes ?? {}) as Record<string, unknown>;
    return {
      project: { ...DEFAULT_PROJECT, ...o.project },
      ignores: { ...DEFAULT_IGNORES, ...o.ignores },
      laws: { ...DEFAULT_LAWS, ...o.laws },
      hooks: { ...DEFAULT_HOOKS, ...o.hooks },
      includes: { ...DEFAULT_INCLUDES, ...o.includes },
      excludes: { ...DEFAULT_EXCLUDES, ...excludesOverride },
      reporting: { ...DEFAULT_REPORTING, ...o.reporting },
      performance: { ...DEFAULT_PERFORMANCE, ...o.performance },
    };
  }

  /**
   * Creates configuration for security scanning operations
   * Used by dependency scanning, secret management, etc.
   */
  static createSecurityScanConfig(
    projectName = 'scan',
    extensions: string[] = []
  ): RuleOfCodeConfig {
    return this.createDefaultConfig({
      project: {
        name: projectName,
        componentPrefix: 'app',
        type: 'generic',
      },
      includes: {
        global:
          extensions.length > 0 ? extensions.map(ext => `**/*${ext}`) : [],
      },
    });
  }

  /**
   * Creates configuration with custom include patterns
   */
  static createWithIncludes(
    includes: string[],
    config?: Partial<RuleOfCodeConfig>
  ): RuleOfCodeConfig {
    return this.createDefaultConfig({
      ...config,
      includes: { global: includes },
    });
  }

  /**
   * Creates configuration with custom exclude patterns
   */
  static createWithExcludes(
    excludes: string[],
    config?: Partial<RuleOfCodeConfig>
  ): RuleOfCodeConfig {
    return this.createDefaultConfig({
      ...config,
      excludes: { global: excludes },
    });
  }
}

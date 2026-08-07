/**
 * Shared Security Configuration Types
 * Common configuration structures for security analysis tools
 */

/**
 * Basic project configuration structure
 */
export interface BaseProjectConfig {
  name: string;
  root?: string;
  componentPrefix: string;
  type: 'angular' | 'generic' | 'ionic' | 'react' | 'vue';
}

/**
 * Standard ignore patterns
 */
export interface IgnorePatterns {
  global: string[];
  tests: string[];
  build: string[];
  design: string[];
}

/**
 * Law configuration
 */
export interface LawsConfig {
  paretoMode: boolean;
  severity: Record<string, 'error' | 'info' | 'warning'>;
}

/**
 * Git hooks configuration
 */
export interface HooksConfig {
  preCommit: boolean;
  prePush: boolean;
  commitMsg: boolean;
}

/**
 * File inclusion patterns
 */
export interface IncludePatterns {
  global: string[];
}

/**
 * File exclusion patterns
 */
export interface ExcludePatterns {
  global: string[];
}

/**
 * Reporting configuration
 */
export interface ReportingConfig {
  format: 'console' | 'html' | 'json';
  verbose: boolean;
  onlyFailures: boolean;
  scoring?: boolean;
}

/**
 * Base security analysis configuration
 */
export interface BaseSecurityConfig {
  project: BaseProjectConfig;
  ignores: IgnorePatterns;
  laws: LawsConfig;
  hooks: HooksConfig;
  includes: IncludePatterns;
  excludes: ExcludePatterns;
  reporting: ReportingConfig;
}

/**
 * Factory for creating default security configuration
 */
export class SecurityConfigFactory {
  /**
   * Create default base configuration
   */
  static createDefaultConfig(
    overrides: Partial<BaseSecurityConfig> = {}
  ): BaseSecurityConfig {
    const defaultConfig: BaseSecurityConfig = {
      project: {
        name: 'temp',
        root: '',
        componentPrefix: 'app',
        type: 'generic',
      },
      ignores: {
        global: [],
        tests: [],
        build: [],
        design: [],
      },
      laws: {
        paretoMode: false,
        severity: {},
      },
      hooks: {
        preCommit: false,
        prePush: false,
        commitMsg: false,
      },
      includes: {
        global: [],
      },
      excludes: {
        global: [],
      },
      reporting: {
        format: 'console',
        verbose: false,
        onlyFailures: false,
        scoring: false,
      },
    };

    return {
      ...defaultConfig,
      ...overrides,
      project: { ...defaultConfig.project, ...overrides.project },
      ignores: { ...defaultConfig.ignores, ...overrides.ignores },
      laws: { ...defaultConfig.laws, ...overrides.laws },
      hooks: { ...defaultConfig.hooks, ...overrides.hooks },
      includes: { ...defaultConfig.includes, ...overrides.includes },
      excludes: { ...defaultConfig.excludes, ...overrides.excludes },
      reporting: { ...defaultConfig.reporting, ...overrides.reporting },
    };
  }
}

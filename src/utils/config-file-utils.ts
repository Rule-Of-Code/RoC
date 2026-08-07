/**
 * Configuration File Utilities
 * Handles loading and management of RuleOfCode configuration files
 */

import type { RuleOfCodeConfig } from '../config/types';
import { COMMON_EXTENSIONS } from './common-extensions';
import { getFilePatterns } from './file-patterns';
import { FileSystemOperations } from './file-system-operations';
import { logError, logWarn } from './logging-utils';
import { PathOperations } from './path-operations';

/**
 * Standard RuleOfCode configuration file names
 * Centralized to avoid duplication across methods
 */
const CONFIG_FILE_NAMES = [
  'ruleofcode.config.json',
  'ruleofcode.config.js',
  '.ruleofcoderc.json',
  '.ruleofcoderc',
] as const;

export class ConfigFileUtils {
  /**
   * Get default config when none provided - uses ConfigLoader synchronously
   */
  static getDefaultConfig(): RuleOfCodeConfig {
    try {
      // Try to load config from standard config files synchronously
      const configPath = ConfigFileUtils.findConfigFileSync();
      if (configPath) {
        return ConfigFileUtils.loadConfigFileSync(configPath);
      }

      // Fallback to minimal default config if no config file found
      return ConfigFileUtils.getMinimalDefaultConfig();
    } catch (_error) {
      logWarn(
        'Failed to load config, using minimal defaults',
        'ConfigFileUtils.getDefaultConfig',
        _error
      );
      return ConfigFileUtils.getMinimalDefaultConfig();
    }
  }

  /**
   * Find configuration file synchronously
   */
  static findConfigFileSync(): string | null {
    for (const fileName of CONFIG_FILE_NAMES) {
      if (FileSystemOperations.exists(fileName)) {
        return PathOperations.resolve(fileName);
      }
    }

    return null;
  }

  /**
   * Load configuration file synchronously
   */
  static loadConfigFileSync(configPath: string): RuleOfCodeConfig {
    try {
      return FileSystemOperations.readJsonFile<RuleOfCodeConfig>(
        configPath,
        ConfigFileUtils.getMinimalDefaultConfig()
      );
    } catch (_error) {
      logWarn(
        `Failed to load config from ${configPath}`,
        'ConfigFileUtils.safeLoadConfig',
        _error
      );
      return ConfigFileUtils.getMinimalDefaultConfig();
    }
  }

  /**
   * Get minimal default configuration
   */
  static getMinimalDefaultConfig(): RuleOfCodeConfig {
    return {
      project: {
        name: '',
        componentPrefix: '',
        type: 'generic',
      },
      ignores: {
        global: [
          '**/node_modules/**',
          '**/dist/**',
          ...COMMON_EXTENSIONS.TESTS.map(ext => `**/*${ext}`),
        ],
        tests: [],
        build: [],
        design: [],
      },
      includes: {
        // Empty = scan everything minus ignores. The old TS/JS extension
        // whitelist here was a no-op for the TS scanners (matches any .ts
        // anywhere) but became lethal once python laws started honouring
        // includes (QA-2): *.py matched nothing → zero files, silent green.
        global: [],
      },
      laws: {
        paretoMode: false,
        severity: {},
      },
      hooks: { preCommit: false, prePush: false, commitMsg: false },
      reporting: {
        format: 'console',
        verbose: false,
        onlyFailures: false,
        scoring: false,
      },
      performance: {
        parallel: false,
        maxConcurrent: 1,
        cache: false,
      },
    };
  }

  /**
   * Load config from cache or file system
   */
  static loadConfig(filePath: string): RuleOfCodeConfig | null {
    try {
      if (FileSystemOperations.exists(filePath)) {
        const config =
          FileSystemOperations.readJsonFile<RuleOfCodeConfig>(filePath);
        return ConfigFileUtils.isValidConfig(config) ? config : null;
      }
    } catch (_error) {
      logError(
        `Error loading config from ${filePath}`,
        'ConfigFileUtils.loadAndValidateConfig',
        _error
      );
    }
    return null;
  }

  /**
   * Find RuleOfCode config in directory hierarchy
   */
  static findConfig(startDir: string): RuleOfCodeConfig | null {
    let currentDir = PathOperations.resolve(startDir);
    const rootDir = PathOperations.parse(currentDir).root;

    while (currentDir !== rootDir) {
      const configPath = ConfigFileUtils.findConfigFileInDir(currentDir);
      if (configPath) {
        return ConfigFileUtils.loadConfig(configPath);
      }
      currentDir = PathOperations.getDirectory(currentDir);
    }

    return null;
  }

  /**
   * Find config file in specific directory
   */
  private static findConfigFileInDir(directory: string): string | null {
    for (const fileName of CONFIG_FILE_NAMES) {
      const filePath = PathOperations.join(directory, fileName);
      if (FileSystemOperations.exists(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Validate configuration structure
   */
  static isValidConfig(config: unknown): config is RuleOfCodeConfig {
    return (
      typeof config === 'object' &&
      config !== null &&
      ('ignores' in config || 'includes' in config || 'laws' in config)
    );
  }

  /**
   * Find workspace root directory
   */
  static findWorkspaceRoot(startDir: string): string {
    let currentDir = PathOperations.resolve(startDir);
    const rootDir = PathOperations.parse(currentDir).root;

    while (currentDir !== rootDir) {
      // Check for common workspace root markers using centralized constant
      if (ConfigFileUtils.hasWorkspaceMarkers(currentDir)) {
        return currentDir;
      }
      currentDir = PathOperations.getDirectory(currentDir);
    }

    return startDir; // Fallback to start directory
  }

  /**
   * Common workspace root markers for detection
   * Expanded to include all standard workspace indicators for maximum compatibility
   * Synced with PathOperations.findWorkspaceRoot markers
   */
  private static readonly WORKSPACE_MARKERS = [
    'package.json',
    '.git',
    'nx.json',
    'workspace.json',
    'angular.json',
    'lerna.json',
    'pnpm-workspace.yaml',
    'yarn.lock',
    'ruleofcode.config.json',
  ] as const;

  /**
   * Check if directory contains workspace markers
   * Reusable helper to avoid code duplication
   */
  private static hasWorkspaceMarkers(directory: string): boolean {
    return ConfigFileUtils.WORKSPACE_MARKERS.some(marker =>
      FileSystemOperations.exists(PathOperations.join(directory, marker))
    );
  }

  /**
   * Read package.json safely with type support
   */
  static readPackageJson<T = Record<string, unknown>>(
    projectRoot: string,
    defaultValue: T = Object.create(null) as T
  ): T {
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (!FileSystemOperations.exists(packageJsonPath)) {
      return defaultValue;
    }

    try {
      return FileSystemOperations.readJsonFile<T>(
        packageJsonPath,
        defaultValue
      );
    } catch (_error) {
      return defaultValue;
    }
  }
}

/**
 * Configuration File Utilities
 * RULE 2: Utility helper class for configuration file operations
 */

import { CONFIG_FILES } from './file-constants';

export class ConfigFileUtils {
  /**
   * Get default configuration for file operations
   */
  static getDefaultConfig() {
    return {
      encoding: 'utf8' as const,
      maxFileSize: 1024 * 1024 * 5, // 5MB
      timeout: 5000,
      skipBinary: true,
      followSymlinks: false,
      excludePatterns: [
        'node_modules',
        'dist',
        'build',
        '.git',
        'coverage',
        '*.log',
      ],
    };
  }

  /**
   * Get Jest configuration file paths
   */
  static getJestConfigFiles(): readonly string[] {
    return [
      CONFIG_FILES.JEST_CONFIG,
      CONFIG_FILES.JEST_CONFIG_TS,
      CONFIG_FILES.JEST_CONFIG_JSON,
    ] as const;
  }

  /**
   * Get common configuration file paths
   */
  static getCommonConfigFiles(): readonly string[] {
    return [
      CONFIG_FILES.PACKAGE_JSON,
      CONFIG_FILES.TSCONFIG_JSON,
      CONFIG_FILES.ANGULAR_JSON,
      CONFIG_FILES.NX_JSON,
    ] as const;
  }

  /**
   * Check if file is a configuration file
   */
  static isConfigFile(fileName: string): boolean {
    const configFiles: string[] = [
      ...this.getCommonConfigFiles(),
      ...this.getJestConfigFiles(),
      CONFIG_FILES.ESLINTRC_JS,
      CONFIG_FILES.ESLINTRC_JSON,
    ];

    return configFiles.includes(fileName);
  }
}

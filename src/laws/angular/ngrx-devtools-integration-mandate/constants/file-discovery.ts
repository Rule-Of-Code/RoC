/**
 * File discovery patterns for NgRx DevTools integration analysis
 * Configuration: Where to find and what patterns to look for
 */

import type { RuleOfCodeConfig } from '../../../../config/types';
import { PathResolver } from '../../../../utils/path-resolver';

export class NgRxDevToolsFileDiscoveryConstants {
  static readonly CONFIG_FILE_PATTERNS = [
    /app\.config\.ts$/,
    /app\.module\.ts$/,
    /main\.ts$/,
  ];

  static readonly SKIP_DIRECTORIES = [
    'node_modules',
    'dist',
    '.angular',
    'coverage',
    'build',
  ];

  static isConfigFile(filename: string): boolean {
    return this.CONFIG_FILE_PATTERNS.some(pattern => pattern.test(filename));
  }

  static shouldSkipDirectory(dirName: string): boolean {
    return this.SKIP_DIRECTORIES.includes(dirName);
  }

  /**
   * Get config file paths - supports pathMappings for monorepo structures
   */
  static async getConfigFilePaths(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<string[]> {
    if (config?.pathMappings) {
      const resolver = PathResolver.create(config, projectRoot);

      const [appConfigPaths, appModulePaths, mainTsPaths] = await Promise.all([
        resolver.getAppConfigPaths(),
        resolver.getAppModulePaths(),
        resolver.getMainTsPaths(),
      ]);

      return [...appConfigPaths, ...appModulePaths, ...mainTsPaths];
    }

    // Fallback to default paths
    return [
      `${projectRoot}/src/app/app.config.ts`,
      `${projectRoot}/src/app/app.module.ts`,
      `${projectRoot}/src/main.ts`,
    ];
  }

  static getPackageJsonPath(projectRoot: string): string {
    return `${projectRoot}/package.json`;
  }
}

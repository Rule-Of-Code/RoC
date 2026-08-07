import { DIRECTORY_NAMES, NGRX_KEYWORDS } from '../constants';
import { FileSystemOperations } from '../file-system-operations';
import { PathOperations } from '../path-operations';

/**
 * NgRx Path Operations
 * SRP: Responsible only for NgRx-related path construction and validation
 */
export class NgRxPathOperations {
  /**
   * DevTools configuration file patterns
   */
  static readonly DEVTOOLS_CONFIG_FILES = {
    appConfig: 'app.config.ts',
    mainFile: 'main.ts',
  } as const;

  /**
   * RULE 2: Extract common path construction to eliminate duplicate logic
   */
  private static buildBasePaths(projectRoot: string): {
    srcPath: string;
    appPath: string;
  } {
    const srcPath = PathOperations.join(projectRoot, DIRECTORY_NAMES.SRC);
    const appPath = PathOperations.join(srcPath, DIRECTORY_NAMES.APP);
    return { srcPath, appPath };
  }

  /**
   * Get all module-related paths for a project
   * RULE 2: Optimized with base paths helper
   */
  static getModulePaths(projectRoot: string) {
    const { srcPath, appPath } = this.buildBasePaths(projectRoot);
    const appModulePath = PathOperations.join(
      appPath,
      NGRX_KEYWORDS.APP_MODULE_TS
    );

    return {
      srcPath,
      appPath,
      appModulePath,
    } as const;
  }

  /**
   * Get the source path for analysis
   * RULE 2: Optimized with base paths helper to eliminate duplicate logic
   */
  static getSourcePath(projectRoot: string): string | null {
    const { srcPath } = this.buildBasePaths(projectRoot);
    return FileSystemOperations.exists(srcPath) ? srcPath : null;
  }

  /**
   * Get app module file path
   * RULE 1: Direct utility usage instead of wrapper
   */
  static getAppModulePath(projectRoot: string): string {
    return PathOperations.join(
      projectRoot,
      DIRECTORY_NAMES.SRC,
      DIRECTORY_NAMES.APP,
      NGRX_KEYWORDS.APP_MODULE_TS
    );
  }

  /**
   * Get app config file path for standalone architecture
   * RULE 1: Support for modern Angular standalone components
   */
  static getAppConfigPath(projectRoot: string): string {
    return PathOperations.join(
      projectRoot,
      DIRECTORY_NAMES.SRC,
      DIRECTORY_NAMES.APP,
      this.DEVTOOLS_CONFIG_FILES.appConfig
    );
  }

  /**
   * Get DevTools configuration file paths
   * RULE 2: Optimized with base paths helper and eliminated duplicate logic
   */
  static getDevToolsConfigPaths(projectRoot: string): string[] {
    const { srcPath, appPath } = this.buildBasePaths(projectRoot);
    const configFiles = this.DEVTOOLS_CONFIG_FILES;
    const moduleFile = NGRX_KEYWORDS.APP_MODULE_TS;

    return [
      PathOperations.join(appPath, configFiles.appConfig),
      PathOperations.join(appPath, moduleFile),
      PathOperations.join(srcPath, configFiles.mainFile),
    ];
  }
}

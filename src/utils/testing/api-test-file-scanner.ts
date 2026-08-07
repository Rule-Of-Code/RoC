import type { RuleOfCodeConfig } from '../../config/types';
import { FileScannerBase } from './file-scanner-base';

/**
 * API Test File Scanner
 * Specialized utility for discovering and analyzing API test files
 */
export class APITestFileScanner extends FileScannerBase {
  /**
   * Find all API test files in project
   */
  static findAPITestFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const apiTestFiles: string[] = [];

    // Define API test patterns
    const apiTestPatterns = [
      /.*api.*\.(test|spec)\.(js|ts)$/i,
      /.*\.api\.(test|spec)\.(js|ts)$/i,
      /.*endpoint.*\.(test|spec)\.(js|ts)$/i,
      /.*routes.*\.(test|spec)\.(js|ts)$/i,
      /.*controller.*\.(test|spec)\.(js|ts)$/i,
      /.*service.*\.(test|spec)\.(js|ts)$/i,
      /.*rest.*\.(test|spec)\.(js|ts)$/i,
      /.*graphql.*\.(test|spec)\.(js|ts)$/i,
    ];

    this.searchAPITestFilesRecursively(
      projectRoot,
      apiTestPatterns,
      apiTestFiles
    );
    return this.filterByConfig(apiTestFiles, config);
  }

  /**
   * Find API test files recursively
   */
  private static searchAPITestFilesRecursively(
    directory: string,
    patterns: RegExp[],
    results: string[]
  ): void {
    this.searchFilesRecursivelyWithPredicate(
      directory,
      (fileName: string) => patterns.some(pattern => pattern.test(fileName)),
      results
    );
  }

  /**
   * Find API-related source files for analysis
   */
  static findAPISourceFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const apiSourceFiles: string[] = [];

    const apiSourcePatterns = [
      /.*controller\.(js|ts)$/i,
      /.*route\.(js|ts)$/i,
      /.*router\.(js|ts)$/i,
      /.*api\.(js|ts)$/i,
      /.*endpoint\.(js|ts)$/i,
      /.*service\.(js|ts)$/i,
      /.*handler\.(js|ts)$/i,
    ];

    this.searchAPISourceFilesRecursively(
      projectRoot,
      apiSourcePatterns,
      apiSourceFiles
    );
    return this.filterByConfig(apiSourceFiles, config);
  }

  /**
   * Search for API source files recursively
   */
  private static searchAPISourceFilesRecursively(
    directory: string,
    patterns: RegExp[],
    results: string[]
  ): void {
    this.searchFilesRecursively(
      directory,
      patterns,
      results,
      'searchAPISourceFilesRecursively'
    );
  }

  /**
   * Generic recursive file search helper
   */
  private static searchFilesRecursively(
    directory: string,
    patterns: RegExp[],
    results: string[],
    _methodName?: string
  ): void {
    this.searchFilesRecursivelyWithPredicate(
      directory,
      name => patterns.some(pattern => pattern.test(name)),
      results,
      nextDir =>
        { this.searchFilesRecursively(nextDir, patterns, results, _methodName); }
    );
  }

  /**
   * Filter files by configuration
   */
  private static filterByConfig(
    files: string[],
    config: RuleOfCodeConfig
  ): string[] {
    // Return all files if no global ignore patterns configured
    const ignorePatterns = config.ignores.global;
    if (ignorePatterns.length === 0) {
      return files;
    }

    return files.filter(file => {
      return !ignorePatterns.some(pattern => {
        return file.includes(pattern.replace('**/', '').replace('/**', ''));
      });
    });
  }
}

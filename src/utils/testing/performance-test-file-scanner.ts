import { FileScannerBase } from './file-scanner-base';

/**
 * Performance Test File Scanner
 * Specialized utility for discovering and analyzing performance test files
 */
export class PerformanceTestFileScanner extends FileScannerBase {
  /**
   * Find all performance test files in project
   */
  static findPerformanceTestFiles(projectRoot: string): string[] {
    const performanceFiles: string[] = [];
    this.findPerformanceFilesRecursively(projectRoot, performanceFiles);
    return performanceFiles;
  }

  /**
   * Recursively search for performance test files
   */
  private static findPerformanceFilesRecursively(
    directory: string,
    files: string[]
  ): void {
    this.searchFilesRecursivelyWithPredicate(
      directory,
      (fileName: string) => this.isPerformanceTestFile(fileName),
      files
    );
  }

  /**
   * Check if filename indicates a performance test file
   */
  private static isPerformanceTestFile(filename: string): boolean {
    const performancePatterns = [
      /performance.*\.(test|spec)\.(js|ts)$/i,
      /.*\.performance\.(test|spec)\.(js|ts)$/i,
      /load.*test.*\.(js|ts)$/i,
      /benchmark.*\.(js|ts)$/i,
      /.*\.benchmark\.(js|ts)$/i,
      /stress.*test.*\.(js|ts)$/i,
      /perf.*test.*\.(js|ts)$/i,
    ];

    return performancePatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Find source files for performance analysis
   */
  static findSourceFilesSync(projectRoot: string): string[] {
    const sourceFiles: string[] = [];
    this.findSourceFilesRecursively(projectRoot, sourceFiles);
    return sourceFiles;
  }

  /**
   * Recursively find source files
   */
  private static findSourceFilesRecursively(
    directory: string,
    files: string[]
  ): void {
    this.searchFilesRecursivelyWithPredicate(
      directory,
      name => this.isSourceFile(name),
      files,
      nextDir => {
        this.findSourceFilesRecursively(nextDir, files);
      }
    );
  }

  /**
   * Check if file is a source file
   */
  private static isSourceFile(filename: string): boolean {
    const sourceExtensions = ['.ts', '.js', '.tsx', '.jsx'];
    return (
      sourceExtensions.some(ext => filename.endsWith(ext)) &&
      !filename.includes('.test.') &&
      !filename.includes('.spec.')
    );
  }
}

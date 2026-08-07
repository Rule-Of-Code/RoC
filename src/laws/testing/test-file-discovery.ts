import type { RuleOfCodeConfig } from '../../types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';

/**
 * Shared test file discovery logic used across all test analyzers
 */
export class TestFileDiscovery {
  /**
   * Find all test files in project
   */
  static findTestFiles(
    projectRoot: string,
    config: RuleOfCodeConfig,
    customSearchDirs?: string[]
  ): string[] {
    const testFiles: string[] = [];

    const searchDirs = customSearchDirs ?? [
      PathOperations.join(projectRoot, 'src'),
      PathOperations.join(projectRoot, 'apps'),
      PathOperations.join(projectRoot, 'libs'),
      PathOperations.join(projectRoot, 'test'),
      PathOperations.join(projectRoot, 'tests'),
      PathOperations.join(projectRoot, 'e2e'),
    ];

    for (const searchDir of searchDirs) {
      if (FileUtils.exists(searchDir)) {
        this.findTestFilesRecursively(searchDir, testFiles, config);
      }
    }

    return testFiles;
  }

  static findTestFilesRecursively(
    dir: string,
    testFiles: string[],
    config: RuleOfCodeConfig
  ): void {
    try {
      const files = CheckerUtils.findFilesByExtension(
        dir,
        ['ts', 'js'],
        config,
        'test-file-discovery', // Pass law ID for debugging
        true // includeTests = true - this is crucial for finding test files!
      );

      for (const file of files) {
        // PROFESSIONAL FIX: Use getFilename() to preserve extension (.spec.ts/.test.ts)
        // getBasename() strips extension, but isTestFile() needs full filename with extension
        const fileName = PathOperations.getFilename(file);
        if (this.isTestFile(fileName)) {
          testFiles.push(file);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }

  /**
   * Check if file is a test file
   */
  static isTestFile(filename: string): boolean {
    return (
      filename.endsWith('.spec.ts') ||
      filename.endsWith('.test.ts') ||
      filename.endsWith('.spec.js') ||
      filename.endsWith('.test.js') ||
      filename.includes('.e2e-spec.')
    );
  }
}

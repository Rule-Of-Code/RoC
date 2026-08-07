import type { RuleOfCodeConfig } from '../../../../types';
import { FileUtils, PathOperations } from '../../../../utils';
import { DirectoryScanner } from '../../../../utils/directory-scanner';
import { SecurityTestFileConstants } from '../constants/test-file';

/**
 * SecurityTestContentSearchService
 *
 * Searches for security test content in test files.
 * Responsibilities:
 * - Find test files with specific content
 * - Search for authentication test keywords
 * - Search for input validation test keywords
 * - Search for security headers test keywords
 */
export class SecurityTestContentSearchService {
  /**
   * Search for test files with specific content
   */
  static hasTestContent(
    projectRoot: string,
    config: RuleOfCodeConfig,
    checker: (content: string) => boolean
  ): boolean {
    try {
      const testDirs = SecurityTestFileConstants.SEARCH_DIRECTORIES.map(dir =>
        PathOperations.join(projectRoot, dir)
      ).filter(dir => FileUtils.exists(dir));

      return testDirs.some(testDir =>
        this.searchDirSafely(testDir, config, checker)
      );
    } catch {
      return false;
    }
  }

  /**
   * Safely search directory, catching any errors
   */
  private static searchDirSafely(
    testDir: string,
    config: RuleOfCodeConfig,
    checker: (content: string) => boolean
  ): boolean {
    try {
      return this.searchDir(testDir, config, checker);
    } catch {
      return false;
    }
  }

  /**
   * Search directory for test content
   */
  private static searchDir(
    dir: string,
    config: RuleOfCodeConfig,
    checker: (content: string) => boolean
  ): boolean {
    try {
      // Scan WITHOUT config filtering to find ALL test files, in every language
      // the project might speak — `.py` was missing here too.
      const scanResult = DirectoryScanner.scanDirectory(dir, config, {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.py'],
        filesOnly: true,
        useConfigFiltering: false, // CRITICAL: Don't use config filtering for test discovery
        includeTests: true,
      });

      const testFiles = scanResult.files.filter(file => {
        // Filename WITH extension, on either path separator.
        const fileName = file.split(/[\\/]/).pop() ?? '';
        return SecurityTestFileConstants.isTestFile(fileName);
      });

      for (const testFile of testFiles) {
        try {
          const content = FileUtils.readFile(testFile, { encoding: 'utf8' });
          if (checker(content)) {
            return true;
          }
        } catch {
          // Ignore file read errors
        }
      }
    } catch {
      // Ignore directory traversal errors
    }

    return false;
  }
}

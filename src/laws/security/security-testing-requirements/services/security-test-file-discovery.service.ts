import type { RuleOfCodeConfig } from '../../../../types';
import { FileUtils, PathOperations } from '../../../../utils';
import { DirectoryScanner } from '../../../../utils/directory-scanner';
import { SecurityTestFileConstants } from '../constants/test-file';

/**
 * SecurityTestFileDiscoveryService
 *
 * Discovers and analyzes security test files.
 * Responsibilities:
 * - Find security test files
 * - Analyze security test case coverage
 */
export class SecurityTestFileDiscoveryService {
  /**
   * Analyze security test cases
   */
  static analyze(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasTests: boolean;
    testFiles: string[];
  } {
    try {
      const testFiles: string[] = [];
      const searchDirs = SecurityTestFileConstants.SEARCH_DIRECTORIES.map(dir =>
        PathOperations.join(projectRoot, dir)
      );

      for (const searchDir of searchDirs) {
        if (FileUtils.exists(searchDir)) {
          try {
            const files = this.findSecurityTestFiles(searchDir, config);
            testFiles.push(...files);
          } catch (error) {
            // Skip directories that can't be read
          }
        }
      }

      return { hasTests: testFiles.length > 0, testFiles };
    } catch (error) {
      return { hasTests: false, testFiles: [] };
    }
  }

  /**
   * Find security test files
   */
  private static findSecurityTestFiles(
    dir: string,
    config: RuleOfCodeConfig
  ): string[] {
    const testFiles: string[] = [];

    try {
      // Scan WITHOUT config filtering to find ALL test files, in every language
      // the project might speak. `.py` was missing, so a Python security test
      // could not be discovered by construction (a backend consumer).
      const scanResult = DirectoryScanner.scanDirectory(dir, config, {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.py'],
        filesOnly: true,
        useConfigFiltering: false, // CRITICAL: Don't use config filtering for test discovery
        includeTests: true,
      });

      scanResult.files.forEach((file: string) => {
        if (this.isSecurityTest(file)) {
          testFiles.push(file);
        }
      });
    } catch (error) {
      console.error(
        `[DEBUG] Error in findSecurityTestFiles for ${dir}:`,
        error
      );
      // Ignore errors in directory traversal
    }

    return testFiles;
  }

  /**
   * A file is a security test if its NAME says so — or if what it ASSERTS says
   * so. The second half is the point: a backend consumer assert HSTS, CSP, nosniff,
   * X-Frame-Options and 401/403 across fifteen files, none of them named
   * "security". Judging evidence by its filename is a law about naming.
   */
  private static isSecurityTest(file: string): boolean {
    // The filename WITH its extension: `PathOperations.getBasename` strips it,
    // and every pattern here is anchored on the extension.
    const fileName = file.split(/[\\/]/).pop() ?? '';

    if (SecurityTestFileConstants.isSecurityTestFile(fileName)) {
      return true;
    }

    if (!SecurityTestFileConstants.isTestFile(fileName)) {
      return false;
    }

    const content = FileUtils.readFileContentSync(file);
    return (
      content !== null &&
      SecurityTestFileConstants.assertsSecurityProperty(content)
    );
  }
}

/**
 * Shared Testing Utilities
 * Common functions for all testing law analyzers
 */

import { TEST_FILE_NAME } from '../../utils/file-constants';

/**
 * Check if filename matches test file patterns
 */
export class TestFilePatterns {
  static isTestFile(filename: string): boolean {
    return TEST_FILE_NAME.test(filename) || filename.includes('.e2e-spec.');
  }

  static isUnitTestFile(filename: string): boolean {
    return this.hasUnitTestExtension(filename);
  }

  static isE2eTestFile(filename: string): boolean {
    return filename.includes('.e2e-spec.');
  }

  static hasTestExtension(filename: string): boolean {
    return this.hasUnitTestExtension(filename);
  }

  private static hasUnitTestExtension(filename: string): boolean {
    return TEST_FILE_NAME.test(filename);
  }
}

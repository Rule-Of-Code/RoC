/**
 * Shared Testing Utilities
 * Common functions for all testing law analyzers
 */

/**
 * Check if filename matches test file patterns
 */
export class TestFilePatterns {
  static isTestFile(filename: string): boolean {
    return (
      filename.endsWith('.spec.ts') ||
      filename.endsWith('.test.ts') ||
      filename.endsWith('.spec.js') ||
      filename.endsWith('.test.js') ||
      filename.includes('.e2e-spec.')
    );
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
    return (
      filename.endsWith('.spec.ts') ||
      filename.endsWith('.test.ts') ||
      filename.endsWith('.spec.js') ||
      filename.endsWith('.test.js')
    );
  }
}

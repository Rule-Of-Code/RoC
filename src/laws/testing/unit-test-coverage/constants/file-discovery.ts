import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * Unit Test Coverage - File Discovery Constants
 * Centralized configuration for discovering test files in the project
 */
export class UnitTestCoverageFileDiscoveryConstants {
  /**
   * Directories to scan for source and test files
   */
  static readonly SCAN_DIRECTORIES = {
    SOURCE: ['src', 'apps', 'libs'],
    RELATIVE_SEARCH_PATHS: ['src', 'apps', 'libs', 'packages'],
  };

  /**
   * Test file naming patterns
   */
  static readonly TEST_FILE_PATTERNS = {
    SPEC_EXTENSION: /\.spec\.ts$/,
    TEST_EXTENSION: /\.test\.ts$/,
    SPEC_EXTENSION_JS: /\.spec\.js$/,
    TEST_EXTENSION_JS: /\.test\.js$/,
    CYPRESS_PATTERN: /\.cy\.ts$/,
  };

  /**
   * Source file naming patterns
   */
  static readonly SOURCE_FILE_PATTERNS = {
    TYPESCRIPT: /\.ts$/,
    JAVASCRIPT: /\.js$/,
    TYPESCRIPT_REACT: /\.tsx$/,
    JAVASCRIPT_REACT: /\.jsx$/,
  };

  /**
   * Exclusion patterns - files/directories to skip
   */
  static readonly EXCLUSION_PATTERNS = {
    NODE_MODULES: /node_modules/,
    DIST: /dist/,
    BUILD: /build/,
    COVERAGE: /coverage/,
    SPEC_FILE: /\.spec\./,
    TEST_FILE: /\.test\./,
    E2E_FILE: /\.e2e\./,
    TEMP: /tmp/,
  };

  /**
   * Test file location conventions
   */
  static readonly TEST_LOCATION_CONVENTIONS = {
    COLOCATED_SPEC: (sourcePath: string) =>
      sourcePath.replace(/\.ts$/, '.spec.ts'),
    COLOCATED_TEST: (sourcePath: string) =>
      sourcePath.replace(/\.ts$/, '.test.ts'),
    TESTS_DIRECTORY: (sourcePath: string) =>
      sourcePath.replace(/src\//, 'tests/').replace(/\.ts$/, '.test.ts'),
    TEST_DIRECTORY: (sourcePath: string) =>
      sourcePath.replace(/src\//, 'test/').replace(/\.ts$/, '.test.ts'),
  };

  /**
   * Check if file is a test file
   */
  static isTestFile(filePath: string): boolean {
    const patterns = [
      this.TEST_FILE_PATTERNS.SPEC_EXTENSION,
      this.TEST_FILE_PATTERNS.TEST_EXTENSION,
      this.TEST_FILE_PATTERNS.SPEC_EXTENSION_JS,
      this.TEST_FILE_PATTERNS.TEST_EXTENSION_JS,
      this.TEST_FILE_PATTERNS.CYPRESS_PATTERN,
    ];
    return patterns.some(pattern =>
      PatternMatchingUtils.hasRegexPattern(filePath, pattern)
    );
  }

  /**
   * Check if file is a source file (non-test)
   */
  static isSourceFile(filePath: string): boolean {
    const codeFilePatterns = [
      this.SOURCE_FILE_PATTERNS.TYPESCRIPT,
      this.SOURCE_FILE_PATTERNS.JAVASCRIPT,
      this.SOURCE_FILE_PATTERNS.TYPESCRIPT_REACT,
      this.SOURCE_FILE_PATTERNS.JAVASCRIPT_REACT,
    ];
    const isCodeFile = codeFilePatterns.some(pattern =>
      PatternMatchingUtils.hasRegexPattern(filePath, pattern)
    );

    if (!isCodeFile) return false;
    return !this.isTestFile(filePath);
  }

  /**
   * Check if path should be excluded
   */
  static shouldExclude(filePath: string): boolean {
    const exclusionPatterns = [
      this.EXCLUSION_PATTERNS.NODE_MODULES,
      this.EXCLUSION_PATTERNS.DIST,
      this.EXCLUSION_PATTERNS.BUILD,
      this.EXCLUSION_PATTERNS.COVERAGE,
      this.EXCLUSION_PATTERNS.TEMP,
    ];
    return exclusionPatterns.some(pattern =>
      PatternMatchingUtils.hasRegexPattern(filePath, pattern)
    );
  }

  /**
   * Find all test file variants for a source file
   */
  static findTestVariants(sourcePath: string): string[] {
    return [
      this.TEST_LOCATION_CONVENTIONS.COLOCATED_SPEC(sourcePath),
      this.TEST_LOCATION_CONVENTIONS.COLOCATED_TEST(sourcePath),
      this.TEST_LOCATION_CONVENTIONS.TESTS_DIRECTORY(sourcePath),
      this.TEST_LOCATION_CONVENTIONS.TEST_DIRECTORY(sourcePath),
    ];
  }

  /**
   * Get directories to scan
   */
  static getScanDirectories(): string[] {
    return this.SCAN_DIRECTORIES.SOURCE;
  }
}

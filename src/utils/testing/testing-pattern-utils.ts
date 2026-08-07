/**
 * Testing Pattern Utils
 * Utility for detecting and analyzing test file patterns
 */
export class TestingPatternUtils {
  /**
   * Standard test file patterns
   */
  static readonly TEST_FILE_PATTERNS = {
    SPEC: '.spec.ts',
    TEST: '.test.ts',
    SPEC_JS: '.spec.js',
    TEST_JS: '.test.js',
  } as const;

  /**
   * Standard test content patterns
   */
  static readonly TEST_CONTENT_PATTERNS = {
    DESCRIBE_BLOCK: 'describe("',
    DESCRIBE_BLOCK_SINGLE: "describe('",
    IT_BLOCK: 'it("',
    IT_BLOCK_SINGLE: "it('",
    TEST_BLOCK: 'test("',
    TEST_BLOCK_SINGLE: "test('",
  } as const;

  /**
   * Create test file content with proper patterns
   */
  static createTestFileContent(description: string): string {
    return `describe("${description}", () => {})`;
  }

  /**
   * Get all test file extensions
   */
  static getTestFileExtensions(): string[] {
    return Object.values(this.TEST_FILE_PATTERNS);
  }

  /**
   * Check if file path is a test file
   */
  static isTestFile(filePath: string): boolean {
    return this.getTestFileExtensions().some(pattern =>
      filePath.includes(pattern)
    );
  }

  /**
   * Generate test project structure with proper test patterns
   */
  static generateTestProjectStructure(
    config: {
      withSourceFiles?: boolean;
      withTestFiles?: boolean;
      withSpecFiles?: boolean;
      withDistFiles?: boolean;
    } = {}
  ) {
    const structure: Record<string, Record<string, string>> = {};

    if (config.withSourceFiles !== false) {
      structure['src/'] = {
        'component.ts': 'export class Component {}',
        'service.ts': 'export class Service {}',
      };
    } else {
      structure['src/'] = {};
    }

    if (config.withTestFiles) {
      structure['src/']['component.test.ts'] =
        this.createTestFileContent('Component tests');
      structure['src/']['service.test.ts'] =
        this.createTestFileContent('Service tests');
    }

    if (config.withSpecFiles !== false) {
      structure['src/'][this.TEST_FILE_PATTERNS.SPEC] =
        this.createTestFileContent('test');
    }

    if (config.withDistFiles !== false) {
      structure['dist/'] = {
        'bundle.js': 'compiled code',
      };
    }

    if (
      config.withSourceFiles !== false &&
      Object.keys(structure).includes('src/')
    ) {
      structure['src/']['styles.css'] = '.class { color: red; }';
    }

    return structure;
  }
}

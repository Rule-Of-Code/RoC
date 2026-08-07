/**
 * @fileoverview Tests for testing-pattern-utils.ts
 * @description Tests for test file pattern utilities
 */

import { TestingPatternUtils } from '../../src/utils/testing/testing-pattern-utils';

describe('utils/testing/testing-pattern-utils', () => {
  describe('TEST_FILE_PATTERNS', () => {
    it('should have SPEC pattern', () => {
      expect(TestingPatternUtils.TEST_FILE_PATTERNS.SPEC).toBe('.spec.ts');
    });

    it('should have TEST pattern', () => {
      expect(TestingPatternUtils.TEST_FILE_PATTERNS.TEST).toBe('.test.ts');
    });

    it('should have SPEC_JS pattern', () => {
      expect(TestingPatternUtils.TEST_FILE_PATTERNS.SPEC_JS).toBe('.spec.js');
    });

    it('should have TEST_JS pattern', () => {
      expect(TestingPatternUtils.TEST_FILE_PATTERNS.TEST_JS).toBe('.test.js');
    });
  });

  describe('TEST_CONTENT_PATTERNS', () => {
    it('should have DESCRIBE_BLOCK pattern', () => {
      expect(TestingPatternUtils.TEST_CONTENT_PATTERNS.DESCRIBE_BLOCK).toBe(
        'describe("'
      );
    });

    it('should have DESCRIBE_BLOCK_SINGLE pattern', () => {
      expect(
        TestingPatternUtils.TEST_CONTENT_PATTERNS.DESCRIBE_BLOCK_SINGLE
      ).toBe("describe('");
    });

    it('should have IT_BLOCK pattern', () => {
      expect(TestingPatternUtils.TEST_CONTENT_PATTERNS.IT_BLOCK).toBe('it("');
    });

    it('should have IT_BLOCK_SINGLE pattern', () => {
      expect(TestingPatternUtils.TEST_CONTENT_PATTERNS.IT_BLOCK_SINGLE).toBe(
        "it('"
      );
    });

    it('should have TEST_BLOCK pattern', () => {
      expect(TestingPatternUtils.TEST_CONTENT_PATTERNS.TEST_BLOCK).toBe(
        'test("'
      );
    });

    it('should have TEST_BLOCK_SINGLE pattern', () => {
      expect(TestingPatternUtils.TEST_CONTENT_PATTERNS.TEST_BLOCK_SINGLE).toBe(
        "test('"
      );
    });
  });

  describe('createTestFileContent', () => {
    it('should create describe block with given description', () => {
      const result =
        TestingPatternUtils.createTestFileContent('MyComponent tests');

      expect(result).toBe('describe("MyComponent tests", () => {})');
    });

    it('should create valid test file content', () => {
      const result = TestingPatternUtils.createTestFileContent('test');

      expect(result).toContain('describe("');
      expect(result).toContain('() => {}');
    });

    it('should handle empty description', () => {
      const result = TestingPatternUtils.createTestFileContent('');

      expect(result).toBe('describe("", () => {})');
    });

    it('should handle special characters in description', () => {
      const result =
        TestingPatternUtils.createTestFileContent('Test with "quotes"');

      expect(result).toContain('Test with "quotes"');
    });
  });

  describe('getTestFileExtensions', () => {
    it('should return array of test file extensions', () => {
      const extensions = TestingPatternUtils.getTestFileExtensions();

      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions.length).toBe(4);
    });

    it('should include .spec.ts', () => {
      const extensions = TestingPatternUtils.getTestFileExtensions();

      expect(extensions).toContain('.spec.ts');
    });

    it('should include .test.ts', () => {
      const extensions = TestingPatternUtils.getTestFileExtensions();

      expect(extensions).toContain('.test.ts');
    });

    it('should include JavaScript extensions', () => {
      const extensions = TestingPatternUtils.getTestFileExtensions();

      expect(extensions).toContain('.spec.js');
      expect(extensions).toContain('.test.js');
    });
  });

  describe('isTestFile', () => {
    it('should return true for .spec.ts files', () => {
      expect(TestingPatternUtils.isTestFile('component.spec.ts')).toBe(true);
    });

    it('should return true for .test.ts files', () => {
      expect(TestingPatternUtils.isTestFile('service.test.ts')).toBe(true);
    });

    it('should return true for .spec.js files', () => {
      expect(TestingPatternUtils.isTestFile('helper.spec.js')).toBe(true);
    });

    it('should return true for .test.js files', () => {
      expect(TestingPatternUtils.isTestFile('utils.test.js')).toBe(true);
    });

    it('should return false for regular TypeScript files', () => {
      expect(TestingPatternUtils.isTestFile('component.ts')).toBe(false);
    });

    it('should return false for regular JavaScript files', () => {
      expect(TestingPatternUtils.isTestFile('helper.js')).toBe(false);
    });

    it('should return true for full paths with test files', () => {
      expect(TestingPatternUtils.isTestFile('src/app/component.spec.ts')).toBe(
        true
      );
    });

    it('should return false for files with test in the name but wrong extension', () => {
      expect(TestingPatternUtils.isTestFile('test-component.ts')).toBe(false);
    });
  });

  describe('generateTestProjectStructure', () => {
    it('should generate structure with default options', () => {
      const structure = TestingPatternUtils.generateTestProjectStructure();

      expect(structure).toBeDefined();
      expect(typeof structure).toBe('object');
    });

    it('should include src directory by default', () => {
      const structure = TestingPatternUtils.generateTestProjectStructure();

      expect(structure).toHaveProperty('src/');
    });

    it('should include dist directory by default', () => {
      const structure = TestingPatternUtils.generateTestProjectStructure();

      expect(structure).toHaveProperty('dist/');
    });

    it('should include source files by default', () => {
      const structure = TestingPatternUtils.generateTestProjectStructure();
      const srcContent = structure['src/'] as Record<string, string>;

      expect(srcContent['component.ts']).toBeDefined();
      expect(srcContent['service.ts']).toBeDefined();
    });

    it('should exclude source files when withSourceFiles is false', () => {
      const structure = TestingPatternUtils.generateTestProjectStructure({
        withSourceFiles: false,
      });

      expect(structure['src/']).not.toHaveProperty('component.ts');
      expect(structure['src/']).not.toHaveProperty('service.ts');
    });

    it('should include test files when withTestFiles is true', () => {
      const structure = TestingPatternUtils.generateTestProjectStructure({
        withTestFiles: true,
      });
      const srcContent = structure['src/'] as Record<string, string>;

      expect(srcContent['component.test.ts']).toBeDefined();
      expect(srcContent['service.test.ts']).toBeDefined();
    });

    it('should include spec file by default', () => {
      const structure = TestingPatternUtils.generateTestProjectStructure();
      const srcContent = structure['src/'] as Record<string, string>;

      expect(srcContent['.spec.ts']).toBeDefined();
    });

    it('should exclude spec file when withSpecFiles is false', () => {
      const structure = TestingPatternUtils.generateTestProjectStructure({
        withSpecFiles: false,
      });

      expect(structure['src/']).not.toHaveProperty('.spec.ts');
    });

    it('should exclude dist when withDistFiles is false', () => {
      const structure = TestingPatternUtils.generateTestProjectStructure({
        withDistFiles: false,
      });

      expect(structure).not.toHaveProperty('dist/');
    });

    it('should include styles.css when source files are included', () => {
      const structure = TestingPatternUtils.generateTestProjectStructure({
        withSourceFiles: true,
      });
      const srcContent = structure['src/'] as Record<string, string>;

      expect(srcContent['styles.css']).toBeDefined();
    });
  });
});

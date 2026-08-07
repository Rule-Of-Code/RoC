/**
 * Universal Checker Base - Tests
 * Tests for the common base functionality for all law checkers
 */

import { UniversalCheckerBase } from '../../src/checkers/universal-checker-base';
import { CheckerUtils } from '../../src/utils/checker-utils';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

// Concrete implementation for testing abstract class
class TestableUniversalChecker extends UniversalCheckerBase {
  // Expose protected static methods for testing
  public static testCreateResult(
    violations: string[],
    lawName: string,
    category: string,
    recommendations: string[],
    fixable = true
  ) {
    return UniversalCheckerBase['createResult'](
      violations,
      lawName,
      category,
      recommendations,
      fixable
    );
  }

  public static testGetProjectRoot() {
    return UniversalCheckerBase['getProjectRoot']();
  }

  public static testExtractConfig(context: string) {
    return UniversalCheckerBase['extractConfig'](context);
  }

  public static testGetLawId() {
    return UniversalCheckerBase['getLawId']();
  }

  public static testGetUtils() {
    return UniversalCheckerBase['getUtils']();
  }

  public static testReadFileContent(filePath: string) {
    return UniversalCheckerBase['readFileContent'](filePath);
  }

  public static testFileExists(filePath: string) {
    return UniversalCheckerBase['fileExists'](filePath);
  }

  public static testDirectoryExists(dirPath: string) {
    return UniversalCheckerBase['directoryExists'](dirPath);
  }

  public static testGetRelativePath(filePath: string, projectRoot?: string) {
    return UniversalCheckerBase['getRelativePath'](filePath, projectRoot);
  }
}

describe('UniversalCheckerBase', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('universal-checker-test-');
  });

  afterEach(() => {
    if (FileUtils.exists(tempDir)) {
      FileUtils.deleteDirectory(tempDir);
    }
  });

  // ============================================
  // createResult()
  // ============================================
  describe('createResult()', () => {
    it('should create passing result with no violations', () => {
      const result = TestableUniversalChecker.testCreateResult(
        [],
        'Test Law',
        'TESTING',
        ['Good job!'],
        true
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.message).toContain('compliance verified');
    });

    it('should create failing result with violations', () => {
      const result = TestableUniversalChecker.testCreateResult(
        ['Violation 1', 'Violation 2'],
        'Test Law',
        'TESTING',
        ['Fix this'],
        true
      );

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);
      expect(result.message).toContain('2');
      expect(result.message).toContain('violations');
    });

    it('should calculate score based on violations', () => {
      const result1 = TestableUniversalChecker.testCreateResult(
        ['V1'],
        'Law',
        'CAT',
        [],
        true
      );
      expect(result1.score).toBe(90);

      const result5 = TestableUniversalChecker.testCreateResult(
        ['V1', 'V2', 'V3', 'V4', 'V5'],
        'Law',
        'CAT',
        [],
        true
      );
      expect(result5.score).toBe(50);
    });

    it('should not go below 0 score', () => {
      const manyViolations = Array(15).fill('Violation');
      const result = TestableUniversalChecker.testCreateResult(
        manyViolations,
        'Law',
        'CAT',
        [],
        true
      );

      expect(result.score).toBe(0);
    });

    it('should include recommendations as details', () => {
      const result = TestableUniversalChecker.testCreateResult(
        [],
        'Law',
        'CAT',
        ['Rec 1', 'Rec 2'],
        true
      );

      expect(result.details).toContain('Rec 1');
      expect(result.details).toContain('Rec 2');
    });

    it('should include recommendations as suggestions', () => {
      const result = TestableUniversalChecker.testCreateResult(
        [],
        'Law',
        'CAT',
        ['Suggestion 1'],
        true
      );

      expect(result.suggestions).toContain('Suggestion 1');
    });

    it('should set fixable flag', () => {
      const fixableResult = TestableUniversalChecker.testCreateResult(
        ['V'],
        'Law',
        'CAT',
        [],
        true
      );
      expect(fixableResult.fixable).toBe(true);

      const notFixableResult = TestableUniversalChecker.testCreateResult(
        ['V'],
        'Law',
        'CAT',
        [],
        false
      );
      expect(notFixableResult.fixable).toBe(false);
    });

    it('should include fix command from recommendations', () => {
      const result = TestableUniversalChecker.testCreateResult(
        [],
        'Law',
        'CAT',
        ['npm fix', 'npm lint'],
        true
      );

      expect(result.fixCommand).toContain('npm fix');
      expect(result.fixCommand).toContain('npm lint');
    });

    it('should include config', () => {
      const result = TestableUniversalChecker.testCreateResult(
        [],
        'Law',
        'CAT',
        [],
        true
      );

      expect(result.config).toBeDefined();
    });
  });

  // ============================================
  // getProjectRoot()
  // ============================================
  describe('getProjectRoot()', () => {
    it('should return current working directory', () => {
      const root = TestableUniversalChecker.testGetProjectRoot();

      expect(typeof root).toBe('string');
      expect(root.length).toBeGreaterThan(0);
      expect(root).toBe(process.cwd());
    });
  });

  // ============================================
  // extractConfig()
  // ============================================
  describe('extractConfig()', () => {
    it('should return a config object', () => {
      const config = TestableUniversalChecker.testExtractConfig('context');

      expect(config).toBeDefined();
      expect(config?.project).toBeDefined();
    });

    it('should return minimal default config', () => {
      const config = TestableUniversalChecker.testExtractConfig('any');

      expect(config?.ignores).toBeDefined();
      expect(config?.includes).toBeDefined();
    });
  });

  // ============================================
  // getLawId()
  // ============================================
  describe('getLawId()', () => {
    it('should return lowercase class name', () => {
      const lawId = TestableUniversalChecker.testGetLawId();

      expect(typeof lawId).toBe('string');
      expect(lawId).toBe(lawId.toLowerCase());
    });
  });

  // ============================================
  // getUtils()
  // ============================================
  describe('getUtils()', () => {
    it('should return CheckerUtils', () => {
      const utils = TestableUniversalChecker.testGetUtils();

      expect(utils).toBe(CheckerUtils);
    });

    it('should have common extensions', () => {
      const utils = TestableUniversalChecker.testGetUtils();

      expect(utils.getCommonExtensions()).toBeDefined();
      expect(utils.getCommonExtensions().TYPESCRIPT).toBeDefined();
    });
  });

  // ============================================
  // readFileContent()
  // ============================================
  describe('readFileContent()', () => {
    it('should read existing file', () => {
      const testFile = PathOperations.join(tempDir, 'test.txt');
      FileUtils.writeFileSync(testFile, 'Hello World');

      const content = TestableUniversalChecker.testReadFileContent(testFile);

      expect(content).toBe('Hello World');
    });

    it('should return empty string for non-existent file', () => {
      const content = TestableUniversalChecker.testReadFileContent(
        PathOperations.join(tempDir, 'nonexistent.txt')
      );

      expect(content).toBe('');
    });

    it('should handle read errors gracefully', () => {
      const content = TestableUniversalChecker.testReadFileContent(
        '/invalid/path/that/does/not/exist.txt'
      );

      expect(content).toBe('');
    });
  });

  // ============================================
  // fileExists()
  // ============================================
  describe('fileExists()', () => {
    it('should return true for existing file', () => {
      const testFile = PathOperations.join(tempDir, 'exists.txt');
      FileUtils.writeFileSync(testFile, 'content');

      expect(TestableUniversalChecker.testFileExists(testFile)).toBe(true);
    });

    it('should return false for non-existent file', () => {
      expect(
        TestableUniversalChecker.testFileExists(
          PathOperations.join(tempDir, 'nope.txt')
        )
      ).toBe(false);
    });

    it('should handle errors gracefully', () => {
      expect(TestableUniversalChecker.testFileExists('/invalid/\0/path')).toBe(
        false
      );
    });
  });

  // ============================================
  // directoryExists()
  // ============================================
  describe('directoryExists()', () => {
    it('should return true for existing directory', () => {
      const testDir = PathOperations.join(tempDir, 'subdir');
      FileUtils.createDirectory(testDir);

      expect(TestableUniversalChecker.testDirectoryExists(testDir)).toBe(true);
    });

    it('should return false for non-existent directory', () => {
      expect(
        TestableUniversalChecker.testDirectoryExists(
          PathOperations.join(tempDir, 'nope')
        )
      ).toBe(false);
    });

    it('should return false for file path', () => {
      const testFile = PathOperations.join(tempDir, 'file.txt');
      FileUtils.writeFileSync(testFile, 'content');

      expect(TestableUniversalChecker.testDirectoryExists(testFile)).toBe(
        false
      );
    });

    it('should handle errors gracefully', () => {
      expect(
        TestableUniversalChecker.testDirectoryExists('/invalid/\0/path')
      ).toBe(false);
    });
  });

  // ============================================
  // getRelativePath()
  // ============================================
  describe('getRelativePath()', () => {
    it('should return relative path from project root', () => {
      const filePath = PathOperations.join(tempDir, 'src', 'app.ts');

      const relative = TestableUniversalChecker.testGetRelativePath(
        filePath,
        tempDir
      );

      expect(relative).toBe(PathOperations.join('src', 'app.ts'));
    });

    it('should handle nested paths', () => {
      const filePath = PathOperations.join(tempDir, 'a', 'b', 'c', 'file.ts');

      const relative = TestableUniversalChecker.testGetRelativePath(
        filePath,
        tempDir
      );

      expect(relative).toBe(PathOperations.join('a', 'b', 'c', 'file.ts'));
    });

    it('should work with default project root', () => {
      const cwd = process.cwd();
      const filePath = PathOperations.join(cwd, 'test.ts');

      const relative = TestableUniversalChecker.testGetRelativePath(filePath);

      expect(relative).toBe('test.ts');
    });
  });
});

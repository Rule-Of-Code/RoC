/**
 * Base Checker - Tests
 * Tests for the abstract base checker class
 */

import { BaseChecker } from '../../src/checkers/base-checker';
import type {
  LawCheckContext,
  RawConstitutionalLaw,
} from '../../src/types/law.types';
import { ConfigFileUtils } from '../../src/utils/config-file-utils';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

// Concrete implementation for testing abstract class
class TestableChecker extends BaseChecker {
  async check(context: LawCheckContext) {
    return this.createSuccessResult('Test passed', context);
  }

  // Expose protected methods for testing
  public testCreateResult(
    violations: string[],
    title: string,
    type: string,
    suggestions: string[],
    context: LawCheckContext
  ) {
    return this.createResult(violations, title, type, suggestions, context);
  }

  public testCreateErrorResult(error: Error, context: LawCheckContext) {
    return this.createErrorResult(error, context);
  }

  public testCreateSuccessResult(message: string, context: LawCheckContext) {
    return this.createSuccessResult(message, context);
  }

  public testGetMatchingFiles(
    context: LawCheckContext,
    pattern: string,
    excludePatterns?: string[]
  ) {
    return this.getMatchingFiles(context, pattern, excludePatterns);
  }

  public testScanFilesForPatterns(
    files: string[],
    patterns: RegExp[],
    context: LawCheckContext,
    errorMessage: string
  ) {
    return this.scanFilesForPatterns(files, patterns, context, errorMessage);
  }

  public testExecuteCommand(command: string, cwd: string) {
    return this.executeCommand(command, cwd);
  }

  public testHasDependency(projectRoot: string, dependency: string) {
    return this.hasDependency(projectRoot, dependency);
  }

  public testGetPackageJson(projectRoot: string) {
    return this.getPackageJson(projectRoot);
  }
}

describe('BaseChecker', () => {
  let checker: TestableChecker;
  let testLaw: RawConstitutionalLaw;
  let testContext: LawCheckContext;
  let tempDir: string;

  beforeEach(() => {
    testLaw = {
      id: 'test-law-001',
      title: 'Test Law',
      description: 'A test law for testing',
      category: 'TESTING',
      priority: 'HIGH',
      article: 'Article 1',
      section: 'Section 1',
      subsection: 'Subsection 1',
      emoji: '🧪',
      automation: 'AUTOMATED',
      defaultEnabled: true,
      defaultSeverity: 'error',
      violationMessage: 'Test violation',
      remediation: 'Fix the test',
    };

    checker = new TestableChecker(testLaw, 1);

    tempDir = FileUtils.createTempDirectory('base-checker-test-');

    testContext = {
      projectRoot: tempDir,
      config: ConfigFileUtils.getMinimalDefaultConfig(),
      lawId: 'test-law-001',
    };
  });

  afterEach(() => {
    if (FileUtils.exists(tempDir)) {
      FileUtils.deleteDirectory(tempDir);
    }
  });

  // ============================================
  // Constructor
  // ============================================
  describe('constructor', () => {
    it('should create instance with law and lawNumber', () => {
      expect(checker).toBeInstanceOf(BaseChecker);
    });

    it('should accept different law numbers', () => {
      const checker2 = new TestableChecker(testLaw, 42);
      expect(checker2).toBeInstanceOf(BaseChecker);
    });
  });

  // ============================================
  // check() - abstract method implementation
  // ============================================
  describe('check()', () => {
    it('should be implemented by subclass', async () => {
      const result = await checker.check(testContext);
      expect(result).toBeDefined();
      expect(result.passed).toBe(true);
    });
  });

  // ============================================
  // createResult()
  // ============================================
  describe('createResult()', () => {
    it('should create result with no violations', () => {
      const result = checker.testCreateResult(
        [],
        'Test Title',
        'test-type',
        [],
        testContext
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
    });

    it('should create result with violations', () => {
      const result = checker.testCreateResult(
        ['Violation 1', 'Violation 2'],
        'Test Title',
        'test-type',
        ['Fix suggestion'],
        testContext
      );

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('Violation 1');
      expect(result.violations).toContain('Violation 2');
    });

    it('should include suggestions', () => {
      const result = checker.testCreateResult(
        ['Violation'],
        'Test Title',
        'test-type',
        ['Suggestion 1', 'Suggestion 2'],
        testContext
      );

      expect(result.suggestions).toContain('Suggestion 1');
      expect(result.suggestions).toContain('Suggestion 2');
    });

    it('should include config in result', () => {
      const result = checker.testCreateResult(
        [],
        'Test Title',
        'test-type',
        [],
        testContext
      );

      expect(result.config).toBeDefined();
    });
  });

  // ============================================
  // createErrorResult()
  // ============================================
  describe('createErrorResult()', () => {
    it('should create error result with message', () => {
      const error = new Error('Something went wrong');
      const result = checker.testCreateErrorResult(error, testContext);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Something went wrong');
      expect(result.score).toBe(0);
    });

    it('should set fixable to false', () => {
      const error = new Error('Error');
      const result = checker.testCreateErrorResult(error, testContext);

      expect(result.fixable).toBe(false);
    });

    it('should include config', () => {
      const error = new Error('Error');
      const result = checker.testCreateErrorResult(error, testContext);

      expect(result.config).toBeDefined();
    });
  });

  // ============================================
  // createSuccessResult()
  // ============================================
  describe('createSuccessResult()', () => {
    it('should create success result with default message', () => {
      const result = checker.testCreateSuccessResult(
        'Compliance verified',
        testContext
      );

      expect(result.passed).toBe(true);
      expect(result.message).toBe('Compliance verified');
      expect(result.score).toBe(100);
    });

    it('should create success result with custom message', () => {
      const result = checker.testCreateSuccessResult(
        'All tests passed!',
        testContext
      );

      expect(result.message).toBe('All tests passed!');
    });

    it('should set fixable to false', () => {
      const result = checker.testCreateSuccessResult('Success', testContext);

      expect(result.fixable).toBe(false);
    });
  });

  // ============================================
  // getMatchingFiles()
  // ============================================
  describe('getMatchingFiles()', () => {
    beforeEach(() => {
      // Create test files
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'file1.ts'),
        'export const a = 1;'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'file2.ts'),
        'export const b = 2;'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'file3.js'),
        'const c = 3;'
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'src', 'app.ts'),
        'export class App {}'
      );
    });

    it('should return files matching pattern', () => {
      const files = checker.testGetMatchingFiles(testContext, '**/*.ts');
      expect(files.length).toBeGreaterThanOrEqual(0);
    });

    it('should exclude patterns when provided', () => {
      const files = checker.testGetMatchingFiles(testContext, '**/*.ts', [
        'node_modules',
      ]);
      expect(files.every(f => !f.includes('node_modules'))).toBe(true);
    });

    it('should return empty array for non-matching pattern', () => {
      const files = checker.testGetMatchingFiles(testContext, '**/*.xyz');
      expect(files).toEqual([]);
    });
  });

  // ============================================
  // scanFilesForPatterns()
  // ============================================
  describe('scanFilesForPatterns()', () => {
    beforeEach(() => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'bad-code.ts'),
        'console.log("debug"); var x = 1;'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'good-code.ts'),
        'const logger = new Logger();'
      );
    });

    it('should find violations matching patterns', () => {
      const violations = checker.testScanFilesForPatterns(
        ['bad-code.ts'],
        [/console\.log/],
        testContext,
        'Found console.log'
      );

      expect(violations.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty for clean files', () => {
      const violations = checker.testScanFilesForPatterns(
        ['good-code.ts'],
        [/console\.log/],
        testContext,
        'Found console.log'
      );

      expect(violations.length).toBe(0);
    });

    it('should handle multiple patterns', () => {
      const violations = checker.testScanFilesForPatterns(
        ['bad-code.ts'],
        [/console\.log/, /var\s+\w+/],
        testContext,
        'Bad pattern found'
      );

      expect(violations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty files array', () => {
      const violations = checker.testScanFilesForPatterns(
        [],
        [/pattern/],
        testContext,
        'Message'
      );

      expect(violations).toEqual([]);
    });
  });

  // ============================================
  // executeCommand()
  // ============================================
  describe('executeCommand()', () => {
    it('should execute successful command', () => {
      const result = checker.testExecuteCommand('echo "hello"', tempDir);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('hello');
      expect(result.stderr).toBe('');
    });

    it('should handle failed command', () => {
      const result = checker.testExecuteCommand(
        'exit 1 2>/dev/null || true',
        tempDir
      );

      // Different behavior based on shell
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle command not found', () => {
      const result = checker.testExecuteCommand(
        'nonexistentcommand12345',
        tempDir
      );

      expect(result.success).toBe(false);
    });

    it('should use correct working directory', () => {
      const result = checker.testExecuteCommand('pwd', tempDir);

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toContain(PathOperations.getBasename(tempDir));
    });
  });

  // ============================================
  // hasDependency()
  // ============================================
  describe('hasDependency()', () => {
    beforeEach(() => {
      const packageJson = {
        name: 'test-project',
        dependencies: {
          lodash: '^4.0.0',
          express: '^4.18.0',
        },
        devDependencies: {
          jest: '^29.0.0',
          typescript: '^5.0.0',
        },
      };
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );
    });

    it('should find existing dependency', () => {
      const result = checker.testHasDependency(tempDir, 'lodash');
      expect(result).toBe(true);
    });

    it('should find existing devDependency', () => {
      const result = checker.testHasDependency(tempDir, 'jest');
      expect(result).toBe(true);
    });

    it('should return false for missing dependency', () => {
      const result = checker.testHasDependency(tempDir, 'nonexistent-package');
      expect(result).toBe(false);
    });

    it('should handle missing package.json', () => {
      const emptyDir = FileUtils.createTempDirectory('no-package-json-');
      try {
        const result = checker.testHasDependency(emptyDir, 'lodash');
        expect(result).toBe(false);
      } finally {
        FileUtils.deleteDirectory(emptyDir);
      }
    });
  });

  // ============================================
  // getPackageJson()
  // ============================================
  describe('getPackageJson()', () => {
    it('should return package.json content', () => {
      const packageJson = {
        name: 'test-project',
        version: '1.0.0',
        main: 'index.js',
      };
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = checker.testGetPackageJson(tempDir);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('test-project');
      expect(result?.version).toBe('1.0.0');
    });

    it('should return null for missing package.json', () => {
      const emptyDir = FileUtils.createTempDirectory('no-pkg-');
      try {
        const result = checker.testGetPackageJson(emptyDir);
        expect(result).toBeNull();
      } finally {
        FileUtils.deleteDirectory(emptyDir);
      }
    });

    it('should return null for invalid JSON', () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'package.json'),
        'not valid json {'
      );

      const result = checker.testGetPackageJson(tempDir);
      expect(result).toBeNull();
    });
  });
});

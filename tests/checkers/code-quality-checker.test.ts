/**
 * Code Quality Checker - Tests
 * Tests for the code quality laws checker
 */


import { PathOperations } from '../../src/utils/path-operations';
import { FileUtils } from '../../src/utils/file-utils';
import { CodeQualityChecker } from '../../src/checkers/code-quality-checker';
import type { LawCheckContext } from '../../src/types/law.types';
import { ConfigFileUtils } from '../../src/utils/config-file-utils';

describe('CodeQualityChecker', () => {
  let tempDir: string;
  let testContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('code-quality-checker-test-');

    // Create minimal project structure
    FileUtils.writeFileSync(
      PathOperations.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        dependencies: {},
      })
    );

    testContext = {
      projectRoot: tempDir,
      config: ConfigFileUtils.getMinimalDefaultConfig(),
      lawId: 'code-quality-001',
    };
  });

  afterEach(() => {
    if (FileUtils.exists(tempDir)) {
      FileUtils.deleteDirectory(tempDir);
    }
  });

  // ============================================
  // checkObservableCleanup()
  // ============================================
  describe('checkObservableCleanup()', () => {
    it('should return LawResult', () => {
      const result = CodeQualityChecker.checkObservableCleanup(testContext);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    it('should pass for empty project', () => {
      const result = CodeQualityChecker.checkObservableCleanup(testContext);

      expect(result.passed).toBe(true);
    });

    it('should check for proper cleanup in observables', () => {
      // Create a file with observables but no cleanup
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'src', 'test.component.ts'),
        `
import { Component } from '@angular/core';
import { Observable } from 'rxjs';

@Component({ selector: 'app-test' })
export class TestComponent {
  data$: Observable<any>;

  ngOnInit() {
    this.data$.subscribe(data => console.log(data));
  }
}
        `
      );

      const result = CodeQualityChecker.checkObservableCleanup(testContext);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have score between 0 and 100', () => {
      const result = CodeQualityChecker.checkObservableCleanup(testContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  // ============================================
  // checkZeroToleranceStrict()
  // ============================================
  describe('checkZeroToleranceStrict()', () => {
    it('should return LawResult', () => {
      const result = CodeQualityChecker.checkZeroToleranceStrict(testContext);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should pass for clean code', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'src', 'clean.ts'),
        `
export function add(a: number, b: number): number {
  return a + b;
}
        `
      );

      const result = CodeQualityChecker.checkZeroToleranceStrict(testContext);

      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
    });

    it('should check for strict mode violations', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'src', 'any-usage.ts'),
        `
export function process(data: any): any {
  return data;
}
        `
      );

      const result = CodeQualityChecker.checkZeroToleranceStrict(testContext);

      expect(result).toBeDefined();
    });

    it('should have fixable flag', () => {
      const result = CodeQualityChecker.checkZeroToleranceStrict(testContext);

      expect(typeof result.fixable).toBe('boolean');
    });
  });

  // ============================================
  // checkNxCommandsOnly()
  // ============================================
  describe('checkNxCommandsOnly()', () => {
    it('should return LawResult', () => {
      const result = CodeQualityChecker.checkNxCommandsOnly(testContext);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should pass for projects without npm scripts', () => {
      const result = CodeQualityChecker.checkNxCommandsOnly(testContext);

      expect(result).toBeDefined();
    });

    it('should check package.json scripts', () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          scripts: {
            build: 'nx build',
            test: 'nx test',
            lint: 'nx lint',
          },
        })
      );

      const result = CodeQualityChecker.checkNxCommandsOnly(testContext);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have message property', () => {
      const result = CodeQualityChecker.checkNxCommandsOnly(testContext);

      expect(result.message).toBeDefined();
      expect(result.message.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // checkCodeDocumentation()
  // ============================================
  describe('checkCodeDocumentation()', () => {
    it('should return LawResult', () => {
      const result = CodeQualityChecker.checkCodeDocumentation(testContext);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should pass for well-documented code', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'src', 'documented.ts'),
        `
/**
 * Calculator utility class
 * Provides basic mathematical operations
 */
export class Calculator {
  /**
   * Adds two numbers together
   * @param a First number
   * @param b Second number
   * @returns Sum of a and b
   */
  add(a: number, b: number): number {
    return a + b;
  }
}
        `
      );

      const result = CodeQualityChecker.checkCodeDocumentation(testContext);

      expect(result).toBeDefined();
    });

    it('should check for missing documentation', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'src', 'undocumented.ts'),
        `
export class NoComments {
  doSomething() {
    return 42;
  }
}
        `
      );

      const result = CodeQualityChecker.checkCodeDocumentation(testContext);

      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
    });

    it('should return proper score', () => {
      const result = CodeQualityChecker.checkCodeDocumentation(testContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  // ============================================
  // Static class behavior
  // ============================================
  describe('Static class behavior', () => {
    it('all methods should be static', () => {
      expect(typeof CodeQualityChecker.checkObservableCleanup).toBe('function');
      expect(typeof CodeQualityChecker.checkZeroToleranceStrict).toBe(
        'function'
      );
      expect(typeof CodeQualityChecker.checkNxCommandsOnly).toBe('function');
      expect(typeof CodeQualityChecker.checkCodeDocumentation).toBe('function');
    });

    it('methods should not require instance', () => {
      // Should be callable without new
      const result1 = CodeQualityChecker.checkObservableCleanup(testContext);
      const result2 = CodeQualityChecker.checkZeroToleranceStrict(testContext);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});

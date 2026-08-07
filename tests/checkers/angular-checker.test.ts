/**
 * Angular Checker - Tests
 * Tests for the Angular constitutional checker
 */

import { AngularChecker } from '../../src/checkers/angular-checker';
import type {
  LawCheckContext,
  RawConstitutionalLaw,
} from '../../src/types/law.types';
import { ConfigFileUtils } from '../../src/utils/config-file-utils';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('AngularChecker', () => {
  let tempDir: string;
  let testContext: LawCheckContext;

  const createLaw = (
    overrides: Partial<RawConstitutionalLaw> = {}
  ): RawConstitutionalLaw => ({
    id: 'angular-test-001',
    title: 'Angular Test Law',
    description: 'A test law for Angular',
    category: 'FRAMEWORK',
    priority: 'HIGH',
    article: 'Article 1',
    section: 'Section 1',
    subsection: 'Subsection 1',
    emoji: '🅰️',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    violationMessage: 'Angular violation',
    remediation: 'Fix Angular code',
    ...overrides,
  });

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-checker-test-');

    // Create minimal Angular project structure
    FileUtils.writeFileSync(
      PathOperations.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-angular-app',
        dependencies: {
          '@angular/core': '^18.0.0',
        },
      })
    );
    FileUtils.writeFileSync(
      PathOperations.join(tempDir, 'angular.json'),
      JSON.stringify({ version: 1, projects: {} })
    );

    testContext = {
      projectRoot: tempDir,
      config: ConfigFileUtils.getMinimalDefaultConfig(),
      lawId: 'angular-test-001',
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
    it('should create instance', () => {
      const law = createLaw();
      const checker = new AngularChecker(law, 1);
      expect(checker).toBeInstanceOf(AngularChecker);
    });

    it('should accept different law numbers', () => {
      const law = createLaw();
      const checker = new AngularChecker(law, 42);
      expect(checker).toBeInstanceOf(AngularChecker);
    });
  });

  // ============================================
  // check() - Modern Control Flow
  // ============================================
  describe('check() - Modern Control Flow', () => {
    it('should handle Angular 18+ control flow law', async () => {
      const law = createLaw({
        description: 'Angular 18+ control flow syntax',
      });
      const checker = new AngularChecker(law, 1);

      const result = await checker.check(testContext);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should handle @if/@for description', async () => {
      const law = createLaw({
        description: 'Use @if/@for syntax in templates',
      });
      const checker = new AngularChecker(law, 1);

      const result = await checker.check(testContext);

      expect(result).toBeDefined();
    });
  });

  // ============================================
  // check() - NgRx Laws
  // ============================================
  describe('check() - NgRx Laws', () => {
    it('should handle checkNxCommandsOnly', async () => {
      const law = createLaw({
        checkFunction: 'checkNxCommandsOnly',
      });
      const checker = new AngularChecker(law, 1);

      const result = await checker.check(testContext);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should handle checkNgrxStorePattern', async () => {
      const law = createLaw({
        checkFunction: 'checkNgrxStorePattern',
      });
      const checker = new AngularChecker(law, 1);

      const result = await checker.check(testContext);

      expect(result).toBeDefined();
    });

    it('should handle checkNgrxActionsHygiene', async () => {
      const law = createLaw({
        checkFunction: 'checkNgrxActionsHygiene',
      });
      const checker = new AngularChecker(law, 1);

      const result = await checker.check(testContext);

      expect(result).toBeDefined();
    });

    it('should handle checkNgrxEffectsErrorHandling', async () => {
      const law = createLaw({
        checkFunction: 'checkNgrxEffectsErrorHandling',
      });
      const checker = new AngularChecker(law, 1);

      const result = await checker.check(testContext);

      expect(result).toBeDefined();
    });
  });

  // ============================================
  // check() - Testing Excellence
  // ============================================
  describe('check() - Testing Excellence', () => {
    it('should handle checkAngularTestingExcellence', async () => {
      const law = createLaw({
        checkFunction: 'checkAngularTestingExcellence',
      });
      const checker = new AngularChecker(law, 1);

      const result = await checker.check(testContext);

      expect(result).toBeDefined();
    });

    it('should handle checkProfessionalComponentTesting', async () => {
      const law = createLaw({
        checkFunction: 'checkProfessionalComponentTesting',
      });
      const checker = new AngularChecker(law, 1);

      const result = await checker.check(testContext);

      expect(result).toBeDefined();
    });
  });

  // ============================================
  // check() - Generic Angular Law
  // ============================================
  describe('check() - Generic Angular Law', () => {
    it('should fall back to GenericAngularLaw', async () => {
      const law = createLaw({
        checkFunction: 'unknownCheckFunction',
        description: 'Generic Angular check',
      });
      const checker = new AngularChecker(law, 1);

      const result = await checker.check(testContext);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should handle law without checkFunction', async () => {
      const law = createLaw({
        checkFunction: undefined,
        description: 'No specific check',
      });
      const checker = new AngularChecker(law, 1);

      const result = await checker.check(testContext);

      expect(result).toBeDefined();
    });
  });

  // ============================================
  // check() - Error Handling
  // ============================================
  describe('check() - Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const law = createLaw();
      const checker = new AngularChecker(law, 1);

      // Use invalid project root
      const invalidContext = {
        ...testContext,
        projectRoot: '/nonexistent/path/that/does/not/exist',
      };

      const result = await checker.check(invalidContext);

      // Should return result even with error
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });
  });

  // ============================================
  // Result structure
  // ============================================
  describe('Result structure', () => {
    it('should return valid LawResult', async () => {
      const law = createLaw();
      const checker = new AngularChecker(law, 1);

      const result = await checker.check(testContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('score');
      expect(typeof result.passed).toBe('boolean');
      expect(typeof result.message).toBe('string');
      expect(typeof result.score).toBe('number');
    });

    it('should have score between 0 and 100', async () => {
      const law = createLaw();
      const checker = new AngularChecker(law, 1);

      const result = await checker.check(testContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});

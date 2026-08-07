/**
 * Tests for TestFilePatterns
 *
 * Tests test file pattern matching utilities.
 */
import { TestFilePatterns } from '../../../src/laws/testing/test-file-patterns';

describe('TestFilePatterns', () => {
  describe('isTestFile', () => {
    describe('should return true for valid test files', () => {
      it('should match .spec.ts files', () => {
        expect(TestFilePatterns.isTestFile('component.spec.ts')).toBe(true);
      });

      it('should match .test.ts files', () => {
        expect(TestFilePatterns.isTestFile('service.test.ts')).toBe(true);
      });

      it('should match .spec.js files', () => {
        expect(TestFilePatterns.isTestFile('util.spec.js')).toBe(true);
      });

      it('should match .test.js files', () => {
        expect(TestFilePatterns.isTestFile('helper.test.js')).toBe(true);
      });

      it('should match .e2e-spec. files', () => {
        expect(TestFilePatterns.isTestFile('app.e2e-spec.ts')).toBe(true);
      });
    });

    describe('should return false for non-test files', () => {
      it('should not match regular .ts files', () => {
        expect(TestFilePatterns.isTestFile('component.ts')).toBe(false);
      });

      it('should not match regular .js files', () => {
        expect(TestFilePatterns.isTestFile('service.js')).toBe(false);
      });

      it('should not match .tsx files', () => {
        expect(TestFilePatterns.isTestFile('component.tsx')).toBe(false);
      });

      it('should not match .json files', () => {
        expect(TestFilePatterns.isTestFile('package.json')).toBe(false);
      });

      it('should not match .html files', () => {
        expect(TestFilePatterns.isTestFile('index.html')).toBe(false);
      });

      it('should not match .css files', () => {
        expect(TestFilePatterns.isTestFile('styles.css')).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle files with spec in the name but not as extension', () => {
        expect(TestFilePatterns.isTestFile('spec-helper.ts')).toBe(false);
      });

      it('should handle files with test in the name but not as extension', () => {
        expect(TestFilePatterns.isTestFile('test-utils.ts')).toBe(false);
      });

      it('should match full paths', () => {
        expect(TestFilePatterns.isTestFile('src/app/component.spec.ts')).toBe(
          true
        );
      });
    });
  });

  describe('isUnitTestFile', () => {
    describe('should return true for unit test files', () => {
      it('should match .spec.ts files', () => {
        expect(TestFilePatterns.isUnitTestFile('component.spec.ts')).toBe(true);
      });

      it('should match .test.ts files', () => {
        expect(TestFilePatterns.isUnitTestFile('service.test.ts')).toBe(true);
      });

      it('should match .spec.js files', () => {
        expect(TestFilePatterns.isUnitTestFile('util.spec.js')).toBe(true);
      });

      it('should match .test.js files', () => {
        expect(TestFilePatterns.isUnitTestFile('helper.test.js')).toBe(true);
      });
    });

    describe('should return false for non-unit test files', () => {
      it('should not match e2e spec files', () => {
        expect(TestFilePatterns.isUnitTestFile('app.e2e-spec.ts')).toBe(false);
      });

      it('should not match regular .ts files', () => {
        expect(TestFilePatterns.isUnitTestFile('component.ts')).toBe(false);
      });

      it('should not match regular .js files', () => {
        expect(TestFilePatterns.isUnitTestFile('service.js')).toBe(false);
      });
    });
  });

  describe('isE2eTestFile', () => {
    describe('should return true for e2e test files', () => {
      it('should match .e2e-spec.ts files', () => {
        expect(TestFilePatterns.isE2eTestFile('app.e2e-spec.ts')).toBe(true);
      });

      it('should match files with e2e-spec anywhere in name', () => {
        expect(TestFilePatterns.isE2eTestFile('login.e2e-spec.js')).toBe(true);
      });

      it('should match full paths', () => {
        expect(TestFilePatterns.isE2eTestFile('e2e/app.e2e-spec.ts')).toBe(
          true
        );
      });
    });

    describe('should return false for non-e2e test files', () => {
      it('should not match .spec.ts files', () => {
        expect(TestFilePatterns.isE2eTestFile('component.spec.ts')).toBe(false);
      });

      it('should not match .test.ts files', () => {
        expect(TestFilePatterns.isE2eTestFile('service.test.ts')).toBe(false);
      });

      it('should not match regular .ts files', () => {
        expect(TestFilePatterns.isE2eTestFile('component.ts')).toBe(false);
      });

      it('should not match files with e2e in name but not e2e-spec pattern', () => {
        expect(TestFilePatterns.isE2eTestFile('e2e-utils.ts')).toBe(false);
      });
    });
  });

  describe('hasTestExtension', () => {
    describe('should return true for files with test extensions', () => {
      it('should match .spec.ts', () => {
        expect(TestFilePatterns.hasTestExtension('component.spec.ts')).toBe(
          true
        );
      });

      it('should match .test.ts', () => {
        expect(TestFilePatterns.hasTestExtension('service.test.ts')).toBe(true);
      });

      it('should match .spec.js', () => {
        expect(TestFilePatterns.hasTestExtension('util.spec.js')).toBe(true);
      });

      it('should match .test.js', () => {
        expect(TestFilePatterns.hasTestExtension('helper.test.js')).toBe(true);
      });
    });

    describe('should return false for files without test extensions', () => {
      it('should not match regular .ts files', () => {
        expect(TestFilePatterns.hasTestExtension('component.ts')).toBe(false);
      });

      it('should not match regular .js files', () => {
        expect(TestFilePatterns.hasTestExtension('service.js')).toBe(false);
      });

      it('should not match .e2e-spec files (different pattern)', () => {
        expect(TestFilePatterns.hasTestExtension('app.e2e-spec.ts')).toBe(
          false
        );
      });

      it('should not match .cy.ts files', () => {
        expect(TestFilePatterns.hasTestExtension('app.cy.ts')).toBe(false);
      });
    });
  });

  describe('method consistency', () => {
    it('all spec.ts files should be both test files and have test extension', () => {
      const file = 'component.spec.ts';
      expect(TestFilePatterns.isTestFile(file)).toBe(true);
      expect(TestFilePatterns.hasTestExtension(file)).toBe(true);
      expect(TestFilePatterns.isUnitTestFile(file)).toBe(true);
    });

    it('e2e-spec files should be test files but not have standard test extension', () => {
      const file = 'app.e2e-spec.ts';
      expect(TestFilePatterns.isTestFile(file)).toBe(true);
      expect(TestFilePatterns.isE2eTestFile(file)).toBe(true);
      expect(TestFilePatterns.hasTestExtension(file)).toBe(false);
      expect(TestFilePatterns.isUnitTestFile(file)).toBe(false);
    });
  });
});

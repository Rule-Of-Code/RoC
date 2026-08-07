/**
 * @fileoverview Tests for UnitTestCoverageFileDiscoveryConstants
 * @description File discovery constants for unit test coverage
 */
import { UnitTestCoverageFileDiscoveryConstants } from '../../../src/laws/testing/unit-test-coverage/constants/file-discovery';

describe('UnitTestCoverageFileDiscoveryConstants', () => {
  describe('SCAN_DIRECTORIES', () => {
    it('should have SOURCE directories', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.SCAN_DIRECTORIES.SOURCE
      ).toContain('src');
      expect(
        UnitTestCoverageFileDiscoveryConstants.SCAN_DIRECTORIES.SOURCE
      ).toContain('apps');
      expect(
        UnitTestCoverageFileDiscoveryConstants.SCAN_DIRECTORIES.SOURCE
      ).toContain('libs');
    });

    it('should have RELATIVE_SEARCH_PATHS', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.SCAN_DIRECTORIES
          .RELATIVE_SEARCH_PATHS
      ).toContain('src');
      expect(
        UnitTestCoverageFileDiscoveryConstants.SCAN_DIRECTORIES
          .RELATIVE_SEARCH_PATHS
      ).toContain('packages');
    });
  });

  describe('TEST_FILE_PATTERNS', () => {
    it('should have SPEC_EXTENSION pattern', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.TEST_FILE_PATTERNS.SPEC_EXTENSION.test(
          'file.spec.ts'
        )
      ).toBe(true);
    });

    it('should have TEST_EXTENSION pattern', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.TEST_FILE_PATTERNS.TEST_EXTENSION.test(
          'file.test.ts'
        )
      ).toBe(true);
    });

    it('should have SPEC_EXTENSION_JS pattern', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.TEST_FILE_PATTERNS.SPEC_EXTENSION_JS.test(
          'file.spec.js'
        )
      ).toBe(true);
    });

    it('should have TEST_EXTENSION_JS pattern', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.TEST_FILE_PATTERNS.TEST_EXTENSION_JS.test(
          'file.test.js'
        )
      ).toBe(true);
    });

    it('should have CYPRESS_PATTERN', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.TEST_FILE_PATTERNS.CYPRESS_PATTERN.test(
          'file.cy.ts'
        )
      ).toBe(true);
    });
  });

  describe('SOURCE_FILE_PATTERNS', () => {
    it('should have TYPESCRIPT pattern', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.SOURCE_FILE_PATTERNS.TYPESCRIPT.test(
          'file.ts'
        )
      ).toBe(true);
    });

    it('should have JAVASCRIPT pattern', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.SOURCE_FILE_PATTERNS.JAVASCRIPT.test(
          'file.js'
        )
      ).toBe(true);
    });

    it('should have TYPESCRIPT_REACT pattern', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.SOURCE_FILE_PATTERNS.TYPESCRIPT_REACT.test(
          'file.tsx'
        )
      ).toBe(true);
    });

    it('should have JAVASCRIPT_REACT pattern', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.SOURCE_FILE_PATTERNS.JAVASCRIPT_REACT.test(
          'file.jsx'
        )
      ).toBe(true);
    });
  });

  describe('EXCLUSION_PATTERNS', () => {
    it('should have NODE_MODULES pattern', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.EXCLUSION_PATTERNS.NODE_MODULES.test(
          'node_modules/package'
        )
      ).toBe(true);
    });

    it('should have DIST pattern', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.EXCLUSION_PATTERNS.DIST.test(
          'dist/app.js'
        )
      ).toBe(true);
    });

    it('should have BUILD pattern', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.EXCLUSION_PATTERNS.BUILD.test(
          'build/bundle.js'
        )
      ).toBe(true);
    });

    it('should have COVERAGE pattern', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.EXCLUSION_PATTERNS.COVERAGE.test(
          'coverage/lcov.info'
        )
      ).toBe(true);
    });

    it('should have SPEC_FILE pattern', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.EXCLUSION_PATTERNS.SPEC_FILE.test(
          'file.spec.ts'
        )
      ).toBe(true);
    });

    it('should have TEST_FILE pattern', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.EXCLUSION_PATTERNS.TEST_FILE.test(
          'file.test.ts'
        )
      ).toBe(true);
    });

    it('should have E2E_FILE pattern', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.EXCLUSION_PATTERNS.E2E_FILE.test(
          'file.e2e.ts'
        )
      ).toBe(true);
    });

    it('should have TEMP pattern', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.EXCLUSION_PATTERNS.TEMP.test(
          'tmp/file.js'
        )
      ).toBe(true);
    });
  });

  describe('TEST_LOCATION_CONVENTIONS', () => {
    it('COLOCATED_SPEC should convert .ts to .spec.ts', () => {
      const result =
        UnitTestCoverageFileDiscoveryConstants.TEST_LOCATION_CONVENTIONS.COLOCATED_SPEC(
          'src/app/service.ts'
        );
      expect(result).toBe('src/app/service.spec.ts');
    });

    it('COLOCATED_TEST should convert .ts to .test.ts', () => {
      const result =
        UnitTestCoverageFileDiscoveryConstants.TEST_LOCATION_CONVENTIONS.COLOCATED_TEST(
          'src/app/service.ts'
        );
      expect(result).toBe('src/app/service.test.ts');
    });

    it('TESTS_DIRECTORY should convert src to tests', () => {
      const result =
        UnitTestCoverageFileDiscoveryConstants.TEST_LOCATION_CONVENTIONS.TESTS_DIRECTORY(
          'src/app/service.ts'
        );
      expect(result).toBe('tests/app/service.test.ts');
    });

    it('TEST_DIRECTORY should convert src to test', () => {
      const result =
        UnitTestCoverageFileDiscoveryConstants.TEST_LOCATION_CONVENTIONS.TEST_DIRECTORY(
          'src/app/service.ts'
        );
      expect(result).toBe('test/app/service.test.ts');
    });
  });

  describe('isTestFile', () => {
    it('should return true for .spec.ts files', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.isTestFile('user.spec.ts')
      ).toBe(true);
    });

    it('should return true for .test.ts files', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.isTestFile('user.test.ts')
      ).toBe(true);
    });

    it('should return true for .spec.js files', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.isTestFile('user.spec.js')
      ).toBe(true);
    });

    it('should return true for .cy.ts files', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.isTestFile('user.cy.ts')
      ).toBe(true);
    });

    it('should return false for regular source files', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.isTestFile('user.service.ts')
      ).toBe(false);
    });
  });

  describe('isSourceFile', () => {
    it('should return true for .ts files that are not tests', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.isSourceFile('user.service.ts')
      ).toBe(true);
    });

    it('should return true for .tsx files that are not tests', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.isSourceFile('component.tsx')
      ).toBe(true);
    });

    it('should return false for test files', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.isSourceFile('user.spec.ts')
      ).toBe(false);
      expect(
        UnitTestCoverageFileDiscoveryConstants.isSourceFile('user.test.ts')
      ).toBe(false);
    });

    it('should return false for non-code files', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.isSourceFile('readme.md')
      ).toBe(false);
      expect(
        UnitTestCoverageFileDiscoveryConstants.isSourceFile('config.json')
      ).toBe(false);
    });
  });

  describe('shouldExclude', () => {
    it('should return true for node_modules paths', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.shouldExclude(
          'node_modules/package/index.js'
        )
      ).toBe(true);
    });

    it('should return true for dist paths', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.shouldExclude('dist/app.js')
      ).toBe(true);
    });

    it('should return true for build paths', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.shouldExclude('build/bundle.js')
      ).toBe(true);
    });

    it('should return true for coverage paths', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.shouldExclude(
          'coverage/lcov.info'
        )
      ).toBe(true);
    });

    it('should return true for tmp paths', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.shouldExclude('tmp/temp.js')
      ).toBe(true);
    });

    it('should return false for src paths', () => {
      expect(
        UnitTestCoverageFileDiscoveryConstants.shouldExclude(
          'src/app/service.ts'
        )
      ).toBe(false);
    });
  });

  describe('findTestVariants', () => {
    it('should return all test file variants', () => {
      const variants = UnitTestCoverageFileDiscoveryConstants.findTestVariants(
        'src/app/user.service.ts'
      );
      expect(variants).toContain('src/app/user.service.spec.ts');
      expect(variants).toContain('src/app/user.service.test.ts');
      expect(variants).toContain('tests/app/user.service.test.ts');
      expect(variants).toContain('test/app/user.service.test.ts');
    });

    it('should return exactly 4 variants', () => {
      const variants =
        UnitTestCoverageFileDiscoveryConstants.findTestVariants(
          'src/service.ts'
        );
      expect(variants).toHaveLength(4);
    });
  });

  describe('getScanDirectories', () => {
    it('should return SOURCE directories', () => {
      const dirs = UnitTestCoverageFileDiscoveryConstants.getScanDirectories();
      expect(dirs).toContain('src');
      expect(dirs).toContain('apps');
      expect(dirs).toContain('libs');
    });
  });

  describe('immutability', () => {
    it('should have consistent SCAN_DIRECTORIES.SOURCE', () => {
      const original = [
        ...UnitTestCoverageFileDiscoveryConstants.SCAN_DIRECTORIES.SOURCE,
      ];
      expect(
        UnitTestCoverageFileDiscoveryConstants.SCAN_DIRECTORIES.SOURCE
      ).toEqual(original);
    });
  });
});

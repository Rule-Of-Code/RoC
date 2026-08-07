/**
 * @fileoverview Tests for constants.ts barrel file
 * @description Tests that verify all exports from the constants barrel file
 */

import * as constants from '../../src/utils/constants';

describe('utils/constants (barrel file)', () => {
  describe('angular-constants exports', () => {
    it('should export ANGULAR_CONSTANTS', () => {
      expect(constants.ANGULAR_CONSTANTS).toBeDefined();
    });

    it('should export ANGULAR_LIFECYCLE_KEYWORDS', () => {
      expect(constants.ANGULAR_LIFECYCLE_KEYWORDS).toBeDefined();
    });

    it('should export ANGULAR_DIRECTORIES', () => {
      expect(constants.ANGULAR_DIRECTORIES).toBeDefined();
    });

    it('should export ANGULAR_BUILD', () => {
      expect(constants.ANGULAR_BUILD).toBeDefined();
    });

    it('should export ANGULAR_TESTING', () => {
      expect(constants.ANGULAR_TESTING).toBeDefined();
    });
  });

  describe('automation-constants exports', () => {
    it('should export TESTING_CONSTANTS', () => {
      expect(constants.TESTING_CONSTANTS).toBeDefined();
    });

    it('should export AUTOMATION_CONSTANTS', () => {
      expect(constants.AUTOMATION_CONSTANTS).toBeDefined();
    });

    it('should export CICD_PATHS', () => {
      expect(constants.CICD_PATHS).toBeDefined();
    });

    it('should export JEST_CONSTANTS', () => {
      expect(constants.JEST_CONSTANTS).toBeDefined();
    });

    it('should export CONFIG_PATTERNS', () => {
      expect(constants.CONFIG_PATTERNS).toBeDefined();
    });
  });

  describe('file-constants exports', () => {
    it('should export DIRECTORY_NAMES', () => {
      expect(constants.DIRECTORY_NAMES).toBeDefined();
    });

    it('should export FILE_EXTENSIONS', () => {
      expect(constants.FILE_EXTENSIONS).toBeDefined();
    });

    it('should export CONFIG_FILES', () => {
      expect(constants.CONFIG_FILES).toBeDefined();
    });

    it('should export PATH_CONSTANTS', () => {
      expect(constants.PATH_CONSTANTS).toBeDefined();
    });

    it('should export SKIP_DIRECTORIES', () => {
      expect(constants.SKIP_DIRECTORIES).toBeDefined();
    });
  });

  describe('git-constants exports', () => {
    it('should export GITHUB_PATHS', () => {
      expect(constants.GITHUB_PATHS).toBeDefined();
    });

    it('should export REVIEW_TEMPLATE_SECTIONS', () => {
      expect(constants.REVIEW_TEMPLATE_SECTIONS).toBeDefined();
    });

    it('should export CONSTITUTIONAL_PATHS', () => {
      expect(constants.CONSTITUTIONAL_PATHS).toBeDefined();
    });
  });

  describe('license-constants exports', () => {
    it('should export LICENSE_STRING_LITERALS', () => {
      expect(constants.LICENSE_STRING_LITERALS).toBeDefined();
    });

    it('should export LICENSE_CONVENTIONS', () => {
      expect(constants.LICENSE_CONVENTIONS).toBeDefined();
    });

    it('should export DEPENDENCY_LICENSE_CONFIG', () => {
      expect(constants.DEPENDENCY_LICENSE_CONFIG).toBeDefined();
    });
  });

  describe('naming-constants exports', () => {
    it('should export NAMING_CONVENTIONS', () => {
      expect(constants.NAMING_CONVENTIONS).toBeDefined();
    });

    it('should export NAMING_RULES', () => {
      expect(constants.NAMING_RULES).toBeDefined();
    });

    it('should export REGEX_PATTERNS', () => {
      expect(constants.REGEX_PATTERNS).toBeDefined();
    });

    it('should export FILE_NAMING_CONVENTIONS', () => {
      expect(constants.FILE_NAMING_CONVENTIONS).toBeDefined();
    });
  });

  describe('ngrx-constants exports', () => {
    it('should export NGRX_PATTERNS', () => {
      expect(constants.NGRX_PATTERNS).toBeDefined();
    });

    it('should export NGRX_CONSTANTS', () => {
      expect(constants.NGRX_CONSTANTS).toBeDefined();
    });

    it('should export NGRX_THRESHOLDS', () => {
      expect(constants.NGRX_THRESHOLDS).toBeDefined();
    });

    it('should export NGRX_KEYWORDS', () => {
      expect(constants.NGRX_KEYWORDS).toBeDefined();
    });
  });

  describe('utility class exports', () => {
    it('should export ConfigFileUtils class', () => {
      expect(constants.ConfigFileUtils).toBeDefined();
      expect(typeof constants.ConfigFileUtils).toBe('function');
    });

    it('should export FileSystemOperations class', () => {
      expect(constants.FileSystemOperations).toBeDefined();
      expect(typeof constants.FileSystemOperations).toBe('function');
    });
  });

  describe('barrel file completeness', () => {
    it('should have at least 20 exports', () => {
      const exportCount = Object.keys(constants).length;
      expect(exportCount).toBeGreaterThanOrEqual(20);
    });

    it('should not have any undefined exports', () => {
      const allDefined = Object.values(constants).every(
        value => value !== undefined
      );
      expect(allDefined).toBe(true);
    });

    it('should export only functions, objects, arrays, or strings', () => {
      const validTypes = Object.values(constants).every(value => {
        const type = typeof value;
        return (
          type === 'function' ||
          type === 'object' ||
          type === 'string' ||
          Array.isArray(value)
        );
      });
      expect(validTypes).toBe(true);
    });
  });
});

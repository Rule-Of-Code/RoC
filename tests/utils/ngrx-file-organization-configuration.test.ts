/**
 * @fileoverview Tests for ngrx-file-organization-configuration.ts
 * @description Tests for NgRx file organization configuration utilities
 */

import { NgRxFileOrganizationConfiguration } from '../../src/utils/angular/ngrx-file-organization/ngrx-file-organization-configuration';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('utils/angular/ngrx-file-organization/ngrx-file-organization-configuration', () => {
  let tempDir: string;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('ngrx-file-organization-test-');
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleSpy.mockRestore();
  });

  describe('VALID_NGRX_SUFFIXES', () => {
    it('should include .actions.ts', () => {
      expect(NgRxFileOrganizationConfiguration.VALID_NGRX_SUFFIXES).toContain(
        '.actions.ts'
      );
    });

    it('should include .reducer.ts', () => {
      expect(NgRxFileOrganizationConfiguration.VALID_NGRX_SUFFIXES).toContain(
        '.reducer.ts'
      );
    });

    it('should include .selectors.ts', () => {
      expect(NgRxFileOrganizationConfiguration.VALID_NGRX_SUFFIXES).toContain(
        '.selectors.ts'
      );
    });

    it('should include .effects.ts', () => {
      expect(NgRxFileOrganizationConfiguration.VALID_NGRX_SUFFIXES).toContain(
        '.effects.ts'
      );
    });

    it('should include .models.ts', () => {
      expect(NgRxFileOrganizationConfiguration.VALID_NGRX_SUFFIXES).toContain(
        '.models.ts'
      );
    });

    it('should include .facade.ts', () => {
      expect(NgRxFileOrganizationConfiguration.VALID_NGRX_SUFFIXES).toContain(
        '.facade.ts'
      );
    });

    it('should include .state.ts', () => {
      expect(NgRxFileOrganizationConfiguration.VALID_NGRX_SUFFIXES).toContain(
        '.state.ts'
      );
    });
  });

  describe('TEST_FILE_EXTENSIONS', () => {
    it('should include .spec.ts', () => {
      expect(NgRxFileOrganizationConfiguration.TEST_FILE_EXTENSIONS).toContain(
        '.spec.ts'
      );
    });

    it('should include .test.ts', () => {
      expect(NgRxFileOrganizationConfiguration.TEST_FILE_EXTENSIONS).toContain(
        '.test.ts'
      );
    });
  });

  describe('VALIDATION_MESSAGES_CONFIG', () => {
    it('should have MISSING_BARREL_EXPORT with placeholder', () => {
      expect(
        NgRxFileOrganizationConfiguration.VALIDATION_MESSAGES_CONFIG
          .MISSING_BARREL_EXPORT
      ).toContain('{0}');
      expect(
        NgRxFileOrganizationConfiguration.VALIDATION_MESSAGES_CONFIG
          .MISSING_BARREL_EXPORT
      ).toContain('index.ts');
    });

    it('should have CREATE_BARREL_EXPORT with placeholder', () => {
      expect(
        NgRxFileOrganizationConfiguration.VALIDATION_MESSAGES_CONFIG
          .CREATE_BARREL_EXPORT
      ).toContain('{0}');
    });

    it('should have IMPROPER_FILE_NAMING with placeholders', () => {
      expect(
        NgRxFileOrganizationConfiguration.VALIDATION_MESSAGES_CONFIG
          .IMPROPER_FILE_NAMING
      ).toContain('{0}');
      expect(
        NgRxFileOrganizationConfiguration.VALIDATION_MESSAGES_CONFIG
          .IMPROPER_FILE_NAMING
      ).toContain('{1}');
    });

    it('should have MISSING_FEATURE_PREFIX with placeholders', () => {
      expect(
        NgRxFileOrganizationConfiguration.VALIDATION_MESSAGES_CONFIG
          .MISSING_FEATURE_PREFIX
      ).toContain('{0}');
      expect(
        NgRxFileOrganizationConfiguration.VALIDATION_MESSAGES_CONFIG
          .MISSING_FEATURE_PREFIX
      ).toContain('{1}');
    });

    it('should have CONSIDER_TEST_FILES with placeholder', () => {
      expect(
        NgRxFileOrganizationConfiguration.VALIDATION_MESSAGES_CONFIG
          .CONSIDER_TEST_FILES
      ).toContain('{0}');
    });

    it('should have MULTIPLE_ACTION_FILES with placeholder', () => {
      expect(
        NgRxFileOrganizationConfiguration.VALIDATION_MESSAGES_CONFIG
          .MULTIPLE_ACTION_FILES
      ).toContain('{0}');
    });

    it('should have MULTIPLE_REDUCER_FILES with placeholder', () => {
      expect(
        NgRxFileOrganizationConfiguration.VALIDATION_MESSAGES_CONFIG
          .MULTIPLE_REDUCER_FILES
      ).toContain('{0}');
    });

    it('should have MULTIPLE_SELECTOR_FILES with placeholder', () => {
      expect(
        NgRxFileOrganizationConfiguration.VALIDATION_MESSAGES_CONFIG
          .MULTIPLE_SELECTOR_FILES
      ).toContain('{0}');
    });
  });

  describe('getValidNgRxFileSuffixes', () => {
    it('should return valid NgRx suffixes', () => {
      const suffixes =
        NgRxFileOrganizationConfiguration.getValidNgRxFileSuffixes();

      expect(suffixes).toContain('.actions.ts');
      expect(suffixes).toContain('.reducer.ts');
      expect(suffixes).toContain('.selectors.ts');
    });
  });

  describe('getTestFileExtensions', () => {
    it('should return test file extensions', () => {
      const extensions =
        NgRxFileOrganizationConfiguration.getTestFileExtensions();

      expect(extensions).toContain('.spec.ts');
      expect(extensions).toContain('.test.ts');
    });
  });

  describe('getValidationMessages', () => {
    it('should return validation message functions', () => {
      const messages =
        NgRxFileOrganizationConfiguration.getValidationMessages();

      expect(typeof messages.MISSING_BARREL_EXPORT).toBe('function');
      expect(typeof messages.CREATE_BARREL_EXPORT).toBe('function');
      expect(typeof messages.IMPROPER_FILE_NAMING).toBe('function');
      expect(typeof messages.MISSING_FEATURE_PREFIX).toBe('function');
      expect(typeof messages.CONSIDER_TEST_FILES).toBe('function');
      expect(typeof messages.MULTIPLE_ACTION_FILES).toBe('function');
      expect(typeof messages.MULTIPLE_REDUCER_FILES).toBe('function');
      expect(typeof messages.MULTIPLE_SELECTOR_FILES).toBe('function');
    });

    it('should build MISSING_BARREL_EXPORT message', () => {
      const messages =
        NgRxFileOrganizationConfiguration.getValidationMessages();
      const result = messages.MISSING_BARREL_EXPORT('items');

      expect(result).toContain('items');
      expect(result).toContain('index.ts');
    });

    it('should build CREATE_BARREL_EXPORT message', () => {
      const messages =
        NgRxFileOrganizationConfiguration.getValidationMessages();
      const result = messages.CREATE_BARREL_EXPORT('items');

      expect(result).toContain('items');
      expect(result).toContain('index.ts');
    });

    it('should build IMPROPER_FILE_NAMING message', () => {
      const messages =
        NgRxFileOrganizationConfiguration.getValidationMessages();
      const result = messages.IMPROPER_FILE_NAMING('actions.ts', 'items');

      expect(result).toContain('actions.ts');
      expect(result).toContain('items');
    });

    it('should build MISSING_FEATURE_PREFIX message', () => {
      const messages =
        NgRxFileOrganizationConfiguration.getValidationMessages();
      const result = messages.MISSING_FEATURE_PREFIX('reducer.ts', 'items');

      expect(result).toContain('reducer.ts');
      expect(result).toContain('items');
    });

    it('should build CONSIDER_TEST_FILES message', () => {
      const messages =
        NgRxFileOrganizationConfiguration.getValidationMessages();
      const result = messages.CONSIDER_TEST_FILES('items');

      expect(result).toContain('items');
      expect(result).toContain('test');
    });

    it('should build MULTIPLE_ACTION_FILES message', () => {
      const messages =
        NgRxFileOrganizationConfiguration.getValidationMessages();
      const result = messages.MULTIPLE_ACTION_FILES('items');

      expect(result).toContain('items');
      expect(result).toContain('action');
    });

    it('should build MULTIPLE_REDUCER_FILES message', () => {
      const messages =
        NgRxFileOrganizationConfiguration.getValidationMessages();
      const result = messages.MULTIPLE_REDUCER_FILES('items');

      expect(result).toContain('items');
      expect(result).toContain('reducer');
    });

    it('should build MULTIPLE_SELECTOR_FILES message', () => {
      const messages =
        NgRxFileOrganizationConfiguration.getValidationMessages();
      const result = messages.MULTIPLE_SELECTOR_FILES('items');

      expect(result).toContain('items');
      expect(result).toContain('selector');
    });
  });

  describe('findStateDirectories', () => {
    it('should return empty array for non-existent project root', () => {
      const mockConfig = { excludePatterns: [] } as any;
      const nonExistentPath = PathOperations.join(tempDir, 'non-existent');
      const result = NgRxFileOrganizationConfiguration.findStateDirectories(
        nonExistentPath,
        mockConfig
      );

      expect(result).toEqual([]);
    });
  });
});

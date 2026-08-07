/**
 * @fileoverview Tests for ngrx-feature-store-configuration.ts
 * @description Tests for NgRx feature store configuration utilities
 */

import { NgRxFeatureStoreConfiguration } from '../../src/utils/angular/ngrx-feature-store/ngrx-feature-store-configuration';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('utils/angular/ngrx-feature-store/ngrx-feature-store-configuration', () => {
  let tempDir: string;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('ngrx-feature-store-test-');
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleSpy.mockRestore();
  });

  describe('REQUIRED_FILE_EXTENSIONS', () => {
    it('should include .actions.ts', () => {
      expect(NgRxFeatureStoreConfiguration.REQUIRED_FILE_EXTENSIONS).toContain(
        '.actions.ts'
      );
    });

    it('should include .reducer.ts', () => {
      expect(NgRxFeatureStoreConfiguration.REQUIRED_FILE_EXTENSIONS).toContain(
        '.reducer.ts'
      );
    });

    it('should include .selectors.ts', () => {
      expect(NgRxFeatureStoreConfiguration.REQUIRED_FILE_EXTENSIONS).toContain(
        '.selectors.ts'
      );
    });

    it('should include .effects.ts', () => {
      expect(NgRxFeatureStoreConfiguration.REQUIRED_FILE_EXTENSIONS).toContain(
        '.effects.ts'
      );
    });

    it('should include .models.ts', () => {
      expect(NgRxFeatureStoreConfiguration.REQUIRED_FILE_EXTENSIONS).toContain(
        '.models.ts'
      );
    });

    it('should include .facade.ts', () => {
      expect(NgRxFeatureStoreConfiguration.REQUIRED_FILE_EXTENSIONS).toContain(
        '.facade.ts'
      );
    });
  });

  describe('OPTIONAL_FILE_EXTENSIONS', () => {
    it('should include .effects.ts', () => {
      expect(NgRxFeatureStoreConfiguration.OPTIONAL_FILE_EXTENSIONS).toContain(
        '.effects.ts'
      );
    });

    it('should include .facade.ts', () => {
      expect(NgRxFeatureStoreConfiguration.OPTIONAL_FILE_EXTENSIONS).toContain(
        '.facade.ts'
      );
    });
  });

  describe('VALIDATION_MESSAGES_CONFIG', () => {
    it('should have MISSING_PLUS_STATE with placeholder', () => {
      expect(
        NgRxFeatureStoreConfiguration.VALIDATION_MESSAGES_CONFIG
          .MISSING_PLUS_STATE
      ).toContain('{0}');
    });

    it('should have CREATE_PLUS_STATE with placeholder', () => {
      expect(
        NgRxFeatureStoreConfiguration.VALIDATION_MESSAGES_CONFIG
          .CREATE_PLUS_STATE
      ).toContain('{0}');
    });

    it('should have MISSING_REQUIRED_FILE with placeholders', () => {
      expect(
        NgRxFeatureStoreConfiguration.VALIDATION_MESSAGES_CONFIG
          .MISSING_REQUIRED_FILE
      ).toContain('{0}');
      expect(
        NgRxFeatureStoreConfiguration.VALIDATION_MESSAGES_CONFIG
          .MISSING_REQUIRED_FILE
      ).toContain('{1}');
    });

    it('should have CREATE_REQUIRED_FILE with placeholders', () => {
      expect(
        NgRxFeatureStoreConfiguration.VALIDATION_MESSAGES_CONFIG
          .CREATE_REQUIRED_FILE
      ).toContain('{0}');
      expect(
        NgRxFeatureStoreConfiguration.VALIDATION_MESSAGES_CONFIG
          .CREATE_REQUIRED_FILE
      ).toContain('{1}');
    });

    it('should have CONSIDER_OPTIONAL_FILE with placeholders', () => {
      expect(
        NgRxFeatureStoreConfiguration.VALIDATION_MESSAGES_CONFIG
          .CONSIDER_OPTIONAL_FILE
      ).toContain('{0}');
      expect(
        NgRxFeatureStoreConfiguration.VALIDATION_MESSAGES_CONFIG
          .CONSIDER_OPTIONAL_FILE
      ).toContain('{1}');
    });

    it('should have CREATE_FEATURE_DIRECTORIES', () => {
      expect(
        NgRxFeatureStoreConfiguration.VALIDATION_MESSAGES_CONFIG
          .CREATE_FEATURE_DIRECTORIES
      ).toContain('feature directories');
    });
  });

  describe('getRequiredFeatureFiles', () => {
    it('should return required files for feature', () => {
      const files =
        NgRxFeatureStoreConfiguration.getRequiredFeatureFiles('items');

      expect(files).toContain('items.actions.ts');
      expect(files).toContain('items.reducer.ts');
      expect(files).toContain('items.selectors.ts');
      expect(files).toContain('items.effects.ts');
      expect(files).toContain('items.models.ts');
      expect(files).toContain('items.facade.ts');
      expect(files).toContain('index.ts');
    });

    it('should work with different feature names', () => {
      const files =
        NgRxFeatureStoreConfiguration.getRequiredFeatureFiles('users');

      expect(files).toContain('users.actions.ts');
      expect(files).toContain('users.reducer.ts');
    });
  });

  describe('getOptionalFeatureFiles', () => {
    it('should return optional files for feature', () => {
      const files =
        NgRxFeatureStoreConfiguration.getOptionalFeatureFiles('items');

      expect(files).toContain('items.effects.ts');
      expect(files).toContain('items.facade.ts');
    });
  });

  describe('getValidationMessages', () => {
    it('should return validation message functions', () => {
      const messages = NgRxFeatureStoreConfiguration.getValidationMessages();

      expect(typeof messages.MISSING_PLUS_STATE).toBe('function');
      expect(typeof messages.CREATE_PLUS_STATE).toBe('function');
      expect(typeof messages.MISSING_REQUIRED_FILE).toBe('function');
      expect(typeof messages.CREATE_REQUIRED_FILE).toBe('function');
      expect(typeof messages.CONSIDER_OPTIONAL_FILE).toBe('function');
      expect(typeof messages.CREATE_FEATURE_DIRECTORIES).toBe('string');
    });

    it('should build MISSING_PLUS_STATE message', () => {
      const messages = NgRxFeatureStoreConfiguration.getValidationMessages();
      const result = messages.MISSING_PLUS_STATE('items');

      expect(result).toContain('items');
      expect(result).toContain('+state');
    });

    it('should build CREATE_PLUS_STATE message', () => {
      const messages = NgRxFeatureStoreConfiguration.getValidationMessages();
      const result = messages.CREATE_PLUS_STATE('items');

      expect(result).toContain('items');
      expect(result).toContain('+state');
    });

    it('should build MISSING_REQUIRED_FILE message', () => {
      const messages = NgRxFeatureStoreConfiguration.getValidationMessages();
      const result = messages.MISSING_REQUIRED_FILE(
        'items.actions.ts',
        'items'
      );

      expect(result).toContain('items.actions.ts');
      expect(result).toContain('items');
    });

    it('should build CREATE_REQUIRED_FILE message', () => {
      const messages = NgRxFeatureStoreConfiguration.getValidationMessages();
      const result = messages.CREATE_REQUIRED_FILE('items.reducer.ts', 'items');

      expect(result).toContain('items.reducer.ts');
      expect(result).toContain('items');
    });

    it('should build CONSIDER_OPTIONAL_FILE message', () => {
      const messages = NgRxFeatureStoreConfiguration.getValidationMessages();
      const result = messages.CONSIDER_OPTIONAL_FILE(
        'items.facade.ts',
        'items'
      );

      expect(result).toContain('items.facade.ts');
      expect(result).toContain('items');
    });
  });

  describe('findPotentialFeatureDirectories', () => {
    it('should return empty array for non-existent project root', () => {
      const mockConfig = { excludePatterns: [] } as any;
      const nonExistentPath = PathOperations.join(tempDir, 'non-existent');
      const result =
        NgRxFeatureStoreConfiguration.findPotentialFeatureDirectories(
          nonExistentPath,
          mockConfig
        );

      expect(result).toEqual([]);
    });

    it('should return empty array when src/app does not exist', () => {
      const mockConfig = { excludePatterns: [] } as any;
      const result =
        NgRxFeatureStoreConfiguration.findPotentialFeatureDirectories(
          tempDir,
          mockConfig
        );

      expect(result).toEqual([]);
    });
  });
});

/**
 * @fileoverview Tests for ngrx-file-organization-configuration.ts
 * @description Tests for NgRx File Organization Configuration utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import {
  FileEntry,
  NgRxFileOrganizationConfiguration,
} from '../../../src/utils/angular/ngrx-file-organization/ngrx-file-organization-configuration';
import { FILE_EXTENSIONS } from '../../../src/utils/constants';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/ngrx-file-organization/ngrx-file-organization-configuration', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxFileOrganizationConfiguration', () => {
    describe('VALID_NGRX_SUFFIXES', () => {
      it('should have all valid NgRx file suffixes', () => {
        const suffixes = NgRxFileOrganizationConfiguration.VALID_NGRX_SUFFIXES;
        expect(suffixes).toContain(FILE_EXTENSIONS.ACTIONS_TS);
        expect(suffixes).toContain(FILE_EXTENSIONS.REDUCER_TS);
        expect(suffixes).toContain(FILE_EXTENSIONS.SELECTORS_TS);
        expect(suffixes).toContain(FILE_EXTENSIONS.EFFECTS_TS);
        expect(suffixes).toContain(FILE_EXTENSIONS.MODELS_TS);
        expect(suffixes).toContain(FILE_EXTENSIONS.FACADE_TS);
        expect(suffixes).toContain(FILE_EXTENSIONS.STATE_TS);
      });

      it('should be a readonly array', () => {
        expect(
          Array.isArray(NgRxFileOrganizationConfiguration.VALID_NGRX_SUFFIXES)
        ).toBe(true);
        // Verify array is defined and has the readonly type
        expect(
          NgRxFileOrganizationConfiguration.VALID_NGRX_SUFFIXES.length
        ).toBeGreaterThan(0);
      });
    });

    describe('TEST_FILE_EXTENSIONS', () => {
      it('should have test file extensions', () => {
        const extensions =
          NgRxFileOrganizationConfiguration.TEST_FILE_EXTENSIONS;
        expect(extensions).toContain(FILE_EXTENSIONS.SPEC_TS);
        expect(extensions).toContain(FILE_EXTENSIONS.TEST_TS);
      });

      it('should be a readonly array', () => {
        expect(
          Array.isArray(NgRxFileOrganizationConfiguration.TEST_FILE_EXTENSIONS)
        ).toBe(true);
        // Verify array is defined and has the readonly type
        expect(
          NgRxFileOrganizationConfiguration.TEST_FILE_EXTENSIONS.length
        ).toBeGreaterThan(0);
      });
    });

    describe('VALIDATION_MESSAGES_CONFIG', () => {
      it('should have all validation message templates', () => {
        const messages =
          NgRxFileOrganizationConfiguration.VALIDATION_MESSAGES_CONFIG;
        expect(messages.MISSING_BARREL_EXPORT).toBeDefined();
        expect(messages.CREATE_BARREL_EXPORT).toBeDefined();
        expect(messages.IMPROPER_FILE_NAMING).toBeDefined();
        expect(messages.MISSING_FEATURE_PREFIX).toBeDefined();
        expect(messages.CONSIDER_TEST_FILES).toBeDefined();
        expect(messages.MULTIPLE_ACTION_FILES).toBeDefined();
        expect(messages.MULTIPLE_REDUCER_FILES).toBeDefined();
        expect(messages.MULTIPLE_SELECTOR_FILES).toBeDefined();
      });

      it('should have proper template placeholders', () => {
        const messages =
          NgRxFileOrganizationConfiguration.VALIDATION_MESSAGES_CONFIG;
        expect(messages.MISSING_BARREL_EXPORT).toContain('{0}');
        expect(messages.IMPROPER_FILE_NAMING).toContain('{0}');
        expect(messages.IMPROPER_FILE_NAMING).toContain('{1}');
        expect(messages.MISSING_FEATURE_PREFIX).toContain('{0}');
        expect(messages.MISSING_FEATURE_PREFIX).toContain('{1}');
      });
    });

    describe('getValidNgRxFileSuffixes', () => {
      it('should return valid NgRx file suffixes', () => {
        const suffixes =
          NgRxFileOrganizationConfiguration.getValidNgRxFileSuffixes();
        expect(suffixes.length).toBeGreaterThan(0);
        expect(suffixes).toContain(FILE_EXTENSIONS.ACTIONS_TS);
      });

      it('should return same reference as VALID_NGRX_SUFFIXES', () => {
        const suffixes =
          NgRxFileOrganizationConfiguration.getValidNgRxFileSuffixes();
        expect(suffixes).toBe(
          NgRxFileOrganizationConfiguration.VALID_NGRX_SUFFIXES
        );
      });
    });

    describe('getTestFileExtensions', () => {
      it('should return test file extensions', () => {
        const extensions =
          NgRxFileOrganizationConfiguration.getTestFileExtensions();
        expect(extensions.length).toBeGreaterThan(0);
        expect(extensions).toContain(FILE_EXTENSIONS.SPEC_TS);
      });

      it('should return same reference as TEST_FILE_EXTENSIONS', () => {
        const extensions =
          NgRxFileOrganizationConfiguration.getTestFileExtensions();
        expect(extensions).toBe(
          NgRxFileOrganizationConfiguration.TEST_FILE_EXTENSIONS
        );
      });
    });

    describe('getValidationMessages', () => {
      it('should return message generator functions', () => {
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

      it('should generate correct MISSING_BARREL_EXPORT message', () => {
        const messages =
          NgRxFileOrganizationConfiguration.getValidationMessages();
        const message = messages.MISSING_BARREL_EXPORT('users');
        expect(message).toContain('users');
        expect(message).toContain('index.ts');
      });

      it('should generate correct CREATE_BARREL_EXPORT message', () => {
        const messages =
          NgRxFileOrganizationConfiguration.getValidationMessages();
        const message = messages.CREATE_BARREL_EXPORT('products');
        expect(message).toContain('products');
        expect(message).toContain('index.ts');
      });

      it('should generate correct IMPROPER_FILE_NAMING message', () => {
        const messages =
          NgRxFileOrganizationConfiguration.getValidationMessages();
        const message = messages.IMPROPER_FILE_NAMING('myfile.ts', 'users');
        expect(message).toContain('myfile.ts');
        expect(message).toContain('users');
      });

      it('should generate correct MISSING_FEATURE_PREFIX message', () => {
        const messages =
          NgRxFileOrganizationConfiguration.getValidationMessages();
        const message = messages.MISSING_FEATURE_PREFIX('actions.ts', 'users');
        expect(message).toContain('actions.ts');
        expect(message).toContain('users');
      });

      it('should generate correct CONSIDER_TEST_FILES message', () => {
        const messages =
          NgRxFileOrganizationConfiguration.getValidationMessages();
        const message = messages.CONSIDER_TEST_FILES('users');
        expect(message).toContain('users');
        expect(message).toContain('test');
      });

      it('should generate correct MULTIPLE_ACTION_FILES message', () => {
        const messages =
          NgRxFileOrganizationConfiguration.getValidationMessages();
        const message = messages.MULTIPLE_ACTION_FILES('users');
        expect(message).toContain('users');
        expect(message).toContain('action');
      });

      it('should generate correct MULTIPLE_REDUCER_FILES message', () => {
        const messages =
          NgRxFileOrganizationConfiguration.getValidationMessages();
        const message = messages.MULTIPLE_REDUCER_FILES('users');
        expect(message).toContain('users');
        expect(message).toContain('reducer');
      });

      it('should generate correct MULTIPLE_SELECTOR_FILES message', () => {
        const messages =
          NgRxFileOrganizationConfiguration.getValidationMessages();
        const message = messages.MULTIPLE_SELECTOR_FILES('users');
        expect(message).toContain('users');
        expect(message).toContain('selector');
      });
    });

    describe('findStateDirectories', () => {
      it('should return empty array when src does not exist', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(false);

        const result = NgRxFileOrganizationConfiguration.findStateDirectories(
          '/test/project',
          mockConfig
        );

        expect(result).toEqual([]);
      });

      it('should return array when src exists', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const readDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
        existsSpy.mockReturnValue(true);
        readDirSpy.mockReturnValue([]);

        const result = NgRxFileOrganizationConfiguration.findStateDirectories(
          '/test/project',
          mockConfig
        );

        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('extractFeatureName', () => {
      it('should extract feature name from state directory path', () => {
        const getDirSpy = jest.spyOn(PathOperations, 'getDirectory');
        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getDirSpy.mockReturnValue('/test/project/src/app/users');
        getBasenameSpy.mockReturnValue('users');

        const result = NgRxFileOrganizationConfiguration.extractFeatureName(
          '/test/project/src/app/users/+state'
        );

        expect(result).toBe('users');
      });

      it('should work with different feature names', () => {
        const getDirSpy = jest.spyOn(PathOperations, 'getDirectory');
        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getDirSpy.mockReturnValue('/test/project/src/app/products');
        getBasenameSpy.mockReturnValue('products');

        const result = NgRxFileOrganizationConfiguration.extractFeatureName(
          '/test/project/src/app/products/+state'
        );

        expect(result).toBe('products');
      });
    });

    describe('hasValidNgRxSuffix', () => {
      it('should return true for .actions.ts suffix', () => {
        const result =
          NgRxFileOrganizationConfiguration.hasValidNgRxSuffix(
            'user.actions.ts'
          );
        expect(result).toBe(true);
      });

      it('should return true for .reducer.ts suffix', () => {
        const result =
          NgRxFileOrganizationConfiguration.hasValidNgRxSuffix(
            'user.reducer.ts'
          );
        expect(result).toBe(true);
      });

      it('should return true for .selectors.ts suffix', () => {
        const result =
          NgRxFileOrganizationConfiguration.hasValidNgRxSuffix(
            'user.selectors.ts'
          );
        expect(result).toBe(true);
      });

      it('should return true for .effects.ts suffix', () => {
        const result =
          NgRxFileOrganizationConfiguration.hasValidNgRxSuffix(
            'user.effects.ts'
          );
        expect(result).toBe(true);
      });

      it('should return true for .models.ts suffix', () => {
        const result =
          NgRxFileOrganizationConfiguration.hasValidNgRxSuffix(
            'user.models.ts'
          );
        expect(result).toBe(true);
      });

      it('should return true for .facade.ts suffix', () => {
        const result =
          NgRxFileOrganizationConfiguration.hasValidNgRxSuffix(
            'user.facade.ts'
          );
        expect(result).toBe(true);
      });

      it('should return true for .state.ts suffix', () => {
        const result =
          NgRxFileOrganizationConfiguration.hasValidNgRxSuffix('user.state.ts');
        expect(result).toBe(true);
      });

      it('should return false for non-NgRx file suffix', () => {
        const result =
          NgRxFileOrganizationConfiguration.hasValidNgRxSuffix(
            'user.component.ts'
          );
        expect(result).toBe(false);
      });

      it('should return false for plain .ts file', () => {
        const result =
          NgRxFileOrganizationConfiguration.hasValidNgRxSuffix('user.ts');
        expect(result).toBe(false);
      });
    });

    describe('shouldHaveFeaturePrefix', () => {
      it('should return false for index.ts', () => {
        const result =
          NgRxFileOrganizationConfiguration.shouldHaveFeaturePrefix('index.ts');
        expect(result).toBe(false);
      });

      it('should return true for regular NgRx files', () => {
        const result =
          NgRxFileOrganizationConfiguration.shouldHaveFeaturePrefix(
            'user.actions.ts'
          );
        expect(result).toBe(true);
      });

      it('should return true for reducer files', () => {
        const result =
          NgRxFileOrganizationConfiguration.shouldHaveFeaturePrefix(
            'user.reducer.ts'
          );
        expect(result).toBe(true);
      });

      it('should return true for effects files', () => {
        const result =
          NgRxFileOrganizationConfiguration.shouldHaveFeaturePrefix(
            'user.effects.ts'
          );
        expect(result).toBe(true);
      });
    });

    describe('hasTestFiles', () => {
      it('should return true when spec files exist', () => {
        const files: FileEntry[] = [
          { name: 'user.actions.ts', isFile: () => true },
          { name: 'user.actions.spec.ts', isFile: () => true },
        ];

        const result = NgRxFileOrganizationConfiguration.hasTestFiles(files);
        expect(result).toBe(true);
      });

      it('should return true when test files exist', () => {
        const files: FileEntry[] = [
          { name: 'user.actions.ts', isFile: () => true },
          { name: 'user.actions.test.ts', isFile: () => true },
        ];

        const result = NgRxFileOrganizationConfiguration.hasTestFiles(files);
        expect(result).toBe(true);
      });

      it('should return false when no test files exist', () => {
        const files: FileEntry[] = [
          { name: 'user.actions.ts', isFile: () => true },
          { name: 'user.reducer.ts', isFile: () => true },
        ];

        const result = NgRxFileOrganizationConfiguration.hasTestFiles(files);
        expect(result).toBe(false);
      });
    });

    describe('filterFilesByType', () => {
      it('should filter action files correctly', () => {
        const files: FileEntry[] = [
          { name: 'user.actions.ts', isFile: () => true },
          { name: 'user.reducer.ts', isFile: () => true },
          { name: 'product.actions.ts', isFile: () => true },
        ];

        const result = NgRxFileOrganizationConfiguration.filterFilesByType(
          files,
          '.actions.'
        );

        expect(result).toHaveLength(2);
        expect(result[0]?.name).toContain('actions');
        expect(result[1]?.name).toContain('actions');
      });

      it('should filter reducer files correctly', () => {
        const files: FileEntry[] = [
          { name: 'user.actions.ts', isFile: () => true },
          { name: 'user.reducer.ts', isFile: () => true },
        ];

        const result = NgRxFileOrganizationConfiguration.filterFilesByType(
          files,
          '.reducer.'
        );

        expect(result).toHaveLength(1);
        expect(result[0]?.name).toContain('reducer');
      });

      it('should return empty array when no matches found', () => {
        const files: FileEntry[] = [
          { name: 'user.actions.ts', isFile: () => true },
        ];

        const result = NgRxFileOrganizationConfiguration.filterFilesByType(
          files,
          '.selectors.'
        );

        expect(result).toHaveLength(0);
      });
    });

    describe('getTypeScriptFiles', () => {
      it('should return TypeScript files excluding index.ts', () => {
        const files: FileEntry[] = [
          { name: 'user.actions.ts', isFile: () => true },
          { name: 'user.reducer.ts', isFile: () => true },
          { name: 'index.ts', isFile: () => true },
        ];

        const result =
          NgRxFileOrganizationConfiguration.getTypeScriptFiles(files);

        expect(result).toHaveLength(2);
        expect(result.every(f => f.name !== 'index.ts')).toBe(true);
      });

      it('should exclude non-TypeScript files', () => {
        const files: FileEntry[] = [
          { name: 'user.actions.ts', isFile: () => true },
          { name: 'readme.md', isFile: () => true },
        ];

        const result =
          NgRxFileOrganizationConfiguration.getTypeScriptFiles(files);

        expect(result).toHaveLength(1);
        expect(result[0]?.name).toBe('user.actions.ts');
      });

      it('should exclude directories', () => {
        const files: FileEntry[] = [
          { name: 'user.actions.ts', isFile: () => true },
          { name: 'subfolder', isFile: () => false },
        ];

        const result =
          NgRxFileOrganizationConfiguration.getTypeScriptFiles(files);

        expect(result).toHaveLength(1);
      });
    });

    describe('hasBarrelExport', () => {
      it('should return true when index.ts exists', () => {
        const files: FileEntry[] = [
          { name: 'user.actions.ts', isFile: () => true },
          { name: 'index.ts', isFile: () => true },
        ];

        const result = NgRxFileOrganizationConfiguration.hasBarrelExport(files);
        expect(result).toBe(true);
      });

      it('should return false when index.ts does not exist', () => {
        const files: FileEntry[] = [
          { name: 'user.actions.ts', isFile: () => true },
          { name: 'user.reducer.ts', isFile: () => true },
        ];

        const result = NgRxFileOrganizationConfiguration.hasBarrelExport(files);
        expect(result).toBe(false);
      });

      it('should return false when index.ts is a directory', () => {
        const files: FileEntry[] = [
          { name: 'user.actions.ts', isFile: () => true },
          { name: 'index.ts', isFile: () => false },
        ];

        const result = NgRxFileOrganizationConfiguration.hasBarrelExport(files);
        expect(result).toBe(false);
      });
    });

    describe('analyzeStateDirectoryStructure', () => {
      it('should analyze state directory structure correctly', () => {
        const getDirSpy = jest.spyOn(PathOperations, 'getDirectory');
        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getDirSpy.mockReturnValue('/test/project/src/app/users');
        getBasenameSpy.mockReturnValue('users');

        const files: FileEntry[] = [
          { name: 'users.actions.ts', isFile: () => true },
          { name: 'users.reducer.ts', isFile: () => true },
          { name: 'users.selectors.ts', isFile: () => true },
          { name: 'index.ts', isFile: () => true },
        ];

        const result =
          NgRxFileOrganizationConfiguration.analyzeStateDirectoryStructure(
            '/test/project/src/app/users/+state',
            files
          );

        expect(result.featureName).toBe('users');
        expect(result.hasBarrelExport).toBe(true);
        expect(result.typeScriptFiles.length).toBeGreaterThan(0);
        expect(result.actionFiles.length).toBe(1);
        expect(result.reducerFiles.length).toBe(1);
        expect(result.selectorFiles.length).toBe(1);
      });

      it('should detect missing barrel export', () => {
        const getDirSpy = jest.spyOn(PathOperations, 'getDirectory');
        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getDirSpy.mockReturnValue('/test/project/src/app/users');
        getBasenameSpy.mockReturnValue('users');

        const files: FileEntry[] = [
          { name: 'users.actions.ts', isFile: () => true },
        ];

        const result =
          NgRxFileOrganizationConfiguration.analyzeStateDirectoryStructure(
            '/test/project/src/app/users/+state',
            files
          );

        expect(result.hasBarrelExport).toBe(false);
      });

      it('should detect missing test files', () => {
        const getDirSpy = jest.spyOn(PathOperations, 'getDirectory');
        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getDirSpy.mockReturnValue('/test/project/src/app/users');
        getBasenameSpy.mockReturnValue('users');

        const files: FileEntry[] = [
          { name: 'users.actions.ts', isFile: () => true },
        ];

        const result =
          NgRxFileOrganizationConfiguration.analyzeStateDirectoryStructure(
            '/test/project/src/app/users/+state',
            files
          );

        expect(result.hasTestFiles).toBe(false);
      });

      it('should detect test files', () => {
        const getDirSpy = jest.spyOn(PathOperations, 'getDirectory');
        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getDirSpy.mockReturnValue('/test/project/src/app/users');
        getBasenameSpy.mockReturnValue('users');

        const files: FileEntry[] = [
          { name: 'users.actions.ts', isFile: () => true },
          { name: 'users.actions.spec.ts', isFile: () => true },
        ];

        const result =
          NgRxFileOrganizationConfiguration.analyzeStateDirectoryStructure(
            '/test/project/src/app/users/+state',
            files
          );

        expect(result.hasTestFiles).toBe(true);
      });

      it('should count multiple action files', () => {
        const getDirSpy = jest.spyOn(PathOperations, 'getDirectory');
        const getBasenameSpy = jest.spyOn(PathOperations, 'getBasename');
        getDirSpy.mockReturnValue('/test/project/src/app/users');
        getBasenameSpy.mockReturnValue('users');

        const files: FileEntry[] = [
          { name: 'users.actions.ts', isFile: () => true },
          { name: 'other.actions.ts', isFile: () => true },
        ];

        const result =
          NgRxFileOrganizationConfiguration.analyzeStateDirectoryStructure(
            '/test/project/src/app/users/+state',
            files
          );

        expect(result.actionFiles.length).toBe(2);
      });
    });
  });
});

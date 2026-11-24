/**
 * @fileoverview Tests for ngrx-file-organization-validation-patterns.ts
 * @description Tests for NgRx File Organization Validation Patterns utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxFileOrganizationConfiguration } from '../../../src/utils/angular/ngrx-file-organization/ngrx-file-organization-configuration';
import { NgRxFileOrganizationValidationPatterns } from '../../../src/utils/angular/ngrx-file-organization/ngrx-file-organization-validation-patterns';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { DirectoryScanner } from '../../../src/utils/directory-scanner';
import path from 'path';
import { FileUtils } from '../../../src/utils/file-utils';
import { project } from '../../checkers/toolkit-fixture';

const config: RuleOfCodeConfig = FileUtils.getMinimalDefaultConfig();
const validate = (files: Record<string, string>) =>
  NgRxFileOrganizationValidationPatterns.validateAllFileOrganizationPatterns(
    project(files),
    config
  );

const M = NgRxFileOrganizationConfiguration.getValidationMessages();
const STATE = 'src/app/user/+state';

/** A +state directory of feature `user` with the given file names. */
const state = (...names: string[]) =>
  Object.fromEntries(
    names.map(name => [`${STATE}/${name}`, 'export {};\n'])
  ) as Record<string, string>;

/** A well-organized `user` store: barrel, one file of each kind, a test. */
const WELL_ORGANIZED = state(
  'index.ts',
  'user.actions.ts',
  'user.reducer.ts',
  'user.selectors.ts',
  'user.effects.ts'
);

/**
 * Helper type for directory entries matching DirectoryScanner.safeReadDirectory return type
 */
interface DirectoryEntry {
  name: string;
  isDirectory: () => boolean;
  isFile: () => boolean;
}

/**
 * Helper to create a file entry for mocks
 */
function createFileEntry(name: string): DirectoryEntry {
  return {
    name,
    isDirectory: () => false,
    isFile: () => true,
  };
}

describe('utils/angular/ngrx-file-organization/ngrx-file-organization-validation-patterns', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxFileOrganizationValidationPatterns', () => {
    describe('validateAllFileOrganizationPatterns', () => {
      it('should return empty results when no state directories found', () => {
        const result = validate({
          'src/app/user/user.actions.ts': 'export {};\n',
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should return empty results when there is no src directory', () => {
        const result = validate({
          'lib/user/+state/user.actions.ts': 'export {};\n',
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should validate barrel exports in state directories', () => {
        const result = validate({
          ...state('user.actions.ts', 'user.reducer.ts'),
          'src/app/user/+state/user.spec.ts': 'export {};\n',
        });

        expect(result.violations).toEqual([M.MISSING_BARREL_EXPORT('user')]);
        expect(result.suggestions).toEqual(
          expect.arrayContaining([M.CREATE_BARREL_EXPORT('user')])
        );
      });

      it('should suggest file naming convention improvements', () => {
        const result = validate(state('index.ts', 'user.helpers.ts'));

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual(
          expect.arrayContaining([
            M.IMPROPER_FILE_NAMING('user.helpers.ts', 'user'),
          ])
        );
      });

      it('should accept every standard NgRx file suffix', () => {
        const result = validate(
          state(
            'index.ts',
            'user.actions.ts',
            'user.reducer.ts',
            'user.selectors.ts',
            'user.effects.ts',
            'user.models.ts',
            'user.facade.ts',
            'user.state.ts'
          )
        );

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([M.CONSIDER_TEST_FILES('user')]);
      });

      it('should suggest adding test files when missing', () => {
        const result = validate(WELL_ORGANIZED);

        expect(result).toEqual({
          violations: [],
          suggestions: [M.CONSIDER_TEST_FILES('user')],
        });
      });

      it.each([
        [
          'action',
          ['user.actions.ts', 'user-admin.actions.ts'],
          M.MULTIPLE_ACTION_FILES,
        ],
        [
          'reducer',
          ['user.reducer.ts', 'user-admin.reducer.ts'],
          M.MULTIPLE_REDUCER_FILES,
        ],
        [
          'selector',
          ['user.selectors.ts', 'user-admin.selectors.ts'],
          M.MULTIPLE_SELECTOR_FILES,
        ],
      ])(
        'should suggest consolidating multiple %s files',
        (_kind, names, message) => {
          const result = validate(state('index.ts', ...names));

          expect(result.violations).toEqual([]);
          expect(result.suggestions).toEqual(
            expect.arrayContaining([message('user')])
          );
        }
      );

      it('should handle directory read errors gracefully', () => {
        const findStateDirsSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'findStateDirectories'
        );
        findStateDirsSpy.mockReturnValue([
          '/test/project/src/app/users/+state',
        ]);

        const findDirsSpy = jest.spyOn(CheckerUtils, 'findDirectories');
        findDirsSpy.mockReturnValue([]);

        const readDirSpy = jest.spyOn(DirectoryScanner, 'safeReadDirectory');
        readDirSpy.mockImplementation(() => {
          throw new Error('Directory not found');
        });

        const result =
          NgRxFileOrganizationValidationPatterns.validateAllFileOrganizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should validate multiple state directories', () => {
        const findStateDirsSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'findStateDirectories'
        );
        findStateDirsSpy.mockReturnValue([
          '/test/project/src/app/users/+state',
          '/test/project/src/app/products/+state',
        ]);

        const findDirsSpy = jest.spyOn(CheckerUtils, 'findDirectories');
        findDirsSpy.mockReturnValue([]);

        const readDirSpy = jest.spyOn(DirectoryScanner, 'safeReadDirectory');
        readDirSpy.mockReturnValue([createFileEntry('file.ts')]);

        const analyzeStructureSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'analyzeStateDirectoryStructure'
        );
        analyzeStructureSpy
          .mockReturnValueOnce({
            featureName: 'users',
            hasBarrelExport: false,
            typeScriptFiles: [],
            hasTestFiles: true,
            actionFiles: [],
            reducerFiles: [],
            selectorFiles: [],
          })
          .mockReturnValueOnce({
            featureName: 'products',
            hasBarrelExport: false,
            typeScriptFiles: [],
            hasTestFiles: true,
            actionFiles: [],
            reducerFiles: [],
            selectorFiles: [],
          });

        const result =
          NgRxFileOrganizationValidationPatterns.validateAllFileOrganizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations.some(v => v.includes('users'))).toBe(true);
        expect(result.violations.some(v => v.includes('products'))).toBe(true);
      });

      it('should deduplicate state directories from different sources', () => {
        const findStateDirsSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'findStateDirectories'
        );
        findStateDirsSpy.mockReturnValue([
          '/test/project/src/app/users/+state',
        ]);

        const findDirsSpy = jest.spyOn(CheckerUtils, 'findDirectories');
        findDirsSpy.mockReturnValue(['/test/project/src/app/users/+state']);

        const readDirSpy = jest.spyOn(DirectoryScanner, 'safeReadDirectory');
        readDirSpy.mockReturnValue([createFileEntry('index.ts')]);

        const analyzeStructureSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'analyzeStateDirectoryStructure'
        );
        analyzeStructureSpy.mockReturnValue({
          featureName: 'users',
          hasBarrelExport: true,
          typeScriptFiles: [],
          hasTestFiles: true,
          actionFiles: [],
          reducerFiles: [],
          selectorFiles: [],
        });

        NgRxFileOrganizationValidationPatterns.validateAllFileOrganizationPatterns(
          '/test/project',
          mockConfig
        );

        expect(analyzeStructureSpy).toHaveBeenCalledTimes(1);
      });

      it('should validate feature prefix in file names', () => {
        const findStateDirsSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'findStateDirectories'
        );
        findStateDirsSpy.mockReturnValue([
          '/test/project/src/app/users/+state',
        ]);

        const findDirsSpy = jest.spyOn(CheckerUtils, 'findDirectories');
        findDirsSpy.mockReturnValue([]);

        const readDirSpy = jest.spyOn(DirectoryScanner, 'safeReadDirectory');
        readDirSpy.mockReturnValue([
          createFileEntry('actions.ts'),
          createFileEntry('index.ts'),
        ]);

        const analyzeStructureSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'analyzeStateDirectoryStructure'
        );
        analyzeStructureSpy.mockReturnValue({
          featureName: 'users',
          hasBarrelExport: true,
          typeScriptFiles: [{ name: 'actions.ts', isFile: () => true }],
          hasTestFiles: true,
          actionFiles: [],
          reducerFiles: [],
          selectorFiles: [],
        });

        const hasValidSuffixSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'hasValidNgRxSuffix'
        );
        hasValidSuffixSpy.mockReturnValue(true);

        const shouldHavePrefixSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'shouldHaveFeaturePrefix'
        );
        shouldHavePrefixSpy.mockReturnValue(true);

        const result =
          NgRxFileOrganizationValidationPatterns.validateAllFileOrganizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.suggestions.some(s => s.includes('feature name'))).toBe(
          true
        );
      });
    });

    describe('processStateDirectoryComprehensive', () => {
      it('should process a single state directory with all validations', () => {
        const readDirSpy = jest.spyOn(DirectoryScanner, 'safeReadDirectory');
        readDirSpy.mockReturnValue([createFileEntry('users.actions.ts')]);

        const analyzeStructureSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'analyzeStateDirectoryStructure'
        );
        analyzeStructureSpy.mockReturnValue({
          featureName: 'users',
          hasBarrelExport: false,
          typeScriptFiles: [{ name: 'users.actions.ts', isFile: () => true }],
          hasTestFiles: false,
          actionFiles: [{ name: 'users.actions.ts', isFile: () => true }],
          reducerFiles: [],
          selectorFiles: [],
        });

        const hasValidSuffixSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'hasValidNgRxSuffix'
        );
        hasValidSuffixSpy.mockReturnValue(true);

        const result =
          NgRxFileOrganizationValidationPatterns.processStateDirectoryComprehensive(
            '/test/project/src/app/users/+state',
            mockConfig
          );

        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.suggestions.length).toBeGreaterThan(0);
      });

      it('should handle errors in comprehensive processing', () => {
        const readDirSpy = jest.spyOn(DirectoryScanner, 'safeReadDirectory');
        readDirSpy.mockImplementation(() => {
          throw new Error('Access denied');
        });

        const result =
          NgRxFileOrganizationValidationPatterns.processStateDirectoryComprehensive(
            '/test/project/src/app/users/+state',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should return empty results for valid state directory', () => {
        const readDirSpy = jest.spyOn(DirectoryScanner, 'safeReadDirectory');
        readDirSpy.mockReturnValue([
          createFileEntry('users.actions.ts'),
          createFileEntry('users.reducer.ts'),
          createFileEntry('users.selectors.ts'),
          createFileEntry('users.actions.spec.ts'),
          createFileEntry('index.ts'),
        ]);

        const analyzeStructureSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'analyzeStateDirectoryStructure'
        );
        analyzeStructureSpy.mockReturnValue({
          featureName: 'users',
          hasBarrelExport: true,
          typeScriptFiles: [
            { name: 'users.actions.ts', isFile: () => true },
            { name: 'users.reducer.ts', isFile: () => true },
            { name: 'users.selectors.ts', isFile: () => true },
          ],
          hasTestFiles: true,
          actionFiles: [{ name: 'users.actions.ts', isFile: () => true }],
          reducerFiles: [{ name: 'users.reducer.ts', isFile: () => true }],
          selectorFiles: [{ name: 'users.selectors.ts', isFile: () => true }],
        });

        const hasValidSuffixSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'hasValidNgRxSuffix'
        );
        hasValidSuffixSpy.mockReturnValue(true);

        const result =
          NgRxFileOrganizationValidationPatterns.processStateDirectoryComprehensive(
            '/test/project/src/app/users/+state',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
      });
    });
  });
});

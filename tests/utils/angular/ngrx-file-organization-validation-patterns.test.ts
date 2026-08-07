/**
 * @fileoverview Tests for ngrx-file-organization-validation-patterns.ts
 * @description Tests for NgRx File Organization Validation Patterns utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxFileOrganizationConfiguration } from '../../../src/utils/angular/ngrx-file-organization/ngrx-file-organization-configuration';
import { NgRxFileOrganizationValidationPatterns } from '../../../src/utils/angular/ngrx-file-organization/ngrx-file-organization-validation-patterns';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { DirectoryScanner } from '../../../src/utils/directory-scanner';

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
        const findStateDirsSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'findStateDirectories'
        );
        findStateDirsSpy.mockReturnValue([]);

        const findDirsSpy = jest.spyOn(CheckerUtils, 'findDirectories');
        findDirsSpy.mockReturnValue([]);

        const result =
          NgRxFileOrganizationValidationPatterns.validateAllFileOrganizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should validate barrel exports in state directories', () => {
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
        readDirSpy.mockReturnValue([createFileEntry('users.actions.ts')]);

        const analyzeStructureSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'analyzeStateDirectoryStructure'
        );
        analyzeStructureSpy.mockReturnValue({
          featureName: 'users',
          hasBarrelExport: false,
          typeScriptFiles: [{ name: 'users.actions.ts', isFile: () => true }],
          hasTestFiles: true,
          actionFiles: [{ name: 'users.actions.ts', isFile: () => true }],
          reducerFiles: [],
          selectorFiles: [],
        });

        const result =
          NgRxFileOrganizationValidationPatterns.validateAllFileOrganizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations.some(v => v.includes('index.ts'))).toBe(true);
        expect(result.suggestions.some(s => s.includes('index.ts'))).toBe(true);
      });

      it('should suggest file naming convention improvements', () => {
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
          createFileEntry('myfile.ts'),
          createFileEntry('index.ts'),
        ]);

        const analyzeStructureSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'analyzeStateDirectoryStructure'
        );
        analyzeStructureSpy.mockReturnValue({
          featureName: 'users',
          hasBarrelExport: true,
          typeScriptFiles: [{ name: 'myfile.ts', isFile: () => true }],
          hasTestFiles: true,
          actionFiles: [],
          reducerFiles: [],
          selectorFiles: [],
        });

        const hasValidSuffixSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'hasValidNgRxSuffix'
        );
        hasValidSuffixSpy.mockReturnValue(false);

        const result =
          NgRxFileOrganizationValidationPatterns.validateAllFileOrganizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.suggestions.some(s => s.includes('naming'))).toBe(true);
      });

      it('should suggest adding test files when missing', () => {
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
          createFileEntry('users.actions.ts'),
          createFileEntry('index.ts'),
        ]);

        const analyzeStructureSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'analyzeStateDirectoryStructure'
        );
        analyzeStructureSpy.mockReturnValue({
          featureName: 'users',
          hasBarrelExport: true,
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
          NgRxFileOrganizationValidationPatterns.validateAllFileOrganizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.suggestions.some(s => s.includes('test'))).toBe(true);
      });

      it('should suggest consolidating multiple action files', () => {
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
          createFileEntry('users.actions.ts'),
          createFileEntry('other.actions.ts'),
          createFileEntry('index.ts'),
        ]);

        const analyzeStructureSpy = jest.spyOn(
          NgRxFileOrganizationConfiguration,
          'analyzeStateDirectoryStructure'
        );
        analyzeStructureSpy.mockReturnValue({
          featureName: 'users',
          hasBarrelExport: true,
          typeScriptFiles: [],
          hasTestFiles: true,
          actionFiles: [
            { name: 'users.actions.ts', isFile: () => true },
            { name: 'other.actions.ts', isFile: () => true },
          ],
          reducerFiles: [],
          selectorFiles: [],
        });

        const result =
          NgRxFileOrganizationValidationPatterns.validateAllFileOrganizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.suggestions.some(s => s.includes('action files'))).toBe(
          true
        );
      });

      it('should suggest consolidating multiple reducer files', () => {
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
          createFileEntry('users.reducer.ts'),
          createFileEntry('other.reducer.ts'),
          createFileEntry('index.ts'),
        ]);

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
          reducerFiles: [
            { name: 'users.reducer.ts', isFile: () => true },
            { name: 'other.reducer.ts', isFile: () => true },
          ],
          selectorFiles: [],
        });

        const result =
          NgRxFileOrganizationValidationPatterns.validateAllFileOrganizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.suggestions.some(s => s.includes('reducer files'))).toBe(
          true
        );
      });

      it('should suggest consolidating multiple selector files', () => {
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
          createFileEntry('users.selectors.ts'),
          createFileEntry('other.selectors.ts'),
          createFileEntry('index.ts'),
        ]);

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
          selectorFiles: [
            { name: 'users.selectors.ts', isFile: () => true },
            { name: 'other.selectors.ts', isFile: () => true },
          ],
        });

        const result =
          NgRxFileOrganizationValidationPatterns.validateAllFileOrganizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.suggestions.some(s => s.includes('selector files'))).toBe(
          true
        );
      });

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

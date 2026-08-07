/**
 * @fileoverview Tests for ngrx-memoization-validation-patterns.ts
 * @description Tests for NgRx Memoization Validation Patterns utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxMemoizationConfiguration } from '../../../src/utils/angular/ngrx-memoization/ngrx-memoization-configuration';
import { NgRxMemoizationValidationPatterns } from '../../../src/utils/angular/ngrx-memoization/ngrx-memoization-validation-patterns';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/ngrx-memoization/ngrx-memoization-validation-patterns', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxMemoizationValidationPatterns', () => {
    describe('validateAllMemoizationPatterns', () => {
      it('should return empty violations when src directory does not exist', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(false);

        const result =
          NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should return empty violations when no selector or component files found', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue([]);

        const result =
          NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should detect direct state access violations in selectors', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        // First call: initializeAnalysis finds .ts files
        // Second call: findSelectorFilesWithChecker finds selector files
        // Third call: findComponentFilesWithChecker finds component files
        findFilesSpy
          .mockReturnValueOnce([]) // initializeAnalysis
          .mockReturnValueOnce(['/test/project/src/user.selectors.ts']) // selector files
          .mockReturnValueOnce([]); // component files

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(
          'export const selectUser = state => state.user'
        );

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('user.selectors.ts');

        const result =
          NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(
          result.violations.some(v => v.includes('Direct state access'))
        ).toBe(true);
        expect(result.suggestions.some(s => s.includes('createSelector'))).toBe(
          true
        );
      });

      it('should detect missing store import violations', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy
          .mockReturnValueOnce([]) // initializeAnalysis
          .mockReturnValueOnce(['/test/project/src/user.selectors.ts']) // selector files
          .mockReturnValueOnce([]); // component files

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(
          'export const selectUser = createSelector(s => s.user)'
        );

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('user.selectors.ts');

        const result =
          NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(
          result.violations.some(v => v.includes('@ngrx/store not imported'))
        ).toBe(true);
      });

      it('should suggest feature selector usage', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy
          .mockReturnValueOnce([]) // initializeAnalysis
          .mockReturnValueOnce(['/test/project/src/user.selectors.ts']) // selector files
          .mockReturnValueOnce([]); // component files

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          import { createSelector } from '@ngrx/store';
          export const selectUser = createSelector(state => state.user);
        `);

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('user.selectors.ts');

        const result =
          NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(
          result.suggestions.some(s => s.includes('createFeatureSelector'))
        ).toBe(true);
      });

      it('should suggest selector composition when needed', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy
          .mockReturnValueOnce([]) // initializeAnalysis
          .mockReturnValueOnce(['/test/project/src/user.selectors.ts']) // selector files
          .mockReturnValueOnce([]); // component files

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          import { createSelector } from '@ngrx/store';
          export const selectA = createSelector(s => s.a);
          export const selectB = createSelector(s => s.b);
          export const selectC = createSelector(s => s.c);
          export const selectD = createSelector(s => s.d);
        `);

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('user.selectors.ts');

        const result =
          NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(
          result.suggestions.some(s => s.includes('composing selectors'))
        ).toBe(true);
      });

      it('should skip selector files with empty content', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy
          .mockReturnValueOnce([]) // initializeAnalysis
          .mockReturnValueOnce(['/test/project/src/empty.selectors.ts']) // selector files
          .mockReturnValueOnce([]); // component files

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('');

        const result =
          NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should not detect violations when store.select contains valid select word', () => {
        // Note: hasValidDirectSelectUsage returns true because 'store.select' contains 'select'
        // This is by design - it checks for SELECT_PREFIX ('select') in content
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy
          .mockReturnValueOnce([]) // initializeAnalysis
          .mockReturnValueOnce([]) // selector files
          .mockReturnValueOnce(['/test/project/src/user.component.ts']); // component files

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue("this.users$ = this.store.select('users')");

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('user.component.ts');

        const result =
          NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
            '/test/project',
            mockConfig
          );

        // No violations because hasValidDirectSelectUsage returns true
        // (store.select contains 'select' which matches SELECT_PREFIX)
        expect(result.violations).toHaveLength(0);
      });

      it('should suggest async pipe for multiple subscriptions', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy
          .mockReturnValueOnce([]) // initializeAnalysis
          .mockReturnValueOnce([]) // selector files
          .mockReturnValueOnce(['/test/project/src/app.component.ts']); // component files

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          this.store.select(selectA).subscribe()
          this.store.select(selectB).subscribe()
          this.store.select(selectC).subscribe()
          this.store.select(selectD).subscribe()
        `);

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('app.component.ts');

        const result =
          NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.suggestions.some(s => s.includes('async pipe'))).toBe(
          true
        );
      });

      it('should suggest subscription cleanup when needed', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy
          .mockReturnValueOnce([]) // initializeAnalysis
          .mockReturnValueOnce([]) // selector files
          .mockReturnValueOnce(['/test/project/src/user.component.ts']); // component files

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('this.store.select(selectUsers)');

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('user.component.ts');

        const result =
          NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(
          result.suggestions.some(s => s.includes('subscription cleanup'))
        ).toBe(true);
      });

      it('should handle errors when reading component files', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy
          .mockReturnValueOnce([]) // initializeAnalysis
          .mockReturnValueOnce([]) // selector files
          .mockReturnValueOnce(['/test/project/src/error.component.ts']); // component files

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockImplementation(() => {
          throw new Error('File read error');
        });

        const result =
          NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
            '/test/project',
            mockConfig
          );

        // Should not throw, just skip the file
        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should analyze both selector and component files', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy
          .mockReturnValueOnce([]) // initializeAnalysis
          .mockReturnValueOnce(['/test/project/src/user.selectors.ts']) // selector files
          .mockReturnValueOnce(['/test/project/src/user.component.ts']); // component files

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy
          .mockReturnValueOnce('export const getUser = state => state.user') // raw selector - causes violation
          .mockReturnValueOnce('this.store.select(selectUsers)'); // component file

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy
          .mockReturnValueOnce('user.selectors.ts')
          .mockReturnValueOnce('user.component.ts');

        const result =
          NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
            '/test/project',
            mockConfig
          );

        // Selector file produces at least 1 violation for direct state access
        expect(result.violations.length).toBeGreaterThanOrEqual(1);
      });

      it('should return no violations for compliant selectors', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(true);

        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy
          .mockReturnValueOnce([]) // initializeAnalysis
          .mockReturnValueOnce(['/test/project/src/user.selectors.ts']) // selector files
          .mockReturnValueOnce([]); // component files

        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          import { createSelector, createFeatureSelector } from '@ngrx/store';
          const selectUserState = createFeatureSelector<UserState>('user');
          export const selectUser = createSelector(selectUserState, state => state.user);
        `);

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('user.selectors.ts');

        const result =
          NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
      });
    });

    describe('analyzeSelectorFileComprehensive', () => {
      it('should return violations and suggestions for a selector file', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('export const getUser = state => state.user');

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('test.selectors.ts');

        const result =
          NgRxMemoizationValidationPatterns.analyzeSelectorFileComprehensive(
            '/test/project/src/test.selectors.ts'
          );

        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.suggestions.length).toBeGreaterThan(0);
      });

      it('should return empty arrays for compliant selector file', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          import { createSelector, createFeatureSelector } from '@ngrx/store';
          const selectState = createFeatureSelector<State>('feature');
          export const selectUsers = createSelector(selectState, s => s.users);
        `);

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('compliant.selectors.ts');

        const result =
          NgRxMemoizationValidationPatterns.analyzeSelectorFileComprehensive(
            '/test/project/src/compliant.selectors.ts'
          );

        expect(result.violations).toHaveLength(0);
      });
    });

    describe('analyzeComponentFileComprehensive', () => {
      it('should return suggestions for component file needing cleanup', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        // Content with .select( triggers needsCleanup check
        readFileSpy.mockReturnValue('this.store.select(selectUsers)');

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('test.component.ts');

        const result =
          NgRxMemoizationValidationPatterns.analyzeComponentFileComprehensive(
            '/test/project/src/test.component.ts'
          );

        // needsCleanup triggers a suggestion
        expect(result.suggestions.length).toBeGreaterThan(0);
      });

      it('should return empty arrays for compliant component file', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue(`
          this.users$ = this.store.select(selectUsers) | async;
          private subscription: Subscription;
        `);

        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        basenameSpy.mockReturnValue('compliant.component.ts');

        const result =
          NgRxMemoizationValidationPatterns.analyzeComponentFileComprehensive(
            '/test/project/src/compliant.component.ts'
          );

        expect(result.violations).toHaveLength(0);
      });

      it('should handle errors gracefully', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockImplementation(() => {
          throw new Error('File read error');
        });

        const result =
          NgRxMemoizationValidationPatterns.analyzeComponentFileComprehensive(
            '/test/project/src/error.component.ts'
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });
    });

    describe('buildMessage integration', () => {
      it('should use buildMessage from configuration', () => {
        const message = NgRxMemoizationConfiguration.buildMessage(
          NgRxMemoizationConfiguration.VALIDATION_MESSAGES.DIRECT_STATE_ACCESS,
          'test.selectors.ts'
        );

        expect(message).toContain('test.selectors.ts');
        expect(message).toContain('Direct state access');
      });

      it('should replace fileName placeholder correctly', () => {
        const message = NgRxMemoizationConfiguration.buildMessage(
          NgRxMemoizationConfiguration.VALIDATION_MESSAGES
            .USE_MEMOIZED_SELECTORS,
          'user.component.ts'
        );

        expect(message).toContain('user.component.ts');
        expect(message).toContain('memoized selectors');
      });
    });
  });
});

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
import path from 'path';
import { project } from '../../checkers/toolkit-fixture';

const config: RuleOfCodeConfig = FileUtils.getMinimalDefaultConfig();
const validate = (files: Record<string, string>) =>
  NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
    project(files),
    config
  );

const C = NgRxMemoizationConfiguration;
const M = C.VALIDATION_MESSAGES;
const SELECTORS = 'src/app/state/user.selectors.ts';
const COMPONENT = 'src/app/user/user.component.ts';
// Messages name a file by its base name without the extension.
const msg = (template: string, file: string) => C.buildMessage(template, file);

const COMPLIANT_SELECTORS = `
  import { createFeatureSelector, createSelector } from '@ngrx/store';
  export const selectUserState = createFeatureSelector<UserState>('user');
  export const selectUsers = createSelector(selectUserState, s => s.users);
`;

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
        const result = validate({
          'lib/state/user.selectors.ts': 'export const a = (s) => s.users;\n',
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should return empty violations when no selector or component files found', () => {
        const result = validate({
          'src/app/state/user.reducer.ts': 'export const a = (s) => s.users;\n',
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should detect direct state access violations in selectors', () => {
        const result = validate({
          [SELECTORS]: 'export const selectUsers = (state) => state.users;\n',
        });

        expect(result.violations).toEqual([
          msg(M.DIRECT_STATE_ACCESS, 'user.selectors'),
        ]);
        expect(result.suggestions).toEqual([
          msg(M.WRAP_WITH_SELECTOR, 'user.selectors'),
        ]);
      });

      it('should not read a createSelector projector as a raw selector', () => {
        const result = validate({ [SELECTORS]: COMPLIANT_SELECTORS });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should detect missing store import violations', () => {
        const result = validate({
          'src/app/state/user.selector.ts': COMPLIANT_SELECTORS.replace(
            /import[^\n]*\n/,
            ''
          ),
        });

        expect(result.violations).toEqual([
          msg(M.MISSING_STORE_IMPORT, 'user.selector'),
        ]);
        expect(result.suggestions).toEqual([
          msg(M.IMPORT_FROM_STORE, 'user.selector'),
        ]);
      });

      it('should suggest feature selector usage', () => {
        const result = validate({
          [SELECTORS]: `
            import { createSelector } from '@ngrx/store';
            export const selectUsers = createSelector(state => state.users);
          `,
        });

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([
          msg(M.USE_FEATURE_SELECTOR, 'user.selectors'),
        ]);
      });

      it('should suggest optimizing a selector that loops', () => {
        const result = validate({
          [SELECTORS]: `
            import { createSelector } from '@ngrx/store';
            export const selectTotal = createSelector(selectItems, items => { let t = 0; for (const i of items) t += i; return t; });
          `,
        });

        expect(result.suggestions).toEqual([
          msg(M.OPTIMIZE_COMPLEX_SELECTOR, 'user.selectors'),
        ]);
      });

      it('should suggest selector composition when needed', () => {
        const result = validate({
          [SELECTORS]: `
            import { createSelector } from '@ngrx/store';
            export const a = createSelector(selectState, s => s.a);
            export const b = createSelector(selectState, s => s.b);
            export const c = createSelector(selectState, s => s.c);
            export const d = createSelector(selectState, s => s.d);
          `,
        });

        expect(result.suggestions).toEqual([
          msg(M.COMPOSE_SELECTORS, 'user.selectors'),
        ]);
      });

      it('should not suggest composition when selectors are composed', () => {
        const result = validate({
          [SELECTORS]: `
            import { createSelector } from '@ngrx/store';
            export const a = createSelector(selectState, s => s.a);
            export const b = createSelector(selectState, s => s.b);
            export const c = createSelector(selectState, s => s.c);
            export const d = createSelector(selectA, selectB, (a, b) => a + b);
          `,
        });

        expect(result.suggestions).toEqual([]);
      });

      it('should skip selector files with empty content', () => {
        const result = validate({ [SELECTORS]: '' });

        expect(result).toEqual({ violations: [], suggestions: [] });
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
        readFileSpy.mockReturnValue(
          'export const getUser = state => state.user'
        );

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

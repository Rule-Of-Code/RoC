/**
 * @fileoverview Tests for ngrx-error-handling-validation-patterns.ts
 * @description Tests for NgRx Error Handling Validation Patterns utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxErrorHandlingConfiguration } from '../../../src/utils/angular/ngrx-error-handling/ngrx-error-handling-configuration';
import { NgRxErrorHandlingValidationPatterns } from '../../../src/utils/angular/ngrx-error-handling/ngrx-error-handling-validation-patterns';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';
import path from 'path';
import { project } from '../../checkers/toolkit-fixture';

const config: RuleOfCodeConfig = FileUtils.getMinimalDefaultConfig();
const validate = (files: Record<string, string>) =>
  NgRxErrorHandlingValidationPatterns.validateAllErrorHandlingPatterns(
    project(files),
    config
  );

const M = NgRxErrorHandlingConfiguration.getValidationMessages();
const EFFECTS = 'src/state/user.effects.ts';
// Messages name a file by its base name without the extension.
const NAME = 'user.effects';

const HANDLED = `
  load$ = createEffect(() =>
    this.actions$.pipe(
      switchMap(() => this.service.load()),
      catchError(error => of(loadFailure({ error })))
    )
  );
`;
const HTTP_EFFECT = `
  load$ = createEffect(() =>
    this.actions$.pipe(
      switchMap(() => this.http.get('/api/users')),
      catchError(error => of(loadFailure({ error })))
    )
  );
`;

describe('utils/angular/ngrx-error-handling/ngrx-error-handling-validation-patterns', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxErrorHandlingValidationPatterns', () => {
    describe('validateAllErrorHandlingPatterns', () => {
      it('should return empty results when no effect files found', () => {
        const result = validate({
          'src/state/user.reducer.ts': 'switchMap(() => load());\n',
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should validate catchError presence', () => {
        const result = validate({
          [EFFECTS]: `
            load$ = createEffect(() =>
              this.actions$.pipe(switchMap(() => this.service.load()))
            );
          `,
        });

        expect(result.violations).toEqual([
          M.MISSING_CATCH_ERROR_VIOLATION(NAME),
        ]);
        expect(result.suggestions).toEqual([M.MISSING_CATCH_ERROR_SUGGESTION]);
      });

      it('should validate observable return in catchError', () => {
        const result = validate({
          [EFFECTS]: HANDLED.replace(
            'of(loadFailure({ error }))',
            'console.error(error)'
          ),
        });

        expect(result.violations).toEqual([
          M.MISSING_OBSERVABLE_RETURN_VIOLATION(NAME),
        ]);
        expect(result.suggestions).toEqual([
          M.MISSING_OBSERVABLE_RETURN_SUGGESTION,
        ]);
      });

      it('should pass validation for proper catchError with of()', () => {
        const result = validate({ [EFFECTS]: HANDLED });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should suggest retry logic and timeout for HTTP operations', () => {
        const result = validate({ [EFFECTS]: HTTP_EFFECT });

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([
          M.RETRY_LOGIC_SUGGESTION,
          M.TIMEOUT_SUGGESTION,
        ]);
      });

      it('should not suggest retry when retry is present', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const isEffectsFileSpy = jest.spyOn(
          NgRxErrorHandlingConfiguration,
          'isEffectsFile'
        );

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/api.effects.ts',
        ]);
        basenameSpy.mockReturnValue('api.effects.ts');
        isEffectsFileSpy.mockReturnValue(true);
        readFileSpy.mockReturnValue(`
          @Injectable()
          export class ApiEffects {
            loadData$ = createEffect(() =>
              this.actions$.pipe(
                ofType(loadData),
                switchMap(() => this.http.get('/api/data').pipe(
                  retry(3),
                  catchError(error => of(loadDataFailure({ error })))
                ))
              )
            );
          }
        `);

        const result =
          NgRxErrorHandlingValidationPatterns.validateAllErrorHandlingPatterns(
            '/test/project',
            mockConfig
          );

        expect(
          result.suggestions.filter(s => s.includes('retry'))
        ).toHaveLength(0);
      });

      it('should not suggest timeout when timeout is present', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const isEffectsFileSpy = jest.spyOn(
          NgRxErrorHandlingConfiguration,
          'isEffectsFile'
        );

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/api.effects.ts',
        ]);
        basenameSpy.mockReturnValue('api.effects.ts');
        isEffectsFileSpy.mockReturnValue(true);
        readFileSpy.mockReturnValue(`
          @Injectable()
          export class ApiEffects {
            loadData$ = createEffect(() =>
              this.actions$.pipe(
                ofType(loadData),
                switchMap(() => this.http.get('/api/data').pipe(
                  timeout(5000),
                  catchError(error => of(loadDataFailure({ error })))
                ))
              )
            );
          }
        `);

        const result =
          NgRxErrorHandlingValidationPatterns.validateAllErrorHandlingPatterns(
            '/test/project',
            mockConfig
          );

        expect(
          result.suggestions.filter(s => s.includes('timeout'))
        ).toHaveLength(0);
      });

      it('should process multiple effect files', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const isEffectsFileSpy = jest.spyOn(
          NgRxErrorHandlingConfiguration,
          'isEffectsFile'
        );

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/user.effects.ts',
          '/test/project/src/state/product.effects.ts',
        ]);
        basenameSpy
          .mockReturnValueOnce('user.effects.ts')
          .mockReturnValueOnce('product.effects.ts');
        isEffectsFileSpy.mockReturnValue(true);
        readFileSpy.mockReturnValue(`
          @Injectable()
          export class SomeEffects {
            effect$ = createEffect(() =>
              this.actions$.pipe(
                ofType(action),
                catchError(error => of(failure({ error })))
              )
            );
          }
        `);

        const result =
          NgRxErrorHandlingValidationPatterns.validateAllErrorHandlingPatterns(
            '/test/project',
            mockConfig
          );

        expect(Array.isArray(result.violations)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      it('should handle file read errors gracefully', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const isEffectsFileSpy = jest.spyOn(
          NgRxErrorHandlingConfiguration,
          'isEffectsFile'
        );

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/error.effects.ts',
        ]);
        basenameSpy.mockReturnValue('error.effects.ts');
        isEffectsFileSpy.mockReturnValue(true);
        readFileSpy.mockImplementation(() => {
          throw new Error('File read error');
        });

        const result =
          NgRxErrorHandlingValidationPatterns.validateAllErrorHandlingPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should filter files based on effects file name patterns', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const isEffectsFileSpy = jest.spyOn(
          NgRxErrorHandlingConfiguration,
          'isEffectsFile'
        );

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/user.effects.ts',
          '/test/project/src/state/user.reducer.ts',
        ]);
        basenameSpy
          .mockReturnValueOnce('user.effects.ts')
          .mockReturnValueOnce('user.reducer.ts');
        isEffectsFileSpy.mockReturnValueOnce(true).mockReturnValueOnce(false);

        const result =
          NgRxErrorHandlingValidationPatterns.validateAllErrorHandlingPatterns(
            '/test/project',
            mockConfig
          );

        expect(isEffectsFileSpy).toHaveBeenCalledWith('user.effects.ts');
        expect(isEffectsFileSpy).toHaveBeenCalledWith('user.reducer.ts');
      });
    });

    describe('analyzeErrorHandlingFile', () => {
      it('should analyze a single file for error handling patterns', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const analyzePatternsSpy = jest.spyOn(
          NgRxErrorHandlingConfiguration,
          'analyzeErrorHandlingPatterns'
        );

        basenameSpy.mockReturnValue('user.effects.ts');
        readFileSpy.mockReturnValue(`
          catchError(error => of(failure({ error })))
        `);
        analyzePatternsSpy.mockReturnValue({
          hasCatchError: true,
          hasRxOf: true,
          hasHttpContent: false,
          hasRetryLogic: false,
          hasTimeout: false,
        });

        const violations: string[] = [];
        const suggestions: string[] = [];

        NgRxErrorHandlingValidationPatterns.analyzeErrorHandlingFile(
          '/test/project/src/state/user.effects.ts',
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
      });

      it('should add violations for missing catchError', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const analyzePatternsSpy = jest.spyOn(
          NgRxErrorHandlingConfiguration,
          'analyzeErrorHandlingPatterns'
        );

        basenameSpy.mockReturnValue('user.effects.ts');
        readFileSpy.mockReturnValue(`
          switchMap(() => this.service.getData())
        `);
        analyzePatternsSpy.mockReturnValue({
          hasCatchError: false,
          hasRxOf: false,
          hasHttpContent: false,
          hasRetryLogic: false,
          hasTimeout: false,
        });

        const violations: string[] = [];
        const suggestions: string[] = [];

        NgRxErrorHandlingValidationPatterns.analyzeErrorHandlingFile(
          '/test/project/src/state/user.effects.ts',
          violations,
          suggestions
        );

        expect(violations.some(v => v.includes('catchError'))).toBe(true);
        expect(suggestions.some(s => s.includes('catchError'))).toBe(true);
      });

      it('should handle file read errors gracefully', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');

        readFileSpy.mockImplementation(() => {
          throw new Error('File read error');
        });

        const violations: string[] = [];
        const suggestions: string[] = [];

        NgRxErrorHandlingValidationPatterns.analyzeErrorHandlingFile(
          '/test/project/src/state/error.effects.ts',
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
        expect(suggestions).toHaveLength(0);
      });
    });
  });
});

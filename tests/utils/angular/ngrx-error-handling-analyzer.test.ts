/**
 * @fileoverview Tests for ngrx-error-handling-analyzer.ts
 * @description Tests for NgRx Error Handling Analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxErrorHandlingAnalyzer } from '../../../src/utils/angular/ngrx-error-handling/ngrx-error-handling-analyzer';
import { NgRxErrorHandlingValidationPatterns } from '../../../src/utils/angular/ngrx-error-handling/ngrx-error-handling-validation-patterns';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/ngrx-error-handling/ngrx-error-handling-analyzer', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxErrorHandlingAnalyzer', () => {
    describe('checkErrorHandling', () => {
      it('should delegate to NgRxErrorHandlingValidationPatterns', () => {
        const validateSpy = jest.spyOn(
          NgRxErrorHandlingValidationPatterns,
          'validateAllErrorHandlingPatterns'
        );
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');

        findFilesSpy.mockReturnValue([]);
        validateSpy.mockReturnValue({ violations: [], suggestions: [] });

        NgRxErrorHandlingAnalyzer.checkErrorHandling(
          '/test/project',
          mockConfig
        );

        expect(validateSpy).toHaveBeenCalledWith('/test/project', mockConfig);
      });

      it('should return empty results when no effect files found', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue([]);

        const result = NgRxErrorHandlingAnalyzer.checkErrorHandling(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should detect missing catchError in effects', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/user.effects.ts',
        ]);
        basenameSpy.mockReturnValue('user.effects.ts');
        readFileSpy.mockReturnValue(`
          @Injectable()
          export class UserEffects {
            loadUsers$ = createEffect(() =>
              this.actions$.pipe(
                ofType(loadUsers),
                switchMap(() => this.userService.getUsers()),
                map(users => loadUsersSuccess({ users }))
              )
            );
          }
        `);

        const result = NgRxErrorHandlingAnalyzer.checkErrorHandling(
          '/test/project',
          mockConfig
        );

        expect(result.violations.some(v => v.includes('catchError'))).toBe(
          true
        );
      });

      it('should detect missing observable return in catchError', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/user.effects.ts',
        ]);
        basenameSpy.mockReturnValue('user.effects.ts');
        readFileSpy.mockReturnValue(`
          @Injectable()
          export class UserEffects {
            loadUsers$ = createEffect(() =>
              this.actions$.pipe(
                ofType(loadUsers),
                switchMap(() => this.userService.getUsers().pipe(
                  catchError(error => console.error(error))
                ))
              )
            );
          }
        `);

        const result = NgRxErrorHandlingAnalyzer.checkErrorHandling(
          '/test/project',
          mockConfig
        );

        expect(result.violations.some(v => v.includes('observable'))).toBe(
          true
        );
      });

      it('should pass validation for properly configured error handling', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/user.effects.ts',
        ]);
        basenameSpy.mockReturnValue('user.effects.ts');
        readFileSpy.mockReturnValue(`
          @Injectable()
          export class UserEffects {
            loadUsers$ = createEffect(() =>
              this.actions$.pipe(
                ofType(loadUsers),
                switchMap(() => this.userService.getUsers().pipe(
                  map(users => loadUsersSuccess({ users })),
                  catchError(error => of(loadUsersFailure({ error })))
                ))
              )
            );
          }
        `);

        const result = NgRxErrorHandlingAnalyzer.checkErrorHandling(
          '/test/project',
          mockConfig
        );

        expect(
          result.violations.filter(v => v.includes('catchError'))
        ).toHaveLength(0);
      });

      it('should suggest retry logic for HTTP operations', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/api.effects.ts',
        ]);
        basenameSpy.mockReturnValue('api.effects.ts');
        readFileSpy.mockReturnValue(`
          @Injectable()
          export class ApiEffects {
            loadData$ = createEffect(() =>
              this.actions$.pipe(
                ofType(loadData),
                switchMap(() => this.http.get('/api/data').pipe(
                  map(data => loadDataSuccess({ data })),
                  catchError(error => of(loadDataFailure({ error })))
                ))
              )
            );
          }
        `);

        const result = NgRxErrorHandlingAnalyzer.checkErrorHandling(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions.some(s => s.includes('retry'))).toBe(true);
      });

      it('should suggest timeout for HTTP operations', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/api.effects.ts',
        ]);
        basenameSpy.mockReturnValue('api.effects.ts');
        readFileSpy.mockReturnValue(`
          @Injectable()
          export class ApiEffects {
            loadData$ = createEffect(() =>
              this.actions$.pipe(
                ofType(loadData),
                switchMap(() => this.http.get('/api/data').pipe(
                  map(data => loadDataSuccess({ data })),
                  catchError(error => of(loadDataFailure({ error })))
                ))
              )
            );
          }
        `);

        const result = NgRxErrorHandlingAnalyzer.checkErrorHandling(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions.some(s => s.includes('timeout'))).toBe(true);
      });

      it('should process multiple effect files', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/user.effects.ts',
          '/test/project/src/state/product.effects.ts',
        ]);
        basenameSpy
          .mockReturnValueOnce('user.effects.ts')
          .mockReturnValueOnce('product.effects.ts');
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

        const result = NgRxErrorHandlingAnalyzer.checkErrorHandling(
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

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/error.effects.ts',
        ]);
        basenameSpy.mockReturnValue('error.effects.ts');
        readFileSpy.mockImplementation(() => {
          throw new Error('File read error');
        });

        const result = NgRxErrorHandlingAnalyzer.checkErrorHandling(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should not suggest retry when retry is already present', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/api.effects.ts',
        ]);
        basenameSpy.mockReturnValue('api.effects.ts');
        readFileSpy.mockReturnValue(`
          @Injectable()
          export class ApiEffects {
            loadData$ = createEffect(() =>
              this.actions$.pipe(
                ofType(loadData),
                switchMap(() => this.http.get('/api/data').pipe(
                  retry(3),
                  map(data => loadDataSuccess({ data })),
                  catchError(error => of(loadDataFailure({ error })))
                ))
              )
            );
          }
        `);

        const result = NgRxErrorHandlingAnalyzer.checkErrorHandling(
          '/test/project',
          mockConfig
        );

        expect(
          result.suggestions.filter(s => s.includes('retry'))
        ).toHaveLength(0);
      });

      it('should not suggest timeout when timeout is already present', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/api.effects.ts',
        ]);
        basenameSpy.mockReturnValue('api.effects.ts');
        readFileSpy.mockReturnValue(`
          @Injectable()
          export class ApiEffects {
            loadData$ = createEffect(() =>
              this.actions$.pipe(
                ofType(loadData),
                switchMap(() => this.http.get('/api/data').pipe(
                  timeout(5000),
                  map(data => loadDataSuccess({ data })),
                  catchError(error => of(loadDataFailure({ error })))
                ))
              )
            );
          }
        `);

        const result = NgRxErrorHandlingAnalyzer.checkErrorHandling(
          '/test/project',
          mockConfig
        );

        expect(
          result.suggestions.filter(s => s.includes('timeout'))
        ).toHaveLength(0);
      });
    });
  });
});

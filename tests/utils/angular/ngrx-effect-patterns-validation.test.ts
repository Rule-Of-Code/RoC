/**
 * @fileoverview Tests for ngrx-effect-patterns-validation.ts
 * @description Tests for NgRx Effect Patterns Validation utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxEffectPatternsConfiguration } from '../../../src/utils/angular/ngrx-effect-patterns/ngrx-effect-patterns-configuration';
import { NgRxEffectPatternsValidation } from '../../../src/utils/angular/ngrx-effect-patterns/ngrx-effect-patterns-validation';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/ngrx-effect-patterns/ngrx-effect-patterns-validation', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxEffectPatternsValidation', () => {
    describe('validateAllEffectPatterns', () => {
      it('should return empty results when no effect files found', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue([]);

        const result = NgRxEffectPatternsValidation.validateAllEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should validate @Injectable decorator presence', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const isEffectFileSpy = jest.spyOn(
          NgRxEffectPatternsConfiguration,
          'isEffectFile'
        );

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/user.effects.ts',
        ]);
        basenameSpy.mockReturnValue('user.effects.ts');
        isEffectFileSpy.mockReturnValue(true);
        readFileSpy.mockReturnValue(`
          export class UserEffects {
            loadUsers$ = createEffect(() =>
              this.actions$.pipe(
                ofType(loadUsers),
                catchError(error => of(failure({ error })))
              )
            );
          }
        `);

        const result = NgRxEffectPatternsValidation.validateAllEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.violations.some(v => v.includes('Injectable'))).toBe(
          true
        );
      });

      it('should validate createEffect usage', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const isEffectFileSpy = jest.spyOn(
          NgRxEffectPatternsConfiguration,
          'isEffectFile'
        );

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/old.effects.ts',
        ]);
        basenameSpy.mockReturnValue('old.effects.ts');
        isEffectFileSpy.mockReturnValue(true);
        readFileSpy.mockReturnValue(`
          @Injectable()
          export class OldEffects {
            @Effect()
            loadItems$ = this.actions$.pipe(
              ofType(loadItems),
              catchError(error => of(loadItemsFailure({ error })))
            );
          }
        `);

        const result = NgRxEffectPatternsValidation.validateAllEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions.some(s => s.includes('createEffect'))).toBe(
          true
        );
      });

      it('should validate error handling with catchError', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const isEffectFileSpy = jest.spyOn(
          NgRxEffectPatternsConfiguration,
          'isEffectFile'
        );

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/user.effects.ts',
        ]);
        basenameSpy.mockReturnValue('user.effects.ts');
        isEffectFileSpy.mockReturnValue(true);
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

        const result = NgRxEffectPatternsValidation.validateAllEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.violations.some(v => v.includes('error handling'))).toBe(
          true
        );
      });

      it('should suggest using inject for HTTP services', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const isEffectFileSpy = jest.spyOn(
          NgRxEffectPatternsConfiguration,
          'isEffectFile'
        );

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/api.effects.ts',
        ]);
        basenameSpy.mockReturnValue('api.effects.ts');
        isEffectFileSpy.mockReturnValue(true);
        readFileSpy.mockReturnValue(`
          @Injectable()
          export class ApiEffects {
            constructor(private http: HttpClient) {}

            loadData$ = createEffect(() =>
              this.actions$.pipe(
                ofType(loadData),
                switchMap(() => this.http.get('/api/data').pipe(
                  catchError(error => of(loadDataFailure({ error })))
                ))
              )
            );
          }
        `);

        const result = NgRxEffectPatternsValidation.validateAllEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions.some(s => s.includes('inject'))).toBe(true);
      });

      it('should pass validation for properly configured effect', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const isEffectFileSpy = jest.spyOn(
          NgRxEffectPatternsConfiguration,
          'isEffectFile'
        );

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/user.effects.ts',
        ]);
        basenameSpy.mockReturnValue('user.effects.ts');
        isEffectFileSpy.mockReturnValue(true);
        readFileSpy.mockReturnValue(`
          @Injectable()
          export class UserEffects {
            private readonly actions$ = inject(Actions);

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

        const result = NgRxEffectPatternsValidation.validateAllEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(
          result.violations.filter(v => v.includes('Injectable'))
        ).toHaveLength(0);
        expect(
          result.violations.filter(v => v.includes('error handling'))
        ).toHaveLength(0);
      });

      it('should process multiple effect files', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const isEffectFileSpy = jest.spyOn(
          NgRxEffectPatternsConfiguration,
          'isEffectFile'
        );

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/user.effects.ts',
          '/test/project/src/state/product.effects.ts',
        ]);
        basenameSpy
          .mockReturnValueOnce('user.effects.ts')
          .mockReturnValueOnce('product.effects.ts');
        isEffectFileSpy.mockReturnValue(true);
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

        const result = NgRxEffectPatternsValidation.validateAllEffectPatterns(
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
        const isEffectFileSpy = jest.spyOn(
          NgRxEffectPatternsConfiguration,
          'isEffectFile'
        );

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/error.effects.ts',
        ]);
        basenameSpy.mockReturnValue('error.effects.ts');
        isEffectFileSpy.mockReturnValue(true);
        readFileSpy.mockImplementation(() => {
          throw new Error('File read error');
        });

        const result = NgRxEffectPatternsValidation.validateAllEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should filter files based on effect file name patterns', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const isEffectFileSpy = jest.spyOn(
          NgRxEffectPatternsConfiguration,
          'isEffectFile'
        );

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/user.effects.ts',
          '/test/project/src/state/user.reducer.ts',
        ]);
        basenameSpy
          .mockReturnValueOnce('user.effects.ts')
          .mockReturnValueOnce('user.reducer.ts');
        isEffectFileSpy.mockReturnValueOnce(true).mockReturnValueOnce(false);

        const result = NgRxEffectPatternsValidation.validateAllEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(isEffectFileSpy).toHaveBeenCalledWith('user.effects.ts');
        expect(isEffectFileSpy).toHaveBeenCalledWith('user.reducer.ts');
      });

      it('should skip files with empty content', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const isEffectFileSpy = jest.spyOn(
          NgRxEffectPatternsConfiguration,
          'isEffectFile'
        );

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/empty.effects.ts',
        ]);
        basenameSpy.mockReturnValue('empty.effects.ts');
        isEffectFileSpy.mockReturnValue(true);
        readFileSpy.mockReturnValue('');

        const result = NgRxEffectPatternsValidation.validateAllEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should suggest combining tap with dispatch false pattern', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const isEffectFileSpy = jest.spyOn(
          NgRxEffectPatternsConfiguration,
          'isEffectFile'
        );

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/logging.effects.ts',
        ]);
        basenameSpy.mockReturnValue('logging.effects.ts');
        isEffectFileSpy.mockReturnValue(true);
        readFileSpy.mockReturnValue(`
          @Injectable()
          export class LoggingEffects {
            logAction$ = createEffect(() =>
              this.actions$.pipe(
                ofType(logAction),
                tap(action => console.log(action)),
                catchError(error => of(logFailure({ error })))
              ),
              { dispatch: false }
            );
          }
        `);

        const result = NgRxEffectPatternsValidation.validateAllEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions.some(s => s.includes('tap'))).toBe(true);
      });
    });
  });
});

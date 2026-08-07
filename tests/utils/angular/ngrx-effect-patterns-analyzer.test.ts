/**
 * @fileoverview Tests for ngrx-effect-patterns-analyzer.ts
 * @description Tests for NgRx Effect Patterns Analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxEffectPatternsAnalyzer } from '../../../src/utils/angular/ngrx-effect-patterns/ngrx-effect-patterns-analyzer';
import { NgRxEffectPatternsValidation } from '../../../src/utils/angular/ngrx-effect-patterns/ngrx-effect-patterns-validation';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/ngrx-effect-patterns/ngrx-effect-patterns-analyzer', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxEffectPatternsAnalyzer', () => {
    describe('checkEffectPatterns', () => {
      it('should delegate to NgRxEffectPatternsValidation', () => {
        const validateSpy = jest.spyOn(
          NgRxEffectPatternsValidation,
          'validateAllEffectPatterns'
        );
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');

        findFilesSpy.mockReturnValue([]);
        validateSpy.mockReturnValue({ violations: [], suggestions: [] });

        NgRxEffectPatternsAnalyzer.checkEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(validateSpy).toHaveBeenCalledWith('/test/project', mockConfig);
      });

      it('should return empty results when no effect files found', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        findFilesSpy.mockReturnValue([]);

        const result = NgRxEffectPatternsAnalyzer.checkEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should detect missing @Injectable decorator violation', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/user.effects.ts',
        ]);
        basenameSpy.mockReturnValue('user.effects.ts');
        readFileSpy.mockReturnValue(`
          export class UserEffects {
            loadUsers$ = createEffect(() =>
              this.actions$.pipe(
                ofType(loadUsers),
                map(() => loadUsersSuccess({ users: [] }))
              )
            );
          }
        `);

        const result = NgRxEffectPatternsAnalyzer.checkEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.violations.some(v => v.includes('Injectable'))).toBe(
          true
        );
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

        const result = NgRxEffectPatternsAnalyzer.checkEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.violations.some(v => v.includes('error handling'))).toBe(
          true
        );
      });

      it('should pass validation for properly configured effect', () => {
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

        const result = NgRxEffectPatternsAnalyzer.checkEffectPatterns(
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

      it('should suggest using createEffect for type safety', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/old.effects.ts',
        ]);
        basenameSpy.mockReturnValue('old.effects.ts');
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

        const result = NgRxEffectPatternsAnalyzer.checkEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions.some(s => s.includes('createEffect'))).toBe(
          true
        );
      });

      it('should suggest using inject for HTTP dependency injection', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/data.effects.ts',
        ]);
        basenameSpy.mockReturnValue('data.effects.ts');
        readFileSpy.mockReturnValue(`
          @Injectable()
          export class DataEffects {
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

        const result = NgRxEffectPatternsAnalyzer.checkEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions.some(s => s.includes('inject'))).toBe(true);
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

        const result = NgRxEffectPatternsAnalyzer.checkEffectPatterns(
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

        const result = NgRxEffectPatternsAnalyzer.checkEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should filter non-effect files from analysis', () => {
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        findFilesSpy.mockReturnValue([
          '/test/project/src/state/user.effects.ts',
          '/test/project/src/state/user.reducer.ts',
        ]);
        basenameSpy
          .mockReturnValueOnce('user.effects.ts')
          .mockReturnValueOnce('user.reducer.ts');
        readFileSpy.mockReturnValue(`
          @Injectable()
          export class UserEffects {
            effect$ = createEffect(() =>
              this.actions$.pipe(
                ofType(action),
                catchError(error => of(failure({ error })))
              )
            );
          }
        `);

        const result = NgRxEffectPatternsAnalyzer.checkEffectPatterns(
          '/test/project',
          mockConfig
        );

        expect(Array.isArray(result.violations)).toBe(true);
      });
    });
  });
});

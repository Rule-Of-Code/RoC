/**
 * @fileoverview Tests for rxjs-operator-analyzers.ts
 * @description Tests for RxJS Operator Analyzers utilities
 */

import {
  DeprecatedOperatorAnalyzer,
  FlatteningOperatorAnalyzer,
  TransformationOperatorAnalyzer,
} from '../../../src/utils/angular/rxjs-operator-usage/rxjs-operator-analyzers';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/rxjs-operator-usage/rxjs-operator-analyzers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('FlatteningOperatorAnalyzer', () => {
    describe('analyze', () => {
      it('should return empty result for empty file list', () => {
        const result = FlatteningOperatorAnalyzer.analyze([]);

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([]);
      });

      it('should return empty result when file cannot be read', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('');

        const result = FlatteningOperatorAnalyzer.analyze(['/test/file.ts']);

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([]);
      });

      it('should detect switchMap without error handling', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        basenameSpy.mockReturnValue('user.effects.ts');
        readFileSpy.mockReturnValue(`
          loadUser$ = createEffect(() =>
            this.actions$.pipe(
              ofType(loadUser),
              switchMap(() => this.userService.getUser())
            )
          );
        `);

        const result = FlatteningOperatorAnalyzer.analyze([
          '/test/user.effects.ts',
        ]);

        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.violations[0]).toContain('switchMap');
        expect(result.suggestions.length).toBeGreaterThan(0);
      });

      it('should not flag switchMap with catchError', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        basenameSpy.mockReturnValue('user.effects.ts');
        readFileSpy.mockReturnValue(`
          loadUser$ = createEffect(() =>
            this.actions$.pipe(
              ofType(loadUser),
              switchMap(() => this.userService.getUser().pipe(
                catchError(err => of(loadUserFailure({ error: err })))
              ))
            )
          );
        `);

        const result = FlatteningOperatorAnalyzer.analyze([
          '/test/user.effects.ts',
        ]);

        expect(result.violations).toEqual([]);
      });

      it('should suggest exhaustMap for HTTP POST operations', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        basenameSpy.mockReturnValue('user.effects.ts');
        readFileSpy.mockReturnValue(`
          createUser$ = createEffect(() =>
            this.actions$.pipe(
              ofType(createUser),
              switchMap(action => this.http.post('/api/users', action.user).pipe(
                catchError(err => of(createUserFailure({ error: err })))
              ))
            )
          );
        `);

        const result = FlatteningOperatorAnalyzer.analyze([
          '/test/user.effects.ts',
        ]);

        expect(result.suggestions.some(s => s.includes('exhaustMap'))).toBe(
          true
        );
      });

      it('should analyze multiple files', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        basenameSpy.mockImplementation(
          (path: string) => path.split('/').pop() || ''
        );

        readFileSpy.mockImplementation((path: string) => {
          if (path.includes('user.effects.ts')) {
            return 'switchMap(() => this.userService.get())';
          }
          if (path.includes('auth.effects.ts')) {
            return 'switchMap(() => this.authService.login())';
          }
          return '';
        });

        const result = FlatteningOperatorAnalyzer.analyze([
          '/test/user.effects.ts',
          '/test/auth.effects.ts',
        ]);

        expect(result.violations.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('DeprecatedOperatorAnalyzer', () => {
    describe('analyze', () => {
      it('should return empty result for empty file list', () => {
        const result = DeprecatedOperatorAnalyzer.analyze([]);

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([]);
      });

      it('should return empty result when file cannot be read', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('');

        const result = DeprecatedOperatorAnalyzer.analyze(['/test/file.ts']);

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([]);
      });

      // v7.2.3: deprecated list modernised (flatMap/mapTo/*MapTo/pluck/toPromise)
      // — the old RxJS-5 entries (do/catch/finally/switch) were removed because
      // matching `catch(`/`switch(` false-positived on try/catch and switch.
      it('should detect deprecated flatMap operator', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        basenameSpy.mockReturnValue('app.effects.ts');
        readFileSpy.mockReturnValue(`
          this.actions$.pipe(
            ofType(someAction),
            flatMap(action => this.api.load(action.id))
          );
        `);

        const result = DeprecatedOperatorAnalyzer.analyze([
          '/test/app.effects.ts',
        ]);

        expect(result.violations.some(v => v.includes('flatMap'))).toBe(true);
        expect(result.suggestions.some(s => s.includes('mergeMap'))).toBe(true);
      });

      it('should detect deprecated mapTo operator', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        basenameSpy.mockReturnValue('app.effects.ts');
        readFileSpy.mockReturnValue(`
          this.source$.pipe(
            mapTo({ type: 'done' })
          );
        `);

        const result = DeprecatedOperatorAnalyzer.analyze([
          '/test/app.effects.ts',
        ]);

        expect(result.violations.some(v => v.includes('mapTo'))).toBe(true);
        expect(result.suggestions.some(s => s.includes('map'))).toBe(true);
      });

      it('should detect deprecated switchMapTo operator', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        basenameSpy.mockReturnValue('app.effects.ts');
        readFileSpy.mockReturnValue(`
          this.source$.pipe(
            switchMapTo(this.api.poll())
          );
        `);

        const result = DeprecatedOperatorAnalyzer.analyze([
          '/test/app.effects.ts',
        ]);

        expect(result.violations.some(v => v.includes('switchMapTo'))).toBe(
          true
        );
        expect(result.suggestions.some(s => s.includes('switchMap'))).toBe(
          true
        );
      });

      it('should detect deprecated toPromise() usage', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        basenameSpy.mockReturnValue('app.effects.ts');
        readFileSpy.mockReturnValue(`
          const data = await this.service.getData().toPromise();
        `);

        const result = DeprecatedOperatorAnalyzer.analyze([
          '/test/app.effects.ts',
        ]);

        expect(result.violations.some(v => v.includes('toPromise'))).toBe(true);
        expect(
          result.suggestions.some(s => s.includes('firstValueFrom'))
        ).toBe(true);
      });

      it('should not flag modern operators', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        basenameSpy.mockReturnValue('app.effects.ts');
        readFileSpy.mockReturnValue(`
          this.actions$.pipe(
            ofType(someAction),
            tap(action => console.log(action)),
            catchError(err => of(null)),
            finalize(() => this.cleanup())
          );
        `);

        const result = DeprecatedOperatorAnalyzer.analyze([
          '/test/app.effects.ts',
        ]);

        expect(result.violations).toEqual([]);
      });
    });
  });

  describe('TransformationOperatorAnalyzer', () => {
    describe('analyze', () => {
      it('should return empty result for empty file list', () => {
        const result = TransformationOperatorAnalyzer.analyze([]);

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([]);
      });

      it('should return empty result when file cannot be read', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        readFileSpy.mockReturnValue('');

        const result = TransformationOperatorAnalyzer.analyze([
          '/test/file.ts',
        ]);

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([]);
      });

      it('should detect operators used outside pipe', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        basenameSpy.mockReturnValue('app.effects.ts');
        readFileSpy.mockReturnValue(`
          const result = map(x => x * 2)(source$);
          const filtered = filter(x => x > 0)(source$);
        `);

        const result = TransformationOperatorAnalyzer.analyze([
          '/test/app.effects.ts',
        ]);

        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.suggestions.some(s => s.includes('pipe'))).toBe(true);
      });

      it('should not flag operators inside pipe', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        basenameSpy.mockReturnValue('app.effects.ts');
        readFileSpy.mockReturnValue(`
          source$.pipe(
            map(x => x * 2),
            filter(x => x > 0),
            tap(x => console.log(x))
          );
        `);

        const result = TransformationOperatorAnalyzer.analyze([
          '/test/app.effects.ts',
        ]);

        expect(result.violations).toEqual([]);
      });

      it('should detect deprecated pluck operator', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        basenameSpy.mockReturnValue('app.effects.ts');
        readFileSpy.mockReturnValue(`
          source$.pipe(
            pluck('data', 'items')
          );
        `);

        const result = TransformationOperatorAnalyzer.analyze([
          '/test/app.effects.ts',
        ]);

        expect(result.suggestions.some(s => s.includes('pluck'))).toBe(true);
        expect(result.suggestions.some(s => s.includes('map'))).toBe(true);
      });

      it('should analyze multiple files', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        basenameSpy.mockImplementation(
          (path: string) => path.split('/').pop() || ''
        );

        readFileSpy.mockImplementation((path: string) => {
          if (path.includes('file1.ts')) {
            return 'map(x => x * 2)(source$)';
          }
          if (path.includes('file2.ts')) {
            return 'source$.pipe(pluck("name"))';
          }
          return '';
        });

        const result = TransformationOperatorAnalyzer.analyze([
          '/test/file1.ts',
          '/test/file2.ts',
        ]);

        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.suggestions.length).toBeGreaterThan(0);
      });

      it('should handle exhaustMap with unknown HTTP method', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        basenameSpy.mockReturnValue('custom.effects.ts');
        readFileSpy.mockReturnValue(`
          customAction$ = createEffect(() =>
            this.actions$.pipe(
              ofType(customAction),
              exhaustMap(() => this.customService.customMethod())
            )
          );
        `);

        const result = FlatteningOperatorAnalyzer.analyze([
          '/test/custom.effects.ts',
        ]);

        // Should not detect violations since exhaustMap is already the best practice
        expect(result.violations).toEqual([]);
      });

      it('should handle switchMap with unrecognized HTTP operation', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        basenameSpy.mockReturnValue('custom.effects.ts');
        readFileSpy.mockReturnValue(`
          customAction$ = createEffect(() =>
            this.actions$.pipe(
              ofType(customAction),
              switchMap(() => this.customService.customPatch())
            )
          );
        `);

        const result = FlatteningOperatorAnalyzer.analyze([
          '/test/custom.effects.ts',
        ]);

        // Should suggest improvement for switchMap even if operation is unrecognized
        expect(result.suggestions.length).toBeGreaterThan(0);
      });

      it('should detect custom HTTP-like operations with switchMap', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        basenameSpy.mockReturnValue('api.effects.ts');
        // Using http.request or other patterns that contain 'http' but not matching POST, PUT, DELETE
        readFileSpy.mockReturnValue(`
          loadData$ = createEffect(() =>
            this.actions$.pipe(
              ofType(loadData),
              switchMap(action => this.http.request('GET', '/api/data'))
            )
          );
        `);

        const result = FlatteningOperatorAnalyzer.analyze([
          '/test/api.effects.ts',
        ]);

        // Should detect switchMap even without specific HTTP method match
        expect(result.violations.length).toBeGreaterThan(0);
      });
    });
  });
});

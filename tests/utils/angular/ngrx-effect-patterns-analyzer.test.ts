/**
 * @fileoverview Tests for ngrx-effect-patterns-analyzer.ts
 * @description Tests for NgRx Effect Patterns Analyzer utility, on real
 * project fixtures: the analyzer finds *.effects.ts files and reads them, so
 * the tests write them. Only the unreadable-file case replaces the reader,
 * since a file the process cannot read is not portable to create.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxEffectPatternsAnalyzer } from '../../../src/utils/angular/ngrx-effect-patterns/ngrx-effect-patterns-analyzer';
import { NgRxEffectPatternsValidation } from '../../../src/utils/angular/ngrx-effect-patterns/ngrx-effect-patterns-validation';
import { FileUtils } from '../../../src/utils/file-utils';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});
afterEach(() => {
  jest.restoreAllMocks();
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-ngrx-effects-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

const config: RuleOfCodeConfig = FileUtils.getMinimalDefaultConfig();
const check = (files: Record<string, string>) =>
  NgRxEffectPatternsAnalyzer.checkEffectPatterns(project(files), config);

const WITHOUT_INJECTABLE = `
  export class UserEffects {
    loadUsers$ = createEffect(() =>
      this.actions$.pipe(
        ofType(loadUsers),
        map(() => loadUsersSuccess({ users: [] }))
      )
    );
  }
`;
const WITHOUT_CATCH_ERROR = `
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
`;
const PROPER_EFFECT = `
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
`;

describe('utils/angular/ngrx-effect-patterns/ngrx-effect-patterns-analyzer', () => {
  describe('NgRxEffectPatternsAnalyzer', () => {
    describe('checkEffectPatterns', () => {
      it('should delegate to NgRxEffectPatternsValidation', () => {
        const root = project({ 'src/app/app.component.ts': 'export {};\n' });
        const validate = jest.spyOn(
          NgRxEffectPatternsValidation,
          'validateAllEffectPatterns'
        );

        NgRxEffectPatternsAnalyzer.checkEffectPatterns(root, config);

        expect(validate).toHaveBeenCalledWith(root, config);
      });

      it('should return empty results when no effect files found', () => {
        const result = check({ 'src/app/app.component.ts': 'export {};\n' });

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should detect missing @Injectable decorator violation', () => {
        const result = check({
          'src/state/user.effects.ts': WITHOUT_INJECTABLE,
        });

        expect(result.violations.some(v => v.includes('Injectable'))).toBe(
          true
        );
      });

      it('should detect missing catchError in effects', () => {
        const result = check({
          'src/state/user.effects.ts': WITHOUT_CATCH_ERROR,
        });

        expect(result.violations.some(v => v.includes('error handling'))).toBe(
          true
        );
      });

      it('should pass validation for properly configured effect', () => {
        const result = check({ 'src/state/user.effects.ts': PROPER_EFFECT });

        expect(
          result.violations.filter(v => v.includes('Injectable'))
        ).toHaveLength(0);
        expect(
          result.violations.filter(v => v.includes('error handling'))
        ).toHaveLength(0);
      });

      it('should suggest using createEffect for type safety', () => {
        const result = check({
          'src/state/old.effects.ts': `
            @Injectable()
            export class OldEffects {
              @Effect()
              loadItems$ = this.actions$.pipe(
                ofType(loadItems),
                catchError(error => of(loadItemsFailure({ error })))
              );
            }
          `,
        });

        expect(result.suggestions.some(s => s.includes('createEffect'))).toBe(
          true
        );
      });

      it('should suggest using inject for HTTP dependency injection', () => {
        const result = check({
          'src/state/data.effects.ts': `
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
          `,
        });

        expect(result.suggestions.some(s => s.includes('inject'))).toBe(true);
      });

      it('should process multiple effect files', () => {
        const result = check({
          'src/state/user.effects.ts': WITHOUT_INJECTABLE,
          'src/state/product.effects.ts': WITHOUT_INJECTABLE,
        });

        // Each file is judged and named in its own finding.
        expect(result.violations.some(v => v.includes('user.effects'))).toBe(
          true
        );
        expect(result.violations.some(v => v.includes('product.effects'))).toBe(
          true
        );
      });

      it('should handle file read errors gracefully', () => {
        const root = project({ 'src/state/error.effects.ts': PROPER_EFFECT });
        // The one replaced reader: an unreadable file is not portable to make.
        jest.spyOn(FileUtils, 'readFile').mockImplementation(() => {
          throw new Error('File read error');
        });

        const result = NgRxEffectPatternsAnalyzer.checkEffectPatterns(
          root,
          config
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should filter non-effect files from analysis', () => {
        // The same content in a reducer file is not judged as an effect.
        const result = check({
          'src/state/user.reducer.ts': WITHOUT_INJECTABLE,
        });

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });
    });
  });
});

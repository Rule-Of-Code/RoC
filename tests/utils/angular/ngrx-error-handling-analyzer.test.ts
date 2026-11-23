/**
 * @fileoverview Tests for ngrx-error-handling-analyzer.ts
 * @description Tests for NgRx Error Handling Analyzer utility, on real
 * project fixtures: the analyzer finds *.effects.ts files and reads them, so
 * the tests write them. Only the unreadable-file case replaces the reader,
 * since a file the process cannot read is not portable to create.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxErrorHandlingAnalyzer } from '../../../src/utils/angular/ngrx-error-handling/ngrx-error-handling-analyzer';
import { NgRxErrorHandlingValidationPatterns } from '../../../src/utils/angular/ngrx-error-handling/ngrx-error-handling-validation-patterns';
import { FileUtils } from '../../../src/utils/file-utils';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});
afterEach(() => {
  jest.restoreAllMocks();
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-ngrx-errors-'));
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
  NgRxErrorHandlingAnalyzer.checkErrorHandling(project(files), config);

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
/** An HTTP effect with catchError, and `extra` operators in its inner pipe. */
const httpEffect = (extra = '') => `
  @Injectable()
  export class ApiEffects {
    loadData$ = createEffect(() =>
      this.actions$.pipe(
        ofType(loadData),
        switchMap(() => this.http.get('/api/data').pipe(
          ${extra}
          map(data => loadDataSuccess({ data })),
          catchError(error => of(loadDataFailure({ error })))
        ))
      )
    );
  }
`;

describe('utils/angular/ngrx-error-handling/ngrx-error-handling-analyzer', () => {
  describe('NgRxErrorHandlingAnalyzer', () => {
    describe('checkErrorHandling', () => {
      it('should delegate to NgRxErrorHandlingValidationPatterns', () => {
        const root = project({ 'src/app/app.component.ts': 'export {};\n' });
        const validate = jest.spyOn(
          NgRxErrorHandlingValidationPatterns,
          'validateAllErrorHandlingPatterns'
        );

        NgRxErrorHandlingAnalyzer.checkErrorHandling(root, config);

        expect(validate).toHaveBeenCalledWith(root, config);
      });

      it('should return empty results when no effect files found', () => {
        const result = check({ 'src/app/app.component.ts': 'export {};\n' });

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should detect missing catchError in effects', () => {
        const result = check({
          'src/state/user.effects.ts': WITHOUT_CATCH_ERROR,
        });

        expect(result.violations.some(v => v.includes('catchError'))).toBe(
          true
        );
      });

      it('should detect missing observable return in catchError', () => {
        const result = check({
          'src/state/user.effects.ts': `
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
          `,
        });

        expect(result.violations.some(v => v.includes('observable'))).toBe(
          true
        );
      });

      it('should pass validation for properly configured error handling', () => {
        const result = check({
          'src/state/user.effects.ts': `
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
          `,
        });

        expect(
          result.violations.filter(v => v.includes('catchError'))
        ).toHaveLength(0);
      });

      it('should suggest retry logic for HTTP operations', () => {
        const result = check({ 'src/state/api.effects.ts': httpEffect() });

        expect(result.suggestions.some(s => s.includes('retry'))).toBe(true);
      });

      it('should suggest timeout for HTTP operations', () => {
        const result = check({ 'src/state/api.effects.ts': httpEffect() });

        expect(result.suggestions.some(s => s.includes('timeout'))).toBe(true);
      });

      it('should process multiple effect files', () => {
        const result = check({
          'src/state/user.effects.ts': WITHOUT_CATCH_ERROR,
          'src/state/product.effects.ts': WITHOUT_CATCH_ERROR,
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
        const root = project({ 'src/state/error.effects.ts': httpEffect() });
        // The one replaced reader: an unreadable file is not portable to make.
        jest.spyOn(FileUtils, 'readFile').mockImplementation(() => {
          throw new Error('File read error');
        });

        const result = NgRxErrorHandlingAnalyzer.checkErrorHandling(
          root,
          config
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should not suggest retry when retry is already present', () => {
        const result = check({
          'src/state/api.effects.ts': httpEffect('retry(3),'),
        });

        expect(
          result.suggestions.filter(s => s.includes('retry'))
        ).toHaveLength(0);
      });

      it('should not suggest timeout when timeout is already present', () => {
        const result = check({
          'src/state/api.effects.ts': httpEffect('timeout(5000),'),
        });

        expect(
          result.suggestions.filter(s => s.includes('timeout'))
        ).toHaveLength(0);
      });
    });
  });
});

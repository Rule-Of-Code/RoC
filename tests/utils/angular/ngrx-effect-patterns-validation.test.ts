/**
 * @fileoverview Tests for ngrx-effect-patterns-validation.ts
 * @description Tests for NgRx Effect Patterns Validation utility, on real
 * project fixtures: the validation finds *.effects.ts / *.effect.ts files in
 * the project and reads them, so the tests write those files.
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxEffectPatternsConfiguration } from '../../../src/utils/angular/ngrx-effect-patterns/ngrx-effect-patterns-configuration';
import { NgRxEffectPatternsValidation } from '../../../src/utils/angular/ngrx-effect-patterns/ngrx-effect-patterns-validation';
import { FileUtils } from '../../../src/utils/file-utils';
import { project } from '../../checkers/toolkit-fixture';

const config: RuleOfCodeConfig = FileUtils.getMinimalDefaultConfig();
const validate = (files: Record<string, string>) =>
  NgRxEffectPatternsValidation.validateAllEffectPatterns(
    project(files),
    config
  );

const M = NgRxEffectPatternsConfiguration.VALIDATION_MESSAGES;
// Messages name a file by its base name without the extension.
const about = (template: string, file: string) =>
  template.replace('{fileName}', file);

const GOOD_EFFECT = `
  @Injectable()
  export class UserEffects {
    private actions$ = inject(Actions);
    private http = inject(HttpClient);
    load$ = createEffect(() =>
      this.actions$.pipe(
        ofType(load),
        switchMap(() => this.http.get('/api/users')),
        catchError(error => of(loadFailure({ error })))
      )
    );
  }
`;

describe('utils/angular/ngrx-effect-patterns/ngrx-effect-patterns-validation', () => {
  describe('NgRxEffectPatternsValidation', () => {
    describe('validateAllEffectPatterns', () => {
      it('should return empty results when no effect files found', () => {
        const result = validate({
          'src/state/user.reducer.ts': 'export const reducer = 1;\n',
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should validate @Injectable decorator presence', () => {
        const result = validate({
          'src/state/user.effects.ts': GOOD_EFFECT.replace('@Injectable()', ''),
        });

        expect(result.violations).toEqual([
          about(M.MISSING_INJECTABLE_VIOLATION, 'user.effects'),
        ]);
      });

      it('should validate createEffect usage', () => {
        const result = validate({
          'src/state/user.effects.ts': `
            @Injectable()
            export class UserEffects {
              @Effect() load$ = this.actions$.pipe(ofType(load));
            }
          `,
        });

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([M.USE_CREATE_EFFECT_SUGGESTION]);
      });

      it('should validate error handling with catchError', () => {
        const result = validate({
          'src/state/user.effects.ts': GOOD_EFFECT.replace(
            /catchError\([^\n]*\n/,
            '\n'
          ),
        });

        expect(result.violations).toEqual([
          about(M.MISSING_ERROR_HANDLING_VIOLATION, 'user.effects'),
        ]);
        expect(result.suggestions).toEqual([]);
      });

      it('should suggest using inject for HTTP services', () => {
        const result = validate({
          'src/state/user.effects.ts': `
            @Injectable()
            export class UserEffects {
              constructor(private actions$: Actions, private api: HttpClient) {}
              load$ = createEffect(() =>
                this.actions$.pipe(catchError(() => EMPTY))
              );
            }
          `,
        });

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([M.USE_INJECT_SUGGESTION]);
      });

      it('should pass validation for properly configured effect', () => {
        const result = validate({ 'src/state/user.effects.ts': GOOD_EFFECT });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should process multiple effect files', () => {
        const result = validate({
          'src/state/user.effects.ts': GOOD_EFFECT,
          'src/state/order.effect.ts': GOOD_EFFECT.replace('@Injectable()', ''),
          'src/state/cart.effects.ts': GOOD_EFFECT.replace(
            /catchError\([^\n]*\n/,
            '\n'
          ),
        });

        expect(result.violations).toEqual(
          expect.arrayContaining([
            about(M.MISSING_INJECTABLE_VIOLATION, 'order.effect'),
            about(M.MISSING_ERROR_HANDLING_VIOLATION, 'cart.effects'),
          ])
        );
        expect(result.violations).toHaveLength(2);
      });

      it('should read only effect files', () => {
        const noDecorator = GOOD_EFFECT.replace('@Injectable()', '');
        const result = validate({
          'src/state/user.reducer.ts': noDecorator,
          'src/state/user.service.ts': noDecorator,
          'src/state/user.effects.ts': noDecorator,
        });

        expect(result.violations).toEqual([
          about(M.MISSING_INJECTABLE_VIOLATION, 'user.effects'),
        ]);
      });

      it('should skip files with empty content', () => {
        const result = validate({ 'src/state/empty.effects.ts': '' });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should suggest combining tap with dispatch false pattern', () => {
        const result = validate({
          'src/state/logging.effects.ts': `
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
          `,
        });

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([
          M.TAP_WITH_DISPATCH_FALSE_SUGGESTION,
        ]);
      });
    });
  });

  describe('NgRxEffectPatternsConfiguration.isEffectFile', () => {
    it.each([
      ['user.effects.ts', true],
      ['user.effect.ts', true],
      ['effects.ts', true],
      ['user.reducer.ts', false],
      ['user.effects.md', false],
    ])('%s is an effect file: %s', (name, expected) => {
      expect(NgRxEffectPatternsConfiguration.isEffectFile(name)).toBe(expected);
    });
  });
});

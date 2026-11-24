/**
 * @fileoverview Tests for ngrx-error-handling-validation-patterns.ts
 * @description Tests for NgRx Error Handling Validation Patterns utility, on
 * real project fixtures: the validation finds *.effects.ts / *.effect.ts files
 * in the project and reads them, so the tests write those files.
 */

import path from 'path';

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxErrorHandlingConfiguration } from '../../../src/utils/angular/ngrx-error-handling/ngrx-error-handling-configuration';
import { NgRxErrorHandlingValidationPatterns } from '../../../src/utils/angular/ngrx-error-handling/ngrx-error-handling-validation-patterns';
import { FileUtils } from '../../../src/utils/file-utils';
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
        const result = validate({
          [EFFECTS]: HTTP_EFFECT.replace(
            "this.http.get('/api/users')",
            "this.http.get('/api/users').pipe(retry(2))"
          ),
        });

        expect(result.suggestions).toEqual([M.TIMEOUT_SUGGESTION]);
      });

      it('should not suggest retry when retryWhen is present', () => {
        const result = validate({
          [EFFECTS]: HTTP_EFFECT.replace(
            "this.http.get('/api/users')",
            "this.http.get('/api/users').pipe(retryWhen(e => e))"
          ),
        });

        expect(result.suggestions).toEqual([M.TIMEOUT_SUGGESTION]);
      });

      it('should not suggest timeout when timeout is present', () => {
        const result = validate({
          [EFFECTS]: HTTP_EFFECT.replace(
            "this.http.get('/api/users')",
            "this.http.get('/api/users').pipe(timeout(5000))"
          ),
        });

        expect(result.suggestions).toEqual([M.RETRY_LOGIC_SUGGESTION]);
      });

      it('should read HttpClient as HTTP content', () => {
        const result = validate({
          [EFFECTS]: HANDLED.replace(
            'this.service.load()',
            'inject(HttpClient).get(url)'
          ),
        });

        expect(result.suggestions).toEqual([
          M.RETRY_LOGIC_SUGGESTION,
          M.TIMEOUT_SUGGESTION,
        ]);
      });

      it('should process multiple effect files', () => {
        const result = validate({
          [EFFECTS]: HANDLED,
          'src/state/order.effect.ts': 'switchMap(() => load());\n',
          'src/state/cart.effects.ts': 'catchError(() => EMPTY);\n',
        });

        expect(result.violations).toEqual(
          expect.arrayContaining([
            M.MISSING_CATCH_ERROR_VIOLATION('order.effect'),
            M.MISSING_OBSERVABLE_RETURN_VIOLATION('cart.effects'),
          ])
        );
        expect(result.violations).toHaveLength(2);
      });

      it('should read only effect files', () => {
        const unhandled = 'switchMap(() => load());\n';
        const result = validate({
          'src/state/user.reducer.ts': unhandled,
          'src/state/user.service.ts': unhandled,
          [EFFECTS]: unhandled,
        });

        expect(result.violations).toEqual([
          M.MISSING_CATCH_ERROR_VIOLATION(NAME),
        ]);
      });
    });

    describe('analyzeErrorHandlingFile', () => {
      it('should analyze a single file for error handling patterns', () => {
        const root = project({ [EFFECTS]: HANDLED });
        const violations: string[] = [];
        const suggestions: string[] = [];

        NgRxErrorHandlingValidationPatterns.analyzeErrorHandlingFile(
          path.join(root, EFFECTS),
          violations,
          suggestions
        );

        expect({ violations, suggestions }).toEqual({
          violations: [],
          suggestions: [],
        });
      });

      it('should add violations for missing catchError', () => {
        const root = project({
          [EFFECTS]: 'switchMap(() => this.service.getData());\n',
        });
        const violations: string[] = [];
        const suggestions: string[] = [];

        NgRxErrorHandlingValidationPatterns.analyzeErrorHandlingFile(
          path.join(root, EFFECTS),
          violations,
          suggestions
        );

        expect(violations).toEqual([M.MISSING_CATCH_ERROR_VIOLATION(NAME)]);
        expect(suggestions).toEqual([M.MISSING_CATCH_ERROR_SUGGESTION]);
      });
    });
  });

  describe('NgRxErrorHandlingConfiguration.isEffectsFile', () => {
    it.each([
      ['user.effects.ts', true],
      ['user.effect.ts', true],
      ['effects.index.ts', true],
      ['user.reducer.ts', false],
    ])('%s is an effects file: %s', (name, expected) => {
      expect(NgRxErrorHandlingConfiguration.isEffectsFile(name)).toBe(expected);
    });
  });
});

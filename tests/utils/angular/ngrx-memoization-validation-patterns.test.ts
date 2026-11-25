/**
 * @fileoverview Tests for ngrx-memoization-validation-patterns.ts
 * @description Tests for NgRx Memoization Validation Patterns utility, on
 * real project fixtures: the validation finds *.selectors.ts / *.selector.ts
 * and *.component.ts files under src/ and reads them, so the tests write
 * those files.
 */

import path from 'path';

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxMemoizationConfiguration } from '../../../src/utils/angular/ngrx-memoization/ngrx-memoization-configuration';
import { NgRxMemoizationValidationPatterns } from '../../../src/utils/angular/ngrx-memoization/ngrx-memoization-validation-patterns';
import { FileUtils } from '../../../src/utils/file-utils';
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

      it('should suggest async pipe for multiple subscriptions', () => {
        const result = validate({
          [COMPONENT]: `
            this.store.select(selectA).subscribe();
            this.store.select(selectB).subscribe();
            this.store.select(selectC).subscribe();
            this.store.select(selectD).subscribe();
          `,
        });

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([
          msg(M.USE_ASYNC_PIPE, 'user.component'),
          msg(M.ENSURE_CLEANUP, 'user.component'),
        ]);
      });

      it('should suggest subscription cleanup when needed', () => {
        const result = validate({
          [COMPONENT]: 'this.users$ = this.store.select(selectUsers);\n',
        });

        expect(result).toEqual({
          violations: [],
          suggestions: [msg(M.ENSURE_CLEANUP, 'user.component')],
        });
      });

      it('should not suggest cleanup when the template reads with the async pipe', () => {
        const result = validate({
          [COMPONENT]: `
            template: '<li *ngFor="let u of users$ | async">{{ u }}</li>',
            users$ = this.store.select(selectUsers);
          `,
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should analyze both selector and component files', () => {
        const result = validate({
          [SELECTORS]: 'export const selectUsers = (state) => state.users;\n',
          [COMPONENT]: 'this.users$ = this.store.select(selectUsers);\n',
        });

        expect(result.violations).toEqual([
          msg(M.DIRECT_STATE_ACCESS, 'user.selectors'),
        ]);
        expect(result.suggestions).toEqual([
          msg(M.WRAP_WITH_SELECTOR, 'user.selectors'),
          msg(M.ENSURE_CLEANUP, 'user.component'),
        ]);
      });

      it('should return no violations for compliant selectors', () => {
        const result = validate({ [SELECTORS]: COMPLIANT_SELECTORS });

        expect(result.violations).toEqual([]);
      });
    });

    describe('analyzeSelectorFileComprehensive', () => {
      it('should return violations and suggestions for a selector file', () => {
        const root = project({
          [SELECTORS]: 'export const selectUsers = (state) => state.users;\n',
        });

        const result =
          NgRxMemoizationValidationPatterns.analyzeSelectorFileComprehensive(
            path.join(root, SELECTORS)
          );

        expect(result).toEqual({
          violations: [msg(M.DIRECT_STATE_ACCESS, 'user.selectors')],
          suggestions: [msg(M.WRAP_WITH_SELECTOR, 'user.selectors')],
        });
      });

      it('should return empty arrays for compliant selector file', () => {
        const root = project({ [SELECTORS]: COMPLIANT_SELECTORS });

        const result =
          NgRxMemoizationValidationPatterns.analyzeSelectorFileComprehensive(
            path.join(root, SELECTORS)
          );

        expect(result).toEqual({ violations: [], suggestions: [] });
      });
    });

    describe('analyzeComponentFileComprehensive', () => {
      it('should return suggestions for component file needing cleanup', () => {
        const root = project({
          [COMPONENT]: 'this.users$ = this.store.select(selectUsers);\n',
        });

        const result =
          NgRxMemoizationValidationPatterns.analyzeComponentFileComprehensive(
            path.join(root, COMPONENT)
          );

        expect(result).toEqual({
          violations: [],
          suggestions: [msg(M.ENSURE_CLEANUP, 'user.component')],
        });
      });

      it('should return empty arrays for compliant component file', () => {
        const root = project({
          [COMPONENT]: `
            export class UserComponent {
              private subscription = new Subscription();
              users$ = this.store.select(selectUsers);
            }
          `,
        });

        const result =
          NgRxMemoizationValidationPatterns.analyzeComponentFileComprehensive(
            path.join(root, COMPONENT)
          );

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should make no finding for a component file that does not exist', () => {
        const root = project({ 'package.json': '{}' });

        const result =
          NgRxMemoizationValidationPatterns.analyzeComponentFileComprehensive(
            path.join(root, 'src/app/missing.component.ts')
          );

        expect(result).toEqual({ violations: [], suggestions: [] });
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

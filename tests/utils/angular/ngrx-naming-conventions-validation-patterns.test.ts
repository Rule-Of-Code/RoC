/**
 * @fileoverview Tests for ngrx-naming-conventions-validation-patterns.ts
 * @description Tests for NgRx Naming Conventions Validation Patterns utility,
 * on real project fixtures: the validation finds the NgRx files under src/,
 * takes the feature name from the folder above +state and reads each file,
 * so the tests write a `src/app/user/+state` store.
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxNamingConventionsConfiguration } from '../../../src/utils/angular/ngrx-naming-conventions/ngrx-naming-conventions-configuration';
import { NgRxNamingConventionsValidationPatterns } from '../../../src/utils/angular/ngrx-naming-conventions/ngrx-naming-conventions-validation-patterns';
import { FileUtils } from '../../../src/utils/file-utils';
import { project } from '../../checkers/toolkit-fixture';

const config: RuleOfCodeConfig = FileUtils.getMinimalDefaultConfig();
const validate = (files: Record<string, string>) =>
  NgRxNamingConventionsValidationPatterns.validateAllNamingConventions(
    project(files),
    config
  );

const C = NgRxNamingConventionsConfiguration;
const M = C.VALIDATION_MESSAGES;
const msg = (template: string, ...values: string[]) =>
  C.buildMessage(template, ...values);

const FEATURE = 'user';
// Names and action sources are PascalCase whatever the folder's case (#612).
const FEATURE_PREFIX = 'User';
const STATE = `src/app/${FEATURE}/+state`;
const ACTIONS = `${STATE}/user.actions.ts`;
const REDUCER = `${STATE}/user.reducer.ts`;
const SELECTORS = `${STATE}/user.selectors.ts`;
const EFFECTS = `${STATE}/user.effects.ts`;
// Messages name a file by its base name without the extension.

describe('utils/angular/ngrx-naming-conventions/ngrx-naming-conventions-validation-patterns', () => {
  describe('NgRxNamingConventionsValidationPatterns', () => {
    describe('validateAllNamingConventions', () => {
      it('should return empty results when no NgRx files found', () => {
        const result = validate({
          'src/app/user/user.service.ts':
            "export const LoadUsers = createAction('load');\n",
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should return empty results when there is no src directory', () => {
        const result = validate({
          'lib/user/+state/user.actions.ts':
            "export const LoadUsers = createAction('load');\n",
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should deduplicate violations and suggestions', () => {
        const result = validate({
          [ACTIONS]: `
            export const loadA = createAction('[Order] Load');
            export const loadB = createAction('[Order] Load');
          `,
        });

        expect(result.violations).toEqual([
          msg(
            M.ACTION_PREFIX_VIOLATION,
            '[Order] Load',
            FEATURE_PREFIX,
            'user.actions'
          ),
        ]);
      });

      it('should skip files with empty content', () => {
        const result = validate({ [ACTIONS]: '' });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should find facade and models files but judge no names in them', () => {
        const result = validate({
          [`${STATE}/user.facade.ts`]:
            "export const LoadUsers = createAction('load');\n",
          [`${STATE}/user.models.ts`]: 'export interface user_State {}\n',
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should handle multiple file types in a project', () => {
        const result = validate({
          [ACTIONS]: "export const LoadUsers = createAction('[Order] Load');\n",
          [EFFECTS]: 'export class OrderEffects {}\n',
        });

        expect(result.violations).toEqual([
          msg(
            M.ACTION_PREFIX_VIOLATION,
            '[Order] Load',
            FEATURE_PREFIX,
            'user.actions'
          ),
        ]);
        expect(result.suggestions).toEqual(
          expect.arrayContaining([
            msg(M.ACTION_CREATOR_CASE_SUGGESTION, 'LoadUsers', 'user.actions'),
            msg(M.EFFECTS_CLASS_SUGGESTION, 'UserEffects', 'user.effects'),
          ])
        );
      });
    });

    describe('action naming validation', () => {
      it('should detect action prefix violations', () => {
        const result = validate({
          [ACTIONS]: "export const load = createAction('[Order] Load');\n",
        });

        expect(result.violations).toEqual([
          msg(
            M.ACTION_PREFIX_VIOLATION,
            '[Order] Load',
            FEATURE_PREFIX,
            'user.actions'
          ),
        ]);
        expect(result.suggestions).toEqual([
          msg(M.ACTION_PREFIX_SUGGESTION, FEATURE_PREFIX, '[Order] Load'),
        ]);
      });

      it('should detect action case violations', () => {
        const result = validate({
          [ACTIONS]: "export const load = createAction('[user] load users');\n",
        });

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([
          msg(M.ACTION_CASE_SUGGESTION, 'load users', 'user.actions'),
        ]);
      });

      it('should accept Capitalized Words and PascalCase action text', () => {
        const result = validate({
          [ACTIONS]: `
            export const load = createAction('[user] Load Users');
            export const save = createAction('[user] SaveUser');
          `,
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should detect action creator case violations', () => {
        const result = validate({
          [ACTIONS]:
            "export const LoadUsers = createAction('[user] Load Users');\n",
        });

        expect(result.suggestions).toEqual([
          msg(M.ACTION_CREATOR_CASE_SUGGESTION, 'LoadUsers', 'user.actions'),
        ]);
      });

      it('should not ask for a prefix outside a +state folder', () => {
        // No +state folder: no feature name, so any bracketed prefix is one.
        const result = validate({
          'src/app/user/user.actions.ts':
            "export const load = createAction('[Order] Load');\n",
        });

        expect(result.violations).toEqual([]);
      });
    });

    describe('reducer naming validation', () => {
      it('should validate reducer function naming', () => {
        const result = validate({
          [REDUCER]: `
            export const initialState = {};
            export const initialUserState = initialState;
            export const ordersReducer = createReducer(initialState);
          `,
        });

        expect(result.suggestions).toEqual([
          msg(M.REDUCER_NAME_SUGGESTION, 'userReducer', 'user.reducer'),
        ]);
      });

      it('should not judge the name of a reducer exported as `reducer`', () => {
        const result = validate({
          [REDUCER]: `
            export const initialState = {};
            export const initialUserState = initialState;
            export const reducer = createReducer(initialState);
          `,
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should validate initial state naming', () => {
        const result = validate({
          [REDUCER]: 'export const reducer = createReducer({});\n',
        });

        expect(result.suggestions).toEqual([
          msg(M.INITIAL_STATE_SUGGESTION, FEATURE_PREFIX, 'user.reducer'),
        ]);
      });

      it('should validate state interface naming', () => {
        const result = validate({
          [REDUCER]: `
            export interface user_State { loading: boolean }
            export interface UserState { loading: boolean }
            export const initialState = {};
            export const initialUserState = initialState;
          `,
        });

        // user_State is neither the expected name nor PascalCase; UserState is PascalCase.
        expect(result.suggestions).toEqual([
          msg(M.STATE_INTERFACE_SUGGESTION, 'UserState', 'user.reducer'),
        ]);
      });
    });

    describe('selector naming validation', () => {
      it('should validate feature selector naming', () => {
        const result = validate({
          [SELECTORS]:
            "export const selectOrdersFeature = createFeatureSelector('orders');\n",
        });

        expect(result.suggestions).toEqual([
          msg(
            M.FEATURE_SELECTOR_SUGGESTION,
            'selectUserFeature',
            'user.selectors'
          ),
        ]);
      });

      it('should make no suggestion for select-prefixed selectors', () => {
        const result = validate({
          [SELECTORS]: `
            export const selectUsers = createSelector(selectState, s => s.users);
            export const selectCount = createSelector(selectUsers, u => u.length);
          `,
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });
    });

    describe('effect naming validation', () => {
      it('should validate effect class naming', () => {
        const result = validate({
          [EFFECTS]: 'export class OrderEffects {}\n',
        });

        expect(result.suggestions).toEqual([
          msg(M.EFFECTS_CLASS_SUGGESTION, 'UserEffects', 'user.effects'),
        ]);
      });

      it('should validate individual effect naming', () => {
        const result = validate({
          [EFFECTS]: `
            load$ = createEffect(() => this.actions$);
            saveEffect = createEffect(() => this.actions$);
            loadUsers = createEffect(() => this.actions$);
          `,
        });

        expect(result.suggestions).toEqual([
          msg(M.EFFECT_NAMING_SUGGESTION, 'loadUsers', 'user.effects'),
        ]);
      });
    });
  });

  describe('NgRxNamingConventionsConfiguration', () => {
    it('should take the feature name from the folder above +state', () => {
      expect(C.extractFeatureName('/repo/src/app/user/+state')).toBe('user');
      expect(C.extractFeatureName('/repo/src/app/user')).toBe('');
    });

    it('should read the file type from the file name', () => {
      expect(C.isFileType('user.actions', 'actions')).toBe(true);
      expect(C.isFileType('user.reducer', 'actions')).toBe(false);
    });
  });
});

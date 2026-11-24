/**
 * @fileoverview Tests for ngrx-immutability-validation-patterns.ts
 * @description Tests for NgRx Immutability Validation Patterns utility, on
 * real project fixtures: the validation finds *.reducer.ts files under src/
 * and reads them, so the tests write those files.
 */

import path from 'path';

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxImmutabilityConfiguration } from '../../../src/utils/angular/ngrx-immutability/ngrx-immutability-configuration';
import { NgRxImmutabilityValidationPatterns } from '../../../src/utils/angular/ngrx-immutability/ngrx-immutability-validation-patterns';
import { FileUtils } from '../../../src/utils/file-utils';
import { project } from '../../checkers/toolkit-fixture';

const config: RuleOfCodeConfig = FileUtils.getMinimalDefaultConfig();
const validate = (files: Record<string, string>) =>
  NgRxImmutabilityValidationPatterns.validateAllImmutabilityPatterns(
    project(files),
    config
  );

const C = NgRxImmutabilityConfiguration;
const M = C.VALIDATION_MESSAGES;
const REDUCER = 'src/app/state/user.reducer.ts';
// Messages name a file by its base name without the extension.
const msg = (template: string, file = 'user.reducer') =>
  C.buildMessage(template, file);

/** A reducer that returns a new object with `return {` and spreads. */
const COMPLIANT = `
  export const reducer = createReducer(
    initialState,
    on(loadSuccess, (state, { items }) => {
      return { ...state, items: [...items], loading: false };
    })
  );
`;
const reducerWith = (body: string) => `
  export const reducer = createReducer(
    initialState,
    on(update, (state, { value }) => {
      ${body}
      return { ...state };
    })
  );
`;

describe('utils/angular/ngrx-immutability/ngrx-immutability-validation-patterns', () => {
  describe('NgRxImmutabilityValidationPatterns', () => {
    describe('validateAllImmutabilityPatterns', () => {
      it('should return empty violations when src directory does not exist', () => {
        const result = validate({
          'lib/state/user.reducer.ts': reducerWith('state.name = value;'),
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should return empty violations when no reducer files found', () => {
        const result = validate({
          'src/app/state/user.effects.ts': reducerWith('state.name = value;'),
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should detect direct state mutation violations', () => {
        const result = validate({
          [REDUCER]: reducerWith('state.name = value;'),
        });

        expect(result.violations).toEqual([msg(M.DIRECT_STATE_MUTATION)]);
        expect(result.suggestions).toEqual([msg(M.USE_IMMUTABLE_UPDATE)]);
      });

      it('should detect a property removed with delete', () => {
        const result = validate({
          [REDUCER]: reducerWith('delete state.selected;'),
        });

        expect(result.violations).toEqual([msg(M.DIRECT_STATE_MUTATION)]);
      });

      it('should detect nested object mutation violations', () => {
        const result = validate({
          [REDUCER]: reducerWith('state.user.name = value;'),
        });

        expect(result.violations).toEqual([msg(M.NESTED_OBJECT_MUTATION)]);
        expect(result.suggestions).toEqual([msg(M.USE_NESTED_SPREAD)]);
      });

      it('should detect array mutation violations', () => {
        const result = validate({
          [REDUCER]: `
            export const reducer = createReducer(
              initialState,
              on(add, (state, { item }) => {
                state.items.push(item);
                return state;
              })
            );
          `,
        });

        expect(result.violations).toEqual([
          msg(M.DIRECT_STATE_MUTATION),
          msg(M.ARRAY_MUTATION),
        ]);
        expect(result.suggestions).toEqual([
          msg(M.USE_IMMUTABLE_UPDATE),
          msg(M.USE_SPREAD_OPERATOR),
          msg(M.USE_IMMUTABLE_ARRAYS),
          msg(M.USE_OBJECT_LITERALS),
        ]);
      });

      it('should not report array methods when the file copies arrays', () => {
        const result = validate({
          [REDUCER]: `
            export const reducer = createReducer(
              initialState,
              on(add, (state, { item }) => {
                const items = state.items.slice();
                items.push(item);
                return { ...state, items };
              })
            );
          `,
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should detect Object.assign mutation violations', () => {
        const result = validate({
          [REDUCER]: reducerWith('Object.assign(state, { name: value });'),
        });

        expect(result.violations).toEqual([msg(M.OBJECT_ASSIGN_MUTATION)]);
        expect(result.suggestions).toEqual([msg(M.USE_PROPER_PATTERNS)]);
      });

      it('should suggest spread operator usage', () => {
        const result = validate({
          [REDUCER]: `
            export const reducer = createReducer(
              initialState,
              on(reset, state => {
                return state;
              })
            );
          `,
        });

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([
          msg(M.USE_SPREAD_OPERATOR),
          msg(M.USE_OBJECT_LITERALS),
        ]);
      });

      it('should suggest immer import when produce is used', () => {
        const result = validate({
          [REDUCER]: COMPLIANT.replace(
            'return { ...state',
            'produce(state, draft => draft); return { ...state'
          ),
        });

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([msg(M.ENSURE_IMMER_IMPORT)]);
      });

      it('should not suggest the immer import when immer is imported', () => {
        const result = validate({
          [REDUCER]:
            "import { produce } from 'immer';\n" +
            COMPLIANT.replace(
              'return { ...state',
              'produce(state, draft => draft); return { ...state'
            ),
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should skip files with empty content', () => {
        const result = validate({ [REDUCER]: '' });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should analyze multiple reducer files', () => {
        const result = validate({
          [REDUCER]: reducerWith('state.name = value;'),
          'src/app/state/order.reducer.ts': reducerWith(
            'Object.assign(state, { total: value });'
          ),
          'src/app/state/cart.reducer.ts': COMPLIANT,
        });

        expect(result.violations).toEqual(
          expect.arrayContaining([
            msg(M.DIRECT_STATE_MUTATION),
            msg(M.OBJECT_ASSIGN_MUTATION, 'order.reducer'),
          ])
        );
        expect(result.violations).toHaveLength(2);
      });

      it('should return no violations for compliant reducers', () => {
        const result = validate({ [REDUCER]: COMPLIANT });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });
    });

    describe('analyzeReducerFileComprehensive', () => {
      it('should return violations and suggestions for a reducer file', () => {
        const root = project({ [REDUCER]: 'state.name = "test";\n' });

        const result =
          NgRxImmutabilityValidationPatterns.analyzeReducerFileComprehensive(
            path.join(root, REDUCER)
          );

        expect(result).toEqual({
          violations: [msg(M.DIRECT_STATE_MUTATION)],
          suggestions: [msg(M.USE_IMMUTABLE_UPDATE)],
        });
      });

      it('should return empty arrays for compliant reducer file', () => {
        const root = project({ [REDUCER]: COMPLIANT });

        const result =
          NgRxImmutabilityValidationPatterns.analyzeReducerFileComprehensive(
            path.join(root, REDUCER)
          );

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should handle empty file content', () => {
        const root = project({ [REDUCER]: '' });

        const result =
          NgRxImmutabilityValidationPatterns.analyzeReducerFileComprehensive(
            path.join(root, REDUCER)
          );

        expect(result).toEqual({ violations: [], suggestions: [] });
      });
    });

    describe('buildMessage integration', () => {
      it('should use buildMessage from configuration', () => {
        const message = NgRxImmutabilityConfiguration.buildMessage(
          NgRxImmutabilityConfiguration.VALIDATION_MESSAGES
            .DIRECT_STATE_MUTATION,
          'test.reducer.ts'
        );

        expect(message).toContain('test.reducer.ts');
        expect(message).toContain('Direct state mutation');
      });

      it('should replace fileName placeholder correctly', () => {
        const message = NgRxImmutabilityConfiguration.buildMessage(
          NgRxImmutabilityConfiguration.VALIDATION_MESSAGES
            .USE_IMMUTABLE_UPDATE,
          'user.reducer.ts'
        );

        expect(message).toContain('user.reducer.ts');
        expect(message).toContain('immutable update patterns');
      });
    });
  });
});

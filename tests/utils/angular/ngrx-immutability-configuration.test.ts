/**
 * @fileoverview Tests for ngrx-immutability-configuration.ts
 * @description Tests for NgRx Immutability Configuration utility
 */

import { NgRxImmutabilityConfiguration } from '../../../src/utils/angular/ngrx-immutability/ngrx-immutability-configuration';
import {
  ANGULAR_CONSTANTS,
  FILE_EXTENSIONS,
  NGRX_KEYWORDS,
} from '../../../src/utils/constants';

describe('utils/angular/ngrx-immutability/ngrx-immutability-configuration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxImmutabilityConfiguration', () => {
    describe('STATE_MUTATION_PATTERNS', () => {
      it('should contain direct state mutation patterns', () => {
        const patterns = NgRxImmutabilityConfiguration.STATE_MUTATION_PATTERNS;
        expect(Array.isArray(patterns)).toBe(true);
        expect(patterns.length).toBeGreaterThan(0);
      });

      it('should detect state.property assignment', () => {
        const patterns = NgRxImmutabilityConfiguration.STATE_MUTATION_PATTERNS;
        const content = 'state.name = "test"';
        expect(patterns.some(p => p.test(content))).toBe(true);
      });

      it('should detect state[property] assignment', () => {
        const patterns = NgRxImmutabilityConfiguration.STATE_MUTATION_PATTERNS;
        const content = 'state[key] = value';
        expect(patterns.some(p => p.test(content))).toBe(true);
      });

      it('should detect array mutation methods', () => {
        const patterns = NgRxImmutabilityConfiguration.STATE_MUTATION_PATTERNS;
        expect(patterns.some(p => p.test('state.items.push(item)'))).toBe(true);
        expect(patterns.some(p => p.test('state.items.pop()'))).toBe(true);
        expect(patterns.some(p => p.test('state.items.shift()'))).toBe(true);
        expect(patterns.some(p => p.test('state.items.unshift(item)'))).toBe(
          true
        );
        expect(patterns.some(p => p.test('state.items.splice(0, 1)'))).toBe(
          true
        );
        expect(patterns.some(p => p.test('state.items.sort()'))).toBe(true);
        expect(patterns.some(p => p.test('state.items.reverse()'))).toBe(true);
      });

      it('should detect delete operator on state', () => {
        const patterns = NgRxImmutabilityConfiguration.STATE_MUTATION_PATTERNS;
        expect(patterns.some(p => p.test('delete state.property'))).toBe(true);
      });
    });

    describe('NESTED_UPDATE_PATTERNS', () => {
      it('should contain nested update patterns', () => {
        const patterns = NgRxImmutabilityConfiguration.NESTED_UPDATE_PATTERNS;
        expect(Array.isArray(patterns)).toBe(true);
        expect(patterns.length).toBeGreaterThan(0);
      });

      it('should detect nested property assignment', () => {
        const patterns = NgRxImmutabilityConfiguration.NESTED_UPDATE_PATTERNS;
        expect(patterns.some(p => p.test('state.user.name = "test"'))).toBe(
          true
        );
      });

      it('should detect nested bracket notation assignment', () => {
        const patterns = NgRxImmutabilityConfiguration.NESTED_UPDATE_PATTERNS;
        expect(patterns.some(p => p.test('state[key1][key2] = value'))).toBe(
          true
        );
      });
    });

    describe('MUTATING_ARRAY_METHODS', () => {
      it('should contain mutating array method keywords', () => {
        const methods = NgRxImmutabilityConfiguration.MUTATING_ARRAY_METHODS;
        expect(methods).toContain(NGRX_KEYWORDS.PUSH_METHOD);
        expect(methods).toContain(NGRX_KEYWORDS.POP_METHOD);
        expect(methods).toContain(NGRX_KEYWORDS.SPLICE_METHOD);
      });
    });

    describe('IMMUTABLE_ARRAY_PATTERNS', () => {
      it('should contain immutable array pattern keywords', () => {
        const patterns = NgRxImmutabilityConfiguration.IMMUTABLE_ARRAY_PATTERNS;
        expect(patterns).toContain(NGRX_KEYWORDS.SPREAD_DOTS);
        expect(patterns).toContain(NGRX_KEYWORDS.CONCAT_METHOD);
        expect(patterns).toContain(NGRX_KEYWORDS.SLICE_METHOD);
      });
    });

    describe('REDUCER_FILE_EXTENSIONS', () => {
      it('should contain reducer file extension', () => {
        const extensions =
          NgRxImmutabilityConfiguration.REDUCER_FILE_EXTENSIONS;
        expect(extensions).toContain(FILE_EXTENSIONS.REDUCER_TS);
      });
    });

    describe('FILE_READ_OPTIONS', () => {
      it('should have correct encoding option', () => {
        const options = NgRxImmutabilityConfiguration.FILE_READ_OPTIONS;
        expect(options.encoding).toBe(ANGULAR_CONSTANTS.ENCODING_UTF8);
      });

      it('should have fallbackToEmpty option set to true', () => {
        const options = NgRxImmutabilityConfiguration.FILE_READ_OPTIONS;
        expect(options.fallbackToEmpty).toBe(true);
      });
    });

    describe('VALIDATION_MESSAGES', () => {
      it('should have all validation message templates', () => {
        const messages = NgRxImmutabilityConfiguration.VALIDATION_MESSAGES;
        expect(messages.DIRECT_STATE_MUTATION).toBeDefined();
        expect(messages.USE_IMMUTABLE_UPDATE).toBeDefined();
        expect(messages.USE_SPREAD_OPERATOR).toBeDefined();
        expect(messages.ENSURE_IMMER_IMPORT).toBeDefined();
        expect(messages.NESTED_OBJECT_MUTATION).toBeDefined();
        expect(messages.USE_NESTED_SPREAD).toBeDefined();
        expect(messages.ARRAY_MUTATION).toBeDefined();
        expect(messages.USE_IMMUTABLE_ARRAYS).toBeDefined();
        expect(messages.USE_OBJECT_LITERALS).toBeDefined();
        expect(messages.OBJECT_ASSIGN_MUTATION).toBeDefined();
        expect(messages.USE_PROPER_PATTERNS).toBeDefined();
      });

      it('should contain fileName placeholders', () => {
        const messages = NgRxImmutabilityConfiguration.VALIDATION_MESSAGES;
        expect(messages.DIRECT_STATE_MUTATION).toContain('{fileName}');
        expect(messages.USE_IMMUTABLE_UPDATE).toContain('{fileName}');
        expect(messages.USE_SPREAD_OPERATOR).toContain('{fileName}');
      });
    });

    describe('hasAnyMutationPattern', () => {
      it('should return true when content matches any pattern', () => {
        const patterns = NgRxImmutabilityConfiguration.STATE_MUTATION_PATTERNS;
        const content = 'state.name = "test"';
        expect(
          NgRxImmutabilityConfiguration.hasAnyMutationPattern(content, patterns)
        ).toBe(true);
      });

      it('should return false when content does not match any pattern', () => {
        const patterns = NgRxImmutabilityConfiguration.STATE_MUTATION_PATTERNS;
        const content = 'return { ...state, name: "test" }';
        expect(
          NgRxImmutabilityConfiguration.hasAnyMutationPattern(content, patterns)
        ).toBe(false);
      });
    });

    describe('hasMutatingArrayMethods', () => {
      it('should return true when content has push method', () => {
        expect(
          NgRxImmutabilityConfiguration.hasMutatingArrayMethods(
            'items.push(item)'
          )
        ).toBe(true);
      });

      it('should return true when content has pop method', () => {
        expect(
          NgRxImmutabilityConfiguration.hasMutatingArrayMethods('items.pop()')
        ).toBe(true);
      });

      it('should return true when content has splice method', () => {
        expect(
          NgRxImmutabilityConfiguration.hasMutatingArrayMethods(
            'items.splice(0, 1)'
          )
        ).toBe(true);
      });

      it('should return false when content has no mutating methods', () => {
        expect(
          NgRxImmutabilityConfiguration.hasMutatingArrayMethods(
            'items.concat(newItem)'
          )
        ).toBe(false);
      });
    });

    describe('hasImmutableArrayPatterns', () => {
      it('should return true when content has spread operator', () => {
        expect(
          NgRxImmutabilityConfiguration.hasImmutableArrayPatterns(
            '[...items, newItem]'
          )
        ).toBe(true);
      });

      it('should return true when content has concat method', () => {
        expect(
          NgRxImmutabilityConfiguration.hasImmutableArrayPatterns(
            'items.concat(newItem)'
          )
        ).toBe(true);
      });

      it('should return true when content has slice method', () => {
        expect(
          NgRxImmutabilityConfiguration.hasImmutableArrayPatterns(
            'items.slice(0, 5)'
          )
        ).toBe(true);
      });

      it('should return false when content has no immutable patterns', () => {
        expect(
          NgRxImmutabilityConfiguration.hasImmutableArrayPatterns(
            'items.push(item)'
          )
        ).toBe(false);
      });
    });

    describe('shouldUseSpreads', () => {
      it('should return true when return state without spread and has on(', () => {
        const content = 'on(action, (state) => { return state });';
        expect(NgRxImmutabilityConfiguration.shouldUseSpreads(content)).toBe(
          true
        );
      });

      it('should return false when spread operator is used', () => {
        const content = 'on(action, (state) => ({ ...state, loading: true }));';
        expect(NgRxImmutabilityConfiguration.shouldUseSpreads(content)).toBe(
          false
        );
      });

      it('should return false when no on( function present', () => {
        const content = 'return state';
        expect(NgRxImmutabilityConfiguration.shouldUseSpreads(content)).toBe(
          false
        );
      });
    });

    describe('hasImmerWithoutImport', () => {
      it('should return true when produce is used without immer import', () => {
        const content = 'produce(state, draft => { draft.name = "test"; })';
        expect(
          NgRxImmutabilityConfiguration.hasImmerWithoutImport(content)
        ).toBe(true);
      });

      it('should return false when immer is imported', () => {
        const content = `import { produce } from 'immer';
        produce(state, draft => { draft.name = "test"; })`;
        expect(
          NgRxImmutabilityConfiguration.hasImmerWithoutImport(content)
        ).toBe(false);
      });

      it('should return false when produce is not used', () => {
        const content = 'return { ...state, name: "test" }';
        expect(
          NgRxImmutabilityConfiguration.hasImmerWithoutImport(content)
        ).toBe(false);
      });
    });

    describe('hasImproperReturns', () => {
      it('should return true when on() exists but no proper return', () => {
        const content = 'on(action, (state) => state)';
        expect(NgRxImmutabilityConfiguration.hasImproperReturns(content)).toBe(
          true
        );
      });

      it('should return false when proper return object literal exists', () => {
        const content = 'on(action, (state) => { return { ...state }; })';
        expect(NgRxImmutabilityConfiguration.hasImproperReturns(content)).toBe(
          false
        );
      });

      it('should return false when no on() function present', () => {
        const content = 'const state = { name: "test" }';
        expect(NgRxImmutabilityConfiguration.hasImproperReturns(content)).toBe(
          false
        );
      });
    });

    describe('hasObjectAssignMutation', () => {
      it('should return true when Object.assign with state as target', () => {
        const content = 'Object.assign(state, { name: "test" })';
        expect(
          NgRxImmutabilityConfiguration.hasObjectAssignMutation(content)
        ).toBe(true);
      });

      it('should return false when Object.assign with empty object as target', () => {
        const content = 'Object.assign({}, state, { name: "test" })';
        expect(
          NgRxImmutabilityConfiguration.hasObjectAssignMutation(content)
        ).toBe(false);
      });

      it('should return false when no Object.assign present', () => {
        const content = 'return { ...state, name: "test" }';
        expect(
          NgRxImmutabilityConfiguration.hasObjectAssignMutation(content)
        ).toBe(false);
      });
    });

    describe('analyzeImmutabilityPatterns', () => {
      it('should detect direct mutation', () => {
        const content = 'state.name = "test"';
        const result =
          NgRxImmutabilityConfiguration.analyzeImmutabilityPatterns(content);
        expect(result.hasDirectMutation).toBe(true);
      });

      it('should detect nested mutation', () => {
        const content = 'state.user.name = "test"';
        const result =
          NgRxImmutabilityConfiguration.analyzeImmutabilityPatterns(content);
        expect(result.hasNestedMutation).toBe(true);
      });

      it('should detect array mutation without immutable patterns', () => {
        const content = 'items.push(item)';
        const result =
          NgRxImmutabilityConfiguration.analyzeImmutabilityPatterns(content);
        expect(result.hasArrayMutation).toBe(true);
      });

      it('should not flag array mutation when immutable patterns present', () => {
        const content = '[...items, newItem].push(temp)';
        const result =
          NgRxImmutabilityConfiguration.analyzeImmutabilityPatterns(content);
        expect(result.hasArrayMutation).toBe(false);
      });

      it('should detect need for spread operator', () => {
        const content = 'on(action, (state) => { return state });';
        const result =
          NgRxImmutabilityConfiguration.analyzeImmutabilityPatterns(content);
        expect(result.needsSpreadOperator).toBe(true);
      });

      it('should detect immer without import', () => {
        const content = 'produce(state, draft => { draft.name = "test"; })';
        const result =
          NgRxImmutabilityConfiguration.analyzeImmutabilityPatterns(content);
        expect(result.hasImmerWithoutImport).toBe(true);
      });

      it('should detect improper returns', () => {
        const content = 'on(action, (state) => state)';
        const result =
          NgRxImmutabilityConfiguration.analyzeImmutabilityPatterns(content);
        expect(result.hasImproperReturns).toBe(true);
      });

      it('should detect Object.assign mutation', () => {
        const content = 'Object.assign(state, { name: "test" })';
        const result =
          NgRxImmutabilityConfiguration.analyzeImmutabilityPatterns(content);
        expect(result.hasObjectAssignMutation).toBe(true);
      });

      it('should return all false for compliant code', () => {
        const content = `
          on(loadSuccess, (state, { items }) => ({
            ...state,
            items: [...items],
            loading: false
          }))
        `;
        const result =
          NgRxImmutabilityConfiguration.analyzeImmutabilityPatterns(content);
        expect(result.hasDirectMutation).toBe(false);
        expect(result.hasNestedMutation).toBe(false);
        expect(result.hasArrayMutation).toBe(false);
        expect(result.needsSpreadOperator).toBe(false);
        expect(result.hasImmerWithoutImport).toBe(false);
        expect(result.hasObjectAssignMutation).toBe(false);
      });
    });
  });
});

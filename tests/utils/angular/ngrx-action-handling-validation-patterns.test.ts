/**
 * @fileoverview Tests for ngrx-action-handling-validation-patterns.ts
 * @description Tests for NgRx Action Handling Validation Patterns utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxActionHandlingConfiguration } from '../../../src/utils/angular/ngrx-action-handling/ngrx-action-handling-configuration';
import { NgRxActionHandlingValidationPatterns } from '../../../src/utils/angular/ngrx-action-handling/ngrx-action-handling-validation-patterns';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/ngrx-action-handling/ngrx-action-handling-validation-patterns', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxActionHandlingValidationPatterns', () => {
    describe('validateAllActionHandlingPatterns', () => {
      it('should return empty results when src directory does not exist', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(false);

        const result =
          NgRxActionHandlingValidationPatterns.validateAllActionHandlingPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should return empty results when no reducer files found', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue([]);

        const result =
          NgRxActionHandlingValidationPatterns.validateAllActionHandlingPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });
    });

    describe('analyzeReducerFile', () => {
      it('should detect reducer without action handlers', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { createReducer } from '@ngrx/store';
          export const reducer = createReducer(initialState);
        `);
        basenameSpy.mockReturnValue('test.reducer.ts');

        NgRxActionHandlingValidationPatterns.analyzeReducerFile(
          '/test/test.reducer.ts',
          violations,
          suggestions
        );

        expect(violations.some(v => v.includes('action handlers'))).toBe(true);
      });

      it('should not flag reducer with action handlers', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { createReducer, on } from '@ngrx/store';
          export const reducer = createReducer(
            initialState,
            on(increment, state => ({ ...state, count: state.count + 1 }))
          );
        `);
        basenameSpy.mockReturnValue('test.reducer.ts');

        NgRxActionHandlingValidationPatterns.analyzeReducerFile(
          '/test/test.reducer.ts',
          violations,
          suggestions
        );

        expect(
          violations.filter(v => v.includes('No action handlers')).length
        ).toBe(0);
      });

      it('should suggest proper imports when on() is used without import', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          export const reducer = createReducer(
            initialState,
            on(increment, state => ({ ...state }))
          );
        `);
        basenameSpy.mockReturnValue('test.reducer.ts');

        NgRxActionHandlingValidationPatterns.analyzeReducerFile(
          '/test/test.reducer.ts',
          violations,
          suggestions
        );

        expect(suggestions.some(s => s.includes('imports'))).toBe(true);
      });

      it('should suggest separate handlers for multi-action pattern', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { createReducer, on } from '@ngrx/store';
          export const reducer = createReducer(
            initialState,
            on(action1, action2, state => ({ ...state }))
          );
        `);
        basenameSpy.mockReturnValue('test.reducer.ts');

        NgRxActionHandlingValidationPatterns.analyzeReducerFile(
          '/test/test.reducer.ts',
          violations,
          suggestions
        );

        expect(suggestions.some(s => s.includes('separate'))).toBe(true);
      });

      it('should suggest using action payloads', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { createReducer, on } from '@ngrx/store';
          export const reducer = createReducer(
            initialState,
            on(increment, state => ({ ...state, count: state.count + 1 }))
          );
        `);
        basenameSpy.mockReturnValue('test.reducer.ts');

        NgRxActionHandlingValidationPatterns.analyzeReducerFile(
          '/test/test.reducer.ts',
          violations,
          suggestions
        );

        expect(suggestions.some(s => s.includes('payload'))).toBe(true);
      });

      it('should suggest error handling for loading actions', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { createReducer, on } from '@ngrx/store';
          export const reducer = createReducer(
            initialState,
            on(loadDataRequest, state => ({ ...state, loading: true }))
          );
        `);
        basenameSpy.mockReturnValue('test.reducer.ts');

        NgRxActionHandlingValidationPatterns.analyzeReducerFile(
          '/test/test.reducer.ts',
          violations,
          suggestions
        );

        expect(suggestions.some(s => s.includes('error'))).toBe(true);
      });

      it('should suggest success actions for loading actions', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { createReducer, on } from '@ngrx/store';
          export const reducer = createReducer(
            initialState,
            on(loadDataRequest, state => ({ ...state, loading: true }))
          );
        `);
        basenameSpy.mockReturnValue('test.reducer.ts');

        NgRxActionHandlingValidationPatterns.analyzeReducerFile(
          '/test/test.reducer.ts',
          violations,
          suggestions
        );

        expect(suggestions.some(s => s.includes('success'))).toBe(true);
      });

      it('should not suggest error handling when error actions exist', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { createReducer, on } from '@ngrx/store';
          export const reducer = createReducer(
            initialState,
            on(loadDataRequest, state => ({ ...state, loading: true })),
            on(loadDataError, state => ({ ...state, loading: false, error: null })),
            on(loadDataSuccess, state => ({ ...state, loading: false }))
          );
        `);
        basenameSpy.mockReturnValue('test.reducer.ts');

        NgRxActionHandlingValidationPatterns.analyzeReducerFile(
          '/test/test.reducer.ts',
          violations,
          suggestions
        );

        expect(
          suggestions.filter(s => s.includes('Consider adding error handling'))
            .length
        ).toBe(0);
      });

      it('should detect violations when not using spread operator', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { createReducer, on } from '@ngrx/store';
          export const reducer = createReducer(
            initialState,
            on(increment, state => ({ count: state.count + 1 }))
          );
        `);
        basenameSpy.mockReturnValue('test.reducer.ts');

        NgRxActionHandlingValidationPatterns.analyzeReducerFile(
          '/test/test.reducer.ts',
          violations,
          suggestions
        );

        expect(violations.some(v => v.includes('spread'))).toBe(true);
      });

      it('should detect side effects in reducer', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { createReducer, on } from '@ngrx/store';
          export const reducer = createReducer(
            initialState,
            on(increment, state => {
              console.log('Side effect!');
              return { ...state, count: state.count + 1 };
            })
          );
        `);
        basenameSpy.mockReturnValue('test.reducer.ts');

        NgRxActionHandlingValidationPatterns.analyzeReducerFile(
          '/test/test.reducer.ts',
          violations,
          suggestions
        );

        expect(violations.some(v => v.includes('Side effect'))).toBe(true);
        expect(suggestions.some(s => s.includes('effects'))).toBe(true);
      });

      it('should handle empty file content', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');

        readFileSpy.mockReturnValue('');

        NgRxActionHandlingValidationPatterns.analyzeReducerFile(
          '/test/empty.reducer.ts',
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
        expect(suggestions).toHaveLength(0);
      });
    });

    describe('message formatting', () => {
      it('should include fileName in violation messages', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { createReducer } from '@ngrx/store';
          export const reducer = createReducer(initialState);
        `);
        basenameSpy.mockReturnValue('my-feature.reducer.ts');

        NgRxActionHandlingValidationPatterns.analyzeReducerFile(
          '/test/my-feature.reducer.ts',
          violations,
          suggestions
        );

        expect(violations.some(v => v.includes('my-feature.reducer.ts'))).toBe(
          true
        );
      });

      it('should include fileName in suggestion messages', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { createReducer, on } from '@ngrx/store';
          export const reducer = createReducer(
            initialState,
            on(loadingRequest, state => ({ ...state }))
          );
        `);
        basenameSpy.mockReturnValue('my-feature.reducer.ts');

        NgRxActionHandlingValidationPatterns.analyzeReducerFile(
          '/test/my-feature.reducer.ts',
          violations,
          suggestions
        );

        expect(suggestions.some(s => s.includes('my-feature.reducer.ts'))).toBe(
          true
        );
      });
    });
  });

  describe('NgRxActionHandlingConfiguration', () => {
    describe('analyzeActionHandlingPatterns', () => {
      it('should detect createReducer keyword', () => {
        const content = `export const reducer = createReducer(initialState);`;
        const patterns =
          NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(
            content
          );

        expect(patterns.hasCreateReducer).toBe(true);
      });

      it('should count on() function occurrences', () => {
        const content = `
          on(action1, state => state),
          on(action2, state => state),
          on(action3, state => state)
        `;
        const patterns =
          NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(
            content
          );

        expect(patterns.onFunctionCount).toBe(3);
      });

      it('should detect import statement', () => {
        const content = `import { createReducer } from '@ngrx/store';`;
        const patterns =
          NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(
            content
          );

        expect(patterns.hasImports).toBe(true);
      });

      it('should detect multi-action pattern', () => {
        const content = `on(action1, action2, state => state)`;
        const patterns =
          NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(
            content
          );

        expect(patterns.hasMultiActionPattern).toBe(true);
      });

      it('should detect action payload usage', () => {
        const content = `on(setName, (state, action) => ({ ...state, name: action.payload }))`;
        const patterns =
          NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(
            content
          );

        expect(patterns.hasActionPayload).toBe(true);
      });

      it('should detect loading action types', () => {
        const content = `on(loadRequest, state => state)`;
        const patterns =
          NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(
            content
          );

        expect(patterns.hasLoadingActions).toBe(true);
      });

      it('should detect error action types', () => {
        const content = `on(loadError, state => state)`;
        const patterns =
          NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(
            content
          );

        expect(patterns.hasErrorActions).toBe(true);
      });

      it('should detect success action types', () => {
        const content = `on(loadSuccess, state => state)`;
        const patterns =
          NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(
            content
          );

        expect(patterns.hasSuccessActions).toBe(true);
      });

      it('should detect loading state', () => {
        const content = `loading: true`;
        const patterns =
          NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(
            content
          );

        expect(patterns.hasLoadingState).toBe(true);
      });

      it('should detect boolean values', () => {
        const content = `loading: true, completed: false`;
        const patterns =
          NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(
            content
          );

        expect(patterns.hasBooleanValues).toBe(true);
      });

      it('should detect error state', () => {
        const content = `error: null`;
        const patterns =
          NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(
            content
          );

        expect(patterns.hasErrorState).toBe(true);
      });

      it('should detect null value', () => {
        const content = `error: null`;
        const patterns =
          NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(
            content
          );

        expect(patterns.hasNullValue).toBe(true);
      });

      it('should detect spread operator', () => {
        const content = `({ ...state, count: 1 })`;
        const patterns =
          NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(
            content
          );

        expect(patterns.hasSpreadOperator).toBe(true);
      });
    });

    describe('detectSideEffects', () => {
      it('should detect console.log as side effect', () => {
        const content = `console.log('test');`;
        const result =
          NgRxActionHandlingConfiguration.detectSideEffects(content);

        expect(result).toBe(true);
      });

      it('should detect alert as side effect', () => {
        const content = `alert('test');`;
        const result =
          NgRxActionHandlingConfiguration.detectSideEffects(content);

        expect(result).toBe(true);
      });

      it('should detect localStorage as side effect', () => {
        const content = `localStorage.setItem('key', 'value');`;
        const result =
          NgRxActionHandlingConfiguration.detectSideEffects(content);

        expect(result).toBe(true);
      });

      it('should detect fetch as side effect', () => {
        const content = `fetch('/api/data');`;
        const result =
          NgRxActionHandlingConfiguration.detectSideEffects(content);

        expect(result).toBe(true);
      });

      it('should detect Math.random as side effect', () => {
        const content = `const id = Math.random();`;
        const result =
          NgRxActionHandlingConfiguration.detectSideEffects(content);

        expect(result).toBe(true);
      });

      it('should detect Date.now as side effect', () => {
        const content = `const timestamp = Date.now();`;
        const result =
          NgRxActionHandlingConfiguration.detectSideEffects(content);

        expect(result).toBe(true);
      });

      it('should not detect side effects in pure reducer', () => {
        const content = `({ ...state, count: state.count + 1 })`;
        const result =
          NgRxActionHandlingConfiguration.detectSideEffects(content);

        expect(result).toBe(false);
      });
    });

    describe('hasActionType', () => {
      it('should detect action type from list', () => {
        const content = `on(loadDataSuccess, state => state)`;
        const actionTypes = ['Success', 'Complete'];
        const result = NgRxActionHandlingConfiguration.hasActionType(
          content,
          actionTypes
        );

        expect(result).toBe(true);
      });

      it('should return false when no action types match', () => {
        const content = `on(increment, state => state)`;
        const actionTypes = ['Success', 'Complete'];
        const result = NgRxActionHandlingConfiguration.hasActionType(
          content,
          actionTypes
        );

        expect(result).toBe(false);
      });
    });
  });
});

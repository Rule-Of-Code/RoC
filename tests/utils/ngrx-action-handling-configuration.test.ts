/**
 * @fileoverview Tests for ngrx-action-handling-configuration.ts
 * @description Tests for NgRx action handling configuration utilities
 */

import { NgRxActionHandlingConfiguration } from '../../src/utils/angular/ngrx-action-handling/ngrx-action-handling-configuration';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/ngrx-action-handling/ngrx-action-handling-configuration', () => {
  let tempDir: string;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('ngrx-action-handling-test-');
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleSpy.mockRestore();
  });

  describe('ACTION_HANDLING_PATTERNS', () => {
    describe('NGRX_KEYWORDS', () => {
      it('should have CREATE_REDUCER', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS.NGRX_KEYWORDS
            .CREATE_REDUCER
        ).toBe('createReducer');
      });

      it('should have ON_FUNCTION', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS.NGRX_KEYWORDS
            .ON_FUNCTION
        ).toBe('on(');
      });

      it('should have SPREAD_OPERATOR', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS.NGRX_KEYWORDS
            .SPREAD_OPERATOR
        ).toBe('...');
      });
    });

    describe('ANGULAR_CONSTANTS', () => {
      it('should have IMPORT', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .ANGULAR_CONSTANTS.IMPORT
        ).toBe('import');
      });

      it('should have ENCODING_UTF8', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .ANGULAR_CONSTANTS.ENCODING_UTF8
        ).toBe('utf8');
      });

      it('should have CONSOLE_DOT', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .ANGULAR_CONSTANTS.CONSOLE_DOT
        ).toBe('console.');
      });

      it('should have ALERT_FUNCTION', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .ANGULAR_CONSTANTS.ALERT_FUNCTION
        ).toBe('alert(');
      });

      it('should have DOCUMENT_DOT', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .ANGULAR_CONSTANTS.DOCUMENT_DOT
        ).toBe('document.');
      });

      it('should have WINDOW_DOT', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .ANGULAR_CONSTANTS.WINDOW_DOT
        ).toBe('window.');
      });

      it('should have LOCAL_STORAGE_DOT', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .ANGULAR_CONSTANTS.LOCAL_STORAGE_DOT
        ).toBe('localStorage.');
      });

      it('should have HTTP_DOT', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .ANGULAR_CONSTANTS.HTTP_DOT
        ).toBe('http.');
      });

      it('should have SUBSCRIBE', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .ANGULAR_CONSTANTS.SUBSCRIBE
        ).toBe('subscribe(');
      });
    });

    describe('PAYLOAD_PATTERNS', () => {
      it('should include action.payload', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .PAYLOAD_PATTERNS
        ).toContain('action.payload');
      });

      it('should include action.', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .PAYLOAD_PATTERNS
        ).toContain('action.');
      });
    });

    describe('ASYNC_ACTION_TYPES', () => {
      it('should have ERROR_TYPES', () => {
        const errorTypes =
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .ASYNC_ACTION_TYPES.ERROR_TYPES;
        expect(errorTypes).toContain('Error');
        expect(errorTypes).toContain('Failure');
        expect(errorTypes).toContain('Failed');
      });

      it('should have LOADING_TYPES', () => {
        const loadingTypes =
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .ASYNC_ACTION_TYPES.LOADING_TYPES;
        expect(loadingTypes).toContain('Loading');
        expect(loadingTypes).toContain('Request');
        expect(loadingTypes).toContain('Start');
      });

      it('should have SUCCESS_TYPES', () => {
        const successTypes =
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .ASYNC_ACTION_TYPES.SUCCESS_TYPES;
        expect(successTypes).toContain('Success');
        expect(successTypes).toContain('Complete');
        expect(successTypes).toContain('Loaded');
      });
    });

    describe('STATE_PATTERNS', () => {
      it('should have LOADING_INDICATORS', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .STATE_PATTERNS.LOADING_INDICATORS
        ).toContain('loading');
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .STATE_PATTERNS.LOADING_INDICATORS
        ).toContain('isLoading');
      });

      it('should have BOOLEAN_VALUES', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .STATE_PATTERNS.BOOLEAN_VALUES
        ).toContain('true');
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .STATE_PATTERNS.BOOLEAN_VALUES
        ).toContain('false');
      });

      it('should have ERROR_INDICATORS', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .STATE_PATTERNS.ERROR_INDICATORS
        ).toContain('error');
      });

      it('should have NULL_VALUE', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .STATE_PATTERNS.NULL_VALUE
        ).toBe('null');
      });
    });

    describe('FILE_EXTENSIONS', () => {
      it('should have REDUCER_TS', () => {
        expect(
          NgRxActionHandlingConfiguration.ACTION_HANDLING_PATTERNS
            .FILE_EXTENSIONS.REDUCER_TS
        ).toBe('.reducer.ts');
      });
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should have NO_ACTION_HANDLERS_VIOLATION with placeholder', () => {
      expect(
        NgRxActionHandlingConfiguration.VALIDATION_MESSAGES
          .NO_ACTION_HANDLERS_VIOLATION
      ).toContain('{fileName}');
    });

    it('should have NO_ACTION_HANDLERS_SUGGESTION with placeholder', () => {
      expect(
        NgRxActionHandlingConfiguration.VALIDATION_MESSAGES
          .NO_ACTION_HANDLERS_SUGGESTION
      ).toContain('{fileName}');
      expect(
        NgRxActionHandlingConfiguration.VALIDATION_MESSAGES
          .NO_ACTION_HANDLERS_SUGGESTION
      ).toContain('on()');
    });

    it('should have PROPER_IMPORTS_SUGGESTION with placeholder', () => {
      expect(
        NgRxActionHandlingConfiguration.VALIDATION_MESSAGES
          .PROPER_IMPORTS_SUGGESTION
      ).toContain('{fileName}');
    });

    it('should have SEPARATE_HANDLERS_SUGGESTION with placeholder', () => {
      expect(
        NgRxActionHandlingConfiguration.VALIDATION_MESSAGES
          .SEPARATE_HANDLERS_SUGGESTION
      ).toContain('{fileName}');
    });

    it('should have USE_ACTION_PAYLOADS_SUGGESTION with placeholder', () => {
      expect(
        NgRxActionHandlingConfiguration.VALIDATION_MESSAGES
          .USE_ACTION_PAYLOADS_SUGGESTION
      ).toContain('{fileName}');
    });

    it('should have ERROR_HANDLING_SUGGESTION with placeholder', () => {
      expect(
        NgRxActionHandlingConfiguration.VALIDATION_MESSAGES
          .ERROR_HANDLING_SUGGESTION
      ).toContain('{fileName}');
    });

    it('should have SUCCESS_ACTIONS_SUGGESTION with placeholder', () => {
      expect(
        NgRxActionHandlingConfiguration.VALIDATION_MESSAGES
          .SUCCESS_ACTIONS_SUGGESTION
      ).toContain('{fileName}');
    });

    it('should have LOADING_STATE_SUGGESTION with placeholder', () => {
      expect(
        NgRxActionHandlingConfiguration.VALIDATION_MESSAGES
          .LOADING_STATE_SUGGESTION
      ).toContain('{fileName}');
    });

    it('should have ERROR_STATE_SUGGESTION with placeholder', () => {
      expect(
        NgRxActionHandlingConfiguration.VALIDATION_MESSAGES
          .ERROR_STATE_SUGGESTION
      ).toContain('{fileName}');
    });

    it('should have PRESERVE_STATE_VIOLATION with placeholder', () => {
      expect(
        NgRxActionHandlingConfiguration.VALIDATION_MESSAGES
          .PRESERVE_STATE_VIOLATION
      ).toContain('{fileName}');
      expect(
        NgRxActionHandlingConfiguration.VALIDATION_MESSAGES
          .PRESERVE_STATE_VIOLATION
      ).toContain('spread');
    });

    it('should have PRESERVE_STATE_SUGGESTION with placeholder', () => {
      expect(
        NgRxActionHandlingConfiguration.VALIDATION_MESSAGES
          .PRESERVE_STATE_SUGGESTION
      ).toContain('{fileName}');
    });

    it('should have SIDE_EFFECT_VIOLATION with placeholder', () => {
      expect(
        NgRxActionHandlingConfiguration.VALIDATION_MESSAGES
          .SIDE_EFFECT_VIOLATION
      ).toContain('{fileName}');
    });

    it('should have SIDE_EFFECT_SUGGESTION with placeholder', () => {
      expect(
        NgRxActionHandlingConfiguration.VALIDATION_MESSAGES
          .SIDE_EFFECT_SUGGESTION
      ).toContain('{fileName}');
      expect(
        NgRxActionHandlingConfiguration.VALIDATION_MESSAGES
          .SIDE_EFFECT_SUGGESTION
      ).toContain('effects');
    });
  });

  describe('analyzeActionHandlingPatterns', () => {
    it('should detect createReducer', () => {
      const content = `
        export const reducer = createReducer(
          initialState,
          on(loadItems, state => ({ ...state, loading: true }))
        );
      `;
      const result =
        NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(content);

      expect(result.hasCreateReducer).toBe(true);
    });

    it('should count on() functions', () => {
      const content = `
        on(loadItems, state => ({ ...state })),
        on(loadItemsSuccess, state => ({ ...state })),
        on(loadItemsFailure, state => ({ ...state }))
      `;
      const result =
        NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(content);

      expect(result.onFunctionCount).toBe(3);
    });

    it('should detect imports', () => {
      const content = `import { createReducer, on } from '@ngrx/store';`;
      const result =
        NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(content);

      expect(result.hasImports).toBe(true);
    });

    it('should detect multi-action pattern', () => {
      const content = `on(action1, action2, state => ({ ...state }))`;
      const result =
        NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(content);

      expect(result.hasMultiActionPattern).toBe(true);
    });

    it('should detect action payload', () => {
      const content = `on(loadItemsSuccess, (state, action) => ({ ...state, items: action.payload }))`;
      const result =
        NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(content);

      expect(result.hasActionPayload).toBe(true);
    });

    it('should detect on() function', () => {
      const content = `on(loadItems, state => ({ ...state }))`;
      const result =
        NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(content);

      expect(result.hasOnFunction).toBe(true);
    });

    it('should detect error actions', () => {
      const content = `on(loadItemsError, state => ({ ...state, error: true }))`;
      const result =
        NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(content);

      expect(result.hasErrorActions).toBe(true);
    });

    it('should detect loading actions', () => {
      const content = `on(loadItemsLoading, state => ({ ...state, loading: true }))`;
      const result =
        NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(content);

      expect(result.hasLoadingActions).toBe(true);
    });

    it('should detect success actions', () => {
      const content = `on(loadItemsSuccess, state => ({ ...state }))`;
      const result =
        NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(content);

      expect(result.hasSuccessActions).toBe(true);
    });

    it('should detect loading state', () => {
      const content = `loading: true`;
      const result =
        NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(content);

      expect(result.hasLoadingState).toBe(true);
    });

    it('should detect boolean values', () => {
      const content = `loading: true, completed: false`;
      const result =
        NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(content);

      expect(result.hasBooleanValues).toBe(true);
    });

    it('should detect error state', () => {
      const content = `error: null`;
      const result =
        NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(content);

      expect(result.hasErrorState).toBe(true);
    });

    it('should detect null value', () => {
      const content = `error: null`;
      const result =
        NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(content);

      expect(result.hasNullValue).toBe(true);
    });

    it('should detect spread operator', () => {
      const content = `({ ...state, loading: true })`;
      const result =
        NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(content);

      expect(result.hasSpreadOperator).toBe(true);
    });

    it('should detect side effects', () => {
      const content = `
        on(loadItems, state => {
          console.log('loading');
          return { ...state };
        })
      `;
      const result =
        NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(content);

      expect(result.hasSideEffects).toBe(true);
    });

    it('should return complete analysis for reducer content', () => {
      const content = `
        import { createReducer, on } from '@ngrx/store';

        export const reducer = createReducer(
          initialState,
          on(loadItems, state => ({ ...state, loading: true })),
          on(loadItemsSuccess, (state, action) => ({
            ...state,
            items: action.payload,
            loading: false,
            error: null
          })),
          on(loadItemsError, state => ({ ...state, loading: false, error: true }))
        );
      `;
      const result =
        NgRxActionHandlingConfiguration.analyzeActionHandlingPatterns(content);

      expect(result.hasCreateReducer).toBe(true);
      expect(result.hasImports).toBe(true);
      expect(result.hasOnFunction).toBe(true);
      expect(result.hasSpreadOperator).toBe(true);
      expect(result.hasActionPayload).toBe(true);
      expect(result.onFunctionCount).toBe(3);
    });
  });
});

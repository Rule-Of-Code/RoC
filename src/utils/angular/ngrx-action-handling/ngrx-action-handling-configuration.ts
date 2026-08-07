/**
 * NgRx Action Handling Configuration
 * Meta-dogfooding: Centralized configuration, patterns, and detection logic for NgRx action handling analysis
 */
import { NgRxConfigurationBase } from '../ngrx-configuration-base';

export class NgRxActionHandlingConfiguration extends NgRxConfigurationBase {
  /**
   * Config alias for cleaner internal references (RULE 2 pattern)
   */
  private static readonly Config = NgRxActionHandlingConfiguration;

  /**
   * NgRx action handling detection patterns
   */
  static readonly ACTION_HANDLING_PATTERNS = {
    NGRX_KEYWORDS: {
      CREATE_REDUCER: 'createReducer',
      ON_FUNCTION: 'on(',
      SPREAD_OPERATOR: '...',
    },
    ANGULAR_CONSTANTS: {
      IMPORT: 'import',
      ENCODING_UTF8: 'utf8',
      CONSOLE_DOT: 'console.',
      ALERT_FUNCTION: 'alert(',
      DOCUMENT_DOT: 'document.',
      WINDOW_DOT: 'window.',
      LOCAL_STORAGE_DOT: 'localStorage.',
      SESSION_STORAGE_DOT: 'sessionStorage.',
      FETCH_FUNCTION: 'fetch(',
      HTTP_DOT: 'http.',
      SUBSCRIBE: 'subscribe(',
      MATH_RANDOM: 'Math.random',
      DATE_NOW: 'Date.now',
      NEW_DATE: 'new Date',
    },
    PAYLOAD_PATTERNS: ['action.payload', 'action.'],
    ASYNC_ACTION_TYPES: {
      ERROR_TYPES: ['Error', 'Failure', 'Failed'],
      LOADING_TYPES: ['Loading', 'Request', 'Start'],
      SUCCESS_TYPES: ['Success', 'Complete', 'Loaded'],
    },
    STATE_PATTERNS: {
      LOADING_INDICATORS: ['loading', 'isLoading'],
      BOOLEAN_VALUES: ['true', 'false'],
      ERROR_INDICATORS: ['error'],
      NULL_VALUE: 'null',
    },
    FILE_EXTENSIONS: {
      REDUCER_TS: '.reducer.ts',
    },
  } as const;

  /**
   * Validation messages for NgRx action handling analysis
   */
  static readonly VALIDATION_MESSAGES = {
    NO_ACTION_HANDLERS_VIOLATION:
      'No action handlers found in reducer {fileName}',
    NO_ACTION_HANDLERS_SUGGESTION:
      'Add action handlers using on() functions in {fileName}',
    PROPER_IMPORTS_SUGGESTION: 'Ensure proper action imports in {fileName}',
    SEPARATE_HANDLERS_SUGGESTION:
      'Consider separate handlers for different actions in {fileName}',
    USE_ACTION_PAYLOADS_SUGGESTION:
      'Consider using action payloads for data passing in {fileName}',
    ERROR_HANDLING_SUGGESTION:
      'Consider adding error handling actions in {fileName}',
    SUCCESS_ACTIONS_SUGGESTION: 'Consider adding success actions in {fileName}',
    LOADING_STATE_SUGGESTION:
      'Ensure proper loading state boolean values in {fileName}',
    ERROR_STATE_SUGGESTION: 'Initialize error state to null in {fileName}',
    PRESERVE_STATE_VIOLATION:
      'Action handlers should preserve state shape with spread operator in {fileName}',
    PRESERVE_STATE_SUGGESTION:
      'Use ... spread operator in all action handlers in {fileName}',
    SIDE_EFFECT_VIOLATION: 'Side effect detected in reducer {fileName}',
    SIDE_EFFECT_SUGGESTION:
      'Move side effects to effects, keep reducers pure in {fileName}',
  } as const;

  /**
   * Analyze NgRx action handling patterns in content
   * RULE 2: Optimized to cache pattern references and eliminate duplicate lookups
   */
  static analyzeActionHandlingPatterns(content: string): {
    hasCreateReducer: boolean;
    onFunctionCount: number;
    hasImports: boolean;
    hasMultiActionPattern: boolean;
    hasActionPayload: boolean;
    hasOnFunction: boolean;
    hasErrorActions: boolean;
    hasLoadingActions: boolean;
    hasSuccessActions: boolean;
    hasLoadingState: boolean;
    hasBooleanValues: boolean;
    hasErrorState: boolean;
    hasNullValue: boolean;
    hasSpreadOperator: boolean;
    hasSideEffects: boolean;
  } {
    // Cache pattern references for reuse
    const ngrxKeywords = this.ACTION_HANDLING_PATTERNS.NGRX_KEYWORDS;
    const angularConstants = this.ACTION_HANDLING_PATTERNS.ANGULAR_CONSTANTS;
    const asyncActionTypes = this.ACTION_HANDLING_PATTERNS.ASYNC_ACTION_TYPES;
    const statePatterns = this.ACTION_HANDLING_PATTERNS.STATE_PATTERNS;
    const payloadPatterns = this.ACTION_HANDLING_PATTERNS.PAYLOAD_PATTERNS;

    const hasCreateReducer = content.includes(ngrxKeywords.CREATE_REDUCER);
    const onFunctionCount = (content.match(/on\(/g) ?? []).length;
    const hasImports = content.includes(angularConstants.IMPORT);
    const multiActionPattern = /on\([^,)]+,[^,)]+,/;
    const hasMultiActionPattern = multiActionPattern.test(content);

    const hasActionPayload = payloadPatterns.some(pattern =>
      content.includes(pattern)
    );
    const hasOnFunction = content.includes(ngrxKeywords.ON_FUNCTION);

    const hasErrorActions = this.hasActionType(
      content,
      asyncActionTypes.ERROR_TYPES
    );
    const hasLoadingActions = this.hasActionType(
      content,
      asyncActionTypes.LOADING_TYPES
    );
    const hasSuccessActions = this.hasActionType(
      content,
      asyncActionTypes.SUCCESS_TYPES
    );

    const hasLoadingState = statePatterns.LOADING_INDICATORS.some(indicator =>
      content.includes(indicator)
    );
    const hasBooleanValues = statePatterns.BOOLEAN_VALUES.every(value =>
      content.includes(value)
    );
    const hasErrorState = statePatterns.ERROR_INDICATORS.some(indicator =>
      content.includes(indicator)
    );
    const hasNullValue = content.includes(statePatterns.NULL_VALUE);
    const hasSpreadOperator = content.includes(ngrxKeywords.SPREAD_OPERATOR);

    const hasSideEffects = this.detectSideEffects(content);

    return {
      hasCreateReducer,
      onFunctionCount,
      hasImports,
      hasMultiActionPattern,
      hasActionPayload,
      hasOnFunction,
      hasErrorActions,
      hasLoadingActions,
      hasSuccessActions,
      hasLoadingState,
      hasBooleanValues,
      hasErrorState,
      hasNullValue,
      hasSpreadOperator,
      hasSideEffects,
    };
  }

  /**
   * Check if content has any of the action types
   */
  static hasActionType(
    content: string,
    actionTypes: readonly string[]
  ): boolean {
    return actionTypes.some(type => content.includes(type));
  }

  /**
   * Detect side effects in reducer content
   * RULE 2: Optimized to cache pattern references and reuse regex patterns
   */
  static detectSideEffects(content: string): boolean {
    // Cache pattern references for reuse
    const constants = this.ACTION_HANDLING_PATTERNS.ANGULAR_CONSTANTS;

    const sideEffectPatterns = [
      new RegExp(constants.CONSOLE_DOT.replace('.', '\\.')),
      new RegExp(constants.ALERT_FUNCTION.replace('(', '\\(')),
      new RegExp(constants.DOCUMENT_DOT.replace('.', '\\.')),
      new RegExp(constants.WINDOW_DOT.replace('.', '\\.')),
      new RegExp(constants.LOCAL_STORAGE_DOT.replace('.', '\\.')),
      new RegExp(constants.SESSION_STORAGE_DOT.replace('.', '\\.')),
      new RegExp(constants.FETCH_FUNCTION.replace('(', '\\(')),
      new RegExp(constants.HTTP_DOT.replace('.', '\\.')),
      new RegExp(`\\.${constants.SUBSCRIBE.replace('(', '\\(')}`),
      new RegExp(constants.MATH_RANDOM),
      new RegExp(constants.DATE_NOW),
      new RegExp(constants.NEW_DATE),
    ];

    return sideEffectPatterns.some(pattern => pattern.test(content));
  }
}

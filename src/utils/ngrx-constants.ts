/**
 * NgRx State Management Constants
 * RULE 2: Specialized constants module for NgRx-specific configurations
 */

// NgRx-specific constants
export const NGRX_CONSTANTS = {
  // NgRx package names and imports
  NGRX_STORE: '@ngrx/store',
  NGRX_EFFECTS: '@ngrx/effects',
  NGRX_ENTITY: '@ngrx/entity',
  NGRX_DEVTOOLS: '@ngrx/store-devtools',
  NGRX_ROUTER_STORE: '@ngrx/router-store',
  NGRX_DATA: '@ngrx/data',
  NGRX_SCHEMATICS: '@ngrx/schematics',

  // Store configuration
  STORE: 'Store',
  STORE_MODULE: 'StoreModule',
  STORE_FOR_ROOT: 'StoreModule.forRoot',
  STORE_FOR_FEATURE: 'StoreModule.forFeature',
  STORE_DEVTOOLS_MODULE: 'StoreDevtoolsModule',
  STORE_DEVTOOLS_INSTRUMENT: 'StoreDevtoolsModule.instrument',
  STORE_ROUTER_CONNECTING_MODULE: 'StoreRouterConnectingModule',
  STORE_ROUTER_FOR_ROOT: 'StoreRouterConnectingModule.forRoot',

  // Effects
  EFFECTS_MODULE: 'EffectsModule',
  EFFECTS_FOR_ROOT: 'EffectsModule.forRoot',
  EFFECTS_FOR_FEATURE: 'EffectsModule.forFeature',
  EFFECTS_RUN: 'EffectsModule.run',
  EFFECT: 'Effect',
  CREATE_EFFECT: 'createEffect',
  ACTIONS: 'Actions',
  OF_TYPE: 'ofType',

  // Entity
  ENTITY_ADAPTER: 'EntityAdapter',
  ENTITY_STATE: 'EntityState',
  CREATE_ENTITY_ADAPTER: 'createEntityAdapter',

  // Action patterns
  ACTION: 'Action',
  CREATE_ACTION: 'createAction',
  PROPS: 'props',
  TYPE: 'type',
  PAYLOAD: 'payload',
  ACTION_CREATOR: 'ActionCreator',

  // Reducer patterns
  REDUCER: 'Reducer',
  CREATE_REDUCER: 'createReducer',
  ON: 'on',
  INITIAL_STATE: 'initialState',
  STATE: 'State',

  // Selector patterns
  SELECTOR: 'Selector',
  CREATE_SELECTOR: 'createSelector',
  CREATE_FEATURE_SELECTOR: 'createFeatureSelector',
  GET_SELECTORS: 'getSelectors',

  // Router store
  ROUTER_STATE: 'RouterState',
  ROUTER_NAVIGATION_ACTION: 'ROUTER_NAVIGATION',
  ROUTER_REQUEST_ACTION: 'ROUTER_REQUEST',
  ROUTER_NAVIGATED_ACTION: 'ROUTER_NAVIGATED',
  ROUTER_CANCEL_ACTION: 'ROUTER_CANCEL',
  ROUTER_ERROR_ACTION: 'ROUTER_ERROR',

  // File naming conventions
  ACTIONS_SUFFIX: '.actions.ts',
  REDUCER_SUFFIX: '.reducer.ts',
  EFFECTS_SUFFIX: '.effects.ts',
  SELECTORS_SUFFIX: '.selectors.ts',
  STATE_SUFFIX: '.state.ts',

  // Store structure keywords
  FEATURE_KEY: 'featureKey',
  SLICE_NAME: 'sliceName',
  NAMESPACE: 'namespace',

  // DevTools keywords
  MAX_AGE: 'maxAge',
  TRACE: 'trace',
  TRACE_LIMIT: 'traceLimit',
  SERIALIZE: 'serialize',
  ACTION_SANITIZER: 'actionSanitizer',
  STATE_SANITIZER: 'stateSanitizer',
  PREDICATE: 'predicate',
  MONITOR_REDUCER_OPTION: 'monitor',

  // Common patterns
  DISPATCH: 'dispatch',
  SELECT: 'select',
  PIPE: 'pipe',
  MAP: 'map',
  SUBSCRIBE: 'subscribe',

  // Testing keywords
  MOCK_STORE: 'MockStore',
  PROVIDE_MOCK_STORE: 'provideMockStore',
  TESTING_MODULE: 'TestingModule',

  // Configuration methods
  FOR_ROOT: 'forRoot',
  FOR_FEATURE: 'forFeature',
  WITH_ROUTER_STATE: 'withRouterState',

  // Error handling
  CATCH_ERROR: 'catchError',
  ERROR: 'error',

  // Update keywords
  UPDATE: 'update',
  UPSERT: 'upsert',
  ADD: 'add',
  REMOVE: 'remove',
  CLEAR: 'clear',

  // Common types
  OBSERVABLE: 'Observable',
  VOID: 'void',
  ANY: 'any',
  UNKNOWN: 'unknown',
} as const;

// NgRx configuration and validation messages
export const NGRX_VALIDATION_MESSAGES = {
  STORE: {
    STORE_FORROOT_NOT_FOUND:
      'StoreModule.forRoot() is not configured for the NgRx store in {fileName}',
    STORE_DEVTOOLS_NOT_FOUND:
      'StoreDevtoolsModule.instrument() is not configured for development in {fileName}',
    STORE_MODULE_NOT_IMPORTED:
      'StoreModule is not imported from @ngrx/store in {fileName}',
    STORE_ROUTER_MODULE_NOT_IMPORTED:
      'StoreRouterConnectingModule is not configured for router state in {fileName}',
    EFFECTS_MODULE_NOT_IMPORTED:
      'EffectsModule is not imported from @ngrx/effects in {fileName}',
    EFFECTS_FORROOT_NOT_FOUND:
      'EffectsModule.forRoot() is not configured in {fileName}',
    STORE_REDUCER_MISSING:
      'Store reducers are not properly configured in {fileName}',
    MISSING_ROOT_STORE_SETUP:
      'Missing complete root store setup in {fileName}. Configure StoreModule.forRoot, EffectsModule.forRoot, and optionally StoreDevtoolsModule.instrument',
  },

  EFFECTS: {
    EFFECTS_NOT_IMPORTED:
      'Effects are not imported from @ngrx/effects in {fileName}',
    EFFECT_DECORATOR_NOT_FOUND:
      '@Effect() decorator or createEffect() is not used in {fileName}',
    ACTIONS_NOT_IMPORTED:
      'Actions service is not imported from @ngrx/effects in {fileName}',
    OF_TYPE_NOT_USED:
      'ofType operator is not used for action filtering in {fileName}',
    EFFECT_RETURNS_ACTION: 'Effects should return actions in {fileName}',
    CATCH_ERROR_NOT_USED:
      'Consider adding error handling with catchError in effects in {fileName}',
    NON_DISPATCHING_EFFECTS:
      'Effects that do not dispatch actions should use {{ dispatch: false }} in {fileName}',
  },

  REDUCER: {
    REDUCER_NOT_IMPORTED:
      'Reducer is not imported from @ngrx/store in {fileName}',
    CREATE_REDUCER_NOT_USED:
      'createReducer() is not used for reducer creation in {fileName}',
    INITIAL_STATE_MISSING:
      'Initial state is not defined for reducer in {fileName}',
    ON_NOT_USED:
      'on() function is not used for action handling in reducer in {fileName}',
    IMMUTABLE_UPDATE_ISSUE:
      'Ensure immutable state updates in reducer in {fileName}',
    REDUCER_DEFAULT_CASE:
      'Reducer should handle default case properly in {fileName}',
  },

  SELECTOR: {
    CREATE_SELECTOR_NOT_USED:
      'createSelector() is not used for selector creation in {fileName}',
    FEATURE_SELECTOR_MISSING:
      'createFeatureSelector() should be used for feature selectors in {fileName}',
    MEMOIZATION_NOT_UTILIZED:
      'Selectors should utilize memoization for performance in {fileName}',
    SELECTOR_COMPOSITION:
      'Consider composing selectors for better reusability in {fileName}',
  },

  ACTION: {
    CREATE_ACTION_NOT_USED:
      'createAction() is not used for action creation in {fileName}',
    ACTION_TYPE_MISSING: 'Action type is not properly defined in {fileName}',
    PROPS_NOT_USED:
      'props() should be used for typed action payloads in {fileName}',
    ACTION_NAMING_CONVENTION:
      'Actions should follow naming convention [Source] Action Name in {fileName}',
  },

  ENTITY: {
    ENTITY_ADAPTER_NOT_USED:
      'createEntityAdapter() should be used for managing entity collections in {fileName}',
    ENTITY_STATE_NOT_EXTENDED:
      'State should extend EntityState interface in {fileName}',
    ENTITY_SELECTORS_NOT_USED:
      'Use getSelectors() from entity adapter for basic entity selectors in {fileName}',
  },

  DEVTOOLS: {
    DEVTOOLS_CONFIG_MISSING:
      'StoreDevtoolsModule configuration is missing or incomplete in {fileName}',
    PRODUCTION_DEVTOOLS_WARNING:
      'StoreDevtoolsModule should be conditionally imported in production in {fileName}',
    DEVTOOLS_OPTIONS_MISSING:
      'Consider configuring StoreDevtoolsModule options (maxAge, trace, etc.) in {fileName}',
  },

  ROUTER: {
    ROUTER_STATE_NOT_CONFIGURED:
      'Router state is not properly configured with StoreRouterConnectingModule in {fileName}',
    ROUTER_SERIALIZER_MISSING:
      'Consider implementing custom router state serializer in {fileName}',
  },

  TESTING: {
    MOCK_STORE_NOT_USED:
      'Use MockStore for testing NgRx components in {fileName}',
    PROVIDE_MOCK_STORE_MISSING:
      'provideMockStore should be used in TestingModule configuration in {fileName}',
  },
} as const;

// NgRx architectural patterns and best practices
export const NGRX_PATTERNS = {
  // Action patterns
  ACTION_CREATORS: {
    LOAD: '[{feature}] Load {entity}',
    LOAD_SUCCESS: '[{feature}] Load {entity} Success',
    LOAD_FAILURE: '[{feature}] Load {entity} Failure',
    CREATE: '[{feature}] Create {entity}',
    CREATE_SUCCESS: '[{feature}] Create {entity} Success',
    CREATE_FAILURE: '[{feature}] Create {entity} Failure',
    UPDATE: '[{feature}] Update {entity}',
    UPDATE_SUCCESS: '[{feature}] Update {entity} Success',
    UPDATE_FAILURE: '[{feature}] Update {entity} Failure',
    DELETE: '[{feature}] Delete {entity}',
    DELETE_SUCCESS: '[{feature}] Delete {entity} Success',
    DELETE_FAILURE: '[{feature}] Delete {entity} Failure',
    SELECT: '[{feature}] Select {entity}',
    CLEAR: '[{feature}] Clear {entity}',
  },

  // State structure patterns
  STATE_PROPERTIES: {
    LOADING: 'loading',
    ERROR: 'error',
    LOADED: 'loaded',
    SELECTED_ID: 'selectedId',
    IDS: 'ids',
    ENTITIES: 'entities',
  },

  // Selector naming patterns
  SELECTOR_NAMES: {
    SELECT_FEATURE: 'select{Feature}State',
    SELECT_ALL: 'selectAll{Entity}',
    SELECT_ENTITIES: 'select{Entity}Entities',
    SELECT_IDS: 'select{Entity}Ids',
    SELECT_TOTAL: 'select{Entity}Total',
    SELECT_LOADING: 'select{Entity}Loading',
    SELECT_ERROR: 'select{Entity}Error',
    SELECT_SELECTED: 'selectSelected{Entity}',
  },

  // Effect patterns
  EFFECT_PATTERNS: {
    LOAD_EFFECT: 'load{Entity}$',
    CREATE_EFFECT: 'create{Entity}$',
    UPDATE_EFFECT: 'update{Entity}$',
    DELETE_EFFECT: 'delete{Entity}$',
    ERROR_EFFECT: 'handle{Entity}Error$',
  },

  // File organization patterns
  FILE_STRUCTURE: {
    STATE_DIR: 'state',
    STORE_DIR: 'store',
    SHARED_DIR: 'shared',
    FEATURE_DIR: '{feature}',
  },
} as const;

// NgRx module configuration templates
export const NGRX_MODULE_TEMPLATES = {
  ROOT_STORE_IMPORT: `StoreModule.forRoot(reducers, {
    metaReducers,
    runtimeChecks: {
      strictStateImmutability: true,
      strictActionImmutability: true,
    },
  })`,

  DEVTOOLS_IMPORT: `StoreDevtoolsModule.instrument({
    maxAge: 25,
    logOnly: environment.production,
  })`,

  EFFECTS_ROOT_IMPORT: `EffectsModule.forRoot([])`,

  ROUTER_STORE_IMPORT: `StoreRouterConnectingModule.forRoot()`,

  FEATURE_STORE_IMPORT: `StoreModule.forFeature('{featureName}', {featureName}Reducer)`,

  FEATURE_EFFECTS_IMPORT: `EffectsModule.forFeature([{FeatureName}Effects])`,
} as const;

// NgRx thresholds and limits
export const NGRX_THRESHOLDS = {
  MAX_ACTIONS_PER_FEATURE: 20,
  MAX_SELECTORS_PER_FEATURE: 15,
  MAX_EFFECTS_PER_FILE: 10,
  MAX_REDUCER_LINES: 200,
  MAX_STATE_NESTING_DEPTH: 4,
  MIN_SELECTOR_MEMOIZATION: 2, // Minimum inputs for memoization benefit
} as const;

// Severity thresholds for analysis
export const SEVERITY_THRESHOLDS = {
  HIGH: 5,
  MEDIUM: 2,
  LEVELS: {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
  },
  CATEGORIES: {
    DEPENDENCY: 'dependency',
    MODULE: 'module',
    DEVTOOLS: 'devtools',
    FEATURE: 'feature',
  },
  // Dependency analysis thresholds
  DEPENDENCY: {
    MIN_REQUIRED: 1, // At least @ngrx/store
    MAX_RECOMMENDED: 5,
    WARNING_THRESHOLD: 2,
  },
} as const;

// NgRx validation messages
export const NGRX_MESSAGES = {
  // Error messages
  PACKAGE_JSON_NOT_FOUND: 'package.json not found in project root',
  APP_MODULE_NOT_FOUND: 'app.module.ts not found in expected location',
  PROJECT_ROOT_REQUIRED: 'Project root path is required',
  // Recommendation messages
  DEVTOOLS_INTEGRATION:
    'Integrate NgRx DevTools for enhanced debugging capabilities',
  FEATURE_STORE_STRUCTURE:
    'Consider implementing proper feature store structure for better organization',
  // Template messages (use with template function)
  INSTALL_FOR_STATE: (packageName: string) =>
    `Install ${packageName} for state management`,
  INSTALL_FOR_EFFECTS: (packageName: string) =>
    `Consider installing ${packageName} for side effect management`,
  INSTALL_FOR_DEBUGGING: (packageName: string) =>
    `Install ${packageName} for debugging support`,
  MISSING_CONFIG: (moduleName: string, fileName: string) =>
    `Missing ${moduleName} configuration in ${fileName}`,
  ADD_TO_IMPORTS: (moduleName: string, fileName: string) =>
    `Add ${moduleName}() to ${fileName} imports`,
  CONFIGURE_MODULE: (moduleName: string, fileName: string) =>
    `Configure ${moduleName} in ${fileName} using specialized DevTools utilities`,
  SOURCE_DIR_NOT_FOUND: (projectRoot: string, srcDir: string) =>
    `Source directory not found at ${projectRoot}/${srcDir}`,
  APP_MODULE_NOT_FOUND_AT: (path: string) => `App module not found at ${path}`,
} as const;

// Legacy NGRX_KEYWORDS for backward compatibility
// RULE 1: Centralized legacy constants to maintain API compatibility
export const NGRX_KEYWORDS = {
  CREATE_SELECTOR: 'createSelector',
  CREATE_FEATURE_SELECTOR: 'createFeatureSelector',
  SELECT_PREFIX: 'select',
  PROPS: 'props',
  FEATURE: 'feature',
  SELECTORS_SUFFIX: '.selectors.',
  // Effects keywords
  CREATE_EFFECT: 'createEffect',
  INJECTABLE: '@Injectable()',
  DISPATCH_FALSE: 'dispatch: false',
  HTTP: 'Http',
  INJECT: 'inject',
  // NgRx file suffixes
  ACTIONS_SUFFIX: '.actions.',
  REDUCER_SUFFIX: '.reducer.',
  FACADE_SUFFIX: '.facade.',
  MODELS_SUFFIX: '.models.',
  // NgRx naming patterns
  CREATE_ACTION: 'createAction',
  EXPORT_CONST: 'export const',
  EXPORT_INTERFACE: 'export interface',
  EXPORT_CLASS: 'export class',
  INITIAL_STATE: 'initialState',
  STATE_SUFFIX: 'State',
  REDUCER_SUFFIX_WORD: 'Reducer',
  EFFECTS_SUFFIX_WORD: 'Effects',
  FEATURE_SUFFIX: 'Feature',
  EFFECT_SUFFIX: 'Effect',
  STATE_FOLDER: '+state',
  // Reducer-specific keywords
  CREATE_REDUCER: 'createReducer',
  INITIAL: 'initial',
  ON_FUNCTION: 'on(',
  RETURN_STATE: 'return state',
  SWITCH: 'switch',
  ACTION_TYPE: ': Action',
  ACTION_REDUCER: 'ActionReducer',
  DEFAULT_CASE: 'default:',
  // NgRx setup constants
  NGRX_STORE: '@ngrx/store',
  NGRX_EFFECTS: '@ngrx/effects',
  NGRX_STORE_DEVTOOLS: '@ngrx/store-devtools',
  // NgRx immutability patterns
  SPREAD_OPERATOR: '...state',
  PRODUCE: 'produce',
  IMMER: 'immer',
  // Array mutation methods
  PUSH_METHOD: '.push(',
  POP_METHOD: '.pop(',
  SPLICE_METHOD: '.splice(',
  // Immutable array methods
  SPREAD_DOTS: '...',
  CONCAT_METHOD: 'concat',
  SLICE_METHOD: 'slice',
  IMMUTABLE_ARRAY_METHODS: 'concat, slice, spread',
  // Object operations
  OBJECT_ASSIGN_STATE: 'Object.assign(state',
  OBJECT_ASSIGN_PATTERN: 'Object.assign({}, state, updates)',
  SPREAD_PATTERN: 'spread operator',
  IMMUTABLE_UPDATE_PATTERNS: 'spread operator, Object.assign',
  // Violation messages
  DIRECT_STATE_MUTATION: 'Direct state mutation detected in',
  NESTED_OBJECT_MUTATION: 'Nested object mutation detected in',
  ARRAY_MUTATION: 'Array mutation detected in',
  OBJECT_ASSIGN_MUTATION: 'Object.assign with state as target mutates state in',
  // Suggestion messages
  USE_SPREAD_OPERATOR: 'Use spread operator for immutable updates in',
  USE_NESTED_SPREAD: 'Use nested spread operators for deep updates in',
  IMPORT_KEYWORD: 'import',
  STORE_MODULE_FOR_ROOT: 'StoreModule.forRoot',
  STORE_DEVTOOLS_MODULE: 'StoreDevtoolsModule',
  EFFECTS_MODULE_FOR_ROOT: 'EffectsModule.forRoot',
  APP_MODULE_TS: 'app.module.ts',
  PLUS_STATE_FOLDER: '+state',
  // Pattern types for module analysis
  PATTERN_TYPES: {
    STORE_MODULE: 'storeModule',
    EFFECTS_MODULE: 'effectsModule',
    DEVTOOLS_MODULE: 'devtoolsModule',
  },
} as const;

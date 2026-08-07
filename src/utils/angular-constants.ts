/**
 * Angular Framework Constants
 * RULE 2: Specialized constants module for Angular-specific configurations
 */

import {
  CONFIG_FILES,
  DIRECTORY_NAMES,
  FILE_EXTENSIONS,
} from './file-constants';

// Angular-specific constants
export const ANGULAR_CONSTANTS = {
  ANGULAR_JSON: CONFIG_FILES.ANGULAR_JSON,
  SRC_DIR: DIRECTORY_NAMES.SRC,
  ENVIRONMENTS_DIR: DIRECTORY_NAMES.ENVIRONMENTS,
  APP_DIR: DIRECTORY_NAMES.APP,
  ASSETS_DIR: DIRECTORY_NAMES.ASSETS,
  STYLES_DIR: DIRECTORY_NAMES.STYLES,
  // File extensions
  COMPONENT_TS: FILE_EXTENSIONS.COMPONENT_TS,
  COMPONENT_HTML: FILE_EXTENSIONS.COMPONENT_HTML,
  SERVICE_TS: FILE_EXTENSIONS.SERVICE_TS,
  DIRECTIVE_TS: FILE_EXTENSIONS.DIRECTIVE_TS,
  MAIN_TS: 'main.ts',
  POLYFILLS_TS: 'polyfills.ts',
  STYLES_CSS: 'styles.css',
  STYLES_SCSS: 'styles.scss',
  INDEX_HTML: 'index.html',
  INDEX_TS: 'index.ts',
  FAVICON_ICO: 'favicon.ico',
  ENVIRONMENT_TS: 'environment.ts',
  ENVIRONMENT_PROD_TS: 'environment.prod.ts',
  // Angular keywords and strings
  APP_MODULE: 'app.module',
  ENCODING_UTF8: 'utf8',
  NG_MODULE: '@NgModule',
  IMPORTS: 'imports:',
  PROVIDERS: 'providers:',
  COMMON_MODULE: 'CommonModule',
  BROWSER_MODULE: 'BrowserModule',
  STANDALONE_TRUE: 'standalone: true',
  LOAD_CHILDREN: 'loadChildren',
  ROUTER_MODULE_FOR_CHILD: 'RouterModule.forChild',
  CONST_ROUTES: 'const routes',
  ROUTING_SUFFIX: '-routing.module.ts',
  ROUTING_ALT_SUFFIX: '.routing.ts',
  MODULE_SUFFIX: 'Module',
  MODULE_DOT: '.module',
  PROVIDED_IN_ROOT: "providedIn: 'root'",
  // Angular validation keywords
  VALIDATOR_FN: 'ValidatorFn',
  ABSTRACT_CONTROL: 'AbstractControl',
  VALIDATION_ERRORS: 'ValidationErrors',
  NULL: 'null',
  ASYNC_VALIDATOR_FN: 'AsyncValidatorFn',
  OBSERVABLE: 'Observable',
  PROMISE: 'Promise',
  EXPORT: 'export',
  FUNCTION: 'function',
  CONST: 'const',
  FORM_CONTROL: 'FormControl',
  VALIDATORS_DOT: 'Validators.',
  FORM_GROUP: 'FormGroup',
  PASSWORD: 'password',
  CONFIRM: 'confirm',
  MATCH_VALIDATOR: 'matchValidator',
  HAS_ERROR: 'hasError',
  ERRORS: 'errors',
  INVALID: 'invalid',
  REQUIRED: 'required',
  EMAIL: 'email',
  VALIDATORS_REQUIRED: 'Validators.required',
  VALIDATORS_EMAIL: 'Validators.email',
  // Validation Messages
  MSG_REQUIRED_VALIDATION: 'Consider adding required validation where needed',
  MSG_EMAIL_VALIDATION: 'Use Validators.email for email field validation',
  MSG_TEMPLATE_ERROR_DISPLAY:
    'Display validation errors in template for better UX',
  MSG_TEMPLATE_ERRORS_MISSING:
    'Form validation errors not displayed in template for',
  MSG_ADD_VALIDATORS_TO_CONTROL: 'Add validators to FormControl instances',
  MSG_CROSS_FIELD_VALIDATION:
    'Consider using cross-field validation for password confirmation',
  MSG_ADD_ERROR_HANDLING: 'Add validation error checking and display logic',
  MSG_USE_ASYNC_VALIDATOR:
    'Consider using AsyncValidatorFn for async validators',
  MSG_REUSABLE_VALIDATORS:
    'Make validators exportable for reuse across components',
  MSG_PASSWORD_MATCHING: 'Implement password matching validator in FormGroup',
  // RxJS Operators
  TAP: 'tap',
  CATCH_ERROR: 'catchError',
  SWITCH_MAP: 'switchMap',
  EXHAUST_MAP: 'exhaustMap',
  MAP: 'map',
  PIPE: 'pipe',
  PLUCK: 'pluck',
  FINALIZE: 'finalize',
  RX_OF: 'of(',
  HTTP_LOWERCASE: 'http',
  TIMEOUT: 'timeout',
  RETRY: 'retry',
  RETRY_WHEN: 'retryWhen',
  // Deprecated RxJS Operators
  DEPRECATED_DO: 'do',
  DEPRECATED_CATCH: 'catch',
  DEPRECATED_FINALLY: 'finally',
  DEPRECATED_SWITCH: 'switch',
  // HTTP Methods
  HTTP_POST: 'POST',
  HTTP_PUT: 'PUT',
  HTTP_GET: 'GET',
  HTTP_DELETE: 'DELETE',
  // NgRx keywords
  EFFECTS: 'effects',
  EFFECTS_SUFFIX: '.effects.',
  EFFECT_SUFFIX: '.effect.',
  TS_EXTENSION: '.ts',
  // Angular Lifecycle
  IMPLEMENTS_ON_DESTROY: 'implements OnDestroy',
  NG_ON_DESTROY: 'ngOnDestroy',
  ON_DESTROY: 'OnDestroy',
  // RxJS Patterns
  SUBSCRIBE: 'subscribe(',
  PIPE_SYNTAX: '.pipe(',
  UNSUBSCRIBE: 'unsubscribe()',
  TAKE_UNTIL: 'takeUntil',
  DESTROY_SUBJECT: 'destroy$',
  ASYNC_PIPE: '| async',
  COMPLETE: 'complete()',
  SUBJECT: 'Subject',
  // Timer Functions
  SET_INTERVAL: 'setInterval',
  SET_TIMEOUT: 'setTimeout',
  CLEAR_INTERVAL: 'clearInterval',
  CLEAR_TIMEOUT: 'clearTimeout',
  TIMER: 'timer(',
  INTERVAL: 'interval(',
  // Event Listeners
  ADD_EVENT_LISTENER: 'addEventListener',
  FROM_EVENT: 'fromEvent',
  SUBSCRIPTION: 'subscription',
  // Angular DI Patterns
  CONSTRUCTOR: 'constructor(',
  INJECTABLE: '@Injectable',
  PROVIDED_IN: 'providedIn',
  COMPONENT_DECORATOR: '@Component',
  NG_MODULE_DECORATOR: '@NgModule',
  VIEW_CHILD: '@ViewChild',
  DECLARATIONS_PROPERTY: 'declarations',
  IMPORTS_PROPERTY: 'imports',
  PROVIDERS_PROPERTY: 'providers',
  FOR_ROOT: 'forRoot',
  OPTIONAL: '@Optional()',
  HOST: '@Host()',
  PRIVATE: 'private',
  PUBLIC: 'public',
  THIS: 'this.',
  EXPORT_CLASS: 'export class',
  SERVICE_SUFFIX: 'Service',
  IMPORT: 'import',
  FROM: 'from',
  // Browser APIs (for side effects detection)
  CONSOLE_DOT: 'console.',
  ALERT_FUNCTION: 'alert(',
  DOCUMENT_DOT: 'document.',
  WINDOW_DOT: 'window.',
  LOCAL_STORAGE_DOT: 'localStorage.',
  SESSION_STORAGE_DOT: 'sessionStorage.',
  FETCH_FUNCTION: 'fetch(',
  HTTP_DOT: 'http.',
  MATH_RANDOM: 'Math.random',
  DATE_NOW: 'Date.now',
  NEW_DATE: 'new Date',
  // Bundle Optimization
  WEBPACK_CONFIG: 'webpack.config.js',
  BUDGETS: 'budgets',
  AOT: 'aot',
  BUILD_OPTIMIZER: 'buildOptimizer',
  EXTRACT_LICENSES: 'extractLicenses',
  SOURCE_MAP: 'sourceMap',
  OPTIMIZATION: 'optimization',
  SPLIT_CHUNKS: 'splitChunks',
  MINIMIZE: 'minimize',
  SIDE_EFFECTS: 'sideEffects',
  USED_EXPORTS: 'usedExports',
  ON_PUSH: 'OnPush',
  TRACK_BY: 'trackBy',
  NG_FOR: '*ngFor',
  PRELOADING_STRATEGY: 'preloadingStrategy',
  ROUTING_MODULE_SUFFIX: '-routing.module.ts',
  NODE_MODULES: DIRECTORY_NAMES.NODE_MODULES,
  DIST_DIR: DIRECTORY_NAMES.DIST,
  GIT_DIR: '.git',
  COVERAGE_DIR: DIRECTORY_NAMES.COVERAGE,
  NX_DIR: '.nx',
  // Angular.json structure keywords
  PROJECTS: 'projects',
  ARCHITECT: 'architect',
  BUILD: 'build',
  CONFIGURATIONS: 'configurations',
  PRODUCTION: 'production',
  WEBPACK_BUNDLE_ANALYZER: 'webpack-bundle-analyzer',
  // TypeScript Types
  COLON: ':',
  ANY_TYPE: 'any',
} as const;

// Angular Lifecycle keywords and patterns
export const ANGULAR_LIFECYCLE_KEYWORDS = {
  // Lifecycle interfaces
  ON_INIT: 'OnInit',
  ON_DESTROY: 'OnDestroy',
  ON_CHANGES: 'OnChanges',
  DO_CHECK: 'DoCheck',
  AFTER_CONTENT_INIT: 'AfterContentInit',
  AFTER_CONTENT_CHECKED: 'AfterContentChecked',
  AFTER_VIEW_INIT: 'AfterViewInit',
  AFTER_VIEW_CHECKED: 'AfterViewChecked',

  // Lifecycle methods
  NG_ON_INIT: 'ngOnInit',
  NG_ON_DESTROY: 'ngOnDestroy',
  NG_ON_CHANGES: 'ngOnChanges',
  NG_DO_CHECK: 'ngDoCheck',
  NG_AFTER_CONTENT_INIT: 'ngAfterContentInit',
  NG_AFTER_CONTENT_CHECKED: 'ngAfterContentChecked',
  NG_AFTER_VIEW_INIT: 'ngAfterViewInit',
  NG_AFTER_VIEW_CHECKED: 'ngAfterViewChecked',

  // Keywords
  IMPLEMENTS: 'implements ',
  COMMA_SPACE: ', ',
  CONSTRUCTOR: 'constructor',
  THIS_HTTP: 'this.http',
  THIS_SERVICE: 'this.service',
  SUBSCRIBE: 'subscribe',
  HTTP: 'http',
  SIMPLE_CHANGES: 'SimpleChanges',
  OPENING_PAREN: '(',
  CLOSING_BRACE: '}',

  // File extensions
  COMPONENT_TS: '.component.ts',
  DIRECTIVE_TS: '.directive.ts',
  SERVICE_TS: '.service.ts',
} as const;

// Angular dependency injection configuration and messages
export const ANGULAR_DEPENDENCY_INJECTION = {
  // Thresholds getter for dependency injection validation
  getThresholds: (config?: {
    thresholds?: {
      angular?: {
        maxConstructorDependencies?: number;
        maxImportCount?: number;
      };
    };
  }) => ({
    MAX_DEPENDENCIES:
      config?.thresholds?.angular?.maxConstructorDependencies ?? 5,
    HIGH_IMPORT_COUNT: config?.thresholds?.angular?.maxImportCount ?? 10,
  }),

  // Legacy THRESHOLDS for backward compatibility (deprecated)
  THRESHOLDS: {
    MAX_DEPENDENCIES: 5,
    HIGH_IMPORT_COUNT: 10,
  },

  // Validation messages for dependency injection patterns
  MESSAGES: {
    ACCESS_MODIFIERS: {
      MISSING_MODIFIER:
        'Use access modifiers for dependency injection in {fileName}',
    },
    SERVICE_COUNT: {
      TOO_MANY_DEPENDENCIES:
        'Too many dependencies ({count}) in constructor in {fileName}',
    },
    INJECTABLE: {
      MISSING_DECORATOR:
        'Service class in {fileName} should have @Injectable decorator',
      SUGGEST_PROVIDED_IN:
        "Consider using providedIn: 'root' for singleton services in {fileName}",
    },
    PROVIDERS: {
      COMPONENT_LEVEL:
        'Component-level providers detected in {fileName}. Consider module-level provision.',
      SUGGEST_FOR_ROOT:
        'Consider implementing forRoot pattern for service modules in {fileName}',
    },
    CIRCULAR_DEPS: {
      HIGH_IMPORTS:
        'High number of imports in {fileName}. Check for potential circular dependencies.',
    },
    OPTIONAL_DEPS: {
      GOOD_USAGE: 'Good use of optional/host dependencies in {fileName}',
    },
  },

  // Patterns for dependency injection analysis
  PATTERNS: {
    CONSTRUCTOR_REGEX: /constructor\s*\([^)]*\)\s*{[^}]*}/,
    IMPORT_REGEX: /import[^;]+from\s+['"][^'"]+['"]/g,
  },
} as const;

// Angular application constants
export const ANGULAR_APPLICATIONS = {
  // Application configuration metadata
  CONFIG_PATHS: {
    ANGULAR_JSON: 'angular.json',
    WORKSPACE_JSON: 'workspace.json',
    NX_JSON: 'nx.json',
    PROJECT_JSON: 'project.json',
  } as const,

  // Application types in Angular workspace
  APPLICATION_TYPES: {
    APPLICATION: 'application',
    LIBRARY: 'library',
    E2E: 'e2e-app',
  } as const,

  // Common application names
  DEFAULT_NAMES: {
    APP: 'app',
    MAIN_APP: 'main-app',
    ADMIN_APP: 'admin-app',
    CLIENT_APP: 'client-app',
    SHELL_APP: 'shell-app',
  } as const,
} as const;

// Angular directory structure constants
export const ANGULAR_DIRECTORIES = {
  // Core Angular directories
  CORE_DIRS: {
    SRC: 'src',
    APP: 'app',
    ASSETS: 'assets',
    ENVIRONMENTS: 'environments',
  } as const,

  // Feature module directories
  FEATURE_DIRS: {
    CORE: 'core',
    SHARED: 'shared',
    FEATURES: 'features',
    LAYOUTS: 'layouts',
  } as const,

  // Angular CLI generated directories
  CLI_DIRS: {
    E2E: 'e2e',
    NODE_MODULES: 'node_modules',
    DIST: 'dist',
    TMP: 'tmp',
  } as const,
} as const;

// Angular build and configuration constants
export const ANGULAR_BUILD = {
  // Build targets and configurations
  BUILD_TARGETS: {
    BUILD: 'build',
    SERVE: 'serve',
    TEST: 'test',
    LINT: 'lint',
    E2E: 'e2e',
    EXTRACT_I18N: 'extract-i18n',
  } as const,

  // Build configurations
  CONFIGURATIONS: {
    PRODUCTION: 'production',
    DEVELOPMENT: 'development',
    STAGING: 'staging',
  } as const,

  // Output paths
  OUTPUT_PATHS: {
    DIST: 'dist',
    BUILD: 'build',
    WWW: 'www',
  } as const,
} as const;

// Angular testing constants
export const ANGULAR_TESTING = {
  // Test file patterns
  TEST_PATTERNS: {
    SPEC: '*.spec.ts',
    TEST: '*.test.ts',
    E2E: '*.e2e-spec.ts',
  } as const,

  // Testing framework configurations
  FRAMEWORKS: {
    JASMINE: 'jasmine',
    JEST: 'jest',
    KARMA: 'karma',
    PROTRACTOR: 'protractor',
    CYPRESS: 'cypress',
  } as const,

  // Common test utilities
  TEST_UTILS: {
    TEST_BED: 'TestBed',
    COMPONENT_FIXTURE: 'ComponentFixture',
    ASYNC: 'async',
    FAKE_ASYNC: 'fakeAsync',
    TICK: 'tick',
  } as const,
} as const;

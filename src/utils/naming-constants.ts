/**
 * Naming Convention Constants
 * RULE 2: Specialized constants module for naming patterns and conventions
 */

// Naming convention patterns and validation
export const NAMING_CONVENTIONS = {
  // Case patterns
  CAMEL_CASE_PATTERN: /^[a-z][a-zA-Z0-9]*$/,
  PASCAL_CASE_PATTERN: /^[A-Z][a-zA-Z0-9]*$/,
  KEBAB_CASE_PATTERN: /^[a-z0-9]+(-[a-z0-9]+)*$/,
  SNAKE_CASE_PATTERN: /^[a-z0-9]+(_[a-z0-9]+)*$/,
  SCREAMING_SNAKE_CASE_PATTERN: /^[A-Z0-9]+(_[A-Z0-9]+)*$/,

  // File naming patterns
  COMPONENT_FILE_PATTERN: /^[a-z0-9-]+\.component\.(ts|html|scss|css)$/,
  SERVICE_FILE_PATTERN: /^[a-z0-9-]+\.service\.ts$/,
  DIRECTIVE_FILE_PATTERN: /^[a-z0-9-]+\.directive\.ts$/,
  PIPE_FILE_PATTERN: /^[a-z0-9-]+\.pipe\.ts$/,
  MODULE_FILE_PATTERN: /^[a-z0-9-]+\.module\.ts$/,
  GUARD_FILE_PATTERN: /^[a-z0-9-]+\.guard\.ts$/,
  RESOLVER_FILE_PATTERN: /^[a-z0-9-]+\.resolver\.ts$/,
  INTERCEPTOR_FILE_PATTERN: /^[a-z0-9-]+\.interceptor\.ts$/,

  // Class naming patterns
  COMPONENT_CLASS_PATTERN: /^[A-Z][a-zA-Z0-9]*Component$/,
  SERVICE_CLASS_PATTERN: /^[A-Z][a-zA-Z0-9]*Service$/,
  DIRECTIVE_CLASS_PATTERN: /^[A-Z][a-zA-Z0-9]*Directive$/,
  PIPE_CLASS_PATTERN: /^[A-Z][a-zA-Z0-9]*Pipe$/,
  MODULE_CLASS_PATTERN: /^[A-Z][a-zA-Z0-9]*Module$/,
  GUARD_CLASS_PATTERN: /^[A-Z][a-zA-Z0-9]*Guard$/,
  RESOLVER_CLASS_PATTERN: /^[A-Z][a-zA-Z0-9]*Resolver$/,
  INTERCEPTOR_CLASS_PATTERN: /^[A-Z][a-zA-Z0-9]*Interceptor$/,

  // Variable and method naming
  VARIABLE_PATTERN: /^[a-z][a-zA-Z0-9]*$/,
  CONSTANT_PATTERN: /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/,
  METHOD_PATTERN: /^[a-z][a-zA-Z0-9]*$/,
  PROPERTY_PATTERN: /^[a-z][a-zA-Z0-9]*$/,

  // Angular-specific patterns
  SELECTOR_PATTERN: /^[a-z]+(-[a-z0-9]+)*$/,
  INPUT_PROPERTY_PATTERN: /^[a-z][a-zA-Z0-9]*$/,
  OUTPUT_PROPERTY_PATTERN: /^[a-z][a-zA-Z0-9]*$/,
  TEMPLATE_VARIABLE_PATTERN: /^[a-z][a-zA-Z0-9]*$/,

  // NgRx naming patterns
  ACTION_TYPE_PATTERN: /^\[.+\] .+$/,
  FEATURE_KEY_PATTERN: /^[a-z][a-zA-Z0-9]*$/,
  REDUCER_NAME_PATTERN: /^[a-z][a-zA-Z0-9]*Reducer$/,

  // Analysis configuration
  ALLOWED_SHORT_NAMES: [
    'i',
    'j',
    'k',
    'x',
    'y',
    'z',
    'id',
    'url',
    'api',
    'db',
    'ui',
  ] as const,

  COMMON_EXCEPTIONS: [
    'window',
    'document',
    'console',
    'process',
    'require',
    'module',
    'exports',
    '__dirname',
    '__filename',
    'setTimeout',
    'setInterval',
    'clearTimeout',
    'clearInterval',
  ] as const,

  ANGULAR_LIFECYCLE: [
    'ngOnInit',
    'ngOnDestroy',
    'ngAfterViewInit',
    'ngAfterContentInit',
    'ngOnChanges',
    'ngDoCheck',
    'ngAfterViewChecked',
    'ngAfterContentChecked',
  ] as const,

  ANALYSIS_THRESHOLDS: {
    MAX_FILES_TO_ANALYZE: 100,
    MAX_VIOLATIONS_PER_FILE: 10,
    MAX_EXAMPLE_VIOLATIONS: 5,
    MAX_EXAMPLES_PER_VIOLATION: 3,
  } as const,
  EFFECT_NAME_PATTERN: /^[a-z][a-zA-Z0-9]*\$$/,
  SELECTOR_NAME_PATTERN: /^select[A-Z][a-zA-Z0-9]*$/,

  // Common suffixes
  SUFFIXES: {
    COMPONENT: 'Component',
    SERVICE: 'Service',
    DIRECTIVE: 'Directive',
    PIPE: 'Pipe',
    MODULE: 'Module',
    GUARD: 'Guard',
    RESOLVER: 'Resolver',
    INTERCEPTOR: 'Interceptor',
    REDUCER: 'Reducer',
    EFFECT: 'Effect',
    SELECTOR: 'Selector',
    STATE: 'State',
    MODEL: 'Model',
    INTERFACE: 'Interface',
    ENUM: 'Enum',
    TYPE: 'Type',
  },

  // Common prefixes
  PREFIXES: {
    INTERFACE: 'I',
    ABSTRACT: 'Abstract',
    BASE: 'Base',
    GENERIC: 'Generic',
    MOCK: 'Mock',
    TEST: 'Test',
    SPEC: 'Spec',
  },

  // File extension patterns
  TYPESCRIPT_EXTENSIONS: ['.ts', '.tsx'],
  JAVASCRIPT_EXTENSIONS: ['.js', '.jsx'],
  STYLE_EXTENSIONS: ['.css', '.scss', '.sass', '.less'],
  TEMPLATE_EXTENSIONS: ['.html', '.htm'],
  CONFIG_EXTENSIONS: ['.json', '.yaml', '.yml', '.xml'],

  // Directory naming patterns
  DIRECTORY_PATTERN: /^[a-z0-9]+(-[a-z0-9]+)*$/,
  FEATURE_DIRECTORY_PATTERN: /^[a-z0-9]+(-[a-z0-9]+)*$/,
  SHARED_DIRECTORY_PATTERN: /^(shared|common|core|utils)$/,

  // Special naming conventions
  BARREL_FILE: 'index.ts',
  PUBLIC_API_FILE: 'public-api.ts',
  ENVIRONMENT_FILE_PATTERN: /^environment(\..*)?\.ts$/,
  SPEC_FILE_PATTERN: /\.spec\.ts$/,
  E2E_FILE_PATTERN: /\.e2e-spec\.ts$/,
} as const;

// Naming validation messages
export const NAMING_VALIDATION_MESSAGES = {
  FILE_NAMING: {
    INVALID_COMPONENT_NAME:
      'Component file {fileName} should follow kebab-case.component.ts pattern',
    INVALID_SERVICE_NAME:
      'Service file {fileName} should follow kebab-case.service.ts pattern',
    INVALID_DIRECTIVE_NAME:
      'Directive file {fileName} should follow kebab-case.directive.ts pattern',
    INVALID_PIPE_NAME:
      'Pipe file {fileName} should follow kebab-case.pipe.ts pattern',
    INVALID_MODULE_NAME:
      'Module file {fileName} should follow kebab-case.module.ts pattern',
    INVALID_GUARD_NAME:
      'Guard file {fileName} should follow kebab-case.guard.ts pattern',
    INVALID_RESOLVER_NAME:
      'Resolver file {fileName} should follow kebab-case.resolver.ts pattern',
    INVALID_INTERCEPTOR_NAME:
      'Interceptor file {fileName} should follow kebab-case.interceptor.ts pattern',
  },

  CLASS_NAMING: {
    INVALID_COMPONENT_CLASS:
      'Component class {className} should follow PascalCaseComponent pattern',
    INVALID_SERVICE_CLASS:
      'Service class {className} should follow PascalCaseService pattern',
    INVALID_DIRECTIVE_CLASS:
      'Directive class {className} should follow PascalCaseDirective pattern',
    INVALID_PIPE_CLASS:
      'Pipe class {className} should follow PascalCasePipe pattern',
    INVALID_MODULE_CLASS:
      'Module class {className} should follow PascalCaseModule pattern',
    INVALID_GUARD_CLASS:
      'Guard class {className} should follow PascalCaseGuard pattern',
    INVALID_RESOLVER_CLASS:
      'Resolver class {className} should follow PascalCaseResolver pattern',
    INVALID_INTERCEPTOR_CLASS:
      'Interceptor class {className} should follow PascalCaseInterceptor pattern',
  },

  VARIABLE_NAMING: {
    INVALID_VARIABLE_CASE:
      'Variable {variableName} should use camelCase naming convention',
    INVALID_CONSTANT_CASE:
      'Constant {constantName} should use SCREAMING_SNAKE_CASE naming convention',
    INVALID_METHOD_CASE:
      'Method {methodName} should use camelCase naming convention',
    INVALID_PROPERTY_CASE:
      'Property {propertyName} should use camelCase naming convention',
  },

  ANGULAR_NAMING: {
    INVALID_SELECTOR:
      'Angular selector {selectorName} should use kebab-case naming convention',
    INVALID_INPUT_PROPERTY:
      'Input property {inputName} should use camelCase naming convention',
    INVALID_OUTPUT_PROPERTY:
      'Output property {outputName} should use camelCase naming convention',
    INVALID_TEMPLATE_VARIABLE:
      'Template variable {variableName} should use camelCase naming convention',
  },

  NGRX_NAMING: {
    INVALID_ACTION_TYPE:
      'Action type {actionType} should follow [Source] Action Name pattern',
    INVALID_FEATURE_KEY:
      'Feature key {featureKey} should use camelCase naming convention',
    INVALID_REDUCER_NAME:
      'Reducer {reducerName} should follow camelCaseReducer naming pattern',
    INVALID_EFFECT_NAME:
      'Effect {effectName} should follow camelCase$ naming pattern',
    INVALID_SELECTOR_NAME:
      'Selector {selectorName} should follow selectCamelCase naming pattern',
  },

  DIRECTORY_NAMING: {
    INVALID_DIRECTORY_CASE:
      'Directory {directoryName} should use kebab-case naming convention',
    INVALID_FEATURE_DIRECTORY:
      'Feature directory {directoryName} should use kebab-case naming convention',
  },

  GENERAL: {
    INCONSISTENT_NAMING:
      'Inconsistent naming convention detected in {fileName}',
    NAMING_CONVENTION_VIOLATION:
      'Naming convention violation in {fileName}: {details}',
    SUGGEST_RENAME:
      'Consider renaming {currentName} to {suggestedName} in {fileName}',
  },
} as const;

// Naming convention rules configuration
export const NAMING_RULES = {
  // Rule severity levels
  SEVERITY: {
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
  },

  // Rule categories
  CATEGORIES: {
    FILE_NAMING: 'file-naming',
    CLASS_NAMING: 'class-naming',
    VARIABLE_NAMING: 'variable-naming',
    ANGULAR_NAMING: 'angular-naming',
    NGRX_NAMING: 'ngrx-naming',
    DIRECTORY_NAMING: 'directory-naming',
  },

  // Default rule configurations
  DEFAULTS: {
    ENFORCE_FILE_NAMING: true,
    ENFORCE_CLASS_NAMING: true,
    ENFORCE_VARIABLE_NAMING: true,
    ENFORCE_ANGULAR_NAMING: true,
    ENFORCE_NGRX_NAMING: true,
    ENFORCE_DIRECTORY_NAMING: false,
    ALLOW_ABBREVIATIONS: false,
    ALLOW_UNDERSCORES: false,
    ALLOW_NUMBERS_IN_NAMES: true,
  },

  // Exceptions and overrides
  EXCEPTIONS: {
    ALLOWED_ABBREVIATIONS: [
      'id',
      'url',
      'api',
      'ui',
      'db',
      'http',
      'xml',
      'json',
    ],
    LEGACY_PATTERNS: [],
    CUSTOM_PREFIXES: [],
    CUSTOM_SUFFIXES: [],
  },
} as const;

// Common naming transformations
export const NAMING_TRANSFORMATIONS = {
  // Case conversions
  TO_CAMEL_CASE: (str: string): string =>
    str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),

  TO_PASCAL_CASE: (str: string): string =>
    str.replace(/(?:^|-)([a-z])/g, (_, letter) => letter.toUpperCase()),

  TO_KEBAB_CASE: (str: string): string =>
    str
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, ''),

  TO_SNAKE_CASE: (str: string): string =>
    str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, ''),

  TO_SCREAMING_SNAKE_CASE: (str: string): string =>
    str
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase()
      .replace(/^_/, ''),

  // File name transformations
  ADD_COMPONENT_SUFFIX: (baseName: string): string =>
    `${baseName}.component.ts`,
  ADD_SERVICE_SUFFIX: (baseName: string): string => `${baseName}.service.ts`,
  ADD_DIRECTIVE_SUFFIX: (baseName: string): string =>
    `${baseName}.directive.ts`,
  ADD_PIPE_SUFFIX: (baseName: string): string => `${baseName}.pipe.ts`,
  ADD_MODULE_SUFFIX: (baseName: string): string => `${baseName}.module.ts`,

  // Class name transformations
  ADD_COMPONENT_CLASS_SUFFIX: (baseName: string): string =>
    `${baseName}Component`,
  ADD_SERVICE_CLASS_SUFFIX: (baseName: string): string => `${baseName}Service`,
  ADD_DIRECTIVE_CLASS_SUFFIX: (baseName: string): string =>
    `${baseName}Directive`,
  ADD_PIPE_CLASS_SUFFIX: (baseName: string): string => `${baseName}Pipe`,
  ADD_MODULE_CLASS_SUFFIX: (baseName: string): string => `${baseName}Module`,
} as const;

// Legacy alias for backward compatibility
export const REGEX_PATTERNS = {
  PASCAL_CASE: /^[A-Z][a-zA-Z0-9]*$/,
  CAMEL_CASE: /^[a-z][a-zA-Z0-9]*$/,
  CAPITALIZED_WORDS: /^[A-Z][a-zA-Z0-9]*(\s+[A-Z][a-zA-Z0-9]*)*$/,
  QUOTED_STRING: /['"`]([^'"`]+)['"`]/,
  ACTION_PREFIX_PATTERN: /^\[.*?\]\s*/,
  CONST_PATTERN: /const\s+(\w+)/,
  CLASS_PATTERN: /class\s+(\w+)/,
  INTERFACE_PATTERN: /interface\s+(\w+)/,
  EFFECT_ASSIGNMENT: /(\w+)\s*=/,

  // Code naming detection patterns
  VARIABLE_DECLARATION: /(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
  FUNCTION_DECLARATION:
    /(?:function\s+|const\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[=()]/g,
  CLASS_DECLARATION: /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
  INTERFACE_DECLARATION: /interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
  METHOD_DECLARATION:
    /(?:public|private|protected)?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,

  // Code naming validation patterns
  INVALID_CHARS: /[^a-zA-Z0-9_$]/,
} as const;

// Code naming validation and suggestion messages
export const CODE_NAMING_MESSAGES = {
  // Validation messages (templates with placeholders)
  VIOLATIONS: {
    TOTAL_VIOLATIONS_FOUND: '{count} naming convention violations found',
    INVALID_VARIABLE_NAME: 'Invalid variable name: {name}',
    INVALID_FUNCTION_NAME: 'Invalid function name: {name}',
    INVALID_CLASS_NAME: 'Invalid class name: {name}',
    INVALID_INTERFACE_NAME: 'Invalid interface name: {name}',
    INVALID_METHOD_NAME: 'Invalid method name: {name}',
  },

  // Suggestion messages
  SUGGESTIONS: {
    FOLLOW_CONVENTIONS:
      'Follow consistent naming conventions (camelCase for variables, PascalCase for classes)',
    EXAMPLES_PREFIX: 'Examples: {examples}',
    UNABLE_TO_ANALYZE: 'Unable to analyze code naming patterns',
  },
} as const;

// ESLint naming convention configuration
export const ESLINT_NAMING_CONVENTIONS = {
  // ESLint configuration file names (in priority order - flat config first!)
  CONFIG_FILES: [
    'eslint.config.mjs',
    'eslint.config.js',
    '.eslintrc.js',
    '.eslintrc.json',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    'package.json',
  ] as const,

  // Naming convention rule names
  NAMING_RULES: [
    '@typescript-eslint/naming-convention',
    'camelcase',
    'id-length',
    'id-match',
  ] as const,

  // Required naming patterns for different code elements
  REQUIRED_PATTERNS: {
    VARIABLE: 'camelCase',
    FUNCTION: 'camelCase',
    CLASS: 'PascalCase',
    INTERFACE: 'PascalCase',
  } as const,

  // ESLint config property keys
  PROPERTY_KEYS: {
    RULES: 'rules',
    ESLINT_CONFIG: 'eslintConfig',
  } as const,

  // Specific rule names
  RULE_NAMES: {
    TYPESCRIPT_NAMING_CONVENTION: '@typescript-eslint/naming-convention',
    UNICORN_FILENAME_CASE: 'unicorn/filename-case',
  } as const,
} as const;

// ESLint naming validation and suggestion messages
export const ESLINT_NAMING_MESSAGES = {
  // Violation messages
  VIOLATIONS: {
    NO_ESLINT_CONFIG: 'No ESLint configuration found',
    NO_NAMING_RULES: 'No naming convention rules configured in ESLint',
    ERROR_PARSING_CONFIG: 'Error parsing ESLint configuration',
  },

  // Suggestion messages
  SUGGESTIONS: {
    ADD_ESLINT_CONFIG:
      'Add .eslintrc.js or eslint.config.mjs for naming convention rules',
    CONFIGURE_NAMING_CONVENTION:
      'Configure @typescript-eslint/naming-convention rule',
    VERIFY_CONFIG_SYNTAX: 'Verify ESLint configuration syntax',
    CONFIGURE_FILENAME_CASE:
      'Configure unicorn/filename-case for consistent file naming',
    ADD_NAMING_RULE_FOR: 'Add naming rule for {selector} ({format})',
  },
} as const;

// File naming conventions and patterns
export const FILE_NAMING_CONVENTIONS = {
  // Directories to skip during file naming analysis
  SKIP_DIRECTORIES: [
    'node_modules',
    'dist',
    'build',
    '.git',
    'coverage',
    '.nx',
    '.angular',
    'tmp',
    'temp',
  ] as const,

  // Angular file suffixes for naming validation
  ANGULAR_SUFFIXES: [
    'component',
    'service',
    'directive',
    'pipe',
    'guard',
    'interceptor',
  ] as const,

  // Naming patterns for validation
  PATTERNS: {
    // Angular file naming: name.component.ts, name.service.ts, etc.
    ANGULAR: /^[a-z-]+\.(component|service|directive|pipe|guard|interceptor)$/,
    // Excessive abbreviations: short variable names like aB, xY
    ABBREVIATION: /^[a-z]{1,2}[A-Z]|[a-z][A-Z][a-z]?$/,
    // PascalCase pattern for directory names
    PASCAL_CASE: /^[A-Z][a-zA-Z]*/,
  } as const,
} as const;

// File naming validation and suggestion messages
export const FILE_NAMING_MESSAGES = {
  // Naming issue messages
  ISSUES: {
    MIXED_CASING: 'Mixed casing in filename',
    EXCESSIVE_ABBREVIATIONS: 'Excessive abbreviations in filename',
    ANGULAR_NAMING: 'Does not follow Angular naming conventions',
    PASCAL_CASE_DIRECTORY: 'Directory uses PascalCase',
  },

  // Naming suggestion messages
  SUGGESTIONS: {
    CONSISTENT_CASING: 'Use consistent kebab-case or camelCase',
    DESCRIPTIVE_NAMES: 'Use more descriptive names',
    ANGULAR_PATTERN: 'Use pattern like component-name.component.ts',
    KEBAB_CASE_DIRECTORY: 'Use kebab-case for directory',
    VERIFY_STRUCTURE: 'Verify project structure for file naming analysis',
  },
} as const;

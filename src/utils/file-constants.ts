/**
 * File System Constants
 * RULE 2: Specialized constants module for files, directories, and paths
 */

// Common directory names
export const DIRECTORY_NAMES = {
  SRC: 'src',
  LIB: 'lib',
  DIST: 'dist',
  BUILD: 'build',
  NODE_MODULES: 'node_modules',
  TESTS: 'tests',
  TEST: 'test',
  SPEC: 'spec',
  COVERAGE: 'coverage',
  DOCS: 'docs',
  ASSETS: 'assets',
  STYLES: 'styles',
  IMAGES: 'images',
  FONTS: 'fonts',
  ENVIRONMENTS: 'environments',
  APP: 'app',
  COMPONENTS: 'components',
  SERVICES: 'services',
  MODULES: 'modules',
  SHARED: 'shared',
  CORE: 'core',
  FEATURES: 'features',
  LAYOUTS: 'layouts',
  PAGES: 'pages',
  UTILS: 'utils',
  HELPERS: 'helpers',
  TYPES: 'types',
  INTERFACES: 'interfaces',
  MODELS: 'models',
  ENUMS: 'enums',
  CONSTANTS: 'constants',
  CONFIG: 'config',
  PIPES: 'pipes',
  DIRECTIVES: 'directives',
  GUARDS: 'guards',
  INTERCEPTORS: 'interceptors',
  RESOLVERS: 'resolvers',
  VALIDATORS: 'validators',
  GIT: '.git',
  GITHUB: '.github',
  WORKFLOWS: 'workflows',
  NX: '.nx',
} as const;

// Common file extensions
export const FILE_EXTENSIONS = {
  TYPESCRIPT: '.ts',
  JAVASCRIPT: '.js',
  JSON: '.json',
  HTML: '.html',
  CSS: '.css',
  SCSS: '.scss',
  SASS: '.sass',
  LESS: '.less',
  MARKDOWN: '.md',
  YAML: '.yaml',
  YML: '.yml',
  XML: '.xml',
  TXT: '.txt',
  LOG: '.log',
  ENV: '.env',
  GITKEEP: '.gitkeep',
  DOCKERFILE: '.dockerfile',
  SPEC_TS: '.spec.ts',
  TEST_TS: '.test.ts',
  MODULE_TS: '.module.ts',
  COMPONENT_TS: '.component.ts',
  COMPONENT_HTML: '.component.html',
  SERVICE_TS: '.service.ts',
  PIPE_TS: '.pipe.ts',
  DIRECTIVE_TS: '.directive.ts',
  GUARD_TS: '.guard.ts',
  INTERCEPTOR_TS: '.interceptor.ts',
  RESOLVER_TS: '.resolver.ts',
  VALIDATOR_TS: '.validator.ts',
  VALIDATORS_TS: '.validators.ts',
  MODEL_TS: '.model.ts',
  INTERFACE_TS: '.interface.ts',
  TYPE_TS: '.type.ts',
  ENUM_TS: '.enum.ts',
  CONSTANT_TS: '.constant.ts',
  SELECTORS_TS: '.selectors.ts',
  SELECTOR_TS: '.selector.ts',
  EFFECTS_TS: '.effects.ts',
  EFFECT_TS: '.effect.ts',
  ACTIONS_TS: '.actions.ts',
  ACTION_TS: '.action.ts',
  REDUCER_TS: '.reducer.ts',
  REDUCERS_TS: '.reducers.ts',
  FACADE_TS: '.facade.ts',
  FACADES_TS: '.facades.ts',
  MODELS_TS: '.models.ts',
  STATE_TS: '.state.ts',
  TSX: '.tsx',
  JSX: '.jsx',
  VUE: '.vue',
  PYTHON: '.py',
  JAVA: '.java',
  GO: '.go',
} as const;

// Path constants for consistent path handling
export const PATH_CONSTANTS = {
  SEPARATOR: '/',
  DOT: '.',
  DOT_DOT: '..',
  ROOT: '/',
  CURRENT_DIR: './',
  PARENT_DIR: '../',
} as const;

// Common patterns and regex
export const PATTERNS = {
  TYPESCRIPT_FILES: '**/*.ts',
  JAVASCRIPT_FILES: '**/*.js',
  SPEC_FILES: '**/*.spec.ts',
  TEST_FILES: '**/*.test.ts',
  CONFIG_FILES: '**/*.json',
  STYLE_FILES: '**/*.{css,scss,sass,less}',
  HTML_FILES: '**/*.html',
  MARKDOWN_FILES: '**/*.md',
  ALL_FILES: '**/*',
} as const;

// File reading and pattern matching options
export const FILE_OPERATIONS = {
  // Default patterns
  PATTERNS: {
    ALL_FILES: '**/*',
    NODE_MODULES_EXCLUDE: 'node_modules/**',
  },

  // File reading options
  READ_OPTIONS: {
    ENCODING: 'utf8' as const,
    FLAG_READ: 'r',
  },
} as const;

// Common skip directories for traversal
export const SKIP_DIRECTORIES = {
  NODE_MODULES: 'node_modules',
  DIST: 'dist',
  BUILD: 'build',
  GIT: '.git',
  COVERAGE: 'coverage',
  NX: '.nx',
  ANGULAR: '.angular',
  // NgRx-specific skip directories
  SHARED: 'shared',
  CORE: 'core',
  COMMON: 'common',
  UTILS: 'utils',
} as const;

// Documentation files
export const DOC_FILES = {
  README: 'README.md',
  SECURITY: 'SECURITY.md',
  PRIVACY: 'PRIVACY.md',
  CONTRIBUTING: 'CONTRIBUTING.md',
  COMPLIANCE: 'COMPLIANCE.md',
  CHANGELOG: 'CHANGELOG.md',
  CODEOWNERS: 'CODEOWNERS',
} as const;

// Configuration files configuration (consolidated from automation-constants)
export const CONFIG_FILES = {
  // Basic configuration files
  ANGULAR_JSON: 'angular.json',
  WORKSPACE_JSON: 'workspace.json',
  TSCONFIG_JSON: 'tsconfig.json',
  ESLINTRC_JS: '.eslintrc.js',
  ESLINTRC_JSON: '.eslintrc.json',
  PACKAGE_JSON: 'package.json',
  PACKAGE_LOCK_JSON: 'package-lock.json',
  NPMRC: '.npmrc',
  NX_JSON: 'nx.json',

  // JavaScript configuration files
  JAVASCRIPT: [
    'webpack.config.js',
    'rollup.config.js',
    'vite.config.js',
    'jest.config.js',
    'karma.config.js',
  ] as const,

  TYPESCRIPT: [
    'webpack.config.ts',
    'vite.config.ts',
    'jest.config.ts',
  ] as const,

  JSON: ['tsconfig.json', 'package.json', 'nx.json', 'angular.json'] as const,

  // Configuration directory patterns
  CONFIG_DIRS: ['config', 'configs', '.config'] as const,

  // RuleOfCode specific configuration files
  RULEOFCODE_CONFIG_JS: 'ruleofcode.config.js',
  RULEOFCODE_CONFIG_JSON: 'ruleofcode.config.json',
  RULEOFCODE_RC: '.ruleofcoderc',
  RULEOFCODE_RC_JSON: '.ruleofcoderc.json',
  ROC_CONFIG_JS: 'roc.config.js',
  ROC_CONFIG_JSON: 'roc.config.json',

  // Docker files
  DOCKERFILE: 'Dockerfile',
  DOCKER_COMPOSE: 'docker-compose.yml',
  NXCONFIG: 'nx.json',

  // Jest configuration files
  JEST_CONFIG: 'jest.config.js',
  JEST_CONFIG_TS: 'jest.config.ts',
  JEST_CONFIG_JSON: 'jest.config.json',
} as const;

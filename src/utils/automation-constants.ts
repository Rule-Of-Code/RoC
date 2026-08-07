/**
 * Automation and Testing Constants
 * RULE 2: Specialized constants module for automation, testing, and CI/CD configurations
 */
import { DIRECTORY_NAMES } from './file-constants';

// Testing framework constants
export const TESTING_CONSTANTS = {
  // Test frameworks
  JEST: 'jest',
  JASMINE: 'jasmine',
  KARMA: 'karma',
  CYPRESS: 'cypress',
  PROTRACTOR: 'protractor',
  WEBDRIVER: 'webdriver',
  PLAYWRIGHT: 'playwright',
  MOCHA: 'mocha',
  CHAI: 'chai',

  // Test file patterns
  SPEC_FILE_EXTENSION: '.spec.ts',
  TEST_FILE_EXTENSION: '.test.ts',
  E2E_SPEC_EXTENSION: '.e2e-spec.ts',
  E2E_TEST_EXTENSION: '.e2e-test.ts',

  // Jest configuration
  JEST_CONFIG: 'jest.config.js',
  JEST_SETUP: 'jest.setup.js',
  JEST_PRESET: 'jest.preset.js',
  JEST_JSON_CONFIG: 'jest.json',

  // Karma configuration
  KARMA_CONFIG: 'karma.conf.js',
  KARMA_CONTEXT_HTML: 'context.html',

  // Cypress configuration
  CYPRESS_CONFIG: 'cypress.config.ts',
  CYPRESS_JSON: 'cypress.json',
  CYPRESS_SUPPORT: 'cypress/support',
  CYPRESS_FIXTURES: 'cypress/fixtures',
  CYPRESS_INTEGRATION: 'cypress/integration',
  CYPRESS_E2E: 'cypress/e2e',

  // Test directories
  TESTS_DIR: 'tests',
  SPEC_DIR: 'spec',
  E2E_DIR: 'e2e',
  CYPRESS_DIR: 'cypress',
  COVERAGE_DIR: DIRECTORY_NAMES.COVERAGE,

  // Coverage tools
  NYC: 'nyc',
  ISTANBUL: 'istanbul',
  LCOV: 'lcov',
  COVERAGE_HTML: 'coverage/index.html',
  COVERAGE_JSON: 'coverage-final.json',
  LCOV_INFO: 'lcov.info',

  // Test keywords and patterns
  DESCRIBE: 'describe',
  IT: 'it',
  TEST: 'test',
  EXPECT: 'expect',
  SHOULD: 'should',
  ASSERT: 'assert',
  BEFORE_EACH: 'beforeEach',
  AFTER_EACH: 'afterEach',
  BEFORE_ALL: 'beforeAll',
  AFTER_ALL: 'afterAll',
  SETUP: 'setup',
  TEARDOWN: 'teardown',

  // Mocking
  MOCK: 'mock',
  SPY: 'spy',
  STUB: 'stub',
  FAKE: 'fake',
  JEST_MOCK: 'jest.mock',
  JEST_SPY_ON: 'jest.spyOn',
  SPY_ON: 'spyOn',

  // Angular Testing
  TESTING_MODULE: 'TestingModule',
  COMPONENT_FIXTURE: 'ComponentFixture',
  TEST_BED: 'TestBed',
  ASYNC: 'async',
  FLUSH: 'flush',
  TICK: 'tick',
  FAKE_ASYNC: 'fakeAsync',
  WAIT_FOR_ASYNC: 'waitForAsync',
  DISCARDPERIODITASKS: 'discardPeriodicTasks',

  // HTTP Testing
  HTTP_CLIENT_TESTING_MODULE: 'HttpClientTestingModule',
  HTTP_TEST_CONTROLLER: 'HttpTestingController',
  EXPECT_ONE: 'expectOne',
  EXPECT_NONE: 'expectNone',
  FLUSH_HTTP: 'flush',
  VERIFY: 'verify',

  // RouterTestingModule
  ROUTER_TESTING_MODULE: 'RouterTestingModule',
  LOCATION: 'Location',
  ROUTER: 'Router',
  NAVIGATE_BY_URL: 'navigateByUrl',

  // Common test utilities
  DEBUG_ELEMENT: 'DebugElement',
  BY: 'By',
  BY_CSS: 'By.css',
  BY_DIRECTIVE: 'By.directive',
  NATIVE_ELEMENT: 'nativeElement',
  QUERY: 'query',
  QUERY_ALL: 'queryAll',
  DETECT_CHANGES: 'detectChanges',
  COMPONENT_INSTANCE: 'componentInstance',

  // Accessibility testing
  AXE: 'axe',
  A11Y: 'a11y',
  ARIA: 'aria',
  SCREEN_READER: 'screen-reader',
} as const;

// CI/CD and automation constants
export const AUTOMATION_CONSTANTS = {
  // CI/CD platforms
  BITBUCKET_PIPELINES: 'bitbucket-pipelines.yml',
  GITHUB_ACTIONS: '.github/workflows',
  GITLAB_CI: '.gitlab-ci.yml',
  TRAVIS_CI: '.travis.yml',
  CIRCLE_CI: '.circleci/config.yml',
  JENKINS: 'Jenkinsfile',
  AZURE_PIPELINES: 'azure-pipelines.yml',

  // Docker
  DOCKERFILE: 'Dockerfile',
  DOCKER_COMPOSE: 'docker-compose.yml',
  DOCKER_IGNORE: '.dockerignore',
  DOCKER_ENV: '.env.docker',

  // Build tools
  WEBPACK: 'webpack.config.js',
  ROLLUP: 'rollup.config.js',
  VITE: 'vite.config.ts',
  ESBUILD: 'esbuild.config.js',
  PARCEL: 'parcel.json',

  // Package managers
  NPM: 'npm',
  YARN: 'yarn',
  PNPM: 'pnpm',
  PACKAGE_JSON: 'package.json',
  PACKAGE_LOCK: 'package-lock.json',
  YARN_LOCK: 'yarn.lock',
  PNPM_LOCK: 'pnpm-lock.yaml',

  // Quality tools
  ESLINT: '.eslintrc',
  ESLINT_JS: '.eslintrc.js',
  ESLINT_JSON: '.eslintrc.json',
  ESLINT_YAML: '.eslintrc.yml',
  PRETTIER: '.prettierrc',
  PRETTIER_JS: 'prettier.config.js',
  PRETTIER_IGNORE: '.prettierignore',
  EDITORCONFIG: '.editorconfig',
  GITIGNORE: '.gitignore',
  GITATTRIBUTES: '.gitattributes',

  // Linting and formatting
  LINT: 'lint',
  FORMAT: 'format',
  FIX: 'fix',
  CHECK: 'check',
  STYLELINT: 'stylelint',
  TSC: 'tsc',
  TYPESCRIPT_CHECK: 'type-check',

  // Scripts and commands
  BUILD: 'build',
  START: 'start',
  DEV: 'dev',
  SERVE: 'serve',
  WATCH: 'watch',
  TEST: 'test',
  TEST_WATCH: 'test:watch',
  TEST_COVERAGE: 'test:coverage',
  E2E: 'e2e',
  ANALYZE: 'analyze',
  BUNDLE_ANALYZER: 'bundle-analyzer',

  // Environment variables
  NODE_ENV: 'NODE_ENV',
  NODE_ENV_DEVELOPMENT: 'development',
  NODE_ENV_PRODUCTION: 'production',
  NODE_ENV_TEST: 'test',
  CI: 'CI',
  BUILD_NUMBER: 'BUILD_NUMBER',
  GIT_COMMIT: 'GIT_COMMIT',
  GIT_BRANCH: 'GIT_BRANCH',

  // Deployment
  DEPLOY: 'deploy',
  RELEASE: 'release',
  STAGING: 'staging',
  PRODUCTION: 'production',
  PREVIEW: 'preview',
  BETA: 'beta',
  CANARY: 'canary',

  // Monitoring and logging
  SENTRY: 'sentry',
  NEW_RELIC: 'newrelic',
  DATADOG: 'datadog',
  WINSTON: 'winston',
  LOG_LEVEL: 'LOG_LEVEL',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',

  // Security scanning
  SNYK: 'snyk',
  AUDIT: 'audit',
  SECURITY_AUDIT: 'security-audit',
  VULNERABILITY_CHECK: 'vulnerability-check',
  DEPENDENCY_CHECK: 'dependency-check',

  // Performance testing
  LIGHTHOUSE: 'lighthouse',
  WEB_VITALS: 'web-vitals',
  PERFORMANCE_BUDGET: 'performance-budget',
  BUNDLE_SIZE: 'bundle-size',
  LOAD_TEST: 'load-test',

  // Git hooks
  PRE_COMMIT: 'pre-commit',
  PRE_PUSH: 'pre-push',
  COMMIT_MSG: 'commit-msg',
  HUSKY: 'husky',
  LINT_STAGED: 'lint-staged',
  COMMITIZEN: 'commitizen',
  COMMITLINT: 'commitlint',

  // Code quality thresholds
  COVERAGE_THRESHOLD: 80,
  MAINTAINABILITY_THRESHOLD: 75,
  RELIABILITY_THRESHOLD: 'A',
  SECURITY_THRESHOLD: 'A',
  DUPLICATION_THRESHOLD: 3,
} as const;

// Automation validation messages
export const AUTOMATION_VALIDATION_MESSAGES = {
  TESTING: {
    NO_TESTS_FOUND:
      'No test files found in {fileName}. Consider adding unit tests.',
    LOW_TEST_COVERAGE:
      'Test coverage is below threshold ({coverage}%) in {fileName}',
    MISSING_TEST_SETUP:
      'Test configuration is missing or incomplete in {fileName}',
    ASYNC_TEST_ISSUES: 'Async test handling could be improved in {fileName}',
    MISSING_MOCKS:
      'Consider adding proper mocks for external dependencies in {fileName}',
    E2E_TESTS_MISSING:
      'End-to-end tests are missing for critical user flows in {fileName}',
    TEST_ISOLATION_ISSUES: 'Tests may not be properly isolated in {fileName}',
    SLOW_TESTS:
      'Some tests are running slowly in {fileName}. Consider optimization.',
  },

  CI_CD: {
    NO_CI_CONFIGURATION:
      'CI/CD configuration is missing. Consider adding automated build pipeline.',
    BUILD_SCRIPT_MISSING: 'Build script is not defined in package.json',
    DEPLOYMENT_SCRIPT_MISSING:
      'Deployment script is not configured in {fileName}',
    ENVIRONMENT_VARIABLES_MISSING:
      'Environment variables are not properly configured in {fileName}',
    SECURITY_SCANNING_MISSING:
      'Security scanning is not configured in CI/CD pipeline',
    QUALITY_GATES_MISSING: 'Quality gates are not enforced in CI/CD pipeline',
    DOCKER_OPTIMIZATION:
      'Docker configuration could be optimized in {fileName}',
  },

  CODE_QUALITY: {
    LINTING_ERRORS:
      'Linting errors found in {fileName}. Run linter to see details.',
    FORMATTING_ISSUES: 'Code formatting issues detected in {fileName}',
    NO_PRETTIER_CONFIG:
      'Prettier configuration is missing for consistent code formatting',
    NO_ESLINT_CONFIG: 'ESLint configuration is missing for code quality checks',
    OUTDATED_DEPENDENCIES: 'Some dependencies are outdated. Consider updating.',
    SECURITY_VULNERABILITIES:
      'Security vulnerabilities detected in dependencies',
  },

  PERFORMANCE: {
    BUNDLE_SIZE_WARNING: 'Bundle size is larger than recommended in {fileName}',
    LIGHTHOUSE_SCORE_LOW: 'Lighthouse performance score is below threshold',
    WEB_VITALS_ISSUES: 'Core Web Vitals metrics need improvement',
    UNUSED_DEPENDENCIES: 'Unused dependencies detected that could be removed',
    HEAVY_IMPORTS:
      'Heavy imports detected that could impact performance in {fileName}',
  },

  DEPLOYMENT: {
    PRODUCTION_BUILD_MISSING: 'Production build configuration is missing',
    ENVIRONMENT_CONFIG_MISSING: 'Environment-specific configuration is missing',
    ROLLBACK_STRATEGY_MISSING:
      'Rollback strategy is not defined for deployments',
    HEALTH_CHECKS_MISSING: 'Health checks are not configured for deployment',
    MONITORING_MISSING: 'Application monitoring is not properly configured',
  },
} as const;

// Automation configuration templates
export const AUTOMATION_TEMPLATES = {
  // Jest configuration template
  JEST_CONFIG_TEMPLATE: `{
  "preset": "jest-preset-angular",
  "setupFilesAfterEnv": ["<rootDir>/setup-jest.ts"],
  "testMatch": ["**/+(*.)+(spec).+(ts)"],
  "collectCoverage": true,
  "coverageReporters": ["html", "lcov", "text-summary"],
  "coverageDirectory": "coverage",
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}`,

  // ESLint configuration template
  ESLINT_CONFIG_TEMPLATE: `{
  "extends": [
    "@angular-eslint/recommended",
    "@angular-eslint/template/process-inline-templates"
  ],
  "rules": {
    "@angular-eslint/directive-selector": [
      "error",
      { "type": "attribute", "prefix": "app", "style": "camelCase" }
    ],
    "@angular-eslint/component-selector": [
      "error",
      { "type": "element", "prefix": "app", "style": "kebab-case" }
    ]
  }
}`,

  // Bitbucket Pipelines template
  BITBUCKET_PIPELINES_TEMPLATE: `image: node:18

pipelines:
  default:
    - step:
        name: Build and Test
        caches:
          - node
        script:
          - npm ci
          - npm run build
          - npm run test
          - npm run lint
  branches:
    master:
      - step:
          name: Deploy to Production
          deployment: production
          script:
            - npm run build:prod
            - npm run deploy:prod`,

  // Docker template
  DOCKERFILE_TEMPLATE: `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

EXPOSE 3000

CMD ["npm", "start"]`,
} as const;

// Legacy constants for backward compatibility
// RULE 1: Centralized legacy constants to maintain API compatibility

// CI/CD configuration paths
export const CICD_PATHS = {
  GITHUB_WORKFLOWS: '.github/workflows',
  BITBUCKET_PIPELINES: 'bitbucket-pipelines.yml',
  GITLAB_CI: '.gitlab-ci.yml',
  TRAVIS_CI: '.travis.yml',
  CIRCLE_CI: '.circleci/config.yml',
  AZURE_PIPELINES: 'azure-pipelines.yml',
  JENKINSFILE: 'Jenkinsfile',
} as const;

// Linting and code quality tools
export const LINTING_TOOLS = {
  ESLINT: 'eslint',
  TSLINT: 'tslint',
  JSHINT: 'jshint',
  STYLELINT: 'stylelint',
  PRETTIER: 'prettier',
} as const;

export const CODE_QUALITY_TOOLS = {
  SONARJS: 'sonarjs',
  CODACY_COVERAGE: 'codacy-coverage',
  CODECOV: 'codecov',
  ISTANBUL: 'istanbul',
  JEST: 'jest',
  NYC: 'nyc',
} as const;

// Review automation keywords and tools
export const REVIEW_AUTOMATION = {
  // Review keywords
  KEYWORDS: {
    LINT: 'lint',
    TEST: 'test',
    QUALITY: 'quality',
    REVIEW: 'review',
  },

  // Pre-commit hooks
  PRE_COMMIT_HOOKS: {
    HUSKY: '.husky',
    PRE_COMMIT_CONFIG: '.pre-commit-config.yaml',
    GIT_HOOKS_PRE_COMMIT: '.git/hooks/pre-commit',
  },

  // Dependency updaters
  DEPENDENCY_UPDATERS: {
    DEPENDABOT: '.github/dependabot.yml',
    RENOVATE: 'renovate.json',
  },

  // Coverage reporting
  COVERAGE_CONFIGS: {
    COVERALLS: '.coveralls.yml',
    CODECOV: 'codecov.yml',
    CODECOV_ALT: '.codecov.yml',
  },
} as const;

// Automation messages for review tools analysis
export const AUTOMATION_MESSAGES = {
  // Linting tools messages
  LINTING: {
    NO_TOOLS_VIOLATION: 'No linting tools found',
    ADD_TOOLS_SUGGESTION:
      'Add ESLint or similar linting tools for automated code quality checks',
  },

  // Code quality tools messages
  CODE_QUALITY: {
    ADD_TOOLS_SUGGESTION:
      'Add code quality tools (coverage, complexity analysis)',
  },

  // CI/CD messages
  CICD: {
    NO_CICD_VIOLATION: 'No CI/CD configuration found',
    NO_REVIEW_CHECKS_VIOLATION: 'CI/CD exists but lacks review automation',
    SETUP_CICD_SUGGESTION:
      'Set up GitHub Actions or similar CI/CD for automated checks',
    ADD_REVIEW_CHECKS_SUGGESTION:
      'Add automated linting and testing to CI/CD pipeline',
  },

  // Pre-commit hooks messages
  PRE_COMMIT: {
    SETUP_HOOKS_SUGGESTION:
      'Set up pre-commit hooks for immediate code quality feedback',
    USE_HUSKY_SUGGESTION:
      'Use husky or pre-commit to run linters before commits',
  },

  // Dependency updaters messages
  DEPENDENCY_UPDATERS: {
    CONSIDER_TOOLS_SUGGESTION:
      'Consider using Dependabot or Renovate for dependency updates',
  },

  // Coverage reporting messages
  COVERAGE: {
    SETUP_REPORTING_SUGGESTION:
      'Set up code coverage reporting (Codecov, Coveralls)',
  },
} as const;

// Jest constants alias for backward compatibility
export const JEST_CONSTANTS = {
  // Jest configuration properties
  COLLECT_COVERAGE: 'collectCoverage',
  COVERAGE_THRESHOLD: 'coverageThreshold',
  COVERAGE_REPORTERS: 'coverageReporters',
  COLLECT_COVERAGE_FROM: 'collectCoverageFrom',
  // Common coverage reporters
  COMMON_REPORTERS: ['html', 'lcov', 'text', 'json'] as const,
  // Coverage metrics
  COVERAGE_METRICS: ['branches', 'functions', 'lines', 'statements'] as const,
  // Default coverage threshold
  DEFAULT_COVERAGE_THRESHOLD: 80,
} as const;

// Bundle optimization configuration constants
export const BUNDLE_OPTIMIZATION = {
  // Webpack bundle analysis thresholds
  WEBPACK_THRESHOLDS: {
    BUNDLE_SIZE_WARNING: 250000,
    BUNDLE_SIZE_ERROR: 500000,
    ASSET_SIZE_WARNING: 100000,
    ASSET_SIZE_ERROR: 200000,
  } as const,

  // Bundle splitting optimization patterns
  SPLIT_CHUNKS_PATTERNS: {
    VENDOR_LIBRARIES: ['node_modules'],
    ANGULAR_CORE: ['@angular/core', '@angular/common'],
    NGRX: ['@ngrx/store', '@ngrx/effects'],
  } as const,

  // Tree shaking configuration
  TREE_SHAKING: {
    SIDE_EFFECTS_FREE: false,
    USED_EXPORTS: true,
    PROVIDED_EXPORTS: true,
  } as const,
} as const;

// Performance monitoring and configuration constants
export const PERFORMANCE_MONITORING = {
  // Lighthouse scoring thresholds
  LIGHTHOUSE_THRESHOLDS: {
    PERFORMANCE: 90,
    ACCESSIBILITY: 95,
    BEST_PRACTICES: 95,
    SEO: 90,
  } as const,

  // Core Web Vitals thresholds
  WEB_VITALS: {
    FIRST_CONTENTFUL_PAINT: 1800,
    LARGEST_CONTENTFUL_PAINT: 2500,
    FIRST_INPUT_DELAY: 100,
    CUMULATIVE_LAYOUT_SHIFT: 0.1,
  } as const,

  // Bundle size monitoring thresholds
  BUNDLE_SIZE_LIMITS: {
    MAIN_BUNDLE: 250000,
    VENDOR_BUNDLE: 500000,
    LAZY_CHUNK: 100000,
  } as const,
} as const;

// Security configuration constants
export const SECURITY_CONFIGURATION = {
  // Content Security Policy headers
  CSP_DIRECTIVES: {
    DEFAULT_SRC: ["'self'"],
    SCRIPT_SRC: ["'self'", "'unsafe-inline'"],
    STYLE_SRC: ["'self'", "'unsafe-inline'"],
    IMG_SRC: ["'self'", 'data:', 'https:'],
  } as const,

  // Security headers configuration
  SECURITY_HEADERS: {
    X_CONTENT_TYPE_OPTIONS: 'nosniff',
    X_FRAME_OPTIONS: 'DENY',
    X_XSS_PROTECTION: '1; mode=block',
    STRICT_TRANSPORT_SECURITY: 'max-age=31536000; includeSubDomains',
  } as const,

  // Dependency vulnerability thresholds
  VULNERABILITY_THRESHOLDS: {
    HIGH: 0,
    MODERATE: 5,
    LOW: 10,
  } as const,
} as const;

// Configuration file patterns and locations
export const CONFIG_PATTERNS = {
  // Build optimization configuration
  WEBPACK_CONFIG: 'webpack.config.js',
  ROLLUP_CONFIG: 'rollup.config.js',
  VITE_CONFIG: 'vite.config.js',

  // Testing configuration
  KARMA_CONFIG: 'karma.config.js',
  PROTRACTOR_CONFIG: 'protractor.config.js',

  // Directory patterns for configuration lookup
  CONFIG_SEARCH_DIRS: ['config', 'configs', '.config', 'tools'] as const,
} as const;

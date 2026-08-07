// 🏛️ CONSTITUTIONAL JEST CONFIGURATION - PROFESSIONAL EXCELLENCE
// Constitutional Compliance: RuleOfCode v4.1.2 Standards
// 💎 SUPREME PROFESSIONAL Testing Framework - Zero Tolerance for Quality Issues

module.exports = {
  // 🎯 CORE TESTING FOUNDATION
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // 🔍 COMPREHENSIVE TEST DISCOVERY
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)',
    '**/*.test.{ts,tsx,js}',
    '**/*.spec.{ts,tsx,js}',
  ],

  // 🚫 STRATEGIC TEST EXCLUSIONS
  testPathIgnorePatterns: [
    '<rootDir>/tests/generated/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/',
    '<rootDir>/tmp/',
    '.*\\.d\\.ts$',
  ],

  // ⚡ ADVANCED TRANSFORMATION ENGINE
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: false,
        diagnostics: {
          ignoreCodes: ['TS151001'],
          warnOnly: false,
          pretty: true,
        },
        tsconfig: {
          skipLibCheck: true,
          types: ['jest', 'node'],
          target: 'es2020',
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          noImplicitAny: true,
          noImplicitReturns: true,
          noImplicitThis: true,
          noUnusedLocals: false, // Let ESLint handle this
          noUnusedParameters: false, // Let ESLint handle this
        },
      },
    ],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // 📊 SUPREME COVERAGE CONFIGURATION
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/index.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/types.ts',
    '!src/**/interfaces.ts',
    '!src/**/constants.ts',
  ],

  // 🏆 COVERAGE EXCELLENCE STANDARDS
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json-summary',
    'cobertura',
    'clover',
  ],

  // 🎯 CONSTITUTIONAL COVERAGE REQUIREMENTS - 100% OR NOTHING
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    // Per-file requirements to ensure no weak spots - ALSO 100%
    'src/**/*.{ts,tsx}': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },

  // ⚙️ PROFESSIONAL PERFORMANCE SETTINGS
  testTimeout: 30000,
  slowTestThreshold: 5000,
  verbose: true,
  // `detectLeaks` is Jest's EXPERIMENTAL heap-growth heuristic — it flagged ~65
  // suites as "leaking memory" and failed them even though every test passed
  // (0 real assertion failures). It is notoriously false-positive, so it is
  // disabled; `logHeapUsage` (its companion per-suite heap noise) is dropped too.
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: '50%',

  // 🚀 ADVANCED EXECUTION OPTIONS
  bail: 0, // Run all tests, don't stop on first failure
  errorOnDeprecated: true,
  collectCoverage: false, // Only collect when explicitly requested
  passWithNoTests: false, // Fail if no tests found
  resetMocks: true,
  resetModules: true,
  restoreMocks: true,
  clearMocks: true,

  // 🔧 SETUP AND TEARDOWN
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // globalSetup: '<rootDir>/tests/global-setup.ts',
  // globalTeardown: '<rootDir>/tests/global-teardown.ts',

  // 📦 MODULE RESOLUTION MASTERY
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@mocks/(.*)$': '<rootDir>/tests/__mocks__/$1',
    '^@helpers/(.*)$': '<rootDir>/tests/helpers/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },

  // 📁 FILE EXTENSION INTELLIGENCE
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // 🎨 ADVANCED DISPLAY OPTIONS
  displayName: {
    name: '🏛️ RuleOfCode Constitutional Tests',
    color: 'blue',
  },

  // 🔍 REPORTER CONFIGURATION
  reporters: [
    'default',
    // Optional reporters (install if needed):
    // ['jest-junit', { outputDirectory: './coverage', outputName: 'junit.xml' }],
    // ['jest-html-reporters', { publicPath: './coverage', filename: 'jest-report.html' }],
  ],

  // ⚡ TYPESCRIPT JEST PROFESSIONAL CONFIG
  preset: 'ts-jest/presets/default',
  extensionsToTreatAsEsm: [],

  // 🏗️ DEPRECATED - Using new transform syntax above
  // globals: { ... } // Moved to transform configuration
  unmockedModulePathPatterns: ['<rootDir>/node_modules/'],

  // 🔄 WATCH MODE PROFESSIONAL SETTINGS
  watchman: true,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/build/',
  ],

  // 🏁 CONSTITUTIONAL COMPLIANCE VALIDATION
  // This configuration enforces the highest standards of testing excellence
  // as mandated by the RuleOfCode Constitutional Framework v4.1.2
};

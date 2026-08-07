// RuleOfCode configuration — example Angular workspace.
// A curated Pareto subset for teams adopting the gate incrementally;
// for the full catalog, drop `laws.enabled` / `paretoMode` and audit everything.

module.exports = {
  project: {
    name: 'My Angular Workspace',
    componentPrefix: 'app',
    type: 'angular',
    framework: {
      angular: {
        strictMode: true,
        standaloneComponents: true,
        onPushStrategy: true,
      },
    },
  },

  ignores: {
    global: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/*.d.ts',
      '**/android/**',
      '**/ios/**',
      'figma_prototype/**',
      '**/design-assets/**',
      // 🛡️ RoC SELF-EXCLUSION - Constitutional System excludes itself
      'packages/ruleofcode/**',
      'tools/constitutional-compliance/**',
      '**/.nx/**',
      '**/www/**',
      '**/capacitor.config.ts',
      '**/firebase.json',
      '**/firestore.rules',
    ],
    byRule: {
      // 🛡️ RoC SELF-EXCLUSION from all constitutional laws
      'build-integrity': ['packages/ruleofcode/**', 'tools/constitutional-compliance/**'],
      'eslint-zero-warnings': ['packages/ruleofcode/**', 'tools/constitutional-compliance/**'],
      'typescript-strict': ['packages/ruleofcode/**', 'tools/constitutional-compliance/**'],
      'no-secrets': ['packages/ruleofcode/**', 'tools/constitutional-compliance/**'],
      'ai-first-development': ['packages/ruleofcode/**', 'tools/constitutional-compliance/**'],
      'sacred-metrics': ['packages/ruleofcode/**', 'tools/constitutional-compliance/**'],
      'component-size-limits': [
        '**/app.component.ts', // Main app component can be larger
        '**/main.ts', // Bootstrap files can be larger
        '**/polyfills.ts',
        'packages/ruleofcode/**', // RoC files excluded
      ],
      'test-coverage': [
        '**/main.ts',
        '**/polyfills.ts',
        '**/*.module.ts',
        '**/capacitor.config.ts',
        'packages/ruleofcode/**',
        'tools/constitutional-compliance/**',
      ],
    },
    tests: [
      '**/*.spec.ts',
      '**/*.e2e-spec.ts',
      '**/karma.conf.js',
      '**/jest.config.ts',
      'apps/*-e2e/**',
      '**/protractor.conf.js',
    ],
    build: [
      '**/dist/**',
      '**/.angular/**',
      '**/.nx/**',
      '**/www/**',
      '**/android/app/build/**',
      '**/ios/App/build/**',
    ],
    design: [
      '**/figma_prototype/**',
      '**/design-assets/**',
      '**/assets/icons/**',
      '**/assets/images/**',
      '**/assets/mockups/**',
    ],
  },

  laws: {
    enabled: {
      // Pareto Core - Critical Angular Rules
      'build-integrity': true,
      'eslint-zero-warnings': true,
      'typescript-strict': true,
      'no-secrets': true,
      'ai-first-development': true,

      // Angular-specific high-impact rules
      'angular-standalone-components': true,
      'angular-onpush-strategy': true,
      'angular-trackby-functions': true,
      'angular-async-pipe': true,
      'angular-lazy-loading': true,

      // Performance and quality
      'sacred-metrics': true,
      'component-size-limits': true,
      accessibility: true,

      // Lower priority
      'test-coverage': false,
      'naming-conventions': false,
      documentation: false,
    },
    paretoMode: true,
    custom: {
      'angular-component-size-limit': 300,
      'angular-template-complexity-limit': 15,
      'accessibility-level': 'AA',
    },
  },

  hooks: {
    preCommit: true,
    prePush: true,
    commitMsg: true,
    custom: {
      'pre-push': [
        'ng build --prod --source-map=false',
        'ng test --watch=false --browsers=ChromeHeadless',
        'ng lint',
      ],
    },
  },

  reporting: {
    format: 'console',
    verbose: false,
    onlyFailures: true,
    scoring: true,
  },

  performance: {
    parallel: true,
    maxConcurrent: 6, // Angular builds can be resource intensive
    cache: true,
    incremental: true,
  },
};

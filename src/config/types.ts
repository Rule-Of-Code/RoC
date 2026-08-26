/**
 * RuleOfCode Configuration Interface
 * Professional-grade FileHeaderComplianceAnalyzer system
 */

import { CONSTITUTIONAL_LAWS } from '../data/constitutional-laws';
import { CONSTITUTIONAL_PATHS } from '../utils/constants';

export interface RuleOfCodeConfig {
  // Allow index signature for compatibility with Record<string, unknown>
  [key: string]: unknown;

  /**
   * Project-specific settings
   */
  project: {
    /** Project root directory */
    root?: string;
    /** Project name for reporting */
    name: string;
    /** Component prefix (e.g., 'app', 'lib', 'ui') */
    componentPrefix: string;
    /** Project type affects which rules are enabled by default */
    type:
      | 'angular'
      | 'generic'
      | 'ionic'
      | 'library'
      | 'node'
      | 'python'
      | 'react'
      | 'vue';
    /** Framework-specific settings */
    framework?: {
      angular?: {
        strictMode: boolean;
        standaloneComponents: boolean;
        onPushStrategy: boolean;
      };
      react?: {
        strictMode: boolean;
        hooksOnly: boolean;
      };
    };
  };

  /**
   * Path mappings for monorepo/custom structures (e.g., Nx, Lerna)
   * Maps canonical paths to actual locations in your project
   */
  pathMappings?: {
    /**
     * Angular app configuration file path
     * Default: 'src/app/app.config.ts'
     * Nx example: 'apps/client-app/src/app/app.config.ts' or 'apps/*\/src/app/app.config.ts'
     */
    appConfig?: string | string[];

    /**
     * Angular app component file path
     * Default: 'src/app/app.component.ts'
     * Nx example: 'apps/client-app/src/app/app.component.ts' or 'apps/*\/src/app/app.component.ts'
     */
    appComponent?: string | string[];

    /**
     * Angular app module file path
     * Default: 'src/app/app.module.ts'
     * Nx example: 'apps/client-app/src/app/app.module.ts' or 'apps/*\/src/app/app.module.ts'
     */
    appModule?: string | string[];

    /**
     * Main entry point file path
     * Default: 'src/main.ts'
     * Nx example: 'apps/client-app/src/main.ts' or 'apps/*\/src/main.ts'
     */
    mainTs?: string | string[];

    /**
     * Source directory root
     * Default: 'src'
     * Nx example: 'apps/*\/src' or ['apps/client-app/src', 'apps/master-app/src']
     */
    srcRoot?: string | string[];

    /**
     * Where this project's CI/CD configuration actually lives.
     *
     * Provider detection is a filename allowlist, and an allowlist of providers
     * is always incomplete — Google Cloud Build in particular puts the build
     * config wherever the trigger's `--build-config=` flag points, so there is no
     * path to guess. Declare it and the CI/CD laws stop guessing.
     *
     * Example: 'infra/cloudbuild/*.yaml' or ['ci/gates.yaml', 'ci/release.yaml']
     */
    cicdConfig?: string | string[];
  };

  /**
   * File and directory patterns to include (POSITIVE INCLUSION APPROACH)
   */
  includes?: {
    /** Patterns to include globally - if specified, ONLY these paths will be audited */
    global?: string[];
    /** Patterns to include for specific rules */
    byRule?: Record<string, string[]>;
  };

  /**
   * File and directory patterns to ignore (NEGATIVE EXCLUSION APPROACH)
   */
  ignores: {
    /** Patterns to ignore globally */
    global: string[];
    /** Patterns to ignore for specific rules */
    byRule?: Record<string, string[]>;
    /** Patterns for test files */
    tests: string[];
    /** Patterns for build outputs */
    build: string[];
    /** Patterns for design/prototype files */
    design: string[];
  };

  /**
   * Constitutional laws configuration
   */
  laws: {
    /** Enable/disable individual laws - if not provided, all laws are enabled */
    enabled?: Record<string, boolean>;
    /**
     * Laws declared Not Applicable to this project, mapped to a documented reason
     * (lawId → why). Such laws are EXCLUDED from the audit (not counted as failing)
     * — e.g. a no-Firestore app skipping DB-query laws, or an SVG-only UI skipping
     * raster image optimization. Use sparingly + always with an honest reason.
     */
    notApplicable?: Record<string, string>;
    /** Pareto optimization - only enable most impactful rules */
    paretoMode: boolean;
    /** Custom law configurations */
    custom?: Record<string, unknown>;
    /**
     * Per-law severity overrides. Keys match the law's canonical name
     * ("Module Size"), its printed slug ("module-size"), its id, or its
     * legacyId. Unknown keys are reported at audit start.
     */
    severity: Record<string, 'error' | 'info' | 'warning'>;
    /**
     * Escalate warning/info violations to audit failures (exit 1).
     * Also settable at the top level of the config or via --fail-on-warnings.
     */
    failOnWarnings?: boolean;
    /**
     * Liveness floor for the Audit Liveness Assertion law: the audit fails
     * when it plans fewer laws than this. Default: 25% of the stack-applicable
     * registry laws. Set it to your known post-waiver count.
     */
    minLawsChecked?: number;
  };

  /**
   * Golden/snapshot fixture paths (globs or substrings) protected by the
   * Golden Fixture Immutability law: changing them requires a
   * GOLDEN-APPROVALS.md entry in the same change-set.
   */
  goldenPaths?: string[];

  /**
   * Git hooks configuration
   */
  hooks: {
    /** Enable pre-commit hooks */
    preCommit: boolean;
    /** Enable pre-push hooks */
    prePush: boolean;
    /** Enable commit-msg hooks */
    commitMsg: boolean;
    /** Custom hook commands */
    custom?: Record<string, string[]>;
  };

  /**
   * Reporting and scoring
   */
  reporting: {
    /** Output format */
    format: 'console' | 'html' | 'json' | 'markdown';
    /** Include detailed explanations */
    verbose: boolean;
    /** Show only failures */
    onlyFailures: boolean;
    /** Generate score reports */
    scoring: boolean;
  };

  /**
   * Performance optimization
   */
  performance: {
    /** Enable parallel execution */
    parallel: boolean;
    /** Maximum concurrent processes */
    maxConcurrent: number;
    /** Cache results */
    cache: boolean;
  };

  /**
   * Quality thresholds - configurable limits for various checks
   */
  thresholds?: {
    git?: {
      /** Maximum commits allowed per feature branch */
      maxCommitsPerBranch?: number;
      /** Maximum commit message (subject) length */
      maxCommitMessageLength?: number;
      /** Maximum commit body (description) line length before wrapping. Default 72. */
      maxCommitBodyLineLength?: number;
      /** Files a single commit may touch before it counts as oversized. Default 10. */
      maxFilesPerCommit?: number;
      /** Lines a single commit may change before it counts as oversized. Default 500. */
      maxLinesPerCommit?: number;
      /** Minimum branch name length */
      minBranchNameLength?: number;
      /**
       * Commit-size scope — the same shape the commitMessage and
       * commitDescription scopes already use, so all three laws that read
       * commit history can be pointed at the same adoption baseline.
       */
      commitSize?: {
        /**
         * Only measure commits AFTER this git ref/SHA/tag, so history made
         * before adopting RoC is exempt while new commits are enforced.
         */
        baseline?: string;
        /** How many recent commits to measure when no baseline is set. Default: 10. */
        maxCommits?: number;
        /**
         * Paths whose LINES are not counted, as regular-expression sources.
         * Replaces the built-in list of lockfiles (package-lock.json, yarn.lock,
         * poetry.lock, go.sum, Cargo.lock and the rest) rather than adding to
         * it. Their file count still applies — the exemption is for content
         * nobody reviews, not for the size of the change.
         */
        generatedFiles?: string[];
      };
      /**
       * Branch prefixes this project accepts, without the trailing slash.
       * Default: feature, bugfix, hotfix, release, chore.
       *
       * Read by every law that judges a branch name, so a project states its
       * convention once. Set it to be stricter than the default (drop `chore`)
       * or to name your own (`spike`, `poc`); the suggestion text follows what
       * you declare, so the advice can never recommend a prefix the check
       * rejects.
       */
      branchPrefixes?: string[];
      /**
       * Commit-message-standards scope — lets you adopt RoC in an EXISTING repo
       * without rewriting its whole history: exempt old/merge commits, enforce new ones.
       */
      commitMessage?: {
        /**
         * Skip merge commits (e.g. Bitbucket "Merged in…", GitHub "Merge pull
         * request…") — they are auto-generated and not authored conventional commits.
         * Default: true.
         */
        ignoreMergeCommits?: boolean;
        /**
         * Only check commits AFTER this git ref/SHA/tag — a baseline so commits made
         * BEFORE adopting RoC are exempt while NEW commits are still enforced.
         */
        baseline?: string;
        /** How many recent commits to check when no baseline is set. Default: 10. */
        maxCommits?: number;
      };
      /**
       * Commit-description (body) scope — same idea as commitMessage, but for the
       * Commit Description Standards law, so an EXISTING repo can exempt old
       * bodies while enforcing new ones. Any field left unset falls back to the
       * matching commitMessage value, so a single baseline can govern both.
       */
      commitDescription?: {
        /** Skip merge commits (auto-generated bodies). Default: true. */
        ignoreMergeCommits?: boolean;
        /**
         * Only check commit bodies AFTER this git ref/SHA/tag — a baseline so
         * descriptions written BEFORE adopting the law are exempt.
         */
        baseline?: string;
        /** How many recent commits to check when no baseline is set. Default: 10. */
        maxCommits?: number;
      };
    };
    codeQuality?: {
      /**
       * How many functions one file may declare (default 20).
       *
       * A COUNT, which is why it has its own name. It used to be governed by
       * `maxComplexity`, so an adopter tuning how many callbacks a file may
       * hold was setting a key that reads as cyclomatic complexity — the metric
       * this law computes separately.
       *
       * The count alone does not fail a file: it must also branch. See
       * `maxComplexity` below for the metric about branching.
       */
      maxFunctionsPerFile?: number;
      /**
       * Maximum cyclomatic complexity.
       *
       * Still read as the fallback for `maxFunctionsPerFile`, so a config
       * written before the two were separated keeps its meaning.
       */
      maxComplexity?: number;
      /**
       * Cyclomatic complexity budget for a SINGLE function (default 10 — the
       * classic per-function limit). The worst function in each file is measured
       * against it; the file's total is not.
       */
      minFunctionComplexity?: number;
      /**
       * Optional budget for a whole file's summed decision points. Absent by
       * default: a file of many simple functions is not a defect, and treating it
       * as one pushed projects toward one function per module.
       */
      maxFileComplexity?: number;
      /** Maximum lines per file before it is flagged as too long. Default: 300. */
      maxFileLines?: number;
      /** Maximum dependencies per module */
      maxDependencies?: number;
      /** Minimum code block size for duplication detection */
      minDuplicationBlockSize?: number;
      /** Minimum comment ratio percentage (0-100) */
      minCommentRatioPercent?: number;
      /** Minimum file size (lines) to require comment ratio */
      minFileSizeForComments?: number;
    };
    typescript?: {
      /**
       * Allow an `enum` to remain when the declaration (or the line above) carries
       * a `// roc-allow-enum` justification — e.g. genuine runtime iteration.
       * Default: true. Set false to forbid enums unconditionally.
       */
      allowEnumWithJustification?: boolean;
    };
    python?: {
      /** Paths (globs or substrings) where naive datetimes are allowed (Timezone-Aware Datetimes law). */
      allowNaiveIn?: string[];
      /** Paths (globs or substrings) where assert statements are allowed in source (No Assert Guards law). */
      allowAssertIn?: string[];
      /** Declared clock modules — wall-clock reads allowed here (No Wall-Clock In Domain law). */
      clockBoundary?: string[];
      /** Declared concurrency modules — threads/locks/tasks allowed here (Declared Concurrency Boundaries law). */
      concurrencyBoundary?: string[];
      /** Declared randomness homes — ambient random/uuid4 allowed here (Seeded Randomness law). */
      randomnessBoundary?: string[];
      /** Composition-root paths that may read env directly — alternative to Pydantic BaseSettings (Settings Via BaseSettings law). */
      envBoundary?: string[];
      /**
       * Test modules where exact float equality is the INVARIANT, not sloppiness
       * (Float Equality Tolerance law): money quantised by construction
       * (`round(x, 2)`) must compare exactly — pytest.approx there would hide a
       * one-cent regression. Declare the money modules; don't silence the law.
       */
      exactEqualityIn?: string[];
      /** Maximum lines per .py file before it is flagged as too long. Default: 300 (matches the TS "File too long" check). */
      maxFileLines?: number;
      /**
       * Separate (usually higher) limit for test files (test_*.py / *_test.py /
       * under tests/ / conftest.py). Falls back to maxFileLines when unset.
       */
      maxTestFileLines?: number;
    };
    accessibility?: {
      /**
       * Require projects with Angular templates to enable the @angular-eslint
       * template a11y rule set in their ESLint config. Default: true.
       */
      requireAngularTemplateA11y?: boolean;
    };
    performance?: {
      /** Maximum module lines before requiring lazy loading */
      maxModuleLines?: number;
    };
    angular?: {
      /** Maximum signal mutations before suggesting refactoring */
      maxSignalMutations?: number;
      /** Maximum dependencies in constructor before suggesting refactoring */
      maxConstructorDependencies?: number;
      /** Maximum import count before checking for circular dependencies */
      maxImportCount?: number;
      /** Maximum methods per service before suggesting split */
      maxMethodsPerService?: number;
      /** Maximum services in directory before suggesting subdirectories */
      maxServicesInDirectory?: number;
      /** Minimum services count to suggest barrel export */
      minServicesForBarrel?: number;
      /**
       * Additional valid component selector prefixes beyond project.componentPrefix
       * (e.g. ["t3"] for a design-system library, like Material's "mat").
       */
      allowedComponentPrefixes?: string[];
      /** Extra callee names allowed in template bindings (e.g. ["$any"]). */
      templateMethodAllowlist?: string[];
      /** Times an identical template expression may repeat before aliasing. Default 3. */
      aliasRepeatedTemplateExprThreshold?: number;
      /** Dashboard template line count above which @defer is expected. Default 250. */
      deferHeavyBlocksMinLines?: number;
      /**
       * Treat Subject/BehaviorSubject used for component-local state (in
       * *.component.ts on Angular 16+) as a Signal Adoption violation rather
       * than only a suggestion. Default true. Set false for advisory-only.
       */
      enforceSignalsForComponentState?: boolean;
      /**
       * Class names allowed to own a timer in a `providedIn: 'root'` service
       * (ROC-FE-02) — e.g. a genuine global app-clock. Default: none.
       */
      rootTimerAllowlist?: string[];
      /**
       * Path fragments exempt from the "poll via sanctioned source" law
       * (ROC-FE-01) — e.g. the file defining the tick helper. The
       * page-visibility/poll-signal/poll-ticks files are already exempt.
       */
      pollSourceAllowlist?: string[];
      /**
       * Component/service LOC above which a co-located *.spec.ts is required
       * (ROC-FE-04). Default: 200. (Money-adjacent write services always require
       * one regardless of size.)
       */
      specRequiredMinLoc?: number;
    };
    testing?: {
      /** Minimum test coverage percentage (0-100) */
      minCoveragePercent?: number;
      /** Minimum test description length */
      minTestDescriptionLength?: number;
      /** Maximum number of untested files to display in suggestions */
      maxUntestedFilesToShow?: number;
      /** Minimum test file to source file ratio percentage (0-100) */
      minTestFileRatioPercent?: number;
      /** Minimum Angular component test coverage percentage (0-100) */
      minAngularTestCoveragePercent?: number;
      /**
       * Real-data testing mode. When true, the checks that REQUIRE mocking
       * ("dependencies found but no mocking detected") and that forbid inline
       * real data ("hardcoded test data") are skipped — for projects that
       * deliberately test against real data/fixtures instead of mocks
       * (integration-first philosophy). Other quality checks still apply.
       */
      realDataMode?: boolean;
      testData?: {
        /** Score deduction for missing setup/teardown patterns */
        missingSetupDeduction?: number;
        /** Score deduction for hardcoded test data */
        hardcodedDataDeduction?: number;
        /** Score deduction for shared mutable state */
        sharedStateDeduction?: number;
        /** Score deduction for no organized data structure */
        noOrganizedDataDeduction?: number;
        /** Score deduction for no test data factories */
        noFactoriesDeduction?: number;
        /** Score deduction for missing cleanup patterns */
        noCleanupDeduction?: number;
        /** Score deduction for no proper mocking */
        noMockingDeduction?: number;
        /** Score deduction for low factory coverage */
        lowFactoryCoverageDeduction?: number;
        /** Minimum factory coverage percentage (0-100) */
        minFactoryCoverage?: number;
      };
      componentTesting?: {
        /** Score deduction per missing spec file */
        missingSpecFileDeduction?: number;
        /** Maximum total deduction for missing spec files */
        maxMissingSpecDeduction?: number;
        /** Score deduction per low quality test */
        lowQualityTestDeduction?: number;
        /** Maximum total deduction for low quality tests */
        maxLowQualityDeduction?: number;
        /** Score deduction for missing testing patterns */
        missingPatternsDeduction?: number;
        /** Score deduction for missing mocking */
        missingMockingDeduction?: number;
        /** Score deduction for missing TestBed */
        missingTestBedDeduction?: number;
      };
      isolation?: {
        /** Score deduction for shared mutable state */
        sharedMutableStateDeduction?: number;
        /** Score deduction for missing setup/teardown isolation */
        missingSetupTeardownDeduction?: number;
        /** Score deduction for test order dependencies */
        orderDependenciesDeduction?: number;
        /** Score deduction for improper resource isolation */
        resourceIsolationDeduction?: number;
        /** Score deduction for global state pollution */
        globalStatePollutionDeduction?: number;
        /** Score deduction for missing isolation patterns */
        missingIsolationPatternsDeduction?: number;
      };
      documentation?: {
        /** Score deduction for missing test documentation files */
        missingTestDocsDeduction?: number;
        /** Score deduction per poorly documented test file */
        poorlyDocumentedFileDeduction?: number;
        /** Maximum total deduction for poorly documented files */
        maxPoorlyDocumentedDeduction?: number;
        /** Score deduction per test with poor description */
        poorDescriptionDeduction?: number;
        /** Maximum total deduction for poor descriptions */
        maxPoorDescriptionDeduction?: number;
        /** Score deduction for missing setup documentation */
        missingSetupDocsDeduction?: number;
        /** Score deduction for missing strategy documentation */
        missingStrategyDocsDeduction?: number;
        /** Score deduction for low structure documentation coverage */
        lowStructureDocDeduction?: number;
        /** Minimum structure documentation coverage percentage (0-100) */
        minStructureDocCoverage?: number;
      };
    };
    deployment?: {
      cicd?: {
        /** Score deduction for missing CI/CD pipeline */
        noPipelineDeduction?: number;
        /** Score deduction for missing constitutional validation */
        noConstitutionalChecksDeduction?: number;
        /** Score deduction for missing quality gates */
        noQualityGatesDeduction?: number;
        /** Score deduction for missing security scanning */
        noSecurityScanningDeduction?: number;
        /** Score deduction for missing performance testing */
        noPerformanceTestingDeduction?: number;
        /** Score deduction for missing approval gates */
        noApprovalGatesDeduction?: number;
        /** Score deduction for missing rollback strategy */
        noRollbackStrategyDeduction?: number;
      };
    };
    documentation?: {
      /** Maximum allowed TODO count */
      maxTodoCount?: number;
      /** Minimum TODO description length */
      minTodoDescriptionLength?: number;
      /** Maximum TODO content length */
      maxTodoContentLength?: number;
      /** Minimum setup/teardown documentation length */
      minSetupDocumentationLength?: number;
      /** Minimum class documentation coverage percentage (0-100) */
      minClassDocumentationPercent?: number;
      /** Minimum function documentation coverage percentage (0-100) */
      minFunctionDocumentationPercent?: number;
      standards?: {
        /** Score deduction per documentation violation */
        perViolationDeduction?: number;
        /** Minimum README content length in characters */
        minReadmeLength?: number;
      };
      projectStructure?: {
        /** Score deduction per project structure violation */
        perViolationDeduction?: number;
      };
      todoManagement?: {
        /** Score deduction per improperly formatted TODO */
        improperFormattingDeduction?: number;
        /** Maximum total deduction for improper formatting */
        maxImproperFormattingDeduction?: number;
        /** Score deduction per TODO without reference */
        noReferenceDeduction?: number;
        /** Maximum total deduction for missing references */
        maxNoReferenceDeduction?: number;
        /** Score deduction per outdated TODO */
        outdatedDeduction?: number;
        /** Maximum total deduction for outdated TODOs */
        maxOutdatedDeduction?: number;
        /** Score deduction per uncategorized TODO */
        uncategorizedDeduction?: number;
        /** Maximum total deduction for uncategorized TODOs */
        maxUncategorizedDeduction?: number;
        /** Score deduction per migration candidate */
        migrationCandidateDeduction?: number;
        /** Maximum total deduction for migration candidates */
        maxMigrationCandidateDeduction?: number;
        /** Minimum TODO content length for long description detection */
        longDescriptionLength?: number;
      };
      mdFooter?: {
        /** Score deduction for inconsistent footer formats */
        inconsistentFormatsDeduction?: number;
        /** Score deduction for missing required footer elements */
        missingElementsDeduction?: number;
        /** Score deduction for outdated footer information */
        outdatedInfoDeduction?: number;
        /** Score deduction for invalid footer links */
        invalidLinksDeduction?: number;
        /** Score deduction for template non-compliance */
        templateNonComplianceDeduction?: number;
        /** Number of last lines to check for footer keywords */
        footerLastLinesCount?: number;
      };
      incidentResponse?: {
        /** Score deduction for missing incident response documentation */
        missingIncidentDocsDeduction?: number;
        /** Score deduction for missing escalation procedures */
        missingEscalationDeduction?: number;
        /** Score deduction for missing communication plans */
        missingCommunicationDeduction?: number;
        /** Score deduction for missing roles and responsibilities */
        missingRolesDeduction?: number;
        /** Score deduction for missing response time objectives */
        missingRTODeduction?: number;
      };
    };
  };
}

/**
 * Default configuration with Pareto optimization
 */
export const DEFAULT_CONFIG: RuleOfCodeConfig = {
  project: {
    name: 'Workspace',
    componentPrefix: 'app',
    type: 'angular',
  },

  ignores: {
    global: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      // RoC's own audit-cache artifact (created only when performance.cache
      // is opted in) — never scan it, and consumers should .gitignore it.
      '**/.ruleofcode-cache/**',
      '**/*.d.ts',
      // 🛡️ RoC SELF-EXCLUSION - Constitutional system excludes itself
      `${CONSTITUTIONAL_PATHS.RULEOFCODE_PACKAGE}/**`,
      `${CONSTITUTIONAL_PATHS.CONSTITUTIONAL_COMPLIANCE_PATTERN}/**`,
      // 🔧 Build scripts and logging infrastructure
      '**/generate-icons.js',
      '**/logger.service.ts',
    ],
    // No byRule defaults. The six that lived here named no law — the keys are
    // SLUGS, and these were category names — so they filtered nothing, silently,
    // for as long as they existed. They were also redundant: the RoC self-
    // exclusion they intended is applied unconditionally in
    // FileFilterUtils.getIgnorePatterns.
    byRule: {},
    tests: [
      '**/*.spec.ts',
      '**/*.spec.js',
      '**/*.test.ts',
      '**/*.test.js',
      '**/e2e/**',
    ],
    build: [
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.next/**',
      '**/.angular/**',
      '**/.nx/**',
    ],
    design: [
      '**/figma_prototype/**',
      '**/design-assets/**',
      '**/design/**',
      '**/mockups/**',
    ],
  },

  includes: {
    // Empty by default = scan everything minus ignores. A hardcoded Nx
    // whitelist here silently blinded every non-Nx consumer (and, with
    // Windows path separators, Nx ones too): zero files scanned means every
    // file-based law "passes" — fail-open by project shape. Consumers that
    // want a whitelist set includes.global themselves.
    global: [],
    // Empty for the same reason as includes.global above: these five named no
    // law either, and every one of them was an Nx-shaped path. Had the keys
    // ever matched, they would have whitelisted a non-Nx project down to
    // nothing — the exact failure the comment above describes.
    byRule: {},
  },

  laws: {
    // No default `enabled` map: absent means ALL laws run. The old
    // autogenerated `law-N` allowlist matched zero registry ids, so any
    // config built on these defaults selected an EMPTY law set the moment
    // the engine consumed it (the v7.5.1 zero-laws-checked P0). A law
    // allowlist only means something when the user writes one.
    paretoMode: false,
    severity: (() => {
      // Generate severity mapping from CONSTITUTIONAL_LAWS
      const severityMap: Record<string, 'error' | 'info' | 'warning'> = {};

      CONSTITUTIONAL_LAWS.forEach((law, index) => {
        const lawId = `law-${index + 1}`;
        // Each law's authored defaultSeverity is the source of truth (v7.2.0).
        // Falls back to priority-derived severity if a law omits the field.
        severityMap[lawId] =
          law.defaultSeverity ??
          (law.priority === 'CRITICAL' || law.priority === 'HIGH'
            ? 'error'
            : law.priority === 'MEDIUM'
              ? 'warning'
              : 'info');
      });

      return severityMap;
    })(),
  },

  hooks: {
    preCommit: true,
    prePush: true,
    commitMsg: true,
  },

  reporting: {
    format: 'console',
    verbose: false,
    onlyFailures: false,
    scoring: true,
  },

  performance: {
    parallel: true,
    maxConcurrent: 4,
    // Opt-in: caching a compliance gate risks reporting a stale PASSED, and
    // it drops a .ruleofcode-cache/ artifact into the consumer's repo root.
    cache: false,
  },
};

/**
 * Angular-specific default configuration
 */
export const ANGULAR_CONFIG: Partial<RuleOfCodeConfig> = {
  project: {
    name: 'Angular Workspace',
    type: 'angular',
    componentPrefix: 'app',
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
      ...DEFAULT_CONFIG.ignores.global,
      '**/android/**',
      '**/ios/**',
      'figma_prototype/**',
      'design-assets/**',
      // 🛡️ RoC SELF-EXCLUSION
      `${CONSTITUTIONAL_PATHS.RULEOFCODE_PACKAGE}/**`,
      `${CONSTITUTIONAL_PATHS.CONSTITUTIONAL_COMPLIANCE_PATTERN}/**`,
    ],
    byRule: {
      ...DEFAULT_CONFIG.ignores.byRule,
      // Angular-specific exclusions + RoC self-exclusion
      'angular-standalone-components': [
        `${CONSTITUTIONAL_PATHS.RULEOFCODE_PACKAGE}/**`,
        `${CONSTITUTIONAL_PATHS.CONSTITUTIONAL_COMPLIANCE_PATTERN}/**`,
      ],
      'angular-onpush-strategy': [
        `${CONSTITUTIONAL_PATHS.RULEOFCODE_PACKAGE}/**`,
        `${CONSTITUTIONAL_PATHS.CONSTITUTIONAL_COMPLIANCE_PATTERN}/**`,
      ],
      'angular-trackby-functions': [
        `${CONSTITUTIONAL_PATHS.RULEOFCODE_PACKAGE}/**`,
        `${CONSTITUTIONAL_PATHS.CONSTITUTIONAL_COMPLIANCE_PATTERN}/**`,
      ],
      'angular-async-pipe': [
        `${CONSTITUTIONAL_PATHS.RULEOFCODE_PACKAGE}/**`,
        `${CONSTITUTIONAL_PATHS.CONSTITUTIONAL_COMPLIANCE_PATTERN}/**`,
      ],
      angular_95b77e5f: [
        `${CONSTITUTIONAL_PATHS.RULEOFCODE_PACKAGE}/**`,
        `${CONSTITUTIONAL_PATHS.CONSTITUTIONAL_COMPLIANCE_PATTERN}/**`,
      ],
      ngrx_e156533b: [
        `${CONSTITUTIONAL_PATHS.RULEOFCODE_PACKAGE}/**`,
        `${CONSTITUTIONAL_PATHS.CONSTITUTIONAL_COMPLIANCE_PATTERN}/**`,
      ],
      ngrx_d494c2aa: [
        `${CONSTITUTIONAL_PATHS.RULEOFCODE_PACKAGE}/**`,
        `${CONSTITUTIONAL_PATHS.CONSTITUTIONAL_COMPLIANCE_PATTERN}/**`,
      ],
      ngrx_168c4ee5: [
        `${CONSTITUTIONAL_PATHS.RULEOFCODE_PACKAGE}/**`,
        `${CONSTITUTIONAL_PATHS.CONSTITUTIONAL_COMPLIANCE_PATTERN}/**`,
      ],
    },
    tests: [...DEFAULT_CONFIG.ignores.tests, 'apps/*-e2e/**'],
    build: [...DEFAULT_CONFIG.ignores.build, '**/.angular/**'],
    design: [...DEFAULT_CONFIG.ignores.design, '**/assets/icons/**'],
  },
  laws: {
    // No `enabled` allowlist: laws.enabled means "run ONLY these" — the old
    // "enable extras" map here silently collapsed every Angular project to
    // the 3 keys that happened to match registry ids. All laws run by
    // default; stack gating already scopes them.
    paretoMode: DEFAULT_CONFIG.laws.paretoMode,
    severity: DEFAULT_CONFIG.laws.severity,
  },
};

/**
 * React-specific default configuration
 */
export const REACT_CONFIG: Partial<RuleOfCodeConfig> = {
  project: {
    name: 'React Project',
    type: 'react',
    componentPrefix: 'ui',
    framework: {
      react: {
        strictMode: true,
        hooksOnly: true,
      },
    },
  },
  laws: {
    // Same as ANGULAR_CONFIG: no allowlist — it collapses the law set.
    paretoMode: DEFAULT_CONFIG.laws.paretoMode,
    severity: DEFAULT_CONFIG.laws.severity,
  },
};

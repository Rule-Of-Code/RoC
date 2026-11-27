/**
 * Enhanced Constitutional Law Types
 * Advanced enterprise-grade type definitions with Pareto optimization
 */

export type LawPriority = 'CRITICAL' | 'HIGH' | 'LOW' | 'MEDIUM';

export type LawCategory =
  | 'ACCESSIBILITY'
  | 'CODE_QUALITY'
  | 'DEPLOYMENT'
  | 'DOCUMENTATION'
  | 'FRAMEWORK'
  | 'PERFORMANCE'
  | 'PROJECT_SPECIFIC'
  | 'PYTHON'
  | 'SACRED_LAW'
  | 'SECURITY'
  | 'TESTING'
  | 'VERSION_CONTROL';

export type AutomationType = 'AUTOMATED' | 'CONFIGURABLE' | 'MANUAL';

export type LawSeverity = 'error' | 'info' | 'warning';

/**
 * Stack scope of a law — which project stacks it is meaningful for. Omitted means
 * universal (applies to every stack: git, secrets, CI/CD, generic docs, …).
 *   - "frontend"   → browser/UI frameworks (angular/react/vue/ionic)
 *   - "typescript" → TS-language laws (any TS project, but NOT python)
 *   - "python"     → Python backend laws (FastAPI + Clean Architecture/CQRS)
 * The audit skips a law whose stack does not include the detected project type,
 * so e.g. Core Web Vitals / bundle / NgRx never fire on a Python backend and the
 * Python laws never fire on an Angular frontend.
 */
export type LawStack = 'frontend' | 'python' | 'typescript';

/**
 * What a project must DECLARE before a law is selected at all — finer than
 * `stack`. `stack: "frontend"` says "a UI project"; `requires` says "a UI
 * project that ships through Ionic" or "… through Capacitor".
 *
 * A law whose subject is absent must not run. Run anyway, it inspects nothing
 * and reports green: a pass over a store that does not exist, a WebView config
 * that was never written. That green is the false confidence this tool exists
 * to refuse, so an unmet requirement drops the law from the audit exactly the
 * way a stack mismatch does — it is not counted, and it is never a passing
 * check.
 *
 * Every listed condition must hold; within `anyDependency` and `anyFile`, one
 * entry is enough; within `allDependencies`, every entry is required; within
 * `anyOf`, one whole requirement set is enough.
 */
export interface LawRequirement {
  /** At least one of these packages is a dependency or devDependency of a workspace package.json. */
  anyDependency?: readonly string[];
  /**
   * Every one of these packages is declared. "Ionic AND the Android platform"
   * cannot be said with `anyDependency`, and a law about Android's back button
   * that runs in an iOS-only shell inspects nothing and reports green.
   */
  allDependencies?: readonly string[];
  /** At least one of these files exists at the workspace root or in a workspace project directory. */
  anyFile?: readonly string[];
  /**
   * At least one of these Python distributions is declared by a Python
   * manifest (requirements*.txt, pyproject.toml, Pipfile, setup.cfg/py).
   * Names compare in PEP 503 form. `anyDependency` reads package.json only,
   * so a law about a Python library cannot be gated with it.
   */
  anyPythonDependency?: readonly string[];
  /**
   * At least one of these requirement sets holds. The conditions above are
   * ANDed, so "a Python SDK OR a Node SDK" — one law about a library that
   * ships for both ecosystems — cannot be said without this.
   */
  anyOf?: readonly LawRequirement[] | undefined;
  /**
   * At least one entry holds: a file matched by one of its globs (relative
   * to the workspace root or a workspace project directory, outside
   * installed, built and virtualenv trees) contains its regular expression.
   * Inside a git work tree only what git publishes is read — tracked files
   * (from the index when the working copy differs) and untracked files that
   * are not ignored — so a git-ignored file never selects a law; outside git
   * the disk is walked. The project's `ignores.global` (#326) is passed by
   * every caller and leaves those files out. A law gated this way reads its
   * files through readFilesContaining with the same ignores, so what selects
   * it is what it judges.
   * For a law whose subject is written in files no manifest declares — a
   * deploy command in a CI step, a split @font-face in a stylesheet — so the
   * law is not selected where the subject is absent.
   */
  anyFileContaining?: readonly FileContaining[] | undefined;
  /**
   * At least one entry holds: a JSON file of this name, at the workspace
   * root or in a workspace project directory, parses to an object with this
   * top-level key. The file is parsed, never searched: the key nested under
   * another one does not count. A file that cannot be read or parsed also
   * selects the law (fail-closed), so the law reports it as not read
   * instead of disappearing from the audit (#547).
   */
  anyJsonFileWithKey?: readonly JsonFileWithKey[] | undefined;
}

/** One `anyJsonFileWithKey` entry: `firebase.json` with a top-level `hosting`. */
export interface JsonFileWithKey {
  file: string;
  key: string;
}

/** One `anyFileContaining` entry: where to look, and what must be there. */
export interface FileContaining {
  /** Globs, e.g. `**\/*.sh`, `.github/workflows/*.yml`, `cloudbuild.yaml`. */
  files: readonly string[];
  /** Regular-expression source, compiled with the `m` flag. */
  pattern: string;
  /** Globs left out of `files` (test trees, fixtures) — for the gate and for the law reading through it. */
  exclude?: readonly string[];
  /**
   * Match the pattern against the file's code only: comments and the
   * contents of string literals are blanked (TS/JS by the JS rules, Python
   * by its own lexer, other files as they are). A law's example kept in a
   * string does not select it (#437).
   */
  readsCode?: boolean;
  /**
   * A `.vue` file the globs name is matched by its `<script>` /
   * `<script setup>` blocks only, at their offsets: its template and style
   * are not code (#607). Without it a `.vue` file is matched as it is (a gate
   * that reads a component's `<style>` or markup).
   */
  vueScript?: boolean;
}

export interface EnhancedConstitutionalLaw {
  id: string; // Changed from number to string for hash-based IDs
  article?: string;
  section?: string;
  subsection: string;
  title: string;
  emoji: string;
  description: string;
  priority: LawPriority;
  category: LawCategory;
  automation: AutomationType;
  defaultEnabled: boolean; // Pareto defaults
  /**
   * A `stack: "frontend"` law that reads plain HTML documents (and static-
   * hosting header files), not a framework's code: it also runs on a
   * `generic` project that holds an HTML document — a static site (#323).
   */
  staticSiteHtml?: boolean;
  /** Gate-of-the-gate: cannot be disabled by config (paretoMode/enabled/notApplicable). */
  alwaysEnabled?: boolean;
  defaultSeverity: LawSeverity;
  checkFunction?: string;
  violationMessage: string;
  remediation: string;
  /**
   * What this law does NOT claim — the boundaries of its detection, in the
   * author's words, next to the detector. This is the "Detection Limits" section
   * of the site's Law Card, and it exists because false confidence is the enemy
   * this whole tool is built to kill: a law that silently misses a case, while
   * looking like it covers it, is the `unauthorized_401` metric that fed nothing.
   * Declared here so it is reviewed as CODE and cannot drift from the detector.
   * Absent = not declared yet (rendered as visible debt, never as "no limits").
   */
  detectionLimits?: string[];
  /**
   * Why this law's subject is never a Vue single-file component (#607): it
   * reads test files, test or perf configuration, or file names, which a Vue
   * project writes as .ts/.js too. Such a law gets no ".vue single-file
   * components were not read" note. The reason is also one of its
   * detectionLimits, so the card says it.
   */
  notAboutComponents?: string;
  /**
   * WHY this law exists — the incident or principle that birthed it, not what the
   * check does (that is `description`). The difference between a "rule" and a
   * "law". Where there is a real story (the zero-laws PASSED, the checklist that
   * demanded a lie, the metric that fed nothing) it is the strongest argument we
   * own. Absent = not declared yet.
   */
  rationale?: string;
  /**
   * How a project SATISFIES this law, in the language of each stack it applies
   * to — a short, real fragment, not a paragraph. Without it, every consumer asks
   * "ok, now what do I do?" and gets `description`, which is not an answer. Keys
   * are only the stacks the law is meaningful for. Absent = not declared yet.
   * `ionic` and `capacitor` carry guidance written for those toolkits — the
   * laws that hold them are gated on the toolkit by `requires`.
   */
  satisfiedBy?: SatisfiedByGuidance;
  /**
   * Legacy numeric id, for migration only. NOT a config key: 21 legacyIds are
   * shared by 43 laws, so keying a config by one silently affects several. Key by
   * canonical name or slug; `laws.severity` and `laws.notApplicable` refuse
   * ambiguous keys (v7.10.0), `laws.enabled` turns on every law that carries one.
   */
  legacyId?: number;
  /**
   * Titles this law had before a rename. Each stays a public identity: a
   * config key written with it (`laws.severity`, `laws.notApplicable`,
   * `laws.enabled`, `ignores.byRule`) resolves to this law, as do its slugs.
   */
  formerTitles?: readonly string[];
  stack?: LawStack | undefined; // Stack scope (omitted = universal). See LawStack.
  /** Declared dependencies/files without which the law is not selected. See LawRequirement. */
  requires?: LawRequirement | undefined;
}

/** The `satisfiedBy` vocabulary — one key per technology guidance is written for. */
export interface SatisfiedByGuidance {
  typescript?: string;
  angular?: string;
  /** React and the frameworks on it (Next.js); keyed by project type, not by stack. */
  react?: string;
  /**
   * Vue single-file components (.vue), keyed by project type like `react`
   * (#12). Written only for a law that reads .vue files: a law whose .vue
   * note stays carries none.
   */
  vue?: string;
  python?: string;
  ionic?: string;
  capacitor?: string;
}

export interface ParetoCategories {
  HIGH_IMPACT: string[];
  MEDIUM_IMPACT: string[];
  LOW_IMPACT: string[];
}

export interface FrameworkLaws {
  angular: string[];
  react: string[];
  vue: string[];
}

export type ProjectLaws = Record<string, string[]>;

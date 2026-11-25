/**
 * Audit engine core functionality
 */

import chalk from 'chalk';
import { execFileSync } from '../../utils/child-process';
import * as fs from 'fs';
import { ConfigLoader } from '../../config/loader';
import { retiredLawNotice } from '../../data/retired-laws';
import { GitHooksInstaller } from '../../hooks/installer';
import { ModularLawsRegistry } from '../../registry/modular-laws-registry';
import type { LawRequirement } from '../../types/enhanced-law.types';
import type { LawResult, RuleOfCodeConfig } from '../../types/law.types';
import { CapacitorProjects } from '../../utils/capacitor/capacitor-project';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import * as LawIdentity from '../../utils/law-identity';
import {
  describeRequirement,
  lawRequirementsMet,
} from '../../utils/law-requirements';
import {
  CATEGORIES_KEY,
  categoriesOf,
  describeLivenessFloor,
  livenessFloorOf,
  narrowingOf,
} from '../../utils/liveness-floor';
import { DirectoryScanner } from '../../utils/directory-scanner';
import { markJudgedNothing, withNotRead } from '../../utils/judged-nothing';
import { honouredWaiverReason } from '../../utils/law-waivers';
import { NxWorkspace } from '../../utils/nx-workspace';
import { warnUser } from '../../utils/logging-utils';
import { PathOperations } from '../../utils/path-operations';
import { selectionProjectType } from '../../utils/selection-project-type';
import {
  type LawScanScope,
  runLawScope,
  vueNotReadNote,
} from '../../utils/vue/vue-read-tracker';
import { AuditCache } from './audit-cache';
import type {
  AuditOptions,
  AuditProjectType,
  AuditResult,
  AuditScope,
  WaivedLaw,
} from './audit-types';
import { AuditResultProcessor } from './result-processor';
import {
  absolutePatternsIn,
  literalNamesReadAsClassesIn,
} from '../../utils/config/path-patterns';
import { ignoreEntriesMatchingNothing } from '../../utils/config/dead-ignore-entries';

// Force chalk to use colors in all environments
chalk.level = 1;

/** Width of the rules that frame the audit report. */
const RULE_WIDTH = 60;

/** What the config validators need to know about a law named by a key. */
interface KnownLaw {
  stack?: string | undefined;
  requires?: LawRequirement | undefined;
  staticSiteHtml?: boolean | undefined;
  name?: string;
  id?: string;
  legacyId?: number | string | undefined;
  defaultEnabled?: boolean | undefined;
}

/**
 * The settings the engine reads from a loaded config. A config written by
 * hand may leave any section out, so every field is optional here — the
 * declared RuleOfCodeConfig promises more than a file on disk has to give.
 * `performance.incremental` and a top-level `failOnWarnings` are read
 * although the declared type does not name them.
 */
interface EngineSettings {
  performance?: {
    parallel?: boolean;
    maxConcurrent?: number;
    cache?: boolean;
    incremental?: boolean;
  };
  reporting?: { verbose?: boolean; onlyFailures?: boolean; scoring?: boolean };
  laws?: { failOnWarnings?: boolean };
  failOnWarnings?: boolean;
}

/**
 * A law as the engine runs it: the registry's entry, read defensively — a
 * law without a check passes with no violations, and a title stands in for
 * a missing name.
 */
interface RunnableLaw {
  id?: string;
  legacyId?: number | string;
  name?: string;
  title?: string;
  severity?: 'error' | 'info' | 'warning';
  check?: (
    projectRoot: string,
    config: RuleOfCodeConfig
  ) => LawResult | Promise<LawResult>;
}

/** The run's options, with the config's `reporting.scoring` the report reads. */
type EngineOptions = AuditOptions & { scoring?: boolean };

/**
 * The stderr line for a config key that names no law. A removed law is named
 * as removed, in Config Integrity Guard's words (#558); any other key keeps
 * its "unknown law" message.
 */
function keyWarning(where: string, key: string, unknown: string): string {
  return `⚠️  ${retiredLawNotice(where, key) ?? unknown}`;
}

export class RuleOfCodeAuditor {
  private static readonly UNKNOWN_LAW = 'Unknown Law';
  /** Suggestions shown per failing law before --verbose is needed. */
  private static readonly SUGGESTION_PREVIEW_COUNT = 3;

  /**
   * Human-facing law name: the canonical registry title. Checker-local
   * lawName strings (often slugged, sometimes diverging) are a fallback only
   * — the audit output and `roc laws --list` must agree on one spelling.
   */
  static displayName(lawResult: {
    lawTitle?: string;
    lawName?: string;
  }): string {
    return (
      lawResult.lawTitle || lawResult.lawName || RuleOfCodeAuditor.UNKNOWN_LAW
    );
  }

  private readonly config: RuleOfCodeConfig;
  private readonly projectRoot: string;
  private readonly mode: string;
  private readonly options: EngineOptions;

  /** The config as the engine reads it: every section may be missing. */
  private get settings(): EngineSettings {
    return this.config;
  }

  static async create(options: {
    projectRoot?: string;
    config: RuleOfCodeConfig;
    mode?: string;
    verbose?: boolean | undefined;
    onlyFailures?: boolean | undefined;
    parallel?: boolean | undefined;
    failOnWarnings?: boolean | undefined;
  }): Promise<RuleOfCodeAuditor> {
    await Promise.resolve(); // Satisfy async requirement

    // Only pass defined CLI options
    const cliOptions: Partial<AuditOptions> = {};
    if (options.verbose !== undefined) cliOptions.verbose = options.verbose;
    if (options.onlyFailures !== undefined)
      cliOptions.onlyFailures = options.onlyFailures;
    if (options.parallel !== undefined) cliOptions.parallel = options.parallel;
    if (options.failOnWarnings !== undefined)
      cliOptions.failOnWarnings = options.failOnWarnings;

    return new RuleOfCodeAuditor(
      options.config,
      options.projectRoot,
      false,
      options.mode,
      cliOptions
    );
  }

  constructor(
    _config: unknown,
    projectRoot: string = process.cwd(),
    // Positional slot of the public constructor; no code reads it. It held
    // --suggest-exceptions, removed in #527; the slot stays so positional
    // callers keep their mode and options.
    _suggestExceptions = false,
    mode = 'fast',
    options: AuditOptions = {}
  ) {
    // Use the injected config when the caller actually loaded one (the CLI
    // passes the --config-aware result); otherwise discover from projectRoot.
    this.config =
      _config && typeof _config === 'object' && Object.keys(_config).length > 0
        ? (_config as RuleOfCodeConfig)
        : ConfigLoader.loadConfig(projectRoot);
    this.projectRoot = projectRoot;
    this.mode = mode;

    // Read settings from config
    const settings = this.settings;
    const configParallel = settings.performance?.parallel ?? true;
    const configMaxConcurrent = settings.performance?.maxConcurrent ?? 10;
    const configVerbose = settings.reporting?.verbose ?? false;
    const configOnlyFailures = settings.reporting?.onlyFailures ?? false;
    const configScoring = settings.reporting?.scoring ?? true;
    // laws.failOnWarnings is the documented home; top-level accepted too.
    const configFailOnWarnings =
      settings.laws?.failOnWarnings ?? settings.failOnWarnings ?? false;

    this.options = {
      parallel: configParallel,
      maxConcurrent: configMaxConcurrent,
      verbose: configVerbose,
      onlyFailures: configOnlyFailures,
      timeout: 30000,
      includeWarnings: !configOnlyFailures,
      outputFormat: configVerbose ? 'detailed' : 'summary',
      failOnWarnings: configFailOnWarnings,
      categories: [],
      excludePatterns: [],
      ...options, // CLI options override config
      // Scoring comes from the config only; no CLI option sets it.
      scoring: configScoring,
    };

    // A narrowing by `categories` is recorded in the config the run audits
    // with (a copy, the caller's object is left alone): the selector, the
    // scope and the Audit Liveness law then read one value (#370).
    const categories = this.options.categories ?? [];
    if (categories.length > 0) {
      this.config = {
        ...this.config,
        laws: { ...this.config.laws, [CATEGORIES_KEY]: [...categories] },
      } as RuleOfCodeConfig;
    }
  }

  async audit(): Promise<AuditResult> {
    const startTime = Date.now();

    this.logAuditStart();

    // Validate git hooks installation
    this.validateGitHooks();

    // A typo'd severity override must not pass silently
    this.validateSeverityOverrides();
    this.validatePathPatterns();

    // Check cache if enabled
    const cacheEnabled = this.settings.performance?.cache ?? false;

    // The key is computed ONCE, before the run, and the same key is written
    // after it. Recomputing it after the run hashed the config the run had
    // mutated (`__plannedLawCount`), so the key written never matched the key
    // read and the cache never hit (#305). The CLI options are part of the
    // key: `--fail-on-warnings` changes the verdict for the same files.
    const cacheKey = cacheEnabled
      ? {
          filesHash: AuditCache.generateFilesHash(this.getProjectFiles()),
          configHash: AuditCache.generateConfigHash({
            config: this.config,
            options: this.options,
          }),
        }
      : undefined;

    if (cacheKey) {
      const { filesHash, configHash } = cacheKey;
      const cachedResult = AuditCache.get(
        this.projectRoot,
        filesHash,
        configHash,
        this.mode
      );

      if (cachedResult) {
        console.log(chalk.green('✅ Using cached audit results (cache hit)'));
        this.displayResults(cachedResult);
        return cachedResult;
      }
    }

    try {
      const selected = this.getSelectedLaws();
      const laws = this.getLawsToAudit(selected);

      // FAIL-CLOSED: a collapsed law selection is never compliance. The two
      // meta-gates are always-on (they cannot be configured away), so they do
      // NOT count as evidence — liveness is measured in SUBSTANTIVE laws.
      // The explicit floor is enforced HERE, in the engine, not only by law
      // 226: the same config mistake that shrinks the selection could also
      // have dropped that law (QA-4). It counts the SELECTION, so one floor
      // holds in every mode (see getSelectedLaws).
      const substantive = selected.filter(
        law => !(law as { alwaysEnabled?: boolean }).alwaysEnabled
      );
      const floor =
        (this.config.laws as { minLawsChecked?: number }).minLawsChecked ?? 0;

      if (substantive.length === 0 || substantive.length < floor) {
        return this.refuse(substantive.length, floor, startTime);
      }

      // The Audit Liveness Assertion law compares the planned law count
      // against the liveness floor — inject it before the run (guards excluded).
      (this.config.laws as { __plannedLawCount?: number }).__plannedLawCount =
        substantive.length;

      const results = await this.executeLawChecks(laws as RunnableLaw[]);
      const processedResults = this.processResults(results);

      const auditResult: AuditResult = {
        passed: processedResults.passed ?? false,
        score: processedResults.score ?? 0,
        totalLaws: processedResults.totalLaws ?? 0,
        passedLaws: processedResults.passedLaws ?? 0,
        failedLaws: processedResults.failedLaws ?? 0,
        warningLaws: processedResults.warningLaws ?? 0,
        judgedNothingLaws: processedResults.judgedNothingLaws ?? 0,
        partlyReadLaws: processedResults.partlyReadLaws ?? 0,
        substantiveLaws: substantive.length,
        deferredLaws: selected.length - laws.length,
        results: processedResults.results ?? new Map(),
        duration: processedResults.duration ?? 0,
        paretoMode:
          (this.config.laws as { paretoMode?: boolean }).paretoMode === true,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        projectRoot: this.projectRoot,
        config: this.config,
        project: this.projectTypeInfo(),
        scope: this.withOutcomes(
          this.scopeOf(
            substantive.length,
            laws.filter(
              law => !(law as { alwaysEnabled?: boolean }).alwaysEnabled
            ).length
          ),
          processedResults.results ?? new Map()
        ),
      };
      // Set before the cache write, so a cached run returns the same verdict.
      auditResult.verdict = AuditResultProcessor.verdictOf(auditResult);

      // Save to cache if enabled — under the key computed before the run.
      if (cacheKey) {
        AuditCache.set(
          this.projectRoot,
          auditResult,
          cacheKey.filesHash,
          cacheKey.configHash,
          this.mode
        );
      }

      this.displayResults(auditResult);
      return auditResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      process.stderr.write(`Audit failed: ${errorMessage}\n`);
      throw error;
    }
  }

  /**
   * FAIL-CLOSED refusal: the selection collapsed, or fell below
   * `laws.minLawsChecked`. No law ran, so no law passed AND no law failed.
   * Reporting the selection as `failedLaws` told every dashboard and CI parser
   * that N laws failed when none had been judged. The refusal is its own fact,
   * carried in `refused` and never disguised as counts. The waivers are named
   * here too: they are part of why the selection is what it is (#350).
   */
  private refuse(
    selected: number,
    floor: number,
    startTime: number
  ): AuditResult {
    const chalkForced = new chalk.Instance({ level: 3 });
    const scope = this.scopeOf(selected, 0, true);
    this.displayWaivers(scope, chalkForced);
    const reason =
      selected === 0
        ? 'No laws executed'
        : `Only ${selected} laws selected — below the liveness floor (laws.minLawsChecked: ${floor})`;
    console.log(
      chalkForced.red.bold(`\n❌ ${reason} — refusing to report compliance.`)
    );
    console.log(
      chalkForced.yellow(
        '   The law selection collapsed. Check laws.enabled / laws.paretoMode / laws.notApplicable and the detected project type. A shrunken audit is a disarmed gate, never a compliance verdict.'
      )
    );
    this.displayUnknownCategories(chalkForced);
    return {
      passed: false,
      score: 0,
      totalLaws: 0,
      passedLaws: 0,
      failedLaws: 0,
      warningLaws: 0,
      substantiveLaws: selected,
      refused: {
        reason: selected === 0 ? 'no-laws' : 'liveness-floor',
        selectedLaws: selected,
        floor,
      },
      verdict: 'refused',
      results: new Map(),
      duration: 0,
      paretoMode: false,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      config: this.config,
      project: this.projectTypeInfo(),
      scope,
    };
  }

  /**
   * A `categories` value that matches no law selects nothing; say which one
   * and what would match (#370). `roc laws --json` prints upper-case
   * categories (PERFORMANCE), the option matches tiers (performance) and id
   * words, so the mistake is an easy one.
   */
  private displayUnknownCategories(chalkForced: chalk.Chalk): void {
    const unknown = ModularLawsRegistry.unknownCategories(
      categoriesOf(this.config.laws)
    );
    if (unknown.length === 0) return;
    const { tiers, idWords } = ModularLawsRegistry.categoryVocabulary();
    for (const category of unknown) {
      console.log(
        chalkForced.yellow(
          `   unknown category '${category}' — valid: ${tiers.join(', ')} (a law's tier), or a law-id word: ${idWords.join(', ')}`
        )
      );
    }
  }

  private logAuditStart(): void {
    process.stdout.write(
      `${chalk.blueBright('🔍 Starting constitutional audit...')}\n`
    );
    process.stdout.write(`${chalk.gray('Project:')} ${this.projectRoot}\n`);
    process.stdout.write(`${chalk.gray('Mode:')} ${this.mode}\n`);
    const project = this.projectTypeInfo();
    process.stdout.write(
      `${chalk.gray('Project type:')} ${project.type ?? 'unknown'} (${project.source})\n`
    );
  }

  /**
   * The type that selects the laws, and its source (#320). A detected type is
   * merged into the config, so the config alone cannot tell the two apart:
   * the detector is asked again and compared.
   */
  private projectTypeInfo(): AuditProjectType {
    const type = this.detectProjectType();
    // The detector answers null (not undefined) when it recognises nothing.
    const detected =
      ProjectTypeDetector.detectProjectType(this.projectRoot) ?? undefined;
    if (detected !== undefined && detected === type)
      return { type, source: 'detected' };
    if (detected === undefined && (type === undefined || type === 'generic')) {
      return { type, source: 'default' };
    }
    return { type, source: 'configured' };
  }

  /** The laws this run executes: the selection, minus what the mode defers. */
  private getLawsToAudit(
    selected: unknown[] = this.getSelectedLaws()
  ): unknown[] {
    return selected.filter(
      law => !this.isHistoryLawBlockedByCommit(law as { name?: string })
    );
  }

  /**
   * The laws the CONFIG selects for this project, before any mode defers some
   * of them. This is what the liveness floor guards: a config mistake shrinks
   * this set, while a mode deferring the history laws to pre-push is by design
   * and runs them there. Comparing the floor with the per-mode count made one
   * setting impossible to get right — the value printed by `--mode=full` broke
   * every pre-commit, and the value that passed pre-commit left slack in full.
   */
  private getSelectedLaws(config: RuleOfCodeConfig = this.config): unknown[] {
    // `categories` narrows the default selection, it does not replace it:
    // waivers, the opt-in rule and the meta-gates hold exactly as without
    // it (#370). It came from a separate registry call that honoured none.
    const selected = ModularLawsRegistry.inCategories(
      ModularLawsRegistry.getEnabled(config),
      categoriesOf(config.laws)
    );

    // Stack gating: skip laws whose stack scope does not match the project type
    // (e.g. Core Web Vitals / NgRx never run on a Python backend, and the Python
    // laws never run on an Angular frontend). Universal laws always run.
    const projectType = this.detectProjectType();
    const stackApplicable = selected.filter(law =>
      ModularLawsRegistry.lawAppliesToProjectType(
        (law as { stack?: string }).stack,
        projectType,
        this.projectRoot,
        law as { staticSiteHtml?: boolean },
        this.globalIgnores()
      )
    );

    // Requirement gating: a law about Ionic's outlet or Capacitor's config is
    // not selected in a project that declares neither. Run anyway, it would
    // inspect nothing and print a green check — a pass that proves nothing.
    return stackApplicable.filter(law =>
      lawRequirementsMet(
        (law as { requires?: LawRequirement }).requires,
        this.projectRoot,
        this.globalIgnores()
      )
    );
  }

  /**
   * Laws that audit git HISTORY must not run in the pre-commit hook.
   *
   * They describe the past, so evaluating them on the way IN to a commit
   * prevents nothing — and it deadlocks the only fix. When history violates one
   * of these, correcting it means rewriting history, rewriting means committing,
   * and the hook blocks the commit because the old history is still there. There
   * is no ordering that escapes it: rewrite first and the first new commit is
   * blocked by the old history; fix everything else first and the law is still
   * red at the moment you commit the rewrite. The only exits were `--no-verify`,
   * which this whole rule set exists to make unnecessary, or waiting for the bad
   * commit to age out of a time window — compliance by calendar.
   *
   * The message being written is still checked at commit time, by the commit-msg
   * hook, which is where that check belongs. These run on pre-push and in CI,
   * where a rewrite has already happened.
   */
  private isHistoryLawBlockedByCommit(law: { name?: string }): boolean {
    if (this.mode !== 'pre-commit') return false;
    const HISTORY_LAWS = [
      'Commit Message Standards',
      'Commit Description Standards',
      'Commit Size Control',
    ];
    return HISTORY_LAWS.includes(law.name ?? '');
  }

  /** Detected project type — config override first, then filesystem detection. */
  /**
   * How much of the applicable law set this run covers (#348). M is what the
   * same selection gives with no `laws.enabled` allowlist, no Pareto and no
   * `categories` (#370) — the laws that apply to this project; N is the
   * substantive laws selected. A run narrowed any way, with N < M, is
   * PARTIAL: an allowlist of 2 laws
   * out of 77 printed "CONSTITUTIONAL COMPLIANCE: PASSED" and the victory art,
   * because only Pareto was treated as partial.
   */
  private scopeOf(
    selectedSubstantive: number,
    executedSubstantive: number,
    refused = false
  ): AuditScope {
    const laws = this.config.laws as Record<string, unknown>;
    const narrowedBy = narrowingOf(laws);
    const applicable = this.openSelection(laws);
    // The same open selection with no waivers: what applied before
    // laws.notApplicable. The difference IS the waived set, so the counts
    // and the list cannot disagree (M₀ = M + W).
    const beforeWaivers = this.openSelection({
      ...laws,
      notApplicable: undefined,
    });
    const applicableLaws = applicable.length;
    // A waiver also counts when it removed a law from THIS run's selection:
    // an opt-in law that only `laws.enabled` turns on is not in the open
    // selection, and its waiver changed the run without a trace (#399).
    const waivedLaws = this.waivedLawsOf(
      [
        [applicable, beforeWaivers],
        [
          this.substantiveSelection(this.config.laws),
          this.substantiveSelection({ ...laws, notApplicable: undefined }),
        ],
      ],
      laws.notApplicable
    );
    return {
      // What actually ran: 0 on a refusal, the selection minus the history
      // laws a pre-commit defers. Reporting the selection here said "2 ran"
      // for a refused audit in which nothing ran.
      executedLaws: executedSubstantive,
      selectedLaws: selectedSubstantive,
      applicableLaws,
      // M₀ = M + W by construction: the waived set is what the waivers took
      // out of the open selection or out of this run's selection.
      applicableBeforeWaivers: applicableLaws + waivedLaws.length,
      waivedLaws,
      // Filled from the results once the laws ran (see withOutcomes).
      warningLaws: [],
      judgedNothingLaws: [],
      partlyReadLaws: [],
      narrowedBy,
      // Partial is about the SELECTION: a pre-commit defers the history laws
      // by design, which is not a narrowing. A refusal is not partial — no
      // law ran at all; `refused` says so, and narrowedBy still says why the
      // selection was small.
      partial:
        !refused &&
        narrowedBy !== undefined &&
        selectedSubstantive < applicableLaws,
      // The floor Audit Liveness judges by, from the function the law uses.
      liveness: livenessFloorOf(this.config, this.projectRoot),
    };
  }

  /**
   * The scope with what the laws reported: the laws with warnings, and the
   * laws that judged nothing. A law that judged nothing did not pass, so the
   * run judged less than the set that applies: partial, no compliance verdict
   * (8.0.0) — never a warning among the others.
   */
  private withOutcomes(
    scope: AuditScope,
    results: Map<string, unknown>
  ): AuditScope {
    const failOnWarnings =
      (this.options as { failOnWarnings?: boolean })?.failOnWarnings ?? false;
    const { warningLaws, judgedNothingLaws, partlyReadLaws } =
      AuditResultProcessor.scopedLaws(results, failOnWarnings);
    return {
      ...scope,
      warningLaws,
      judgedNothingLaws,
      partlyReadLaws,
      // What was not judged or not read cannot have passed (8.0.0, #453).
      partial:
        scope.partial ||
        judgedNothingLaws.length > 0 ||
        partlyReadLaws.length > 0,
    };
  }

  /** Substantive laws the config selects with no allowlist, no Pareto and no categories. */
  private openSelection(
    laws: Record<string, unknown>
  ): Array<{ id: string; name: string }> {
    const openLaws: Record<string, unknown> = {
      ...laws,
      enabled: undefined,
      paretoMode: false,
      [CATEGORIES_KEY]: undefined,
    };
    const open = { ...this.config, laws: openLaws } as RuleOfCodeConfig;
    return this.getSelectedLaws(open).filter(
      law => !(law as { alwaysEnabled?: boolean }).alwaysEnabled
    ) as Array<{ id: string; name: string }>;
  }

  /** Substantive laws this run's config selects with these `laws` settings. */
  private substantiveSelection(
    laws: unknown
  ): Array<{ id: string; name: string }> {
    return this.getSelectedLaws({
      ...this.config,
      laws,
    } as RuleOfCodeConfig).filter(
      law => !(law as { alwaysEnabled?: boolean }).alwaysEnabled
    ) as Array<{ id: string; name: string }>;
  }

  /**
   * The laws the waivers removed, with their reasons: for each [after, before]
   * pair of selections, what is in `before` and not in `after`; each law once.
   */
  private waivedLawsOf(
    pairs: Array<[Array<{ id: string }>, Array<{ id: string; name: string }>]>,
    notApplicable: unknown
  ): WaivedLaw[] {
    const removed = new Map<string, { id: string; name: string }>();
    for (const [after, before] of pairs) {
      const kept = new Set(after.map(law => law.id));
      for (const law of before)
        if (!kept.has(law.id) && !removed.has(law.id)) removed.set(law.id, law);
    }
    return [...removed.values()]
      .map(law => ({
        law: law.name,
        lawId: law.id,
        reason:
          ModularLawsRegistry.waiverReasonOf(
            law,
            notApplicable as Record<string, unknown> | undefined
          ) ?? '',
      }))
      .sort((a, b) => a.law.localeCompare(b.law));
  }

  /** `ignores.global`: what the project says is not its own code (#326). */
  private globalIgnores(): readonly string[] {
    return (
      (this.config as { ignores?: { global?: readonly string[] } }).ignores
        ?.global ?? []
    );
  }

  private detectProjectType(): string | undefined {
    const configured = (this.config as { project?: { type?: string } }).project
      ?.type;
    return selectionProjectType(configured, this.projectRoot);
  }

  private async executeLawChecks(laws: RunnableLaw[]): Promise<unknown[]> {
    process.stdout.write(
      `${chalk.yellow('⚖️  Executing constitutional checks...')}\n`
    );

    const lawsArray = Array.isArray(laws) ? laws : [laws];
    console.log(
      `🔍 Processing ${lawsArray.length} laws (parallel: ${this.options.parallel})`
    );

    if (this.options.parallel) {
      return await this.executeParallel(lawsArray);
    } else {
      return await this.executeSequential(lawsArray);
    }
  }

  private async executeParallel(laws: RunnableLaw[]): Promise<unknown[]> {
    const chunks = this.chunkArray(laws, this.options.maxConcurrent ?? 10);
    const allResults = [];

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(law => this.executeSingleLaw(law))
      );

      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          allResults.push(result.value);
        } else {
          process.stderr.write(`Law execution failed: ${result.reason}\n`);
        }
      }
    }

    return allResults;
  }

  private async executeSequential(laws: RunnableLaw[]): Promise<unknown[]> {
    const results = [];

    for (const law of laws) {
      try {
        const result = await this.executeSingleLaw(law);
        results.push(result);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        process.stderr.write(`Law execution failed: ${errorMessage}\n`);
      }
    }

    return results;
  }

  /**
   * Effective severity of a law: per-law config override wins over the
   * registry severity (which is the authored defaultSeverity). Override keys
   * resolve through every public identity of the law — canonical name,
   * suffix-stripped name, printed slugs, id, legacyId (see
   * ModularLawsRegistry.lawIdentityKeys). Copy-pasting either the
   * `roc laws --list` name or the audit output must gate correctly.
   * Warning/info results are reported without failing the audit — see
   * AuditResultProcessor.
   */
  private resolveLawSeverity(law: {
    name?: string | undefined;
    id?: string | undefined;
    legacyId?: number | string | undefined;
    severity?: 'error' | 'info' | 'warning';
  }): 'error' | 'info' | 'warning' {
    const overrides = (
      this.config.laws as {
        severity?: Record<string, 'error' | 'info' | 'warning'>;
      }
    ).severity;
    if (!overrides) return law.severity ?? 'error';
    for (const key of this.unambiguousIdentityKeys(law)) {
      const override = overrides[key];
      if (override !== undefined) return override;
    }
    return law.severity ?? 'error';
  }

  /**
   * A law's identity keys, minus the ones that resolve to MORE THAN ONE law.
   *
   * `legacyId` is not unique — 21 values are shared by 43 laws (20 = "No Explicit
   * Any" AND "Branch Governance Standards"). Applying such a key would silence
   * several laws while the team believes it silenced one: a hidden waiver
   * produced by us. We refuse to apply it, and Config Integrity Guard reports it
   * as a violation — so the config fails loudly instead of gating quietly.
   */
  private unambiguousIdentityKeys(law: {
    name?: string | undefined;
    id?: string | undefined;
    legacyId?: number | string | undefined;
  }): string[] {
    return ModularLawsRegistry.unambiguousIdentityKeys(law);
  }

  /**
   * A typo'd laws.severity key silently gates nothing — the config looks
   * strict while the audit stays green. Warn loudly for every key that
   * matches no law at all, and distinguish that from a law that EXISTS but
   * is stack-gated off this project type (a legitimate key in a shared
   * config — informational, not an alarm). Autogenerated legacy `law-N`
   * keys from DEFAULT_CONFIG are skipped.
   */
  private validateSeverityOverrides(): void {
    const overrides =
      (this.config.laws as { severity?: Record<string, string> }).severity ??
      {};

    const known = new Map<string, KnownLaw>();
    for (const law of ModularLawsRegistry.getAll()) {
      for (const key of ModularLawsRegistry.lawIdentityKeys(law)) {
        known.set(key, {
          stack: law.stack,
          requires: law.requires,
          staticSiteHtml: law.staticSiteHtml,
          name: law.name,
          id: law.id,
          legacyId: law.legacyId,
          defaultEnabled: law.defaultEnabled,
        });
      }
    }

    // No early return when severity is absent: the notApplicable and byRule
    // checks below do not depend on it, and returning here skipped them.
    const projectType = this.detectProjectType();
    for (const [key, value] of Object.entries(overrides)) {
      if (LawIdentity.isNonLawConfigKey(key)) continue; // annotation or legacy map
      this.warnOnSeverityValue(key, value);

      const law = known.get(key);
      if (!law) {
        warnUser(
          keyWarning(
            'laws.severity',
            key,
            `laws.severity: unknown law '${key}' — this override gates nothing. Check the name with 'roc laws --list'.`
          )
        );
      } else if (
        !ModularLawsRegistry.lawAppliesToProjectType(
          law.stack,
          projectType,
          this.projectRoot,
          law,
          this.globalIgnores()
        )
      ) {
        warnUser(
          `ℹ️  laws.severity: '${key}' exists but does not apply to this project type (${projectType ?? 'unknown'}) — stack-gated, kept for shared configs.`
        );
      } else if (
        !lawRequirementsMet(
          law.requires,
          this.projectRoot,
          this.globalIgnores()
        )
      ) {
        warnUser(
          `ℹ️  laws.severity: '${key}' exists but this project does not declare ${describeRequirement(law.requires ?? {})} — requirement-gated, kept for shared configs.`
        );
      }
    }

    this.validateNotApplicableKeys(known, projectType);
    this.validateByRuleKeys(known);
  }

  /**
   * A key in `ignores.byRule` / `includes.byRule` that names no law filters
   * nothing, and says nothing about it.
   *
   * This is the quietest of the three: a wrong severity name still runs the law
   * at its default, and a wrong `notApplicable` name still runs it — but a
   * wrong byRule key produces a config that reads as an exemption and is inert.
   * The mistake is easy to make, because the key is a SLUG rather than the
   * title: `magic-numbers` looks right for a law called Magic Number
   * Prevention, and does nothing. It is also easy to miss, because the entry
   * people are most likely to write — excluding spec files — appears to work,
   * for the unrelated reason that test files are excluded by default anyway.
   */
  private validateByRuleKeys(known: Map<string, KnownLaw>): void {
    const sections: Array<[string, Record<string, string[]> | undefined]> = [
      [
        'ignores.byRule',
        (this.config.ignores as { byRule?: Record<string, string[]> })?.byRule,
      ],
      [
        'includes.byRule',
        (this.config.includes as { byRule?: Record<string, string[]> })?.byRule,
      ],
    ];

    for (const [label, section] of sections) {
      if (!section) continue;
      for (const key of Object.keys(section)) {
        if (LawIdentity.isNonLawConfigKey(key)) continue; // annotation or legacy map
        if (known.has(key)) continue;
        warnUser(
          keyWarning(
            label,
            key,
            `${label}: unknown law '${key}' — these patterns filter nothing. Check the name with 'roc laws --list'.`
          )
        );
      }
    }
  }

  /**
   * An absolute ignores/includes path outside the project matches no file in
   * any form (#414). The loader makes an absolute path inside the project
   * relative; one left absolute points elsewhere, so say so instead of
   * excluding nothing in silence.
   */
  private validatePathPatterns(): void {
    for (const [where, pattern] of absolutePatternsIn(this.config)) {
      warnUser(
        `⚠️  ${where}: '${pattern}' is an absolute path outside the project (${this.projectRoot}) — it matches nothing. Write it relative to the project root.`
      );
    }
    for (const [where, pattern, segment, kind] of literalNamesReadAsClassesIn(
      this.config,
      this.projectRoot
    )) {
      const name = segment.replace(/\\(.)/g, '$1');
      const literal = name.replace(/[[\]{}()*?!+@]/g, ch => `\\${ch}`);
      warnUser(
        `⚠️  ${where}: '${pattern}' — '${segment}' is a glob character class and does not match the ${kind} '${name}' — write ${literal} for the literal name.`
      );
    }
    // An entry the project wrote that points at no file excludes nothing —
    // a typo or a renamed directory (#414). Gitignored output is not judged.
    for (const pattern of ignoreEntriesMatchingNothing(
      this.config,
      this.projectRoot
    )) {
      warnUser(
        `⚠️  ignores.global: '${pattern}' matched no file in the project — it excludes nothing. Check the path: a typo, or a directory that was renamed or removed.`
      );
    }
  }

  /**
   * A severity that is not a severity is dropped in silence — the config reads
   * as though it said something and did not. `notApplicable` gets its own
   * message because writing it here instead of in `laws.notApplicable` is the
   * mistake people actually make, and the real key requires a reason, which is
   * the whole point of it being separate.
   */
  private warnOnSeverityValue(key: string, value: unknown): void {
    const VALID = ['error', 'warning', 'info'];
    if (typeof value === 'string' && VALID.includes(value)) return;

    if (value === 'notApplicable') {
      warnUser(
        `⚠️  laws.severity['${key}'] = 'notApplicable' is not a severity — this waives nothing and the law still runs.`
      );
      warnUser(
        `   Declare it inapplicable with a reason instead: laws.notApplicable = { "${key}": "why it does not apply" }`
      );
      return;
    }

    warnUser(
      `⚠️  laws.severity['${key}'] = ${JSON.stringify(value)} is not a severity — valid values are ${VALID.join(' | ')}. This entry gates nothing.`
    );
  }

  /**
   * A misspelled key in `laws.notApplicable` waives nothing, and there the cost
   * is worse than in `severity`: the team believes a law is switched off while
   * it is running and failing them.
   */
  private validateNotApplicableKeys(
    known: Map<string, KnownLaw>,
    projectType: string | undefined
  ): void {
    const notApplicable = (
      this.config.laws as { notApplicable?: Record<string, string> }
    ).notApplicable;
    if (!notApplicable) return;

    for (const [key, reason] of Object.entries(notApplicable)) {
      if (LawIdentity.isNonLawConfigKey(key)) continue;
      if (!known.has(key)) {
        warnUser(
          keyWarning(
            'laws.notApplicable',
            key,
            `laws.notApplicable: unknown law '${key}' — this waives nothing and the law still runs. Check the name with 'roc laws --list'.`
          )
        );
        continue;
      }
      if (honouredWaiverReason(reason) === null) {
        // Not a waiver: the selector runs the law (see waiverReasonOf).
        warnUser(
          `⚠️  laws.notApplicable['${key}'] has no reason — it waives nothing and the law still runs. Give the reason: laws.notApplicable = { "${key}": "why it does not apply" }`
        );
      }
      const law = known.get(key);
      if (
        law &&
        !ModularLawsRegistry.lawAppliesToProjectType(
          law.stack,
          projectType,
          this.projectRoot,
          law,
          this.globalIgnores()
        )
      ) {
        warnUser(
          `ℹ️  laws.notApplicable: '${key}' is already stack-gated off this project type (${projectType ?? 'unknown'}) — the waiver is redundant here.`
        );
      } else if (
        law &&
        !lawRequirementsMet(
          law.requires,
          this.projectRoot,
          this.globalIgnores()
        )
      ) {
        warnUser(
          `ℹ️  laws.notApplicable: '${key}' is already requirement-gated off this project (it needs ${describeRequirement(law.requires ?? {})}) — the waiver is redundant here.`
        );
      } else if (law && this.optInNotEnabled(law)) {
        warnUser(
          `ℹ️  laws.notApplicable: '${key}' is opt-in and not enabled in this config (it runs only when laws.severity gives it a severity or laws.enabled names it) — the waiver is redundant here.`
        );
      }
    }
  }

  /**
   * An opt-in law (`defaultEnabled: false`) that this config does not turn on:
   * the selector would not run it, so a waiver of it waives nothing. Asked the
   * way the selector asks: `laws.enabled` when present, else `laws.severity`.
   */
  private optInNotEnabled(law: KnownLaw): boolean {
    if (law.defaultEnabled !== false) return false;
    const laws = this.config.laws as Record<string, unknown>;
    const enabled = laws.enabled as Record<string, unknown> | undefined;
    if (enabled !== undefined) {
      return !ModularLawsRegistry.lawIdentityKeys(law).some(
        key => enabled[key] === true
      );
    }
    return !LawIdentity.runsWithoutAllowlist(
      law,
      laws.severity as Record<string, unknown> | undefined
    );
  }

  private async executeSingleLaw(law: RunnableLaw): Promise<unknown> {
    const severity = this.resolveLawSeverity(law);

    // Execute the actual law check function
    const check = law.check;
    if (typeof check === 'function') {
      try {
        // Each law in its own scan scope: the shared scanners note a scan
        // for script files that left .vue out (#607).
        const scoped = await runLawScope(() =>
          check.call(law, this.projectRoot, this.config)
        );
        const result = this.withVueNote(scoped.value, scoped.scope);
        // Ensure lawName is set + expose canonical registry identifiers so a
        // --json consumer can key `laws.notApplicable` (by lawId or legacyId)
        // without dumping the registry separately. A law that judged nothing
        // is a failure scored 0, whatever it computed (#302).
        return AuditResultProcessor.normalizeJudgedNothing({
          lawId: law.id,
          legacyId: law.legacyId,
          lawTitle: law.name,
          ...result,
          severity,
          // The reported name is the CANONICAL registry slug — never the
          // checker-local one. A name RoC itself prints must resolve as a
          // config key; 16 checkers reported local names that did not (QA-5).
          lawName: law.name
            ? LawIdentity.slugifyLawName(law.name)
            : (result.lawName ?? RuleOfCodeAuditor.UNKNOWN_LAW),
        });
      } catch (error) {
        return {
          lawId: law.id,
          legacyId: law.legacyId,
          lawTitle: law.name,
          lawName: law.name || law.title || RuleOfCodeAuditor.UNKNOWN_LAW,
          passed: false,
          severity,
          violations: [
            `Check failed: ${error instanceof Error ? error.message : String(error)}`,
          ],
          suggestions: [],
        };
      }
    }
    // Fallback for laws without check function
    return {
      lawId: law.id,
      legacyId: law.legacyId,
      lawTitle: law.name,
      lawName: law.name || law.title || RuleOfCodeAuditor.UNKNOWN_LAW,
      passed: true,
      severity,
      violations: [],
      suggestions: [],
    };
  }

  /** The project's .vue files (project-relative), read once per audit. */
  private vueFilesCache: string[] | undefined;
  private vueFiles(): string[] {
    this.vueFilesCache ??= DirectoryScanner.scanForFiles(
      this.projectRoot,
      this.config,
      ['.vue']
    ).map(file =>
      PathOperations.getRelative(this.projectRoot, file).replace(/\\/g, '/')
    );
    return this.vueFilesCache;
  }

  /**
   * A law that scanned for script files without .vue, in a project that has
   * .vue files, did not read them: said in notRead, never a silent pass; when
   * they are all the script there is, it judged nothing (#607).
   */
  private withVueNote<T>(result: T, scope: LawScanScope): T {
    const vue = vueNotReadNote(scope, this.vueFiles());
    if (!vue || !result || typeof result !== 'object') return result;
    const current = result as unknown as {
      passed: boolean;
      notRead?: string[];
    };
    const noted = withNotRead(current, [...(current.notRead ?? []), vue.note]);
    return (vue.judgedNothing ? markJudgedNothing(noted) : noted) as T;
  }

  private processResults(results: unknown[]): Partial<AuditResult> {
    const processor = new AuditResultProcessor();
    const resultsMap = new Map<string, unknown>();

    // Convert array results to Map
    results.forEach((result, index) => {
      resultsMap.set(`law-${index}`, result);
    });

    return processor.processResults(resultsMap, this.options, this.config);
  }

  private displayResults(auditResult: AuditResult): void {
    const chalkForced = new chalk.Instance({ level: 3 });
    const options = {
      onlyFailures: this.options.onlyFailures ?? false,
      verbose: this.options.verbose ?? false,
      showScoring: this.options.scoring ?? true,
    };

    this.displayHeader(chalkForced);
    this.displaySummaryStats(auditResult, chalkForced, options.showScoring);
    this.displayFailedLaws(auditResult, chalkForced, options);
    this.displayWarningLaws(auditResult, chalkForced, options);
    this.displayJudgedNothingLaws(auditResult, chalkForced, options);
    this.displayPartlyReadLaws(auditResult, chalkForced, options);
    this.displayPassedLaws(auditResult, chalkForced, options);
    this.displayWaivers(auditResult.scope, chalkForced);
    this.displayFinalVerdict(auditResult, chalkForced);
  }

  /**
   * The waived laws, by name and reason, in every outcome (#350). Fifty laws
   * waived with `laws.notApplicable` printed a bare COMPLIANCE: PASSED, with
   * the waivers nowhere in the output — a reviewer had to read the config to
   * learn what had not run. Printed only when something was waived.
   */
  private displayWaivers(
    scope: AuditScope | undefined,
    chalk: chalk.Chalk
  ): void {
    const waived = scope?.waivedLaws ?? [];
    if (waived.length === 0) return;
    console.log(
      chalk.yellow.bold(
        `📋 ${waived.length} law(s) waived by laws.notApplicable — not run, not passed:`
      )
    );
    for (const { law, reason } of waived) {
      console.log(
        `${chalk.gray('   – ')}${chalk.white(law)}${chalk.gray(`: ${reason}`)}`
      );
    }
    console.log('');
  }

  /** Warning result = violations at warning/info severity (non-blocking). */
  /** Where a law's result counts, under this run's failOnWarnings. */
  private outcomeOf(lawResult: {
    passed?: boolean;
    severity?: string;
    judgedNothing?: boolean;
    notRead?: string[] | undefined;
    violations?: unknown;
  }): ReturnType<typeof AuditResultProcessor.outcomeOf> {
    return AuditResultProcessor.outcomeOf(
      lawResult,
      this.options.failOnWarnings ?? false
    );
  }

  private isWarningResult(lawResult: {
    passed?: boolean;
    severity?: string;
  }): boolean {
    return AuditResultProcessor.isWarningResult(
      lawResult,
      this.options.failOnWarnings ?? false
    );
  }

  private displayHeader(chalk: chalk.Chalk): void {
    console.log('\n');
    console.log(chalk.cyan('═'.repeat(RULE_WIDTH)));
    console.log(chalk.bold.white('   🏛️  CONSTITUTIONAL AUDIT RESULTS'));
    console.log(chalk.cyan('═'.repeat(RULE_WIDTH)));
    console.log('');
  }

  private displaySummaryStats(
    auditResult: AuditResult,
    chalk: chalk.Chalk,
    showScoring: boolean
  ): void {
    const passRate =
      auditResult.totalLaws > 0
        ? Math.round((auditResult.passedLaws / auditResult.totalLaws) * 100)
        : 0;

    console.log(chalk.bold('📊 AUDIT SUMMARY:'));
    console.log(chalk.gray('─'.repeat(RULE_WIDTH)));
    console.log(
      `${chalk.cyan('Total Laws Checked:')} ${chalk.bold.white(auditResult.totalLaws)}`
    );
    // The liveness floor counts EVIDENCE, i.e. everything except the two
    // always-on meta-gates. Print both, so nobody sets laws.minLawsChecked to
    // the total and fails for no reason (FE).
    const substantive = auditResult.substantiveLaws;
    const deferred = auditResult.deferredLaws ?? 0;
    if (substantive !== undefined && deferred > 0) {
      // The floor counts the selection, which here is larger than what ran.
      // Say so, or the advice reads as a number bigger than the total.
      const metaGates = auditResult.totalLaws - (substantive - deferred);
      console.log(
        `${chalk.gray('  the liveness floor counts the selection:')} ${chalk.white(
          substantive
        )} ${chalk.gray(
          `(${substantive - deferred} run here + ${deferred} history laws deferred to pre-push in --mode=${this.mode}, +${metaGates} always-on meta-gates — set laws.minLawsChecked against ${substantive}, the same in every mode)`
        )}`
      );
    } else if (
      substantive !== undefined &&
      substantive !== auditResult.totalLaws
    ) {
      console.log(
        `${chalk.gray('  of which count for the liveness floor:')} ${chalk.white(
          substantive
        )} ${chalk.gray(
          `(+${auditResult.totalLaws - substantive} always-on meta-gates — set laws.minLawsChecked against ${substantive})`
        )}`
      );
    }
    this.displayLivenessFloor(auditResult.scope, chalk);
    console.log('');
    console.log(
      `${chalk.green('✓ Passed:')} ${chalk.bold.green(auditResult.passedLaws)}`
    );
    console.log(
      `${chalk.red('✗ Failed:')} ${chalk.bold.red(auditResult.failedLaws)}`
    );
    if ((auditResult.warningLaws ?? 0) > 0) {
      console.log(
        `${chalk.yellow('⚠ Warnings:')} ${chalk.bold.yellow(auditResult.warningLaws)} ${chalk.gray('(reported, not blocking)')}`
      );
    }
    // The outcome, not scope.judgedNothingLaws: a law that judged nothing at
    // error severity is already counted in Failed, so the four lines add up to
    // Total Laws Checked (8.0.1).
    const judgedNothing = auditResult.judgedNothingLaws ?? 0;
    if (judgedNothing > 0) {
      console.log(
        `${chalk.magenta('◌ Judged nothing:')} ${chalk.bold.magenta(judgedNothing)} ${chalk.gray('(did not pass)')}`
      );
    }
    const partlyRead = auditResult.partlyReadLaws ?? 0;
    if (partlyRead > 0) {
      console.log(
        `${chalk.magenta('◐ Partly read:')} ${chalk.bold.magenta(partlyRead)} ${chalk.gray('(did not pass)')}`
      );
    }

    if (showScoring) {
      console.log(
        `${chalk.yellow('Score:')} ${chalk.bold.yellow(auditResult.score + '%')} ${chalk.gray(`(Pass Rate: ${passRate}%)`)}`
      );
    }

    console.log(
      `${chalk.gray('Execution time:')} ${chalk.white(auditResult.executionTime + 'ms')}`
    );
    console.log('');
  }

  /**
   * The floor Audit Liveness judged this run by, and where it comes from —
   * on a pass too (#350): "compliance verified" alone left the floor in
   * effect invisible, and a user setting laws.minLawsChecked could not see
   * what the default had been.
   */
  private displayLivenessFloor(
    scope: AuditScope | undefined,
    chalk: chalk.Chalk
  ): void {
    if (!scope?.liveness) return;
    console.log(
      `${chalk.gray('  Audit Liveness:')} ${chalk.white(describeLivenessFloor(scope.liveness, scope.narrowedBy))}`
    );
  }

  private displayFailedLaws(
    auditResult: AuditResult,
    chalk: chalk.Chalk,
    options: { verbose: boolean; showScoring: boolean }
  ): void {
    if (auditResult.failedLaws === 0) return;

    console.log(chalk.red.bold('❌ FAILED CONSTITUTIONAL LAWS:'));
    console.log(chalk.gray('─'.repeat(RULE_WIDTH)));
    console.log('');

    let count = 0;
    for (const [, result] of auditResult.results) {
      const lawResult = result as {
        passed?: boolean;
        severity?: string;
        lawName?: string;
        lawTitle?: string;
        violations?: string[];
        score?: number;
      };
      if (!lawResult.passed && !this.isWarningResult(lawResult)) {
        count++;
        this.displayFailedLaw(lawResult, count, chalk, options);
      }
    }
  }

  /**
   * Warning-severity violations: shown with full detail like failures, but
   * under their own header and never blocking (the warn-first contract).
   */
  private displayWarningLaws(
    auditResult: AuditResult,
    chalk: chalk.Chalk,
    options: { verbose: boolean; showScoring: boolean }
  ): void {
    if ((auditResult.warningLaws ?? 0) === 0) return;

    console.log(
      chalk.yellow.bold('⚠️  WARNING LAWS (reported, not blocking):')
    );
    console.log(chalk.gray('─'.repeat(RULE_WIDTH)));
    console.log('');

    let count = 0;
    for (const [, result] of auditResult.results) {
      const lawResult = result as {
        passed?: boolean;
        severity?: string;
        lawName?: string;
        lawTitle?: string;
        violations?: string[];
        score?: number;
      };
      if (this.outcomeOf(lawResult) === 'warning') {
        count++;
        this.displayFailedLaw(lawResult, count, chalk, options);
      }
    }
  }

  /**
   * Laws that found nothing in this project to judge, at a non-blocking
   * severity: their own block, never among the warnings (8.0.0). At error
   * severity they are failures and listed with the failed laws.
   */
  private displayJudgedNothingLaws(
    auditResult: AuditResult,
    chalk: chalk.Chalk,
    options: { verbose: boolean; showScoring: boolean }
  ): void {
    const laws = [...auditResult.results.values()].filter(
      result =>
        this.outcomeOf(result as { passed?: boolean }) === 'judged-nothing'
    );
    if (laws.length === 0) return;
    console.log(
      chalk.magenta.bold(
        '◌ JUDGED NOTHING — found nothing in this project to judge; they did not pass:'
      )
    );
    console.log(chalk.gray('─'.repeat(RULE_WIDTH)));
    console.log('');
    laws.forEach((lawResult, index) =>
      this.displayFailedLaw(
        lawResult as Parameters<RuleOfCodeAuditor['displayFailedLaw']>[0],
        index + 1,
        chalk,
        options
      )
    );
  }

  /**
   * Laws that read part of their input and found nothing wrong in it, at a
   * non-blocking severity (#453): their own block, listing what each could
   * not read — never among the findings. At error severity they are
   * failures and listed with the failed laws.
   */
  private displayPartlyReadLaws(
    auditResult: AuditResult,
    chalk: chalk.Chalk,
    options: { verbose: boolean; showScoring: boolean }
  ): void {
    const laws = [...auditResult.results.values()].filter(
      result => this.outcomeOf(result as { passed?: boolean }) === 'partly-read'
    );
    if (laws.length === 0) return;
    console.log(
      chalk.magenta.bold(
        '◐ PARTLY READ — found nothing wrong in what they read, and did not read all of it; they did not pass:'
      )
    );
    console.log(chalk.gray('─'.repeat(RULE_WIDTH)));
    console.log('');
    laws.forEach((lawResult, index) => {
      const law = lawResult as { notRead?: string[] };
      this.displayFailedLaw(
        {
          ...(lawResult as Parameters<
            RuleOfCodeAuditor['displayFailedLaw']
          >[0]),
          violations: law.notRead ?? [],
        },
        index + 1,
        chalk,
        options
      );
    });
  }

  private displayFailedLaw(
    lawResult: {
      lawName?: string;
      violations?: string[];
      violationDetails?: Array<{
        file?: string;
        line?: number;
        column?: number;
        message: string;
      }>;
      suggestions?: string[];
      score?: number;
    },
    count: number,
    chalk: chalk.Chalk,
    options: { verbose: boolean; showScoring: boolean }
  ): void {
    const violationCount = lawResult.violations?.length || 0;
    const scoreDisplay = this.getScoreDisplay(
      lawResult.score,
      options.showScoring,
      chalk
    );

    console.log(
      `${chalk.red.bold(`${count}.`)} ${chalk.white.bold(RuleOfCodeAuditor.displayName(lawResult))} ${chalk.red(`[${violationCount} violations]`)}${scoreDisplay}`
    );

    this.displayViolations(lawResult.violations, options.verbose, chalk);

    // Display structured violation details with file information
    if (lawResult.violationDetails && lawResult.violationDetails.length > 0) {
      console.log('');
      console.log(`   ${chalk.cyan('📁 Affected files:')}`);
      this.displayViolationDetails(
        lawResult.violationDetails,
        options.verbose,
        chalk
      );
    }

    this.displaySuggestions(lawResult.suggestions, options.verbose, chalk);

    console.log('');
  }

  /**
   * What the law suggests doing about it — which is where most laws put the
   * artefacts they counted.
   *
   * These were computed and thrown away: a law reported "21 source files lack
   * corresponding test files" while holding the list of names in `suggestions`,
   * and the renderer printed only `violations`. A consumer reimplemented the
   * law's discovery in a script to find out which files it meant, got a
   * different number, and had no way to tell which of the two was wrong — so
   * they parked the law. An unexplained violation pushes a project toward a
   * waiver rather than a fix, which is the opposite of the point.
   */
  private displaySuggestions(
    suggestions: string[] | undefined,
    verbose: boolean,
    chalk: chalk.Chalk
  ): void {
    if (!suggestions || suggestions.length === 0) return;

    const maxSuggestions = verbose
      ? suggestions.length
      : RuleOfCodeAuditor.SUGGESTION_PREVIEW_COUNT;
    const remainingCount = suggestions.length - maxSuggestions;

    console.log('');
    console.log(`   ${chalk.cyan('💡 What the law is asking for:')}`);
    suggestions.slice(0, maxSuggestions).forEach(suggestion => {
      console.log(`   ${chalk.gray('•')} ${chalk.dim(suggestion)}`);
    });

    if (remainingCount > 0) {
      console.log(
        `   ${chalk.yellow(`... and ${remainingCount} more — run with --verbose for all, or --export json for the full result`)}`
      );
    }
  }

  private displayViolations(
    violations: string[] | undefined,
    verbose: boolean,
    chalk: chalk.Chalk
  ): void {
    if (!violations || violations.length === 0) return;

    const maxViolations = verbose ? violations.length : 5;
    const visibleViolations = violations.slice(0, maxViolations);
    const remainingCount = violations.length - maxViolations;

    visibleViolations.forEach(v => {
      console.log(`   ${chalk.gray('•')} ${chalk.dim(v)}`);
    });

    if (remainingCount > 0) {
      console.log(
        `   ${chalk.yellow(`... and ${remainingCount} more violations`)}`
      );
    }
  }

  private displayViolationDetails(
    violationDetails: Array<{
      file?: string;
      line?: number;
      column?: number;
      message: string;
    }>,
    verbose: boolean,
    chalk: chalk.Chalk
  ): void {
    const maxDetails = verbose ? violationDetails.length : 10;
    const visibleDetails = violationDetails.slice(0, maxDetails);
    const remainingCount = violationDetails.length - maxDetails;

    visibleDetails.forEach(detail => {
      let location = '';
      if (detail.file) {
        location = chalk.yellow(detail.file);
        if (detail.line) {
          location += chalk.gray(`:${detail.line}`);
          if (detail.column) {
            location += chalk.gray(`:${detail.column}`);
          }
        }
        location += chalk.gray(' - ');
      }
      console.log(
        `   ${chalk.gray('•')} ${location}${chalk.dim(detail.message)}`
      );
    });

    if (remainingCount > 0) {
      console.log(`   ${chalk.yellow(`... and ${remainingCount} more files`)}`);
    }
  }

  private displayPassedLaws(
    auditResult: AuditResult,
    chalk: chalk.Chalk,
    options: { onlyFailures: boolean; verbose: boolean; showScoring: boolean }
  ): void {
    if (options.onlyFailures || auditResult.passedLaws === 0) return;

    console.log(chalk.green.bold('✅ PASSED CONSTITUTIONAL LAWS:'));
    console.log(chalk.gray('─'.repeat(RULE_WIDTH)));
    console.log('');

    let count = 0;
    for (const [, result] of auditResult.results) {
      const lawResult = result as {
        passed?: boolean;
        lawName?: string;
        lawTitle?: string;
        violations?: string[];
        score?: number;
      };
      if (lawResult.passed) {
        count++;
        this.displayPassedLaw(lawResult, count, chalk, options);
      }
    }
    console.log('');
  }

  private displayPassedLaw(
    lawResult: {
      lawName?: string;
      lawTitle?: string;
      violations?: string[];
      score?: number;
    },
    count: number,
    chalk: chalk.Chalk,
    options: { verbose: boolean; showScoring: boolean }
  ): void {
    const scoreDisplay = this.getScoreDisplay(
      lawResult.score,
      options.showScoring,
      chalk
    );

    console.log(
      `${chalk.green.bold(`${count}.`)} ${chalk.white.bold(RuleOfCodeAuditor.displayName(lawResult))}${scoreDisplay}`
    );

    if (options.verbose && lawResult.violations) {
      console.log(`   ${chalk.dim('No violations detected')}`);
    }
  }

  private displayFinalVerdict(
    auditResult: AuditResult,
    chalk: chalk.Chalk
  ): void {
    console.log(chalk.cyan('═'.repeat(RULE_WIDTH)));

    // A Pareto run checks a SUBSET. It may pass — but it must never call that
    // "compliance", because the laws it did not run cannot have passed. A
    // consumer whose convenience script said PASSED over 13 of 100 laws had no
    // way to know the gate was disarmed (a backend consumer). Better to refuse the
    // word than to lie with it.
    // Any narrowed run — Pareto OR a laws.enabled allowlist — that ran fewer
    // substantive laws than apply is PARTIAL (#348). The word PASSED is not
    // printed for it: "PARTIAL SCAN PASSED" and "never PASSED" were quoted
    // against each other.
    if (auditResult.passed && auditResult.scope?.partial) {
      this.displayPartialVerdict(auditResult, chalk);
      return;
    }

    if (auditResult.passed) {
      this.displayPassedVerdict(auditResult, chalk);
    } else {
      console.log(chalk.red.bold('❌ CONSTITUTIONAL COMPLIANCE: FAILED'));
      console.log(
        chalk.yellow(
          `\n⚠️  ${auditResult.failedLaws} laws failed. Please address the violations above.`
        )
      );
      console.log(chalk.cyan('═'.repeat(RULE_WIDTH)));
      console.log('');
    }
  }

  private displayPartialVerdict(
    auditResult: AuditResult,
    chalk: chalk.Chalk
  ): void {
    const scope = auditResult.scope as AuditScope;
    const counted = RuleOfCodeAuditor.passedSentence(auditResult);
    if (scope.narrowedBy === undefined) {
      this.displayJudgedNothingVerdict(scope, counted, chalk);
      return;
    }
    this.displayNarrowedVerdict(scope, counted, chalk);
  }

  /**
   * What the laws that ran did, in one clause: "passed" only when none of
   * them reported warnings; otherwise the counts (stats.passedLaws and
   * stats.warningLaws) — a law with warnings did not "pass".
   */
  static passedSentence(
    auditResult: Pick<
      AuditResult,
      'passedLaws' | 'warningLaws' | 'partlyReadLaws'
    >
  ): string | null {
    const warnings = auditResult.warningLaws ?? 0;
    // A law that read part of its input did not pass either (#453).
    const partlyRead = auditResult.partlyReadLaws ?? 0;
    if (warnings === 0 && partlyRead === 0) return null;
    const parts = [`${auditResult.passedLaws} passed`];
    if (warnings > 0)
      parts.push(`${warnings} reported warnings (not blocking)`);
    if (partlyRead > 0)
      parts.push(`${partlyRead} did not read all of their input`);
    return parts.join(', ');
  }

  /**
   * Every law that applies ran, but some found nothing to judge (8.0.0): what
   * was not judged cannot have passed, so there is no compliance verdict.
   */
  private displayJudgedNothingVerdict(
    scope: AuditScope,
    counted: string | null,
    chalk: chalk.Chalk
  ): void {
    const judgedNothing = scope.judgedNothingLaws.length;
    const partlyRead = scope.partlyReadLaws?.length ?? 0;
    const others = counted ?? 'The other laws passed';
    const what = [
      judgedNothing > 0
        ? `${judgedNothing} law(s) judged nothing (${scope.judgedNothingLaws.map(l => l.law).join(', ')})`
        : null,
      partlyRead > 0
        ? `${partlyRead} law(s) did not read all of their input (${scope.partlyReadLaws.map(l => l.law).join(', ')})`
        : null,
    ]
      .filter(Boolean)
      .join('; ');
    console.log(
      chalk.yellowBright.bold(
        `⚠️  PARTIAL — ${what}. ${others}; no compliance verdict.`
      )
    );
    if (judgedNothing > 0)
      console.log(
        chalk.yellow('   A law that found nothing to judge has not passed.')
      );
    if (partlyRead > 0)
      console.log(
        chalk.yellow(
          '   What a law could not read cannot have passed; each says above what it did not read.'
        )
      );
    console.log(
      chalk.gray(
        '   For a compliance verdict give it something to judge, or leave it off (it is opt-in or stack-gated where it can be).'
      )
    );
    console.log(chalk.cyan('═'.repeat(RULE_WIDTH)));
    console.log('');
  }

  private displayNarrowedVerdict(
    scope: AuditScope,
    counted: string | null,
    chalk: chalk.Chalk
  ): void {
    const { executedLaws, applicableLaws, narrowedBy } = scope;
    const waived = scope.waivedLaws?.length ?? 0;
    const why =
      waived > 0 ? `${narrowedBy}; ${waived} waived` : `${narrowedBy}`;
    const selected = counted
      ? `Of the selected laws ${counted}`
      : 'The selected laws passed';
    console.log(
      chalk.yellowBright.bold(
        `⚠️  PARTIAL SCAN — ${executedLaws} of ${applicableLaws} applicable laws ran (narrowed by ${why}). ${selected}; no compliance verdict.`
      )
    );
    console.log(
      chalk.yellow('   The laws that did not run cannot have passed.')
    );
    console.log(
      chalk.gray(
        `   For a compliance verdict run the full set: ${RuleOfCodeAuditor.fullSetRemedy(narrowedBy)}.`
      )
    );
    const judgedNothing = scope.judgedNothingLaws.length;
    if (judgedNothing > 0)
      console.log(
        chalk.magenta(
          `   And ${judgedNothing} law(s) that ran judged nothing; they did not pass either.`
        )
      );
    const partlyRead = scope.partlyReadLaws?.length ?? 0;
    if (partlyRead > 0)
      console.log(
        chalk.magenta(
          `   And ${partlyRead} law(s) that ran did not read all of their input; they did not pass either.`
        )
      );
    console.log(chalk.cyan('═'.repeat(RULE_WIDTH)));
    console.log('');
  }

  /** What to remove for a run of the full set, by what narrowed this one. */
  private static fullSetRemedy(narrowedBy: AuditScope['narrowedBy']): string {
    if (narrowedBy === 'laws.enabled')
      return 'remove the laws.enabled allowlist';
    if (narrowedBy === 'categories') return 'run without categories';
    return 'paretoMode: false and no --mode=fast';
  }

  /**
   * A pass with waivers is not the clean pass (#350): it says WITH WAIVERS and
   * how many, and the victory art stays for a run in which every law that
   * applies ran. The waivers themselves are listed just above.
   */
  private displayPassedVerdict(
    auditResult: AuditResult,
    chalk: chalk.Chalk
  ): void {
    const scope = auditResult.scope;
    const waived = scope?.waivedLaws?.length ?? 0;
    const warnings = auditResult.warningLaws ?? 0;
    if (scope && waived > 0) {
      console.log(
        chalk.green.bold(
          `✅ CONSTITUTIONAL COMPLIANCE: PASSED WITH WAIVERS — ${scope.executedLaws} of ${scope.applicableLaws} applicable laws ran (${waived} waived)`
        )
      );
    } else if (warnings > 0) {
      console.log(
        chalk.green.bold(
          `✅ CONSTITUTIONAL COMPLIANCE: PASSED WITH WARNINGS — ${warnings} law(s) reported warnings (not blocking)`
        )
      );
    } else {
      console.log(chalk.green.bold('✅ CONSTITUTIONAL COMPLIANCE: PASSED'));
    }
    if (warnings > 0) {
      console.log(
        chalk.yellow(
          `⚠️  ${auditResult.warningLaws} law(s) reported warnings — address them in the warn cycle (or enforce with failOnWarnings).`
        )
      );
    }
    console.log(chalk.cyan('═'.repeat(RULE_WIDTH)));
    console.log('');
    // The art is for the clean pass only: no law failed, waived, warning or
    // judging nothing (a judged-nothing run is partial and never gets here).
    if (waived === 0 && warnings === 0) this.displayVictoryArt(chalk);
  }

  private displayVictoryArt(chalk: chalk.Chalk): void {
    const art = `
                        ::
                        ;.::                               ::
                         :.::                            ::::
                         ::.:;  .;                      :::::
                          ;...;x . +;+:.              ::::::
                        ;::;;;;X .::+;;;::;         .:::::;:
                      :::+;;+++X+  ;++;;;::;       :.:::::::                            .:
                     +:;+;;+;;;      ;+;+: ::    :..:. :::::                         ::...
                    ;;++;;++++;       +;+:.:;  :....  ::::::                    .::.  .:
                      +;;+x.   .      ;+;:::.;. ..  .:: :::.            .::....    .:;:
                      :x;   X:;       ;;;:::..;..  .:  .;;;     ..::..      ...::;:::::
                      :      +;       +;:::...:  .:.    .:;;..       ...  ::::::::::
                     ;          ..    +;::...:;+..  .:..;.    .::;:..  ..::::::::::::
                    :                 +;::..;:;;; .:..:.  .:::.  ...:..;:::::::::::
                   ;               :  ;;;;..;::;;;. .;   ;:...:..  ...::::::::::::
                   ;:.   .   :;:;      :+;;;x::;;: .:   .::.  ..::...:::::::::::.
                    :   .. :   ;       :+;:;:::;;:.;.  :::       ..:::::::::::
                              :       ;+;:;:::;;;:;.  ::.. .::.... :::::::::::
                            :       ;+;:;;:::+;;+:  .;:.     ...::;::::::::
               :;;         ;      ;+;:;;;:::;;;+.  .:..  .....  .::::::::::
              :     :     x;     ;;;X;;;:::;;+;   ::.   .....:;;:::::::..
            :    .    :  :.+;:  ++. ;;;:::++;   ::.  ..... . .:::::::::
                .+      ;  :;;;+Xx;x;;:::+;  .::.  . ...  .:::::::;:
           :    : :.    ;          +;;:;;. ...     ..  ..::::::::::
           :   :    :  ..          :;;:  :   . .:.. ..++;::::::
          :.  .;:     .+:           ;;:   .:  .:. .:;::::::
          ::::;;+     .;             ;+     .:.::....:;:: :
           :+x+:  ;                                        ;+++++
                ;                                   :;;    :+:..++++
               .   :;::;+++++:.                            : .+..;++;
              :   ;          ::                 :;;   ::   : ;+..;+++
             .   :              ::              .:;       ++;::.:+++
             +   .                 .;..                 ++;;:;..++;;
             +  ;;X                   :   ::;:        ;+;;;:;..+++x
             +;:;++                   .     :.       ;+;;;;:...++;;.
             +:;++                     .     ;       X;;;;;::..;+;;;;;
              ;;                       ..    :       X;;;;;:. ...++;;;;;+:
                                        :    .+      x;;;;+;;:::...:+++;;;;;:
                                        ;   :  :     .+;;;;;;;::::... :+++;;;+.
                                       .   .     .    ;x;;;;;;;;;:::.....;++;:+
                                      :    :     ..   .  ++;;;;;;;;:::.....+;  ;
                                     x     .      :   :     ;x+;;;;;;::... :+;:;.
                                     +:::++:     :    :         :++;;;:;....+;;+
                                      ;+++x:    .    ..            :x;:;...:+;;;
                                                ;    :      +.     .;;:... +;;;
                                               :;::;++      ;..::;++:....:+;;+
                                                :+;;+;       +;........;+;;+
                                                               :+++++++++.

`;

    console.log(chalk.cyan(art));
    console.log('');
  }

  private getScoreDisplay(
    score: number | undefined,
    showScoring: boolean,
    chalk: chalk.Chalk
  ): string {
    return showScoring && score !== undefined
      ? chalk.gray(` (Score: ${score}/100)`)
      : '';
  }

  /**
   * Validate git hooks installation according to config
   */
  private validateGitHooks(): void {
    const validation = GitHooksInstaller.validateHooks({
      projectRoot: this.projectRoot,
      config: this.config,
    });

    if (!validation.valid) {
      const chalkForced = new chalk.Instance({ level: 3 });

      if (validation.missing.length > 0) {
        console.log(
          chalkForced.yellow(
            `\n⚠️  Warning: Missing git hooks: ${validation.missing.join(', ')}`
          )
        );
        console.log(
          chalkForced.gray(
            `   Run 'npx ruleofcode reinstall-hooks' to install them`
          )
        );
      }

      if (validation.outdated.length > 0) {
        console.log(
          chalkForced.yellow(
            `\n⚠️  Warning: Outdated git hooks: ${validation.outdated.join(', ')}`
          )
        );
        console.log(
          chalkForced.gray(
            `   Run 'npx ruleofcode reinstall-hooks' to update to latest version`
          )
        );
      }

      console.log(''); // Empty line
    }
  }

  /**
   * Export audit results to various formats
   */
  async exportResults(result: AuditResult, format: string): Promise<string> {
    await Promise.resolve(); // Satisfy async requirement
    const processor = new AuditResultProcessor();
    return processor.exportResults(result, format as 'csv' | 'html' | 'json');
  }

  /**
   * Get all project files for cache hashing
   */
  private getProjectFiles(): string[] {
    // For caching purposes, use a simple glob-based file collection.
    //
    // Every file in the project, of every type, whatever `includes`/`ignores`
    // say: laws read .py, .html, .json, .yml and dotfiles, and many open
    // files by fixed path regardless of the scan's ignores. The default
    // `includes.global` is EMPTY ("scan everything minus ignores"), and an
    // empty list is truthy, so the old `includes.global || ['**/*.ts…']`
    // hashed NO scanned file at all — harmless only while the cache never
    // hit (#305); once it hits, an edited file would be served the verdict
    // computed before the edit. A key that is too wide costs a miss; a key
    // that is too narrow serves a stale PASS.
    const glob = require('glob');
    const patterns = ['**/*'];
    const ignorePatterns = [
      // Installed packages are keyed by the lockfiles (getFixedPathInputs).
      '**/node_modules/**',
      // Never key on the cache's own file or RoC's own report, which this run
      // writes, nor on git's object store (git state is keyed separately,
      // and the git files laws read are fixed-path inputs).
      '**/.ruleofcode-cache/**',
      '**/.git/**',
      'ruleofcode-report.*',
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      try {
        const matches = glob.sync(pattern, {
          cwd: this.projectRoot,
          absolute: true,
          ignore: ignorePatterns,
          nodir: true,
          dot: true,
        });
        files.push(...matches);
      } catch (error) {
        // Ignore glob errors
      }
    }

    return [...files, ...this.getFixedPathInputs()];
  }

  /**
   * Files laws open by a FIXED path rather than through the scan: manifests
   * and lockfiles (which decide `requires` gating and what is installed), the
   * ignore file, and the Capacitor native shells, which a project rightly
   * excludes from the scan. A cache keyed only on scanned files would serve a
   * verdict computed before one of these changed.
   */
  private getFixedPathInputs(): string[] {
    const rootFiles = [
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '.gitignore',
    ].map(name => PathOperations.join(this.projectRoot, name));
    return [
      ...rootFiles,
      ...NxWorkspace.resolveSourceFiles(this.projectRoot, 'package.json'),
      ...CapacitorProjects.fixedPathInputs(this.projectRoot),
      ...this.gitInputs(),
    ];
  }

  /**
   * The files inside the git directory that laws read besides history: the
   * hooks, the repo config, the index (what is staged) and MERGE_HEAD. The
   * cache's `branch@sha` key does not move when any of these change.
   * Resolved by git itself (`--git-path`), so a worktree, whose `.git` is a
   * file, and a `core.hooksPath` are both followed.
   */
  private gitInputs(): string[] {
    const names = ['hooks', 'config', 'index', 'MERGE_HEAD', 'HEAD'];
    let printed: string[];
    try {
      printed = execFileSync(
        'git',
        ['rev-parse', ...names.flatMap(name => ['--git-path', name])],
        {
          cwd: this.projectRoot,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }
      )
        .split(/\r?\n/)
        .filter(line => line.trim().length > 0);
    } catch {
      return []; // not a git repository: nothing here to key on
    }
    const resolved = printed.map(entry =>
      PathOperations.resolve(this.projectRoot, entry.trim())
    );
    const [hooksDir, ...files] = resolved;
    return [...files, ...(hooksDir ? this.filesIn(hooksDir) : [])];
  }

  /** The entries of a directory, as paths; none when it cannot be read. */
  private filesIn(dir: string): string[] {
    try {
      return fs.readdirSync(dir).map(name => PathOperations.join(dir, name));
    } catch {
      return [];
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

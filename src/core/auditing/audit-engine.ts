/**
 * Audit engine core functionality
 */

import chalk from 'chalk';
import { ConfigLoader } from '../../config/loader';
import { GitHooksInstaller } from '../../hooks/installer';
import { ModularLawsRegistry } from '../../registry/modular-laws-registry';
import type { RuleOfCodeConfig } from '../../types/law.types';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import * as LawIdentity from '../../utils/law-identity';
import { AuditCache } from './audit-cache';
import type { AuditOptions, AuditResult } from './audit-types';
import { AuditResultProcessor } from './result-processor';

// Force chalk to use colors in all environments
chalk.level = 1;

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
  private readonly suggestExceptions: boolean;
  private readonly mode: string;
  private readonly options: AuditOptions;

  static async create(options: {
    projectRoot?: string;
    config: RuleOfCodeConfig;
    mode?: string;
    suggestExceptions?: boolean;
    verbose?: boolean;
    onlyFailures?: boolean;
    parallel?: boolean;
    failOnWarnings?: boolean;
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
      options.suggestExceptions,
      options.mode,
      cliOptions
    );
  }

  constructor(
    _config: unknown,
    projectRoot: string = process.cwd(),
    suggestExceptions = false,
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
    this.suggestExceptions = suggestExceptions;
    this.mode = mode;

    // Read settings from config
    const configParallel = (this.config as any).performance?.parallel ?? true;
    const configMaxConcurrent =
      (this.config as any).performance?.maxConcurrent ?? 10;
    const configVerbose = (this.config as any).reporting?.verbose ?? false;
    const configOnlyFailures =
      (this.config as any).reporting?.onlyFailures ?? false;
    const configScoring = (this.config as any).reporting?.scoring ?? true;
    // laws.failOnWarnings is the documented home; top-level accepted too.
    const configFailOnWarnings =
      (this.config as any).laws?.failOnWarnings ??
      (this.config as any).failOnWarnings ??
      false;

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
    };

    // Store scoring config for result processor
    (this.options as any).scoring = configScoring;
  }

  async audit(): Promise<AuditResult> {
    const startTime = Date.now();

    this.logAuditStart();

    // Validate git hooks installation
    this.validateGitHooks();

    // A typo'd severity override must not pass silently
    this.validateSeverityOverrides();

    // Check cache if enabled
    const cacheEnabled = (this.config as any).performance?.cache ?? false;
    const incrementalEnabled =
      (this.config as any).performance?.incremental ?? false;

    if (cacheEnabled) {
      const filesHash = AuditCache.generateFilesHash(this.getProjectFiles());
      const configHash = AuditCache.generateConfigHash(this.config);
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
      const laws = this.getLawsToAudit();

      // FAIL-CLOSED: a collapsed law selection is never compliance. The two
      // meta-gates are always-on (they cannot be configured away), so they do
      // NOT count as evidence — liveness is measured in SUBSTANTIVE laws.
      // The explicit floor is enforced HERE, in the engine, not only by law
      // 226: the same config mistake that shrinks the selection could also
      // have dropped that law (QA-4).
      const substantive = laws.filter(
        law => !(law as { alwaysEnabled?: boolean }).alwaysEnabled
      );
      const floor =
        (this.config.laws as { minLawsChecked?: number }).minLawsChecked ?? 0;

      if (substantive.length === 0 || substantive.length < floor) {
        const chalkForced = new chalk.Instance({ level: 3 });
        const reason =
          substantive.length === 0
            ? 'No laws executed'
            : `Only ${substantive.length} laws selected — below the liveness floor (laws.minLawsChecked: ${floor})`;
        console.log(
          chalkForced.red.bold(`\n❌ ${reason} — refusing to report compliance.`)
        );
        console.log(
          chalkForced.yellow(
            '   The law selection collapsed. Check laws.enabled / laws.paretoMode / laws.notApplicable and the detected project type. A shrunken audit is a disarmed gate, never PASSED.'
          )
        );
        return {
          passed: false,
          score: 0,
          totalLaws: substantive.length,
          passedLaws: 0,
          failedLaws: substantive.length,
          warningLaws: 0,
          results: new Map(),
          duration: 0,
          paretoMode: false,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          projectRoot: this.projectRoot,
          config: this.config,
        };
      }

      // The Audit Liveness Assertion law compares the planned law count
      // against the liveness floor — inject it before the run (guards excluded).
      (this.config.laws as { __plannedLawCount?: number }).__plannedLawCount =
        substantive.length;

      const results = await this.executeLawChecks(laws);
      const processedResults = this.processResults(results);

      const auditResult: AuditResult = {
        passed: processedResults.passed ?? false,
        score: processedResults.score ?? 0,
        totalLaws: processedResults.totalLaws ?? 0,
        passedLaws: processedResults.passedLaws ?? 0,
        failedLaws: processedResults.failedLaws ?? 0,
        warningLaws: processedResults.warningLaws ?? 0,
        substantiveLaws: substantive.length,
        results: processedResults.results ?? new Map(),
        duration: processedResults.duration ?? 0,
        paretoMode:
          (this.config.laws as { paretoMode?: boolean }).paretoMode === true,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        projectRoot: this.projectRoot,
        config: this.config,
      };

      // Save to cache if enabled
      if (cacheEnabled) {
        const filesHash = AuditCache.generateFilesHash(this.getProjectFiles());
        const configHash = AuditCache.generateConfigHash(this.config);
        AuditCache.set(
          this.projectRoot,
          auditResult,
          filesHash,
          configHash,
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

  private logAuditStart(): void {
    process.stdout.write(
      `${chalk.blueBright('🔍 Starting constitutional audit...')}\n`
    );
    process.stdout.write(`${chalk.gray('Project:')} ${this.projectRoot}\n`);
    process.stdout.write(`${chalk.gray('Mode:')} ${this.mode}\n`);
  }

  private getLawsToAudit(): unknown[] {
    const registry = ModularLawsRegistry.getInstance();

    const selected =
      this.options.categories && this.options.categories.length > 0
        ? registry.getLawsByCategories(this.options.categories)
        : ModularLawsRegistry.getEnabled(this.config);

    // Stack gating: skip laws whose stack scope does not match the project type
    // (e.g. Core Web Vitals / NgRx never run on a Python backend, and the Python
    // laws never run on an Angular frontend). Universal laws always run.
    const projectType = this.detectProjectType();
    const stackApplicable = selected.filter(law =>
      ModularLawsRegistry.lawAppliesToProjectType(
        (law as { stack?: string }).stack,
        projectType
      )
    );

    return stackApplicable.filter(
      law => !this.isHistoryLawBlockedByCommit(law as { name?: string })
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
  private detectProjectType(): string | undefined {
    const configured = (this.config as { project?: { type?: string } }).project
      ?.type;
    if (configured && configured !== 'generic') return configured;
    return ProjectTypeDetector.detectProjectType(this.projectRoot) ?? configured;
  }

  private async executeLawChecks(laws: unknown[]): Promise<unknown[]> {
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

  private async executeParallel(laws: unknown[]): Promise<unknown[]> {
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

  private async executeSequential(laws: unknown[]): Promise<unknown[]> {
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
    name?: string;
    id?: string;
    legacyId?: number | string;
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
   * `legacyId` is not unique — 25 values are shared by 51 laws (20 = "No Explicit
   * Any" AND "Branch Governance Standards"). Applying such a key would silence
   * several laws while the team believes it silenced one: a hidden waiver
   * produced by us. We refuse to apply it, and Config Integrity Guard reports it
   * as a violation — so the config fails loudly instead of gating quietly.
   */
  private unambiguousIdentityKeys(law: {
    name?: string;
    id?: string;
    legacyId?: number | string;
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
    const overrides = (
      this.config.laws as { severity?: Record<string, string> }
    ).severity;
    if (!overrides) return;

    const known = new Map<string, { stack?: string }>();
    for (const law of ModularLawsRegistry.getAll()) {
      for (const key of ModularLawsRegistry.lawIdentityKeys(law)) {
        known.set(key, { stack: law.stack });
      }
    }

    const projectType = this.detectProjectType();
    for (const [key, value] of Object.entries(overrides)) {
      if (/^law-\d+$/.test(key)) continue; // legacy autogenerated map
      this.warnOnSeverityValue(key, value);

      const law = known.get(key);
      if (!law) {
        console.warn(
          `⚠️  laws.severity: unknown law '${key}' — this override gates nothing. Check the name with 'roc laws --list'.`
        );
      } else if (
        !ModularLawsRegistry.lawAppliesToProjectType(law.stack, projectType)
      ) {
        console.warn(
          `ℹ️  laws.severity: '${key}' exists but does not apply to this project type (${projectType ?? 'unknown'}) — stack-gated, kept for shared configs.`
        );
      }
    }

    this.validateNotApplicableKeys(known, projectType);
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
      console.warn(
        `⚠️  laws.severity['${key}'] = 'notApplicable' is not a severity — this waives nothing and the law still runs.`
      );
      console.warn(
        `   Declare it inapplicable with a reason instead: laws.notApplicable = { "${key}": "why it does not apply" }`
      );
      return;
    }

    console.warn(
      `⚠️  laws.severity['${key}'] = ${JSON.stringify(value)} is not a severity — valid values are ${VALID.join(' | ')}. This entry gates nothing.`
    );
  }

  /**
   * A misspelled key in `laws.notApplicable` waives nothing, and there the cost
   * is worse than in `severity`: the team believes a law is switched off while
   * it is running and failing them.
   */
  private validateNotApplicableKeys(
    known: Map<string, { stack?: string }>,
    projectType: string | undefined
  ): void {
    const notApplicable = (
      this.config.laws as { notApplicable?: Record<string, string> }
    ).notApplicable;
    if (!notApplicable) return;

    for (const [key, reason] of Object.entries(notApplicable)) {
      if (/^law-\d+$/.test(key)) continue;
      if (!known.has(key)) {
        console.warn(
          `⚠️  laws.notApplicable: unknown law '${key}' — this waives nothing and the law still runs. Check the name with 'roc laws --list'.`
        );
        continue;
      }
      if (typeof reason !== 'string' || reason.trim().length === 0) {
        console.warn(
          `⚠️  laws.notApplicable['${key}'] has no reason. A waiver without a documented reason is a silent one.`
        );
      }
      const law = known.get(key);
      if (
        law &&
        !ModularLawsRegistry.lawAppliesToProjectType(law.stack, projectType)
      ) {
        console.warn(
          `ℹ️  laws.notApplicable: '${key}' is already stack-gated off this project type (${projectType ?? 'unknown'}) — the waiver is redundant here.`
        );
      }
    }
  }

  private async executeSingleLaw(law: any): Promise<unknown> {
    const severity = this.resolveLawSeverity(law);

    // Execute the actual law check function
    if (typeof law.check === 'function') {
      try {
        const result = await law.check(this.projectRoot, this.config);
        // Ensure lawName is set + expose canonical registry identifiers so a
        // --json consumer can key `laws.notApplicable` (by lawId or legacyId)
        // without dumping the registry separately.
        return {
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
        };
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
      onlyFailures: (this.options as any).onlyFailures ?? false,
      verbose: (this.options as any).verbose ?? false,
      showScoring: (this.options as any).scoring ?? true,
    };

    this.displayHeader(chalkForced);
    this.displaySummaryStats(auditResult, chalkForced, options.showScoring);
    this.displayFailedLaws(auditResult, chalkForced, options);
    this.displayWarningLaws(auditResult, chalkForced, options);
    this.displayPassedLaws(auditResult, chalkForced, options);
    this.displayFinalVerdict(auditResult, chalkForced);
  }

  /** Warning result = violations at warning/info severity (non-blocking). */
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
    console.log(chalk.cyan('═'.repeat(60)));
    console.log(chalk.bold.white('   🏛️  CONSTITUTIONAL AUDIT RESULTS'));
    console.log(chalk.cyan('═'.repeat(60)));
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
    console.log(chalk.gray('─'.repeat(60)));
    console.log(
      `${chalk.cyan('Total Laws Checked:')} ${chalk.bold.white(auditResult.totalLaws)}`
    );
    // The liveness floor counts EVIDENCE, i.e. everything except the two
    // always-on meta-gates. Print both, so nobody sets laws.minLawsChecked to
    // the total and fails for no reason (FE).
    const substantive = auditResult.substantiveLaws;
    if (substantive !== undefined && substantive !== auditResult.totalLaws) {
      console.log(
        `${chalk.gray('  of which count for the liveness floor:')} ${chalk.white(
          substantive
        )} ${chalk.gray(
          `(+${auditResult.totalLaws - substantive} always-on meta-gates — set laws.minLawsChecked against ${substantive})`
        )}`
      );
    }
    console.log(''
    );
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

  private displayFailedLaws(
    auditResult: AuditResult,
    chalk: chalk.Chalk,
    options: { verbose: boolean; showScoring: boolean }
  ): void {
    if (auditResult.failedLaws === 0) return;

    console.log(chalk.red.bold('❌ FAILED CONSTITUTIONAL LAWS:'));
    console.log(chalk.gray('─'.repeat(60)));
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

    console.log(chalk.yellow.bold('⚠️  WARNING LAWS (reported, not blocking):'));
    console.log(chalk.gray('─'.repeat(60)));
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
      if (this.isWarningResult(lawResult)) {
        count++;
        this.displayFailedLaw(lawResult, count, chalk, options);
      }
    }
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
    console.log(chalk.gray('─'.repeat(60)));
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
    console.log(chalk.cyan('═'.repeat(60)));

    // A Pareto run checks a SUBSET. It may pass — but it must never call that
    // "compliance", because the laws it did not run cannot have passed. A
    // consumer whose convenience script said PASSED over 13 of 100 laws had no
    // way to know the gate was disarmed (a backend consumer). Better to refuse the
    // word than to lie with it.
    if (auditResult.passed && auditResult.paretoMode) {
      const applicable = ModularLawsRegistry.getAll().filter(law =>
        ModularLawsRegistry.lawAppliesToProjectType(
          law.stack,
          this.detectProjectType()
        )
      ).length;
      console.log(
        chalk.yellowBright.bold(
          `⚠️  PARTIAL SCAN PASSED — ${auditResult.totalLaws} of ${applicable} applicable laws (Pareto subset).`
        )
      );
      console.log(
        chalk.yellow(
          '   This is NOT a compliance verdict: the laws that did not run cannot have passed.'
        )
      );
      console.log(
        chalk.gray(
          '   Run the full audit (no --mode=fast, paretoMode: false) before you push.'
        )
      );
      console.log(chalk.cyan('═'.repeat(60)));
      console.log('');
      return;
    }

    if (auditResult.passed) {
      console.log(chalk.green.bold('✅ CONSTITUTIONAL COMPLIANCE: PASSED'));
      if ((auditResult.warningLaws ?? 0) > 0) {
        console.log(
          chalk.yellow(
            `⚠️  ${auditResult.warningLaws} law(s) reported warnings — address them in the warn cycle (or enforce with failOnWarnings).`
          )
        );
      }
      console.log(chalk.cyan('═'.repeat(60)));
      console.log('');
      this.displayVictoryArt(chalk);
    } else {
      console.log(chalk.red.bold('❌ CONSTITUTIONAL COMPLIANCE: FAILED'));
      console.log(
        chalk.yellow(
          `\n⚠️  ${auditResult.failedLaws} laws failed. Please address the violations above.`
        )
      );
      console.log(chalk.cyan('═'.repeat(60)));
      console.log('');
    }
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

  private displaySummary(_summary: unknown): void {
    // Display summary logic would go here
    process.stdout.write(`${chalk.blue('📊 Summary available')}\n`);
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
    // For caching purposes, use a simple glob-based file collection
    const glob = require('glob');
    const patterns = (this.config as any).includes?.global || [
      '**/*.{ts,js,tsx,jsx}',
    ];
    const ignorePatterns = (this.config as any).ignores?.global || [
      '**/node_modules/**',
      '**/dist/**',
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      try {
        const matches = glob.sync(pattern, {
          cwd: this.projectRoot,
          absolute: true,
          ignore: ignorePatterns,
          nodir: true,
        });
        files.push(...matches);
      } catch (error) {
        // Ignore glob errors
      }
    }

    return files;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

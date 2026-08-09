import chalk from 'chalk';
import type { Command } from 'commander';
import type { AuditResult } from '../core/auditing/audit-types';
import { RuleOfCodeAuditor } from '../core/auditor';
import { FileUtils } from '../utils/file-utils';
import { TOTAL_LAWS_COUNT, getVersion, isRoCPath } from './utils';

export interface AuditActionOptions {
  mode?: string;
  verbose?: boolean;
  onlyFailures?: boolean;
  parallel?: boolean;
  config?: string;
  export?: string;
  json?: boolean;
  suggestExceptions?: boolean;
  staged?: boolean;
  failOnWarnings?: boolean;
}

interface AuditActionResult {
  exitCode: number;
  result?: AuditResult;
  error?: Error;
}

/**
 * Determine audit mode from CLI options and config
 */
export function determineAuditMode(
  cliMode: string | undefined,
  paretoMode: boolean
): string {
  return cliMode ?? (paretoMode ? 'fast' : 'full');
}

/**
 * Which modes decide the LAW scope. `fast`/`full` are law-scope decisions;
 * `pre-commit`/`pre-push` are FILE-scope decisions (which files a hook looks
 * at) and must never narrow the law set. Treating every non-`full` mode as
 * Pareto collapsed the hook modes to the Pareto core — the gate ran 27 laws
 * instead of 133 on every commit and push (FE, v7.9.0). That is the very
 * "silently disarmed gate" this tool exists to prevent, produced by the tool.
 */
export function paretoModeForCliMode(
  cliMode: string | undefined,
  configPareto: boolean
): boolean {
  if (cliMode === 'fast') return true;
  if (cliMode === 'full') return false;
  return configPareto; // hook modes (and no --mode) leave law selection alone
}

/**
 * Display audit mode header. The banner reflects the EFFECTIVE law selection,
 * never the mode string — otherwise it lies (QA-7).
 */
export function displayModeHeader(mode: string, paretoActive?: boolean): void {
  const isPareto = paretoActive ?? mode === 'fast';

  if (isPareto) {
    console.log(
      chalk.yellowBright(
        '🎯 PARETO MODE — a SUBSET of the law set will run (high-impact laws only).'
      )
    );
    console.log(
      chalk.yellow(
        '   This cannot produce a compliance verdict: the laws that do not run cannot pass.\n'
      )
    );
  } else {
    // The old banner printed "FULL CONSTITUTIONAL COMPLIANCE - 173 LAWS!" — the
    // registry TOTAL — before the config had selected anything. Our own repo ran
    // FIVE laws under that banner (a downstream consumer). A banner that announces a scope it
    // does not execute is the artifact this tool exists to destroy: something that
    // LOOKS like a check. The executed count is printed by the engine, after the
    // selection, and it is the only number anyone should trust.
    console.log(chalk.greenBright('🏛️  FULL MODE — the whole applicable law set will run.'));
    console.log(
      chalk.gray('   The executed count is reported below, after config selection.\n')
    );
  }
}

/**
 * Execute audit action (for testing)
 */
export async function executeAuditAction(
  options: AuditActionOptions,
  projectRoot?: string,
  injectedError?: Error
): Promise<AuditActionResult> {
  try {
    if (injectedError) {
      throw injectedError;
    }

    const root = projectRoot ?? process.cwd();

    console.log(
      chalk.cyan(`🏛️  RuleOfCode v${getVersion()} — constitutional audit`)
    );

    // Load config to check Pareto mode (--config replaces file discovery)
    const { ConfigLoader } = await import('../config/loader');
    const config = ConfigLoader.load(root, options.config);

    // Determine final mode: CLI overrides config
    const finalMode = determineAuditMode(options.mode, config.laws.paretoMode);

    // The banner and the executed law set must always agree (QA-7) — but only
    // `fast`/`full` may decide the law scope. Hook modes keep the config's
    // selection: a pre-commit gate that quietly checks 20% of the laws is a
    // disarmed gate (FE, v7.9.0 regression).
    config.laws.paretoMode = paretoModeForCliMode(
      options.mode,
      config.laws.paretoMode
    );

    displayModeHeader(finalMode, config.laws.paretoMode);

    // 🛡️ RoC SELF-EXCLUSION CHECK
    if (isRoCPath(root)) {
      console.log(
        chalk.yellow(
          '🛡️ RoC SELF-EXCLUSION: Skipping audit (Constitutional system excludes itself)'
        )
      );
      return { exitCode: 0 };
    }

    const auditor = await RuleOfCodeAuditor.create({
      projectRoot: root,
      config,
      mode: finalMode as 'fast' | 'full',
      suggestExceptions: options.suggestExceptions,
      verbose: options.verbose,
      onlyFailures: options.onlyFailures,
      parallel: options.parallel,
      failOnWarnings: options.failOnWarnings,
    });

    const result = await auditor.audit();

    // Export results if requested
    if (options.export) {
      const exportData = await auditor.exportResults(result, options.export);
      const filename = `ruleofcode-report.${options.export}`;
      FileUtils.writeFile(filename, exportData);
      console.log(chalk.green(`📄 Report exported to ${filename}`));
    }

    // JSON output
    if (options.json) {
      const jsonOutput = await auditor.exportResults(result, 'json');
      console.log(jsonOutput);
    }

    return { exitCode: result.passed ? 0 : 1, result };
  } catch (_error) {
    const err = _error as Error;
    console.error(chalk.red(`❌ Audit failed: ${err.message}`));
    return { exitCode: 1, error: err };
  }
}

/**
 * Audit action handler with optional skipExit for testing
 */
export async function auditActionHandler(
  options: AuditActionOptions,
  skipExit = false
): Promise<number> {
  const { exitCode } = await executeAuditAction(options);
  if (!skipExit) {
    process.exit(exitCode);
  }
  return exitCode;
}

/**
 * Configure audit command
 */
export function auditCommand(program: Command): void {
  program
    .command('audit')
    .description(
      `🏛️ Run Constitutional Compliance Audit (${TOTAL_LAWS_COUNT} laws)`
    )
    .option('--mode <mode>', 'audit mode: fast (Pareto) or full')
    .option(
      '--verbose',
      'show every violation, affected file and suggestion (no truncation)'
    )
    .option('--only-failures', 'show only failed audits')
    .option('--parallel', 'run audits in parallel for faster execution')
    .option('--config <path>', 'custom config file path')
    .option('--export <format>', 'export results: json, html, csv')
    .option('--json', 'output results as JSON')
    .option('--suggest-exceptions', 'suggest exception patterns for failures')
    .option('--staged', 'audit only staged files (for git hooks)')
    .option(
      '--fail-on-warnings',
      'escalate warning/info violations to audit failures (exit 1)'
    )
    .action(async (options: AuditActionOptions) => {
      await auditActionHandler(options);
    });
}

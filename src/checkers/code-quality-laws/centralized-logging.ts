/**
 * Centralized Logging Law
 * All logging must go through the dedicated logger service (which can gate/strip
 * output outside dev mode). Direct `console.*` calls bypass that control and ship
 * unsanitized output. Allowed only in the logger service itself and bootstrap
 * (main.ts).
 *
 * This is the single source of truth for console hygiene — the older, narrower
 * console checks in generic-angular / dead-code-elimination defer to it.
 */

import type {
  LawCheckContext,
  LawResult,
  ViolationDetail,
} from '../../types/law.types';
import { PathOperations } from '../../utils/path-operations';
import { FileUtils } from '../../utils/file-utils';
import {
  loadTypeScript,
  parserUnavailable,
} from '../../utils/react/tsx-source';
import { PythonLawBase } from '../python-laws/python-law-base';
import { CliPackages } from './cli-packages';
import { CodeQualityLawBase } from './code-quality-law-base';
import { readSource } from './source-view';

export class CentralizedLoggingLaw extends CodeQualityLawBase {
  // The console methods this law counts. In a package that declares a
  // `bin`, CliPackages takes the command's output out of the list.
  private static readonly METHODS = [
    'log',
    'debug',
    'info',
    'warn',
    'error',
    'trace',
  ];
  private static readonly ALLOWED =
    /(?:^|[\\/])(?:logger\.service\.ts|main\.ts)$/;
  // Python branch (arch proposal №12): print() in source is the console.* of
  // the backend. CLI entrypoints and tooling are the legitimate homes.
  private static readonly PY_PRINT = /\bprint\s*\(/g;
  private static readonly PY_ALLOWED =
    /(^|[\\/])(scripts|tools|bin)[\\/]|(^|[\\/])__main__\.py$|(^|[\\/])(cli|manage)\.py$/i;
  private static readonly PY_TEST =
    /(^|[\\/])tests?[\\/]|(^|[\\/])test_[^\\/]*\.py$|_test\.py$|(^|[\\/])conftest\.py$/i;

  /**
   * The JS/TS branch — direct console.* in CODE outside the logging module.
   *
   * Calls are read from the parse (#424): `console.log(` in a message string
   * or a comment is not a call. In a package that declares a `bin`,
   * console.log/info are how the command talks to its user — its output, not
   * logging that bypasses a logger (#425) — and in the command's entry
   * modules warn/error are too. Library code's warn/error, and debug/trace
   * everywhere, are counted. The list comes from CliPackages, shared with
   * Absolute Zero Tolerance. A logging module (logger.*, logging*, log.*) and the
   * bootstrap (main.ts) are where console output is meant to live.
   */
  private static collectConsoleViolations(
    context: LawCheckContext,
    violations: string[],
    details: ViolationDetail[]
  ): void {
    const { projectRoot } = context;
    const files = this.findTypeScriptFiles(projectRoot, context);
    const ts = loadTypeScript(projectRoot);
    if (!ts) {
      if (files.length > 0) {
        violations.push(
          `${parserUnavailable(projectRoot, `the ${files.length} .ts file(s)`)} — Centralized Logging judged nothing for them`
        );
      }
      return;
    }
    const cli = new CliPackages(projectRoot);
    for (const file of files) {
      const normalized = file.replace(/\\/g, '/');
      if (this.ALLOWED.test(normalized) || CliPackages.isLoggingModule(file)) {
        continue;
      }
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;
      const methods = cli.countedConsoleMethods(file, this.METHODS);
      if (methods.length === 0) continue;
      const pattern = new RegExp(
        `\\bconsole\\s*\\.\\s*(${methods.join('|')})\\s*\\(`,
        'g'
      );
      const { code } = readSource(ts, content, file);
      const matches = code.match(pattern);
      if (matches && matches.length > 0) {
        const rel = PathOperations.getRelative(projectRoot, file);
        violations.push(
          `${rel}: ${
            matches.length
          } direct console.* call(s) — route logging through the logger service.`
        );
        // Each call behind the count, at its line (#43).
        details.push(
          ...this.matchDetails(
            code,
            pattern,
            rel,
            call => `direct ${call.replace(/\s+/g, '')}…) call`
          )
        );
      }
    }
  }

  /** The Python branch — print() outside tests/CLI tooling. */
  private static collectPrintViolations(
    context: LawCheckContext,
    violations: string[],
    details: ViolationDetail[]
  ): void {
    const { projectRoot, config } = context;
    for (const file of PythonLawBase.getPythonFiles(projectRoot, config)) {
      const normalized = file.replace(/\\/g, '/');
      if (this.PY_ALLOWED.test(normalized) || this.PY_TEST.test(normalized))
        continue;
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;
      const code = PythonLawBase.stripPython(content);
      const matches = code.match(this.PY_PRINT);
      if (matches && matches.length > 0) {
        const rel = PathOperations.getRelative(projectRoot, file);
        violations.push(
          `${rel}: ${matches.length} print() call(s) — use the logging module.`
        );
        details.push(
          ...this.matchDetails(code, this.PY_PRINT, rel, () => 'print() call')
        );
      }
    }
  }

  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const details: ViolationDetail[] = [];
    this.collectConsoleViolations(context, violations, details);
    this.collectPrintViolations(context, violations, details);

    const result = this.createResult(
      violations,
      'Centralized Logging',
      'CODE_QUALITY_LAW',
      [
        'Use the gated LoggerService instead of console.* (TS) / the logging module instead of print() (Python)',
        'console.* is allowed only in logger.service.ts and main.ts; print() only in CLI entrypoints (scripts/, __main__.py)',
      ],
      context
    );
    return this.withDetails(result, details);
  }
}

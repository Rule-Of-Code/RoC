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

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PathOperations } from '../../utils/path-operations';
import { FileUtils } from '../../utils/file-utils';
import { PythonLawBase } from '../python-laws/python-law-base';
import { CodeQualityLawBase } from './code-quality-law-base';

export class CentralizedLoggingLaw extends CodeQualityLawBase {
  private static readonly CONSOLE = /\bconsole\s*\.\s*(log|debug|info|warn|error|trace)\s*\(/g;
  private static readonly ALLOWED = /(?:^|[\\/])(?:logger\.service\.ts|main\.ts)$/;
  // Python branch (arch proposal №12): print() in source is the console.* of
  // the backend. CLI entrypoints and tooling are the legitimate homes.
  private static readonly PY_PRINT = /\bprint\s*\(/g;
  private static readonly PY_ALLOWED =
    /(^|[\\/])(scripts|tools|bin)[\\/]|(^|[\\/])__main__\.py$|(^|[\\/])(cli|manage)\.py$/i;
  private static readonly PY_TEST =
    /(^|[\\/])tests?[\\/]|(^|[\\/])test_[^\\/]*\.py$|_test\.py$|(^|[\\/])conftest\.py$/i;

  /** The JS/TS branch — direct console.* outside the logger service. */
  private static collectConsoleViolations(
    context: LawCheckContext,
    violations: string[]
  ): void {
    const { projectRoot } = context;
    for (const file of this.findTypeScriptFiles(projectRoot, context)) {
      const normalized = file.replace(/\\/g, '/');
      if (this.ALLOWED.test(normalized)) continue;

      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;
      const code = this.stripComments(content);
      const matches = code.match(this.CONSOLE);
      if (matches && matches.length > 0) {
        violations.push(
          `${PathOperations.getRelative(projectRoot, file)}: ${
            matches.length
          } direct console.* call(s) — route logging through the logger service.`
        );
      }
    }
  }

  /** The Python branch — print() outside tests/CLI tooling. */
  private static collectPrintViolations(
    context: LawCheckContext,
    violations: string[]
  ): void {
    const { projectRoot, config } = context;
    for (const file of PythonLawBase.getPythonFiles(projectRoot, config)) {
      const normalized = file.replace(/\\/g, '/');
      if (this.PY_ALLOWED.test(normalized) || this.PY_TEST.test(normalized))
        continue;
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;
      const matches = PythonLawBase.stripPython(content).match(this.PY_PRINT);
      if (matches && matches.length > 0) {
        violations.push(
          `${PathOperations.getRelative(projectRoot, file)}: ${
            matches.length
          } print() call(s) — use the logging module.`
        );
      }
    }
  }

  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    this.collectConsoleViolations(context, violations);
    this.collectPrintViolations(context, violations);

    return this.createResult(
      violations,
      'Centralized Logging',
      'CODE_QUALITY_LAW',
      [
        'Use the gated LoggerService instead of console.* (TS) / the logging module instead of print() (Python)',
        'console.* is allowed only in logger.service.ts and main.ts; print() only in CLI entrypoints (scripts/, __main__.py)',
      ],
      context
    );
  }
}

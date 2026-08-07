/**
 * Timezone-Aware Datetimes
 * Naive datetime.now() / datetime.utcnow() / date.today() in source is the root
 * of a whole class of money bugs in trading systems (daily kill-switch latches,
 * trading-day boundaries, DST drift). Require tz-aware construction
 * (datetime.now(UTC) / ZoneInfo). Tests are excluded — No Wall-Clock In Tests
 * covers them separately. No-AST honesty: aliased imports
 * (`from datetime import datetime as dt`) are only partially covered.
 */

import { minimatch } from 'minimatch';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class TimezoneAwareDatetimesLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Timezone-Aware Datetimes';
  private static readonly NAIVE_PATTERNS: { re: RegExp; what: string }[] = [
    { re: /\bdatetime\.now\(\s*\)/, what: 'datetime.now() without a timezone' },
    { re: /\bdatetime\.utcnow\s*\(/, what: 'datetime.utcnow() (naive, deprecated since 3.12)' },
    { re: /\bdate\.today\s*\(/, what: 'date.today() (naive)' },
  ];

  /** Path is allowlisted via thresholds.python.allowNaiveIn (glob or substring). */
  private static isAllowlisted(rel: string, allowlist: string[]): boolean {
    const norm = rel.replace(/\\/g, '/');
    return allowlist.some(p => minimatch(norm, p) || norm.includes(p));
  }

  private static collectNaiveDatetimes(
    content: string,
    rel: string,
    violations: string[]
  ): void {
    const lines = this.stripPython(content).split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      for (const { re, what } of this.NAIVE_PATTERNS) {
        if (re.test(line)) {
          violations.push(
            `${rel}:${i + 1}: naive ${what} — use timezone-aware datetime.now(UTC) / ZoneInfo`
          );
        }
      }
    }
  }

  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    const allowlist =
      (config.thresholds?.python as { allowNaiveIn?: string[] })
        ?.allowNaiveIn ?? [];
    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, config)) {
      if (this.isTestFile(file)) continue;
      const rel = PathOperations.getRelative(projectRoot, file);
      if (this.isAllowlisted(rel, allowlist)) continue;
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;
      this.collectNaiveDatetimes(content, rel, violations);
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Use datetime.now(timezone.utc) / datetime.now(ZoneInfo("...")) instead of naive now()/utcnow()/today()',
        'Allowlist genuinely-naive spots (e.g. local-only tooling) via thresholds.python.allowNaiveIn',
      ],
      context
    );
  }
}

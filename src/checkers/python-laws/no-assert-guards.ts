/**
 * No Assert Guards In Production
 * `python -O` strips every assert statement — a guard written as an assert
 * silently vanishes in production. For a system whose guards protect money
 * (freshness gates, kill-switches) that is a soundless hole. Guard logic in
 * source must be an explicit raise; asserts belong in tests.
 */

import { minimatch } from 'minimatch';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class NoAssertGuardsLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'No Assert Guards In Production';
  private static readonly ASSERT_STMT = /^\s*assert(\s|$)/;

  /** Path is allowlisted via thresholds.python.allowAssertIn (glob or substring). */
  private static isAllowlisted(rel: string, allowlist: string[]): boolean {
    const norm = rel.replace(/\\/g, '/');
    return allowlist.some(p => minimatch(norm, p) || norm.includes(p));
  }

  private static collectAssertGuards(
    content: string,
    rel: string,
    violations: string[]
  ): void {
    const lines = this.stripPython(content).split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (this.ASSERT_STMT.test(lines[i] ?? '')) {
        violations.push(
          `${rel}:${i + 1}: assert used as a production guard — python -O strips it; raise an explicit exception instead`
        );
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
      (config.thresholds?.python as { allowAssertIn?: string[] })
        ?.allowAssertIn ?? [];
    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, config)) {
      if (this.isTestFile(file)) continue;
      const rel = PathOperations.getRelative(projectRoot, file);
      if (this.isAllowlisted(rel, allowlist)) continue;
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;
      this.collectAssertGuards(content, rel, violations);
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Replace guard asserts with explicit `if not cond: raise …` (survives python -O)',
        'Type-narrowing asserts: allowlist the path via thresholds.python.allowAssertIn, or convert to explicit raises',
      ],
      context
    );
  }
}

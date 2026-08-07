/**
 * Strict Expected Failures
 * A non-strict pytest xfail passes silently FOREVER — it dies as documentation,
 * not as a test (forward-golden mechanisms only work with strict=True). And an
 * xfail/skip/skipif without a reason= is an unaccountable hole in the suite.
 * Scans test files only.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class StrictExpectedFailuresLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Strict Expected Failures';
  private static readonly MARKER = /\bmark\.(xfail|skip|skipif)\b/g;

  /** The marker's argument text: balanced parens after the marker, or ''. */
  private static markerArgs(content: string, afterMarker: number): string {
    let i = afterMarker;
    while (i < content.length && /\s/.test(content[i] ?? '')) i++;
    if (content[i] !== '(') return '';
    return this.readBalancedParens(content, i) ?? '';
  }

  /**
   * A project-level `xfail_strict = true` (pyproject/pytest.ini/setup.cfg/tox.ini)
   * makes every xfail strict — so a per-marker strict=True is no longer required.
   * Ignoring this globally-set option was a false failure.
   */
  private static projectXfailStrict(projectRoot: string): boolean {
    const config =
      (this.readProjectFile(projectRoot, 'pyproject.toml') ?? '') +
      (this.readProjectFile(projectRoot, 'pytest.ini') ?? '') +
      (this.readProjectFile(projectRoot, 'setup.cfg') ?? '') +
      (this.readProjectFile(projectRoot, 'tox.ini') ?? '');
    return /xfail_strict\s*=\s*true/i.test(config);
  }

  private static collectLaxMarkers(
    content: string,
    rel: string,
    violations: string[],
    xfailStrictGlobal: boolean
  ): void {
    const stripped = this.stripPython(content);
    this.MARKER.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = this.MARKER.exec(stripped)) !== null) {
      const kind = m[1] ?? '';
      const line = stripped.slice(0, m.index).split('\n').length;
      const args = this.markerArgs(stripped, m.index + m[0].length);

      if (
        kind === 'xfail' &&
        !xfailStrictGlobal &&
        !/\bstrict\s*=\s*True\b/.test(args)
      ) {
        violations.push(
          `${rel}:${line}: mark.xfail without strict=True — a non-strict xfail passes silently forever`
        );
      }
      if (!/\breason\s*=/.test(args)) {
        violations.push(
          `${rel}:${line}: mark.${kind} without reason= — every expected failure/skip needs an accountable reason`
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

    const violations: string[] = [];
    const xfailStrictGlobal = this.projectXfailStrict(projectRoot);

    for (const file of this.getPythonFiles(projectRoot, config)) {
      if (!this.isTestFile(file)) continue;
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;
      this.collectLaxMarkers(
        content,
        PathOperations.getRelative(projectRoot, file),
        violations,
        xfailStrictGlobal
      );
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'xfail: add strict=True so the test fails loudly when it unexpectedly passes',
        'xfail/skip/skipif: add reason="..." so the hole in the suite is accountable',
      ],
      context
    );
  }
}

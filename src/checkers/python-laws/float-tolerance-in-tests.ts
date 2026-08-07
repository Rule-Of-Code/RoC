/**
 * Float Equality Tolerance In Tests
 * Bare `assert x == 1.23` on floats is a flakiness trap — parity tolerances
 * are explicit by design (0 for deterministic paths, epsilon otherwise).
 * Conservative detection (float literals only, approx/isclose exempt);
 * advisory severity (info), like Public Docstrings.
 *
 * `thresholds.python.exactEqualityIn` declares the modules where exact float
 * equality is CORRECT, not sloppy: money quantised by construction
 * (`pnl_usd = round(x, 2)`) has an exact invariant, and pytest.approx there
 * would hide a one-cent regression. Declare the money modules — do not
 * silence the law globally.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class FloatToleranceInTestsLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Float Equality Tolerance In Tests';
  private static readonly BARE_FLOAT_EQ = /^\s*assert\s+[^=<>!]*==\s*-?\d+\.\d/;
  private static readonly TOLERANT = /\bapprox\s*\(|\bisclose\s*\(/;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    const exactOk =
      (config.thresholds?.python as { exactEqualityIn?: string[] })
        ?.exactEqualityIn ?? [];
    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, config)) {
      if (!this.isTestFile(file)) continue;
      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      const rel = PathOperations.getRelative(projectRoot, file);
      // Exactness is the invariant here (quantised money), not an oversight.
      if (this.pathMatchesAllowlist(rel, exactOk)) continue;
      const lines = this.stripPython(raw).split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (this.BARE_FLOAT_EQ.test(line) && !this.TOLERANT.test(line)) {
          violations.push(
            `${rel}:${i + 1}: bare float equality in a test — use pytest.approx or an explicit tolerance`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Use pytest.approx(expected, abs=…/rel=…) or math.isclose with an explicit tolerance',
        'Make the tolerance a deliberate number, not an accident of representation',
      ],
      context
    );
  }
}

/**
 * Security Scanner Configured
 * Exact symmetry with Ruff Configured (220) and Type Checker Configured (221),
 * but for security SAST: a Python gate without bandit (or equivalent) has no
 * static security lane.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { PythonLawBase } from './python-law-base';

export class BanditConfiguredLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Security Scanner Configured';

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    // Reuse the shared SAST recognition instead of a narrower local check: it
    // also accepts semgrep, ruff's flake8-bandit rules (select = ["S"]), a
    // bandit.yaml, and both pre-commit spellings — all of which this law used to
    // false-fail while PythonSatisfaction (and the general security laws)
    // accepted them, an inconsistency a Python consumer would rightly report.
    const configured = PythonSatisfaction.hasPythonSast(projectRoot);

    const violations = configured
      ? []
      : [
          'No security SAST configured (bandit or equivalent) — add [tool.bandit] to pyproject.toml or a bandit pre-commit hook',
        ];

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Add [tool.bandit] to pyproject.toml (or a .bandit file)',
        'Run bandit in pre-commit/CI alongside ruff and the type checker',
      ],
      context
    );
  }
}

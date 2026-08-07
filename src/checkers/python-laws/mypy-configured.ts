/**
 * Static Type Checker Configured
 * Type hints only pay off if a checker enforces them in CI. A FastAPI + Clean
 * Architecture codebase leans on types for its contracts (Pydantic, ports), so a
 * mypy/pyright configuration is the backend counterpart of TypeScript's strict
 * compiler. Pairs with the typing laws (no Any-by-default, typed DTOs).
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PythonLawBase } from './python-law-base';

export class MypyConfiguredLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Type Checker Configured';

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    const pyproject = this.readProjectFile(projectRoot, 'pyproject.toml') ?? '';
    const setupCfg = this.readProjectFile(projectRoot, 'setup.cfg') ?? '';
    const toxIni = this.readProjectFile(projectRoot, 'tox.ini') ?? '';
    // A type checker configured in tox.ini or ONLY as a pre-commit hook counts —
    // this law read neither and false-failed it.
    const preCommit =
      (this.readProjectFile(projectRoot, '.pre-commit-config.yaml') ?? '') +
      (this.readProjectFile(projectRoot, '.pre-commit-config.yml') ?? '');
    const configured =
      this.projectFileExists(projectRoot, 'mypy.ini') ||
      this.projectFileExists(projectRoot, '.mypy.ini') ||
      this.projectFileExists(projectRoot, 'pyrightconfig.json') ||
      /\[tool\.mypy/.test(pyproject) ||
      /\[tool\.pyright/.test(pyproject) ||
      /\[mypy\]/.test(setupCfg) ||
      /\[mypy\]/.test(toxIni) ||
      /\b(mypy|pyright)\b/.test(preCommit);

    const violations = configured
      ? []
      : [
          'No static type checker configured (mypy/pyright) — add [tool.mypy] to pyproject.toml so type hints are enforced in CI',
        ];

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Add a [tool.mypy] section to pyproject.toml (or mypy.ini / pyrightconfig.json)',
        'Run mypy/pyright in CI; aim for strict on new code',
      ],
      context
    );
  }
}

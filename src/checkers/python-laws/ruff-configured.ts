/**
 * Ruff Configured
 * A Python project should pin its linting rules in config so every contributor
 * and CI run enforces the same standard (the lint equivalent of an ESLint config
 * for the frontend). Ruff is the project default; an existing flake8/pylint
 * config also satisfies the law.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PythonLawBase } from './python-law-base';

export class RuffConfiguredLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Ruff Configured';

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
    // A linter wired ONLY as a pre-commit hook is still configured — this law
    // used to false-fail it because it read config files but not the gate.
    const preCommit =
      (this.readProjectFile(projectRoot, '.pre-commit-config.yaml') ?? '') +
      (this.readProjectFile(projectRoot, '.pre-commit-config.yml') ?? '');
    const configured =
      this.projectFileExists(projectRoot, 'ruff.toml') ||
      this.projectFileExists(projectRoot, '.ruff.toml') ||
      this.projectFileExists(projectRoot, '.flake8') ||
      this.projectFileExists(projectRoot, '.pylintrc') ||
      /\[tool\.ruff/.test(pyproject) ||
      /\[tool\.pylint/.test(pyproject) ||
      /\[flake8\]/.test(setupCfg) ||
      /\[flake8\]/.test(toxIni) ||
      /\b(ruff|flake8|pylint)\b/.test(preCommit);

    const violations = configured
      ? []
      : [
          'No linter configuration found (ruff/flake8/pylint) — add [tool.ruff] to pyproject.toml or a ruff.toml so lint rules are enforced consistently',
        ];

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Add a [tool.ruff] section to pyproject.toml (or a ruff.toml)',
        'Run ruff in pre-commit and CI so every change is linted',
      ],
      context
    );
  }
}

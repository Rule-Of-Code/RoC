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

    const configured = this.isLinterConfigured(projectRoot);

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

  /** Config files whose presence alone configures a linter. */
  private static readonly LINTER_FILES = [
    'ruff.toml',
    '.ruff.toml',
    '.flake8',
    '.pylintrc',
  ] as const;

  /**
   * A file and the section in it that configures a linter. A linter wired
   * ONLY as a pre-commit hook is still configured — this law used to
   * false-fail it because it read config files but not the gate.
   */
  private static readonly LINTER_SECTIONS: ReadonlyArray<
    readonly [file: string, section: RegExp]
  > = [
    ['pyproject.toml', /\[tool\.ruff/],
    ['pyproject.toml', /\[tool\.pylint/],
    ['setup.cfg', /\[flake8\]/],
    ['tox.ini', /\[flake8\]/],
    ['.pre-commit-config.yaml', /\b(ruff|flake8|pylint)\b/],
    ['.pre-commit-config.yml', /\b(ruff|flake8|pylint)\b/],
  ];

  /** Whether ruff, flake8 or pylint is configured by a file or a section. */
  private static isLinterConfigured(projectRoot: string): boolean {
    return (
      this.LINTER_FILES.some(file =>
        this.projectFileExists(projectRoot, file)
      ) ||
      this.LINTER_SECTIONS.some(([file, section]) =>
        section.test(this.readProjectFile(projectRoot, file) ?? '')
      )
    );
  }
}

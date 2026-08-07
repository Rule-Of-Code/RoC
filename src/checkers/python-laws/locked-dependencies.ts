/**
 * Locked Dependencies
 * Reproducible installs need a lockfile (uv.lock / poetry.lock / Pipfile.lock /
 * pdm.lock) or a fully pinned requirements file. Without one, two installs of the
 * "same" project can resolve different transitive versions — the cause of
 * works-on-my-machine drift. Only flagged when the project actually declares
 * runtime dependencies.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PythonLawBase } from './python-law-base';

export class LockedDependenciesLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Locked Dependencies';
  private static readonly LOCKFILES = [
    'uv.lock',
    'poetry.lock',
    'Pipfile.lock',
    'pdm.lock',
  ];

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    if (this.LOCKFILES.some(f => this.projectFileExists(projectRoot, f))) {
      return this.createResult([], this.LAW_NAME, 'PYTHON_LAW', [], context);
    }

    const requirements = this.readProjectFile(projectRoot, 'requirements.txt');
    if (requirements !== null && this.isFullyPinned(requirements)) {
      return this.createResult([], this.LAW_NAME, 'PYTHON_LAW', [], context);
    }

    const pyproject = this.readProjectFile(projectRoot, 'pyproject.toml') ?? '';
    const declaresDeps =
      /dependencies\s*=\s*\[[^\]]*[^\s\]]/.test(pyproject) || // non-empty [project].dependencies
      /\[tool\.poetry\.dependencies\]/.test(pyproject) ||
      requirements !== null;

    const violations = declaresDeps
      ? [
          'Dependencies are declared but not locked — commit a lockfile (uv.lock / poetry.lock) or fully pin requirements.txt for reproducible installs',
        ]
      : [];

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Generate and commit a lockfile (uv lock / poetry lock / pip-compile)',
        'Or pin every dependency with == in requirements.txt',
      ],
      context
    );
  }

  /** Every non-comment, non-blank requirement line pins an exact version (==). */
  private static isFullyPinned(requirements: string): boolean {
    const deps = requirements
      .split('\n')
      .map(l => l.trim())
      .filter(l => l !== '' && !l.startsWith('#') && !l.startsWith('-'));
    return deps.length > 0 && deps.every(l => l.includes('=='));
  }
}

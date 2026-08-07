/**
 * Pyproject Metadata (PEP 621)
 * A modern Python project declares its metadata in pyproject.toml: a project name
 * and the supported Python version (requires-python). This is the build/runtime
 * contract — the backend equivalent of a well-formed package.json. Poetry's
 * [tool.poetry] table (name + python constraint) also satisfies the law.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PythonLawBase } from './python-law-base';

export class PyprojectMetadataLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Pyproject Metadata';

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    const pyproject = this.readProjectFile(projectRoot, 'pyproject.toml');
    const violations =
      pyproject === null
        ? [
            'No pyproject.toml — adopt PEP 621 packaging with a [project] table (name, version, requires-python)',
          ]
        : this.validateMetadata(pyproject);

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Add a [project] table with name, version and requires-python (PEP 621)',
        'Example: requires-python = ">=3.12"',
      ],
      context
    );
  }

  /**
   * Validate name + requires-python, each SCOPED to the table that should own it.
   * Whole-file regexes let a `name=` under, say, [tool.ruff] satisfy the check
   * while [project] itself declared neither — a cross-table false pass.
   */
  private static validateMetadata(pyproject: string): string[] {
    const hasProject = /\[project\]/.test(pyproject);
    const hasPoetry = /\[tool\.poetry\]/.test(pyproject);
    if (!hasProject && !hasPoetry) {
      return [
        'pyproject.toml has no [project] table — declare PEP 621 metadata (name, version, requires-python)',
      ];
    }

    const meta = hasProject
      ? this.tomlSection(pyproject, 'project')
      : this.tomlSection(pyproject, 'tool.poetry');
    const pythonScope = hasProject
      ? meta
      : meta + this.tomlSection(pyproject, 'tool.poetry.dependencies');

    const violations: string[] = [];
    if (!/\bname\s*=\s*["']/.test(meta)) {
      violations.push('pyproject.toml declares no project name');
    }
    const hasRequiresPython =
      /requires-python\s*=/.test(pythonScope) ||
      /^\s*python\s*=\s*["']/m.test(pythonScope); // poetry python constraint
    if (!hasRequiresPython) {
      violations.push(
        'pyproject.toml declares no requires-python — pin the supported Python version'
      );
    }
    return violations;
  }

  /**
   * The body of a TOML table (`[header]` until the next top-level `[...]` header),
   * so a key is checked in the table that should own it, not anywhere in the file.
   */
  private static tomlSection(content: string, header: string): string {
    const lines = content.split(/\r?\n/);
    const open = `[${header}]`;
    const out: string[] = [];
    let inSection = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^\[[^\]]+\]\s*$/.test(trimmed)) {
        inSection = trimmed === open;
        continue;
      }
      if (inSection) out.push(line);
    }
    return out.join('\n');
  }
}

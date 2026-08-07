/**
 * Dependency Audit Configured (Python)
 * The universal Dependency Security Scanning law is JS-oriented (SPDX/npm-audit
 * artifacts) — Python consumers running pip-audit were forced to waive it. The
 * Python-native variant closes that gap: pip-audit/safety must be present in
 * the gate configuration.
 */

import { glob } from 'glob';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PythonLawBase } from './python-law-base';

export class PipAuditConfiguredLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Dependency Audit Configured';
  private static readonly TOOL = /\b(pip-audit|pip_audit|safety)\b/;
  private static readonly GATE_FILES = [
    '.pre-commit-config.yaml',
    'pyproject.toml',
    'bitbucket-pipelines.yml',
    'Makefile',
    'noxfile.py',
    'tox.ini',
  ];

  private static gateMentionsTool(projectRoot: string): boolean {
    for (const rel of this.GATE_FILES) {
      const content = this.readProjectFile(projectRoot, rel);
      if (content && this.TOOL.test(content)) return true;
    }
    const workflows = glob.sync('.github/workflows/*.{yml,yaml}', {
      cwd: projectRoot,
      absolute: true,
    });
    return workflows.some(f => {
      const content = FileUtils.readFileContentSync(f);
      return !!content && this.TOOL.test(content);
    });
  }

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    const violations = this.gateMentionsTool(projectRoot)
      ? []
      : [
          'No Python dependency audit in the gate (pip-audit/safety) — known-vulnerable dependencies ship silently',
        ];

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Add pip-audit (or safety) to pre-commit/CI/Makefile',
        'Run it against the locked dependency set, not just top-level requirements',
      ],
      context
    );
  }
}

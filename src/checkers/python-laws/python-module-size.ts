/**
 * Module Size (Python)
 * A .py file that grows past a few hundred lines is doing too much — it is hard
 * to read, review and test, and usually hides several responsibilities that
 * belong in separate modules. This is the Python counterpart of the TypeScript
 * "File too long" check (which only scans .ts/.js), so Python backends get the
 * same guard. Test files get their own (optionally higher) limit but are not
 * exempt by default.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class PythonModuleSizeLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Module Size';
  private static readonly DEFAULT_MAX = 300;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    const py = config.thresholds?.python;
    const maxLines = py?.maxFileLines ?? this.DEFAULT_MAX;
    const maxTestLines = py?.maxTestFileLines ?? maxLines;

    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, config)) {
      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      // CRLF-tolerant line count; ignore a single trailing newline.
      let lines = this.splitLines(raw);
      if (lines.length > 0 && lines[lines.length - 1] === '') lines = lines.slice(0, -1);
      const count = lines.length;
      const isTest = this.isTestFile(file);
      const limit = isTest ? maxTestLines : maxLines;
      if (count > limit) {
        violations.push(
          `${PathOperations.getRelative(projectRoot, file)} is ${count} lines (max ${limit}${isTest ? ', test file' : ''}) — split it into focused modules`
        );
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Split large modules by responsibility (one clear concern per file)',
        'Tune thresholds.python.maxFileLines / maxTestFileLines if a higher limit is justified',
      ],
      context
    );
  }
}

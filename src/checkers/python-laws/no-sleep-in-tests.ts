/**
 * No Sleep In Tests
 * A real sleep in a test trades correctness for luck: it makes the suite slow and
 * flaky (too short → races, too long → wasted time). Wait on the actual condition
 * (poll/await an event), or freeze/inject the clock instead of sleeping.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class NoSleepInTestsLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'No Sleep In Tests';
  private static readonly SLEEP = /\b(time\.sleep|asyncio\.sleep)\s*\(/;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, context.config)) {
      if (!this.isTestFile(file)) continue;
      const raw = FileUtils.readFileContentSync(file);
      if (!raw || !raw.includes('sleep')) continue;
      const lines = this.stripPython(raw).split('\n');
      const rel = PathOperations.getRelative(projectRoot, file);

      for (let i = 0; i < lines.length; i++) {
        const m = (lines[i] ?? '').match(this.SLEEP);
        if (m) {
          violations.push(
            `${rel}:${i + 1}: ${m[1]}() in a test — wait on the actual condition or control the clock instead of sleeping (avoids flaky, slow tests)`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Poll/await the real condition (e.g. wait_for) instead of a fixed sleep',
        'Freeze or inject the clock (freezegun / a Clock dependency) for time-based logic',
      ],
      context
    );
  }
}

/**
 * No Wall-Clock In Tests
 * datetime.now()/time.time() in tests without time freezing makes them
 * non-deterministic (symmetry with No Sleep In Tests, 214). Files that freeze
 * time (freezegun/freeze_time) are exempt. Advisory rollout (info).
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class NoWallClockInTestsLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'No Wall-Clock In Tests';
  private static readonly WALL_CLOCK =
    /\bdatetime\.now\s*\(|\bdatetime\.utcnow\s*\(|\btime\.time\s*\(/;
  private static readonly FROZEN = /\bfreezegun\b|\bfreeze_time\b/;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, config)) {
      if (!this.isTestFile(file)) continue;
      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      const content = this.stripPython(raw);
      if (this.FROZEN.test(content)) continue;
      const rel = PathOperations.getRelative(projectRoot, file);
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (this.WALL_CLOCK.test(lines[i] ?? '')) {
          violations.push(
            `${rel}:${i + 1}: test reads the wall clock without freezing time — non-deterministic test`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Freeze time (freezegun.freeze_time) or pass an explicit fixed `now`',
        'Deterministic tests are the precondition for golden/parity gates',
      ],
      context
    );
  }
}

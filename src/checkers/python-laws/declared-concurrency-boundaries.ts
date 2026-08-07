/**
 * Declared Concurrency Boundaries
 * Races die structurally (single-writer engines), not with scattered locks. A
 * new thread/lock/process/task outside the declared concurrency modules is an
 * architectural event that deserves review, not a silent merge — this law
 * makes the concurrency perimeter explicit, the way the Clean-Arch laws make
 * layers explicit.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class DeclaredConcurrencyBoundariesLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Declared Concurrency Boundaries';
  private static readonly CONCURRENCY =
    /\bthreading\.(Thread|Timer|Lock|RLock|Semaphore|BoundedSemaphore|Event|Condition|Barrier)\b|\bmultiprocessing\.\w|\bconcurrent\.futures\b|\basyncio\.create_task\s*\(/;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    const boundary =
      (config.thresholds?.python as { concurrencyBoundary?: string[] })
        ?.concurrencyBoundary ?? [];
    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, config)) {
      if (this.isTestFile(file)) continue;
      const rel = PathOperations.getRelative(projectRoot, file);
      if (this.pathMatchesAllowlist(rel, boundary)) continue;
      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      const lines = this.stripPython(raw).split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (this.CONCURRENCY.test(lines[i] ?? '')) {
          violations.push(
            `${rel}:${i + 1}: concurrency primitive outside the declared boundary — declare the module in thresholds.python.concurrencyBoundary or move the concern there`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Keep threads/locks/tasks in the declared concurrency modules (single-writer style)',
        'Declare genuine concurrency homes in thresholds.python.concurrencyBoundary',
      ],
      context
    );
  }
}

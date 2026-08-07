/**
 * ROC-FE-09 — setInterval/requestAnimationFrame in a class must be cleaned up
 * Guards against leaked timers / RAF loops. A `setInterval`/`requestAnimationFrame`
 * in a component/service/directive/store needs a matching `clearInterval`/
 * `cancelAnimationFrame`, or cleanup tied to `DestroyRef`/`takeUntilDestroyed`.
 * (RAF loop termination is not fully statically checkable, so this only requires
 * the cleanup mechanism to be present.)
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { FeArchLawBase } from './fe-arch-law-base';

export class TimerCleanupLaw extends FeArchLawBase {
  private static readonly LAW_NAME = 'Timer Cleanup';
  private static readonly CLEANUP =
    /\bclearInterval\b|\bcancelAnimationFrame\b|\bDestroyRef\b|\btakeUntilDestroyed\b/;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const early = this.createAngularRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasAngularProject(root),
      context
    );
    if (early) return early;

    const violations: string[] = [];

    for (const file of CheckerUtils.findTypeScriptFiles(projectRoot, config)) {
      if (!/\.(component|service|directive|store)\.ts$/.test(file.replace(/\\/g, '/'))) {
        continue;
      }
      const content = FileUtils.readFile(file);
      if (!content) continue;
      const rel = PathOperations.getRelative(projectRoot, file);
      const hasCleanup = this.CLEANUP.test(content);

      if (/\bsetInterval\s*\(/.test(content) && !hasCleanup) {
        violations.push(
          `${rel}: setInterval without a clearInterval / DestroyRef cleanup — leaked timer`
        );
      }
      if (
        /\brequestAnimationFrame\s*\(/.test(content) &&
        !/\bcancelAnimationFrame\b|\bDestroyRef\b|\btakeUntilDestroyed\b/.test(content)
      ) {
        violations.push(
          `${rel}: requestAnimationFrame without a cancelAnimationFrame / DestroyRef cleanup — leaked RAF loop`
        );
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'ANGULAR_LAW',
      [
        'Pair setInterval/RAF with clearInterval/cancelAnimationFrame',
        'Tie cleanup to DestroyRef (inject(DestroyRef).onDestroy) or takeUntilDestroyed',
      ],
      context
    );
  }
}

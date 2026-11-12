/**
 * ROC-FE-09 — setInterval/requestAnimationFrame in a class must be cleaned up
 * Guards against leaked timers / RAF loops. A `setInterval`/`requestAnimationFrame`
 * in a component/service/directive/store needs a matching `clearInterval`/
 * `cancelAnimationFrame`, or cleanup tied to `DestroyRef`/`takeUntilDestroyed`.
 * (RAF loop termination is not fully statically checkable, so this only requires
 * the cleanup mechanism to be present.)
 *
 * An Angular law: the file kinds and the DestroyRef credit are Angular's. It is
 * selected by the card's `requires` (@angular/core in any workspace manifest),
 * not by a gate in here, which read the root manifest only. React effects are
 * judged per effect by a law of their own (react-effect-resource-cleanup),
 * where this law's file-level clearInterval credit would be far too loose.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { FeArchLawBase } from './fe-arch-law-base';
import { AngularComponentFiles } from '../../utils/angular-component-files';

export class TimerCleanupLaw extends FeArchLawBase {
  private static readonly LAW_NAME = 'Timer Cleanup';
  private static readonly CLEANUP =
    /\bclearInterval\b|\bcancelAnimationFrame\b|\bDestroyRef\b|\btakeUntilDestroyed\b/;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const violations: string[] = [];

    for (const file of CheckerUtils.findTypeScriptFiles(projectRoot, config, context.lawId)) {
      // A store file has no decorator (signal stores, NgRx) — its suffix stays;
      // components, services and directives also by decorator (#336).
      const isStore = /\.store\.ts$/.test(file.replace(/\\/g, '/'));
      if (!isStore && !AngularComponentFiles.isKind(file, ['component', 'service', 'directive'])) {
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
      'FE_ARCHITECTURE',
      [
        'Pair setInterval/RAF with clearInterval/cancelAnimationFrame',
        'Tie cleanup to DestroyRef (inject(DestroyRef).onDestroy) or takeUntilDestroyed',
      ],
      context
    );
  }
}

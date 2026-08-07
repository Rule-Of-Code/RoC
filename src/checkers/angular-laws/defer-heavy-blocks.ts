/**
 * Defer Heavy Blocks Law (advisory)
 * A large dashboard/route template that renders everything eagerly hurts initial
 * render. Heavy/below-fold blocks should use Angular's `@defer`. Conservative
 * advisory: flags a large `*-dashboard.component.html` (over a configurable line
 * threshold) that contains no `@defer` at all.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { AngularLawBase } from './angular-law-base';

export class DeferHeavyBlocksLaw extends AngularLawBase {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];
    const minLines =
      context.config.thresholds?.angular?.deferHeavyBlocksMinLines ?? 250;

    const templates = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['html'],
      context.config
    ).filter(f => /-dashboard\.component\.html$/i.test(f.replace(/\\/g, '/')));

    for (const file of templates) {
      const html = FileUtils.readFile(file);
      const lines = html.split('\n').length;
      if (lines > minLines && !/@defer\b/.test(html)) {
        violations.push(
          `${PathOperations.getRelative(projectRoot, file)}: large dashboard template (${lines} lines) with no @defer — defer heavy/below-fold blocks (charts, modals, backtests) with @defer (on viewport).`
        );
      }
    }

    return this.createResult(
      violations,
      'Defer Heavy Blocks',
      'ANGULAR_LAW',
      [
        'Wrap heavy/below-fold blocks in @defer (on viewport)',
        'Tune the threshold via thresholds.angular.deferHeavyBlocksMinLines',
      ],
      context
    );
  }
}

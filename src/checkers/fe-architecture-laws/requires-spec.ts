/**
 * ROC-FE-04 — Money-adjacent write services + large components must have a spec
 * Untested code that dispatches real-money actions is an unacceptable risk. A
 * `*actions*.service.ts`, any file that writes an `X-Control-Pass` header, or a
 * component/service over the LOC threshold must have a co-located `*.spec.ts`.
 */

import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FeArchLawBase } from './fe-arch-law-base';

export class RequiresSpecLaw extends FeArchLawBase {
  private static readonly LAW_NAME = 'Requires Spec';
  private static readonly DEFAULT_LOC = 200;

  /** The violation for one candidate file, or null if no spec is required / one exists. */
  private static checkFile(
    file: string,
    projectRoot: string,
    maxLoc: number
  ): string | null {
    const norm = file.replace(/\\/g, '/');
    if (!/\.(service|component)\.ts$/.test(norm)) return null;
    if (norm.endsWith('.spec.ts')) return null;
    if (!this.isFeatureOrDataAccess(norm)) return null;

    const content = FileUtils.readFile(file) ?? '';
    const moneyAdjacent =
      /actions[^/]*\.service\.ts$/.test(norm) || /X-Control-Pass/.test(content);
    const loc = content.split(/\r\n|\r|\n/).length;
    const reason = moneyAdjacent
      ? 'money-adjacent write service'
      : loc > maxLoc
        ? `${loc} LOC (> ${maxLoc})`
        : '';
    if (!reason) return null;

    const specPath = file.replace(/\.ts$/, '.spec.ts');
    if (!FileUtils.exists(specPath)) {
      return `${PathOperations.getRelative(projectRoot, file)}: ${reason} but has no co-located *.spec.ts — add a spec`;
    }
    return null;
  }

  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const early = this.createAngularRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasAngularProject(root),
      context
    );
    if (early) return early;

    const maxLoc =
      (config.thresholds?.angular as { specRequiredMinLoc?: number })
        ?.specRequiredMinLoc ?? this.DEFAULT_LOC;
    const violations: string[] = [];

    for (const file of CheckerUtils.findTypeScriptFiles(projectRoot, config)) {
      const violation = this.checkFile(file, projectRoot, maxLoc);
      if (violation) violations.push(violation);
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'ANGULAR_LAW',
      [
        'Add a co-located *.spec.ts (mandatory for money-adjacent write services)',
        'Split large components/services, or cover them with a spec',
      ],
      context
    );
  }
}

/**
 * ROC-FE-04 — Money-adjacent write services + large components must have a spec
 * Untested code that dispatches real-money actions is an unacceptable risk. In
 * the feature or data-access layer, a `*actions*.service.ts`, any file that
 * writes an `X-Control-Pass` header, or a component over the LOC threshold must
 * have a co-located test.
 *
 * A component is an Angular `*.component.ts` / `*.service.ts`, or a React
 * `.tsx` / `.jsx` module. The co-located test is the sibling with the same base
 * name and a `.spec` or `.test` infix, in any of the TS/JS spellings — so
 * `Basket.tsx` is covered by `Basket.test.tsx`, and `a.component.ts` by
 * `a.component.spec.ts`.
 */

import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FeArchLawBase } from './fe-arch-law-base';

/** The files a spec is required for (when money-adjacent or large). */
const CANDIDATE = /\.(?:service|component)\.ts$|\.[jt]sx$/;
/** The sibling test spellings that count as co-located. */
const TEST_SUFFIXES = ['spec', 'test'].flatMap(infix =>
  ['.ts', '.tsx', '.js', '.jsx'].map(ext => `.${infix}${ext}`)
);

export class RequiresSpecLaw extends FeArchLawBase {
  private static readonly LAW_NAME = 'Requires Spec';
  private static readonly DEFAULT_LOC = 200;

  /** The violation for one candidate file, or null if no spec is required / one exists. */
  private static checkFile(file: string, projectRoot: string, maxLoc: number): string | null {
    const norm = file.replace(/\\/g, '/');
    if (!CANDIDATE.test(norm)) return null;

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

    const base = file.replace(/\.[jt]sx?$/, '');
    if (TEST_SUFFIXES.some(suffix => FileUtils.exists(base + suffix))) return null;
    return `${PathOperations.getRelative(projectRoot, file)}: ${reason} but has no co-located *.spec.* / *.test.* — add one`;
  }

  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const maxLoc =
      (config.thresholds?.angular as { specRequiredMinLoc?: number })
        ?.specRequiredMinLoc ?? this.DEFAULT_LOC;

    const layered = this.sourceFiles(context).filter(file =>
      this.inFeatureOrDataAccess(context, file)
    );
    const violations: string[] =
      layered.length === 0 ? [this.emptyLayer(context, ['feature', 'dataAccess'])] : [];
    for (const file of layered) {
      const violation = this.checkFile(file, projectRoot, maxLoc);
      if (violation) violations.push(violation);
    }

    return this.layerResult(
      this.createResult(
        violations,
        this.LAW_NAME,
        'FE_ARCHITECTURE',
        [
          'Add a co-located test (*.spec.ts / *.test.tsx) — mandatory for money-adjacent write services',
          'Split large components/services, or cover them with a test',
        ],
        context
      ),
      layered.length === 0
    );
  }
}

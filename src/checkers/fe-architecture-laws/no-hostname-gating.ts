/**
 * ROC-FE-10 — No dev/demo gating via `location.hostname`
 * Demo/dev code gated on the hostname still ships in the production bundle. Put
 * dev-only harness behind an `environment.*` flag (or a `*.dev.ts` that is
 * tree-shaken). Reading the hostname is fine; comparing it to gate behaviour is
 * the smell, so only hostname comparisons are flagged.
 */

import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FeArchLawBase } from './fe-arch-law-base';

export class NoHostnameGatingLaw extends FeArchLawBase {
  private static readonly LAW_NAME = 'No Hostname Gating';
  private static readonly HOSTNAME_COMPARE =
    /\blocation\.hostname\s*(?:===|!==|==|!=)|(?:===|!==|==|!=)\s*location\.hostname|\blocation\.hostname\s*\.\s*(?:includes|startsWith|endsWith|match|indexOf|test)\s*\(/;

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
      const content = FileUtils.readFile(file);
      if (!content || !content.includes('location.hostname')) continue;
      const rel = PathOperations.getRelative(projectRoot, file);
      const lines = content.split(/\r\n|\r|\n/);
      for (let i = 0; i < lines.length; i++) {
        if (this.HOSTNAME_COMPARE.test(lines[i] ?? '')) {
          violations.push(
            `${rel}:${i + 1}: feature gating via location.hostname — put dev/demo code behind an environment flag or a tree-shaken *.dev.ts`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'ANGULAR_LAW',
      [
        'Gate dev/demo code with environment.* flags, not location.hostname',
        'Move dev-only harness into a *.dev.ts that is tree-shaken from prod',
      ],
      context
    );
  }
}

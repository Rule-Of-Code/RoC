/**
 * ROC-FE-01 — HTTP polling only through the sanctioned tick source
 * Ad-hoc `interval()`/`timer()` driving an HTTP poll bypasses the shared
 * visibility-gated tick source (PageVisibilityService.pollTicks), so it drains in
 * the background and re-implements cadence/cancel/staleness. A raw rxjs source
 * that feeds a mapping operator + an HttpClient call must instead be driven by
 * `pollTicks(...)`. Local ticks WITHOUT an HTTP call (e.g. a countdown) are fine —
 * the law fires only when the pipe also contains an HTTP call.
 */

import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FeArchLawBase } from './fe-arch-law-base';

export class PollViaSanctionedSourceLaw extends FeArchLawBase {
  private static readonly LAW_NAME = 'Poll Via Sanctioned Source';
  private static readonly RAW_SOURCE = /\b(interval|timer)\s*\(/g;
  private static readonly MAPPING = /\b(switchMap|mergeMap|exhaustMap|concatMap)\s*\(/;
  private static readonly HTTP = /\.(get|post|put|delete|patch|request)\s*\(|\bhttp\./;
  // Files that legitimately define the sanctioned tick source.
  private static readonly HELPER_FILE = /(page-visibility|poll-signal|poll-ticks)/i;

  /** Raw interval()/timer() calls in one file that directly drive an HTTP poll. */
  private static collectRawPollViolations(content: string, rel: string): string[] {
    const violations: string[] = [];
    this.RAW_SOURCE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = this.RAW_SOURCE.exec(content)) !== null) {
      const open = m.index + m[0].length - 1; // the '(' of interval(/timer(
      const args = this.readParens(content, open);
      if (args === null) continue;
      const afterSource = open + args.length + 2; // index past the ')'
      const pipeIdx = content.indexOf('.pipe(', afterSource);
      if (pipeIdx < 0 || pipeIdx > afterSource + 10) continue; // must chain directly
      const pipe = this.readParens(content, pipeIdx + '.pipe'.length);
      if (pipe === null) continue;
      if (this.MAPPING.test(pipe) && this.HTTP.test(pipe)) {
        const line = content.slice(0, m.index).split('\n').length;
        violations.push(
          `${rel}:${line}: raw ${m[1]}() drives an HTTP poll — use the sanctioned visibility-gated tick source (pollTicks) instead of ad-hoc interval/timer`
        );
      }
    }
    return violations;
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

    const extraAllow =
      (config.thresholds?.angular as { pollSourceAllowlist?: string[] })
        ?.pollSourceAllowlist ?? [];
    const violations: string[] = [];

    for (const file of CheckerUtils.findTypeScriptFiles(projectRoot, config)) {
      const norm = file.replace(/\\/g, '/');
      if (!this.isFeatureOrDataAccess(norm)) continue;
      const base = PathOperations.getFilename(norm);
      if (this.HELPER_FILE.test(base) || extraAllow.some(a => norm.includes(a))) {
        continue;
      }
      const content = FileUtils.readFile(file);
      if (!content) continue;

      violations.push(
        ...this.collectRawPollViolations(
          content,
          PathOperations.getRelative(projectRoot, file)
        )
      );
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'ANGULAR_LAW',
      [
        'Drive HTTP polls with PageVisibilityService.pollTicks(ms) (visibility-gated)',
        'Keep raw interval/timer only for local UI ticks with no HTTP call',
      ],
      context
    );
  }
}

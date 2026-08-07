/**
 * ROC-FE-02 — A `providedIn: 'root'` service must not own a timer
 * A root singleton lives for the whole app lifetime, so an interval/timer inside
 * it is an eternal poll that never stops when the user leaves the screen. Bind
 * timers to a component/route provider lifecycle (or allowlist a genuine global
 * app-clock by class name).
 */

import { CheckerUtils } from '../../utils/checker-utils';
import { CodeText } from '../../utils/code-text';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FeArchLawBase } from './fe-arch-law-base';

export class RootServiceNoTimerLaw extends FeArchLawBase {
  private static readonly LAW_NAME = 'Root Service No Timer';
  private static readonly ROOT_INJECTABLE =
    /@Injectable\s*\(\s*\{[^}]*providedIn\s*:\s*['"]root['"][^}]*\}\s*\)/g;
  private static readonly CLASS_HEAD = /\b(?:export\s+)?class\s+(\w+)[^{]*\{/g;
  // A REAL timer: RxJS `interval(`/`timer(` as a bare call, or `setInterval(`.
  // The lookbehind excludes a METHOD named timer/interval (`this.timer(`,
  // `poll.interval(`) — a method whose name happens to contain the word is not a
  // setInterval — which, together with comment/string stripping below, kills the
  // raw-text false positives (a `timer(` in a note, a dependency named `timer`).
  private static readonly TIMER =
    /(?<![.\w])(?:interval|timer)\s*\(|\bsetInterval\s*\(/;
  // The sanctioned tick source that ROC-FE-01 mandates lives in these files —
  // same exemption as poll-via-sanctioned-source, or the two laws eat each other.
  private static readonly HELPER_FILE = /(page-visibility|poll-signal|poll-ticks)/i;

  /** Root-provided classes in one file that own a timer, honoring the allowlist. */
  private static collectRootTimerViolations(
    content: string,
    rel: string,
    allowlist: Set<string>
  ): string[] {
    const violations: string[] = [];
    this.ROOT_INJECTABLE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = this.ROOT_INJECTABLE.exec(content)) !== null) {
      // The class this decorator applies to starts right after it.
      this.CLASS_HEAD.lastIndex = m.index + m[0].length;
      const head = this.CLASS_HEAD.exec(content);
      if (!head) continue;
      const className = head[1] ?? '';
      if (allowlist.has(className)) continue;
      const rawBody = this.readBraces(content, head.index + head[0].length - 1);
      // Match CODE, not a `// interval(...)` note or an "interval(" string.
      const body =
        rawBody === null ? null : CodeText.stripCommentsAndStrings(rawBody);
      if (body !== null && this.TIMER.test(body)) {
        violations.push(
          `${rel}: root-provided ${className} owns a timer (interval/timer/setInterval) — bind it to a component/route lifecycle, or allowlist a genuine app-clock`
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

    const allowlist = new Set(
      (config.thresholds?.angular as { rootTimerAllowlist?: string[] })
        ?.rootTimerAllowlist ?? []
    );
    const violations: string[] = [];

    for (const file of CheckerUtils.findTypeScriptFiles(projectRoot, config)) {
      if (this.HELPER_FILE.test(file)) continue;
      const content = FileUtils.readFile(file);
      if (!content || !content.includes('providedIn')) continue;

      violations.push(
        ...this.collectRootTimerViolations(
          content,
          PathOperations.getRelative(projectRoot, file),
          allowlist
        )
      );
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'ANGULAR_LAW',
      [
        "Provide the service at the route/component that owns the screen (not providedIn: 'root')",
        'Add a real global app-clock to thresholds.angular.rootTimerAllowlist',
      ],
      context
    );
  }
}

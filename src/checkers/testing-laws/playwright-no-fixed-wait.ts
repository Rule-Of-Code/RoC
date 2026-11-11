/**
 * Playwright No Fixed Wait
 *
 * `waitForTimeout(ms)` waits for time, not for the state the test needs. On a
 * slower machine the state is not there yet and the test fails; on a faster
 * one the test idles. Playwright's own documentation of the method says to use
 * it for debugging only. Locator actions and web-first assertions wait for the
 * state itself.
 *
 * A fixed pause is sometimes the honest check — "nothing happens within N ms"
 * has no event to await. Such a call carries its reason in a comment on the
 * line or directly above it, and is not a finding. An eslint directive counts
 * only for the reason written after its `--`.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { TestSources } from '../../utils/testing/test-sources';
import { LawBase } from '../law-base';

const FIXED_WAIT = 'waitForTimeout';

/** The message when Playwright is declared but the scan saw none of its files. */
export const PLAYWRIGHT_NOT_FOUND =
  'Playwright is declared, but the scan found no playwright.config.* and no file importing @playwright/test — nothing was inspected. If the e2e suite is excluded by ignores or includes, it was not read';

export class PlaywrightNoFixedWaitLaw extends LawBase {
  static readonly LAW_NAME = 'Playwright No Fixed Wait';

  static check(context: LawCheckContext): LawResult {
    const suite = TestSources.playwrightFiles(context);
    const violations = [...suite.unread];
    if (!suite.found) violations.push(PLAYWRIGHT_NOT_FOUND);
    for (const source of suite.sources) {
      for (const call of this.unexplainedWaits(source)) {
        violations.push(
          `${ReactProject.relative(context, source.fileName)}:${source.lineOf(call)}: ${call.getText(source.sourceFile)} waits for time, not for a state — flaky where the app is slower, idle where it is faster. Wait for the state, or write why time is the check in a comment on the line`
        );
      }
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'TESTING',
      [
        'Wait for the state: await expect(locator).toBeVisible(), page.waitForURL(), page.waitForResponse()',
        'Where "nothing happens within N ms" is the check, say so in a comment above the call',
      ],
      context
    );
  }

  /** Every `x.waitForTimeout(…)` call without a reason comment. */
  static unexplainedWaits(source: TsxSource): TS.CallExpression[] {
    const ts = source.ts;
    const found: TS.CallExpression[] = [];
    source.walk(node => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === FIXED_WAIT &&
        !this.hasReason(source, node)
      ) {
        found.push(node);
      }
    });
    return found;
  }

  /**
   * A comment on the call's line, or a comment block ending on the line
   * directly above the statement that holds the call.
   */
  private static hasReason(source: TsxSource, call: TS.Node): boolean {
    const ts = source.ts;
    const text = source.text;
    let statement: TS.Node = call;
    while (statement.parent && !ts.isBlock(statement.parent) && !ts.isSourceFile(statement.parent)) {
      statement = statement.parent;
    }
    const lineOf = (position: number): number =>
      source.sourceFile.getLineAndCharacterOfPosition(position).line;
    const startLine = lineOf(statement.getStart(source.sourceFile));
    const comments = [
      ...(ts.getLeadingCommentRanges(text, statement.getFullStart()) ?? []).filter(
        range => lineOf(range.end) >= startLine - 1
      ),
      ...(ts.getTrailingCommentRanges(text, statement.getEnd()) ?? []),
    ];
    return comments.some(range => this.isReason(text.slice(range.pos, range.end)));
  }

  private static isReason(comment: string): boolean {
    let body = comment.replace(/^\/\/|^\/\*+|\*+\/$/g, '').replace(/^\s*\*/gm, '').trim();
    if (/^eslint-disable/.test(body)) {
      const dashes = body.indexOf('--');
      body = dashes >= 0 ? body.slice(dashes + 2) : '';
    }
    return /\p{L}{2,}/u.test(body);
  }
}

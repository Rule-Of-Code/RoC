/**
 * React Poll Visibility Gated
 *
 * A `setInterval` that fetches keeps fetching while the tab is hidden: the
 * user is not looking, the battery and the API quota are still spent, and on a
 * phone the requests pile up behind a throttled timer and fire in a burst on
 * return. The page tells the app when it is hidden — `visibilitychange` and
 * `document.visibilityState` — and a poll should stop or skip on it. The law
 * reads each `setInterval` from the parse, follows its callback (inline, or a
 * function of the same file it names or calls), and when that fetches, asks
 * whether the file handles visibility at all. A file named in
 * `thresholds.react.pollHelpers` is the project's sanctioned poll helper and
 * is trusted to gate itself.
 */

import { minimatch } from 'minimatch';
import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  isFetchCall,
  isGlobalCall,
  localFunction,
  readReactSources,
  unwrap,
  walkWithin,
  where,
} from '../../utils/react/react-hooks-ast';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource, TypeScriptModule } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

/** What a file reads when it handles page visibility. */
const VISIBILITY_EVENT = 'visibilitychange';
const VISIBILITY_PROPERTIES = new Set(['visibilityState', 'hidden']);

export class ReactPollVisibilityGatedLaw extends LawBase {
  static readonly LAW_NAME = 'React Poll Visibility Gated';

  static check(context: LawCheckContext): LawResult {
    const { sources, violations } = readReactSources(context, this.LAW_NAME);
    const helpers = context.config.thresholds?.react?.pollHelpers ?? [];
    for (const source of sources) {
      const relative = ReactProject.relative(context, source.fileName);
      if (helpers.some(glob => minimatch(relative, glob))) continue;
      const polls = this.fetchingIntervals(source);
      if (polls.length === 0 || this.handlesVisibility(source)) continue;
      for (const poll of polls) {
        violations.push(
          `${where(context, source, poll)}: setInterval polls with fetch and nothing in the file reacts to visibilitychange — it keeps requesting while the tab is hidden. Pause on document.visibilityState === 'hidden', or poll through the helper named in thresholds.react.pollHelpers`
        );
      }
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'PERFORMANCE',
      [
        "Listen to visibilitychange: clear the interval when document.visibilityState is 'hidden' and restart it when visible",
        'Or put polling in one helper that does this, and name it in thresholds.react.pollHelpers',
      ],
      context
    );
  }

  /** `setInterval` calls whose callback reaches `fetch`. */
  private static fetchingIntervals(source: TsxSource): TS.CallExpression[] {
    const ts = source.ts;
    const found: TS.CallExpression[] = [];
    source.walk(node => {
      if (!ts.isCallExpression(node) || !isGlobalCall(ts, node, 'setInterval')) return;
      const callback = node.arguments[0];
      if (callback && this.reachesFetch(source, unwrap(ts, callback))) found.push(node);
    });
    return found;
  }

  /** The callback fetches itself, or calls (or is) a function of this file that does. */
  private static reachesFetch(source: TsxSource, callback: TS.Expression): boolean {
    const ts = source.ts;
    const named = (name: string): TS.FunctionLikeDeclaration | null =>
      localFunction(ts, source.sourceFile, name);
    if (ts.isIdentifier(callback)) {
      const fn = named(callback.text);
      return fn ? this.fetchesDirectly(ts, fn) : false;
    }
    if (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) return false;
    if (this.fetchesDirectly(ts, callback)) return true;
    let reaches = false;
    walkWithin(ts, callback, node => {
      if (reaches || !ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return;
      const fn = named(node.expression.text);
      if (fn && fn !== callback) reaches = this.fetchesDirectly(ts, fn);
    });
    return reaches;
  }

  private static fetchesDirectly(ts: TypeScriptModule, fn: TS.Node): boolean {
    let fetches = false;
    walkWithin(ts, fn, node => {
      if (isFetchCall(ts, node)) fetches = true;
    });
    return fetches;
  }

  /** A `'visibilitychange'` string, or a read of `visibilityState` / `document.hidden`. */
  private static handlesVisibility(source: TsxSource): boolean {
    const ts = source.ts;
    let handles = false;
    source.walk(node => {
      if (ts.isStringLiteralLike(node) && node.text === VISIBILITY_EVENT) handles = true;
      if (ts.isPropertyAccessExpression(node) && VISIBILITY_PROPERTIES.has(node.name.text)) {
        const receiver = unwrap(ts, node.expression);
        if (node.name.text === 'visibilityState' || (ts.isIdentifier(receiver) && receiver.text === 'document')) {
          handles = true;
        }
      }
    });
    return handles;
  }
}

/**
 * Side Effects in NgRx Effects Law
 * Components should be declarative: dispatch an intent and let an NgRx Effect run
 * the async side effect. Two anti-patterns flagged in *.component.ts:
 *  A) a long-lived stream (interval/timer/fromEvent/webSocket) subscribed in the
 *     component (belongs in an Effect, regardless of cleanup);
 *  B) store.dispatch() called inside a .subscribe() callback (convert the trigger
 *     into an action handled by an Effect).
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { AngularLawBase } from './angular-law-base';

export class SideEffectsInNgrxEffectsLaw extends AngularLawBase {
  private static readonly LONG_LIVED =
    /\b(?:interval|timer|fromEvent|fromEventPattern|webSocket)\s*\(/;
  private static readonly HAS_SUBSCRIBE = /\.subscribe\s*\(/;
  // store.dispatch() inside a .subscribe() callback (single-level arrow body).
  private static readonly DISPATCH_IN_SUBSCRIBE =
    /\.subscribe\s*\(\s*(?:async\s*)?\(?[^)]*\)?\s*=>[\s\S]{0,300}?\bdispatch\s*\(/;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    const files = FileUtils.getAllTypeScriptFiles(
      projectRoot,
      context.config,
      undefined,
      false
    ).filter(f => f.endsWith('.component.ts'));

    for (const file of files) {
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;
      const code = content
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
      const relativePath = PathOperations.getRelative(projectRoot, file);

      if (this.LONG_LIVED.test(code) && this.HAS_SUBSCRIBE.test(code)) {
        violations.push(
          `${relativePath}: long-lived stream (interval/timer/fromEvent/webSocket) subscribed in a component — move it to an NgRx Effect; the component should only dispatch.`
        );
      }
      if (this.DISPATCH_IN_SUBSCRIBE.test(code)) {
        violations.push(
          `${relativePath}: store.dispatch() inside .subscribe() — convert the trigger into an action handled by an Effect.`
        );
      }
    }

    return this.createResult(
      violations,
      'Side Effects in NgRx Effects',
      'ANGULAR_LAW',
      [
        'Move polling/long-lived streams into an NgRx Effect (see bot.effects.ts)',
        'Dispatch an action instead of calling dispatch() inside subscribe()',
      ],
      context
    );
  }
}

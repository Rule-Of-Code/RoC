/**
 * Declarative Read Subscriptions Law (advisory)
 * A `.subscribe()` whose callback only mirrors a value into a signal
 * (`x.set(...)`) is a pure read→render that is better expressed declaratively
 * with toSignal() or the async pipe. Low-precision advisory: it only flags the
 * narrow "subscribe callback is a single .set()" shape to avoid false positives
 * on legitimately imperative flows.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { AngularLawBase } from './angular-law-base';

export class DeclarativeReadSubscriptionsLaw extends AngularLawBase {
  // .subscribe(v => this.x.set(v))  /  .subscribe(v => { this.x.set(v); })
  private static readonly SET_ONLY_SUBSCRIBE =
    /\.subscribe\(\s*(?:\(?[\w$]*\)?)\s*=>\s*\{?\s*[\w$.]+\.set\([^;{}]*\)\s*;?\s*\}?\s*\)/g;

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
      const matches = code.match(this.SET_ONLY_SUBSCRIBE);
      if (matches && matches.length > 0) {
        violations.push(
          `${PathOperations.getRelative(projectRoot, file)}: ${
            matches.length
          } subscribe() callback(s) that only mirror into a signal — prefer toSignal()/async pipe.`
        );
      }
    }

    return this.createResult(
      violations,
      'Declarative Read Subscriptions',
      'ANGULAR_LAW',
      [
        'Replace read-only subscribe(v => sig.set(v)) with toSignal() or the async pipe',
      ],
      context
    );
  }
}

/**
 * React Store Subscription Uses useSyncExternalStore
 *
 * Subscribing to an external source in an effect and copying each update into
 * component state renders the stale value first, can tear under concurrent
 * rendering (two components read different versions of the same store in one
 * render), and has nothing to show on the server. useSyncExternalStore is
 * React's API for exactly this: it subscribes, reads the snapshot during
 * render and takes a server snapshot. The law reads effects from the parse
 * and flags a `.subscribe(cb)` or `.addEventListener(type, cb)` whose callback
 * does nothing but call a useState setter.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  callTarget,
  effectCalls,
  readReactSources,
  stateSetters,
  unwrap,
  walkWithin,
  where,
} from '../../utils/react/react-hooks-ast';
import type { TsxSource, TypeScriptModule } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

/** The subscribing call and the index of the callback argument. */
const SUBSCRIBERS: Readonly<Record<string, number>> = { subscribe: 0, addEventListener: 1 };

export class ReactStoreSubscriptionUsesSyncExternalStoreLaw extends LawBase {
  static readonly LAW_NAME = 'React Store Subscription Uses Sync External Store';

  static check(context: LawCheckContext): LawResult {
    const { sources, violations } = readReactSources(context, this.LAW_NAME);
    for (const source of sources) {
      const setters = stateSetters(source);
      if (setters.size === 0) continue;
      for (const call of this.copyingSubscriptions(source, setters)) {
        const name = callTarget(source.ts, call)?.name ?? 'subscribe';
        violations.push(
          `${where(context, source, call)}: an effect's ${name} callback only copies the source into useState — the first render shows a stale value and concurrent renders can tear. Read it with useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`
        );
      }
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'CODE_QUALITY',
      [
        'Replace the effect + useState pair with useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)',
        "Keep the effect when the callback reacts to an event (it does more than store the source's value)",
      ],
      context
    );
  }

  private static copyingSubscriptions(source: TsxSource, setters: Set<string>): TS.CallExpression[] {
    const ts = source.ts;
    const found: TS.CallExpression[] = [];
    for (const effect of effectCalls(source)) {
      if (!effect.setup) continue;
      // The whole setup, returned value included: `() => store.subscribe(cb)` returns its subscription.
      walkWithin(ts, effect.setup.body, node => {
        if (!ts.isCallExpression(node)) return;
        const target = callTarget(ts, node);
        if (!target?.receiver) return;
        const index = SUBSCRIBERS[target.name];
        if (index === undefined) return;
        const callback = node.arguments[index];
        if (callback && this.onlyCallsSetter(ts, unwrap(ts, callback), setters)) found.push(node);
      });
    }
    return found;
  }

  /** `() => setX(…)` or `function () { setX(…); }` — one statement, a setter call. */
  private static onlyCallsSetter(
    ts: TypeScriptModule,
    callback: TS.Expression,
    setters: Set<string>
  ): boolean {
    if (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) return false;
    let expression: TS.Expression | undefined;
    if (ts.isBlock(callback.body)) {
      const [only, ...rest] = callback.body.statements;
      if (!only || rest.length > 0 || !ts.isExpressionStatement(only)) return false;
      expression = only.expression;
    } else {
      expression = callback.body;
    }
    const call = unwrap(ts, expression);
    if (!ts.isCallExpression(call)) return false;
    const callee = unwrap(ts, call.expression);
    return ts.isIdentifier(callee) && setters.has(callee.text);
  }
}

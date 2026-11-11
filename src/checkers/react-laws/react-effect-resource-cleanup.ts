/**
 * React Effect Resource Cleanup
 *
 * An effect that starts an interval, a listener, an observer, a socket or a
 * subscription and returns no cleanup leaves it running after the component
 * unmounts — and in development, where React mounts every effect twice, it
 * runs two of them from the first render. React calls the function the setup
 * returns before the next run and on unmount; that function is the only place
 * the resource is stopped. The law reads each effect's setup from the parse:
 * what it starts directly, and whether it returns a function.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  callTarget,
  type EffectCall,
  effectCalls,
  hasInlineReason,
  isGlobalCall,
  readReactSources,
  returnedValues,
  unwrap,
  walkSetup,
  walkWithin,
  where,
} from '../../utils/react/react-hooks-ast';
import type { TsxSource, TypeScriptModule } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

/** The inline answer for a bounded one-shot resource the law cannot judge. */
export const EFFECT_CLEANUP_REASON_MARKER = 'roc-allow-effect-without-cleanup';

/** Browser globals that start a repeating resource: `setInterval(…)`, `window.requestAnimationFrame(…)`. */
const GLOBAL_STARTERS = ['setInterval', 'requestAnimationFrame'];
/** Methods that start one on any receiver: `el.addEventListener(…)`, `store.subscribe(…)`. */
const METHOD_STARTERS = ['addEventListener', 'subscribe'];
/** Constructors of a resource that stays open: `new WebSocket(…)`, `new ResizeObserver(…)`. */
const OPEN_CONSTRUCTORS = new Set(['WebSocket', 'EventSource']);

/** What `node` starts, by name, or null. */
export function startedResource(ts: TypeScriptModule, node: TS.Node): string | null {
  if (ts.isCallExpression(node)) {
    const global = GLOBAL_STARTERS.find(name => isGlobalCall(ts, node, name));
    if (global) return global;
    const target = callTarget(ts, node);
    if (target?.receiver && METHOD_STARTERS.includes(target.name)) return target.name;
    return null;
  }
  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
    const name = node.expression.text;
    if (OPEN_CONSTRUCTORS.has(name) || /^[A-Z]\w*Observer$/.test(name)) return `new ${name}`;
  }
  return null;
}

export class ReactEffectResourceCleanupLaw extends LawBase {
  static readonly LAW_NAME = 'React Effect Resource Cleanup';

  static check(context: LawCheckContext): LawResult {
    const { sources, violations } = readReactSources(context, this.LAW_NAME);
    for (const source of sources) {
      for (const effect of effectCalls(source)) {
        const finding = this.judge(source, effect);
        if (finding) violations.push(`${where(context, source, effect.call)}: ${finding}`);
      }
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'CODE_QUALITY',
      [
        'Return a cleanup from the effect that stops what it started: clearInterval, removeEventListener, disconnect, close, unsubscribe, cancelAnimationFrame',
        `For a bounded one-shot resource, write the reason above the effect: // ${EFFECT_CLEANUP_REASON_MARKER}: <why it cannot outlive the component>`,
      ],
      context
    );
  }

  /** Why this effect leaks, or null. */
  private static judge(source: TsxSource, effect: EffectCall): string | null {
    const ts = source.ts;
    const setup = effect.setup;
    if (!setup) return null;
    const started = new Set<string>();
    const collect = (node: TS.Node): void => {
      const resource = startedResource(ts, node);
      if (resource) started.add(resource);
    };
    walkSetup(ts, setup, collect);
    // A returned value that is not a cleanup (`return setInterval(…)`) still started something.
    const returned = returnedValues(ts, setup);
    const cleanups = returned.filter(value => this.isCleanupValue(ts, value));
    for (const value of returned) {
      if (!cleanups.includes(value)) walkWithin(ts, value, collect);
    }
    if (started.size === 0 || cleanups.length > 0) return null;
    if (hasInlineReason(source, effect.line, EFFECT_CLEANUP_REASON_MARKER)) return null;
    return `${effect.hook} starts ${[...started].join(', ')} and returns no cleanup — it keeps running after unmount (and twice under StrictMode). Return a function that stops it`;
  }

  /**
   * Whether a returned value can be the cleanup: a function, a name bound to
   * one, or the result of a call that hands one back (`store.subscribe(fn)`).
   * `undefined`, `null`, an interval id and a fresh object are not.
   */
  private static isCleanupValue(ts: TypeScriptModule, value: TS.Expression): boolean {
    const inner = unwrap(ts, value);
    if (ts.isArrowFunction(inner) || ts.isFunctionExpression(inner)) return true;
    if (ts.isIdentifier(inner)) return inner.text !== 'undefined';
    if (ts.isNewExpression(inner)) return false;
    if (ts.isCallExpression(inner)) {
      const resource = startedResource(ts, inner);
      return resource === null || resource === 'subscribe';
    }
    if (ts.isPropertyAccessExpression(inner)) return true;
    return false;
  }
}

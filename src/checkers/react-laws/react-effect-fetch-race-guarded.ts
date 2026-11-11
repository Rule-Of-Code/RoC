/**
 * React Effect Fetch Race Guarded
 *
 * An effect that fetches on a dependency change starts a new request every
 * time the dependency changes, and the responses arrive in whatever order the
 * network returns them. Without a guard the slower, older response is written
 * last and the screen shows data for an input the user has already left. The
 * React documentation's remedy is a cleanup that either aborts the request (a
 * `signal` from an AbortController aborted in the cleanup) or flips an
 * `ignore` flag the response handler checks. The law reads both from the
 * parse: each direct `fetch` in the setup, the init object it passes, and
 * what the returned cleanup assigns or calls.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  callTarget,
  cleanupNodes,
  type EffectCall,
  effectCalls,
  isDeferredCallback,
  isFetchCall,
  readReactSources,
  unwrap,
  walkSetup,
  walkWithin,
  where,
} from '../../utils/react/react-hooks-ast';
import type { TsxSource, TypeScriptModule } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

export class ReactEffectFetchRaceGuardedLaw extends LawBase {
  static readonly LAW_NAME = 'React Effect Fetch Race Guarded';

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
        'Create an AbortController in the effect, pass { signal: controller.signal } to fetch and return () => controller.abort()',
        'Or declare let ignore = false, skip the state update when ignore is true, and return () => { ignore = true; }',
      ],
      context
    );
  }

  /** Why this effect's fetches can race, or null. */
  private static judge(source: TsxSource, effect: EffectCall): string | null {
    const ts = source.ts;
    const setup = effect.setup;
    if (!setup) return null;
    const fetches: TS.CallExpression[] = [];
    // A fetch a timer or listener runs later is not one this effect run starts.
    walkSetup(
      ts,
      setup,
      node => {
        if (isFetchCall(ts, node)) fetches.push(node);
      },
      node => isDeferredCallback(ts, node)
    );
    if (fetches.length === 0) return null;
    const cleanup = cleanupNodes(ts, setup);
    if (this.ignoreFlag(ts, setup, cleanup)) return null;
    const aborts = cleanup.some(node => this.callsAbort(ts, node));
    const unsignalled = fetches.filter(call => !this.passesSignal(ts, call));
    if (unsignalled.length === 0 && aborts) return null;
    const count = fetches.length === 1 ? 'a fetch' : `${fetches.length} fetches`;
    if (unsignalled.length === 0) {
      return `${effect.hook} passes a signal to ${count} but its cleanup never calls abort() — a superseded response still lands. Return () => controller.abort()`;
    }
    return `${effect.hook} runs ${count} with neither an aborted signal nor an ignore flag in its cleanup — a slower, older response can overwrite the newer one. Abort it in the cleanup or guard the update with an ignore flag`;
  }

  /** `fetch(url, { signal })` or `fetch(url, { signal: controller.signal })`. */
  private static passesSignal(ts: TypeScriptModule, call: TS.CallExpression): boolean {
    const init = call.arguments[1];
    if (!init) return false;
    const value = unwrap(ts, init);
    if (!ts.isObjectLiteralExpression(value)) return false;
    return value.properties.some(
      property =>
        (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) &&
        property.name.getText() === 'signal'
    );
  }

  private static callsAbort(ts: TypeScriptModule, root: TS.Node): boolean {
    let found = false;
    walkWithin(ts, root, node => {
      if (ts.isCallExpression(node) && callTarget(ts, node)?.name === 'abort') found = true;
    });
    return found;
  }

  /**
   * An ignore-style flag: a `let` declared in the setup, assigned in the
   * cleanup and read by the setup — `if (!ignore) setData(json)` — or a
   * property of an object the setup declares (`state.ignore = true`).
   */
  private static ignoreFlag(
    ts: TypeScriptModule,
    setup: TS.ArrowFunction | TS.FunctionExpression,
    cleanup: TS.Node[]
  ): boolean {
    const assigned: TS.Expression[] = [];
    for (const root of cleanup) {
      walkWithin(ts, root, node => {
        if (this.isAssignment(ts, node)) assigned.push(node.left);
      });
    }
    if (assigned.length === 0) return false;
    const lets = new Set<string>();
    const declared = new Set<string>();
    const read = new Set<string>();
    walkSetup(ts, setup, node => {
      if (ts.isVariableDeclarationList(node)) {
        const isLet = (node.flags & ts.NodeFlags.Let) !== 0;
        for (const declaration of node.declarations) {
          if (!ts.isIdentifier(declaration.name)) continue;
          declared.add(declaration.name.text);
          if (isLet) lets.add(declaration.name.text);
        }
      }
      const flag = this.flagText(ts, node);
      if (flag && this.isRead(ts, node)) read.add(flag);
    });
    return assigned.some(left => {
      const flag = this.flagText(ts, left);
      if (!flag || !read.has(flag)) return false;
      return ts.isIdentifier(left) ? lets.has(flag) : declared.has(flag.split('.')[0] as string);
    });
  }

  private static isAssignment(ts: TypeScriptModule, node: TS.Node): node is TS.BinaryExpression {
    return ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken;
  }

  /** `ignore` or `state.ignore` — a name, or one property of a name. */
  private static flagText(ts: TypeScriptModule, node: TS.Node): string | null {
    if (ts.isIdentifier(node)) return node.text;
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      return `${node.expression.text}.${node.name.text}`;
    }
    return null;
  }

  /** A flag used as a value, not declared, not the property name of a longer access, not assigned to. */
  private static isRead(ts: TypeScriptModule, node: TS.Node): boolean {
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) && parent.name === node) return false;
    if (ts.isPropertyAccessExpression(parent) && (parent.name === node || parent.expression === node)) {
      return false;
    }
    return !(this.isAssignment(ts, parent) && parent.left === node);
  }
}

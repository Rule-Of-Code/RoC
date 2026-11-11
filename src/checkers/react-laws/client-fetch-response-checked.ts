/**
 * Client Fetch Response Checked
 *
 * `fetch` rejects only when the request cannot be made. A 401, a 404 or a 500
 * resolves like a success, and code that goes straight to `res.json()` renders
 * the error body as data — or throws later, far from the cause, on a body that
 * is not JSON. In the browser nothing reports it: the user sees an empty or a
 * wrong screen. The law reads each `fetch` in client code from the parse and
 * asks whether its response's `ok` or `status` is read, or the call is inside
 * a `catch` (a try block, `.catch(…)` or a rejection handler).
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PathOperations } from '../../utils/path-operations';
import {
  callTarget,
  isFetchCall,
  isFunctionNode,
  readReactSources,
  unwrap,
  walkWithin,
  where,
} from '../../utils/react/react-hooks-ast';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource, TypeScriptModule } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

/** The response properties that say whether the request succeeded. */
const STATUS_PROPERTIES = new Set(['ok', 'status']);

type Verdict = 'checked' | 'unchecked' | 'wrapper';

export class ClientFetchResponseCheckedLaw extends LawBase {
  static readonly LAW_NAME = 'Client Fetch Response Checked';

  static check(context: LawCheckContext): LawResult {
    const { sources, violations } = readReactSources(context, this.LAW_NAME);
    const nextRoots = ReactProject.nextApps(context.projectRoot).map(app => app.root);
    for (const source of sources) {
      if (!this.isClientFile(source, nextRoots)) continue;
      const ts = source.ts;
      source.walk(node => {
        if (!isFetchCall(ts, node) || this.verdict(ts, node) !== 'unchecked') return;
        violations.push(
          `${where(context, source, node)}: fetch response used without reading res.ok or res.status, and no catch around it — a 4xx/5xx resolves like a success and its error body is treated as data. Check res.ok before reading the body`
        );
      });
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'CODE_QUALITY',
      [
        'if (!res.ok) throw new Error(`HTTP ${res.status}`) before res.json(), and show the failure',
        'Route client requests through one helper that checks res.ok, so each call site cannot forget',
      ],
      context
    );
  }

  /** `'use client'`, or React source outside every Next app (it renders in the browser). */
  private static isClientFile(source: TsxSource, nextRoots: string[]): boolean {
    if (source.directives().includes('use client')) return true;
    return !nextRoots.some(root => PathOperations.isInDirectory(source.fileName, root));
  }

  private static verdict(ts: TypeScriptModule, call: TS.CallExpression): Verdict {
    if (this.caught(ts, call)) return 'checked';
    let expression: TS.Node = call;
    while (
      ts.isAwaitExpression(expression.parent) ||
      ts.isParenthesizedExpression(expression.parent) ||
      ts.isAsExpression(expression.parent) ||
      ts.isNonNullExpression(expression.parent)
    ) {
      expression = expression.parent;
    }
    const parent = expression.parent;
    // `return fetch(…)` hands the response to a caller this law cannot follow.
    if (ts.isReturnStatement(parent) || (ts.isArrowFunction(parent) && parent.body === expression)) {
      return 'wrapper';
    }
    if (ts.isVariableDeclaration(parent) && parent.initializer === expression) {
      return this.bindingChecked(ts, parent.name, this.scopeOf(ts, parent)) ? 'checked' : 'unchecked';
    }
    const callback = this.thenCallback(ts, expression);
    if (callback) {
      const param = callback.parameters[0];
      return param && this.bindingChecked(ts, param.name, callback) ? 'checked' : 'unchecked';
    }
    return 'unchecked';
  }

  /** The `onFulfilled` of `fetch(…).then(onFulfilled)`, when inline. */
  private static thenCallback(
    ts: TypeScriptModule,
    expression: TS.Node
  ): TS.ArrowFunction | TS.FunctionExpression | null {
    const access = expression.parent;
    if (!ts.isPropertyAccessExpression(access) || access.name.text !== 'then') return null;
    const call = access.parent;
    if (!ts.isCallExpression(call) || !call.arguments[0]) return null;
    const callback = unwrap(ts, call.arguments[0]);
    return ts.isArrowFunction(callback) || ts.isFunctionExpression(callback) ? callback : null;
  }

  /** `res` with `res.ok`/`res.status` read in `scope`, or `{ ok }` / `{ status }` destructured. */
  private static bindingChecked(ts: TypeScriptModule, name: TS.BindingName, scope: TS.Node): boolean {
    if (ts.isObjectBindingPattern(name)) {
      return name.elements.some(element => {
        const key = element.propertyName ?? element.name;
        return ts.isIdentifier(key) && STATUS_PROPERTIES.has(key.text);
      });
    }
    if (!ts.isIdentifier(name)) return false;
    let read = false;
    walkWithin(ts, scope, node => {
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === name.text &&
        STATUS_PROPERTIES.has(node.name.text)
      ) {
        read = true;
      }
      if (
        ts.isVariableDeclaration(node) &&
        node.initializer &&
        ts.isIdentifier(unwrap(ts, node.initializer)) &&
        (unwrap(ts, node.initializer) as TS.Identifier).text === name.text &&
        this.bindingChecked(ts, node.name, scope)
      ) {
        read = true;
      }
    });
    return read;
  }

  /** Inside a try block (same function), or chained to `.catch(…)` / `.then(ok, onRejected)`. */
  private static caught(ts: TypeScriptModule, call: TS.CallExpression): boolean {
    let child: TS.Node = call;
    for (let parent = call.parent; parent && !isFunctionNode(ts, parent); parent = parent.parent) {
      if (ts.isTryStatement(parent) && parent.tryBlock === child && parent.catchClause) return true;
      child = parent;
    }
    let link: TS.Node = call;
    while (ts.isPropertyAccessExpression(link.parent) && ts.isCallExpression(link.parent.parent)) {
      const chained = link.parent.parent;
      const name = callTarget(ts, chained)?.name;
      if (name === 'catch' || (name === 'then' && chained.arguments.length > 1)) return true;
      link = chained;
    }
    return false;
  }

  /** The function (or file) a declaration lives in — where its reads are looked for. */
  private static scopeOf(ts: TypeScriptModule, node: TS.Node): TS.Node {
    let current: TS.Node = node;
    while (current.parent && !isFunctionNode(ts, current.parent)) current = current.parent;
    return current.parent ?? current;
  }
}

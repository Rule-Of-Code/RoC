/**
 * Next Server Action Authorizes
 *
 * A Server Action is a public POST endpoint: Next makes every exported
 * function of a `'use server'` module (and every inline `'use server'`
 * function) callable by a direct POST, whether or not any page imports it,
 * with arguments the client fully controls. A check on the page that renders
 * the form does not extend to the action. So each action must establish who
 * is calling, itself, before it does anything else.
 *
 * The guard names are data (`thresholds.next.authGuards`). The first
 * statement of the action's body must call one; a wrapper built from one
 * (`withAuth(async () => …)`, `authClient.action(…)`) is accepted for the
 * export it wraps. Without the declaration the law cannot tell a guard from
 * any other call, so it fails while there are actions to judge.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  isAsync,
  isFunctionLike,
  moduleExports,
  type FunctionLike,
} from '../../utils/react/module-exports';
import { isServerModule } from '../../utils/react/next-module-graph';
import { NextThresholds } from '../../utils/react/next-thresholds';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';
import { callsGuard, isGuardWrapper, listed, readProject } from './next-server-support';

interface Action {
  source: TsxSource;
  name: string;
  line: number;
  fn: FunctionLike | null;
  call: TS.CallExpression | null;
  reexportFrom: string | null;
}

const GUARD_KEY = 'thresholds.next.authGuards';

export class NextServerActionAuthorizesLaw extends LawBase {
  static readonly LAW_NAME = 'Next Server Action Authorizes';

  static check(context: LawCheckContext): LawResult {
    const { graph, sources, unread } = readProject(context);
    const guards = NextThresholds.authGuards(context);
    const violations = [...unread, ...guards.problems];
    const actions = sources.flatMap(source => [...this.moduleActions(source), ...this.inlineActions(source)]);
    const where = (action: Action): string =>
      `${graph ? graph.relative(action.source.fileName) : action.source.fileName}:${action.line}`;
    if (actions.length > 0 && !guards.value?.length && guards.problems.length === 0) {
      violations.push(
        `${actions.length} Server Action(s) (${listed(actions.map(a => `${where(a)} ${a.name}`))}) and no ${GUARD_KEY} — the law cannot tell an authorization call from any other. Declare the guard functions your actions call`
      );
    } else if (guards.value?.length) {
      for (const action of actions) {
        const problem = this.problem(action, guards.value);
        if (problem) violations.push(`${where(action)}: Server Action '${action.name}' ${problem}`);
      }
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        `Call a guard from ${GUARD_KEY} as the first statement of every Server Action`,
        'Treat every action as a public POST endpoint: check who calls it and whether they may act on the resource',
      ],
      context
    );
  }

  /** The async exports of a `'use server'` module. */
  private static moduleActions(source: TsxSource): Action[] {
    if (!isServerModule(source)) return [];
    const ts = source.ts;
    return moduleExports(source)
      .filter(entry => entry.reexportFrom !== null || entry.call !== null || (entry.fn !== null && isAsync(ts, entry.fn)))
      .map(entry => ({ source, ...entry }));
  }

  /** Functions anywhere whose body opens with `'use server'`. */
  private static inlineActions(source: TsxSource): Action[] {
    const ts = source.ts;
    const actions: Action[] = [];
    source.walk(node => {
      if (!isFunctionLike(ts, node) || !node.body || !ts.isBlock(node.body)) return;
      if (!this.prologue(source, node.body).includes('use server')) return;
      actions.push({ source, name: this.nameOf(source, node), line: source.lineOf(node), fn: node, call: null, reexportFrom: null });
    });
    return actions;
  }

  private static prologue(source: TsxSource, body: TS.Block): string[] {
    const ts = source.ts;
    const found: string[] = [];
    for (const statement of body.statements) {
      if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
      found.push(statement.expression.text);
    }
    return found;
  }

  private static nameOf(source: TsxSource, fn: FunctionLike): string {
    const ts = source.ts;
    if (fn.name) return fn.name.text;
    const parent = fn.parent;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
    if (ts.isPropertyAssignment(parent)) return parent.name.getText(source.sourceFile);
    return '(inline)';
  }

  /** Why the action is not guarded, or null. */
  private static problem(action: Action, guards: readonly string[]): string | null {
    const { source } = action;
    if (action.reexportFrom) {
      return `is re-exported from '${action.reexportFrom}' — this file cannot show that it authorizes. Define the action where its guard can be seen`;
    }
    if (action.call) {
      if (isGuardWrapper(source, action.call, guards)) return null;
      const inner = action.call.arguments.find(arg => isFunctionLike(source.ts, arg));
      if (inner && isFunctionLike(source.ts, inner)) return this.functionProblem(source, inner, guards);
      return `is built by ${action.call.expression.getText(source.sourceFile)}(…), which is not a guard in ${GUARD_KEY} — list the builder there if it authorizes, or call a guard inside the action`;
    }
    return action.fn ? this.functionProblem(source, action.fn, guards) : null;
  }

  private static functionProblem(source: TsxSource, fn: FunctionLike, guards: readonly string[]): string | null {
    const ts = source.ts;
    const body = fn.body;
    if (!body) return null;
    if (!ts.isBlock(body)) {
      return callsGuard(source, body, guards, true) ? null : this.unguarded(guards);
    }
    const directives = this.prologue(source, body).length;
    const first = body.statements[directives];
    if (!first) return `has an empty body and no guard — it is still a public endpoint`;
    return callsGuard(source, first, guards, true) ? null : this.unguarded(guards);
  }

  private static unguarded(guards: readonly string[]): string {
    return `does not call a guard (${guards.join(', ')}) before its first statement — Next exposes it as a public POST endpoint with client-controlled arguments`;
  }
}

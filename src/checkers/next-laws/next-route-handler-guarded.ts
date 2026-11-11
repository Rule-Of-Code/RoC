/**
 * Next Route Handler Guarded
 *
 * A `route.ts` that exports POST, PUT, PATCH or DELETE is a mutating HTTP
 * endpoint. One with no guard looks like any other, compiles, and passes every
 * test that calls it as the author intended. Each mutating handler must call a
 * guard from `thresholds.next.authGuards` (in its body, or by being wrapped in
 * one), or be listed in `thresholds.next.publicRoutes` with the reason it is
 * public. A handler that reads the body (`request.json()`,
 * `request.formData()`) must also validate it: call one of
 * `thresholds.next.bodyValidators`, or narrow with `typeof`.
 *
 * Route files are found where Next finds them (the app directory Next picks,
 * private folders excluded); a handler re-exported from another module cannot
 * be read here, so it fails unless its route is declared public.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { isFunctionLike, moduleExports, type FunctionLike, type ModuleExport } from '../../utils/react/module-exports';
import { NextModuleGraph } from '../../utils/react/next-module-graph';
import { nextRoutes, routerLayout, type NextRoute } from '../../utils/react/next-routes';
import { NextThresholds, type ReasonedEntry } from '../../utils/react/next-thresholds';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';
import { callsGuard, isGuardCall, isGuardWrapper, listed } from './next-server-support';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const BODY_READS = new Set(['json', 'formData']);
const GUARD_KEY = 'thresholds.next.authGuards';
const PUBLIC_KEY = 'thresholds.next.publicRoutes';
const VALIDATOR_KEY = 'thresholds.next.bodyValidators';

interface Handler {
  route: NextRoute;
  source: TsxSource;
  entry: ModuleExport;
}

interface Config {
  guards: string[] | undefined;
  validators: string[];
  publicRoutes: ReasonedEntry[];
}

export class NextRouteHandlerGuardedLaw extends LawBase {
  static readonly LAW_NAME = 'Next Route Handler Guarded';

  static check(context: LawCheckContext): LawResult {
    const guards = NextThresholds.authGuards(context);
    const validators = NextThresholds.bodyValidators(context);
    const publicRoutes = NextThresholds.publicRoutes(context);
    const violations = [...guards.problems, ...validators.problems, ...publicRoutes.problems];
    const config: Config = {
      guards: guards.value,
      validators: validators.value ?? [],
      publicRoutes: publicRoutes.value ?? [],
    };
    const routes = nextRoutes(ReactProject.nextApps(context.projectRoot).map(routerLayout)).filter(
      route => route.kind === 'route'
    );
    const graph = NextModuleGraph.create(context);
    if (typeof graph === 'string') {
      if (routes.length > 0) violations.push(`${routes.length} route file(s): ${graph}`);
      return this.result(violations, context);
    }
    const handlers = this.handlers(graph, routes);
    violations.push(...graph.unread);
    const where = (h: Handler): string => `${graph.relative(h.route.file)}:${h.entry.line}`;
    const isPublic = (h: Handler): boolean => config.publicRoutes.some(p => p.key === h.route.path);
    const guarded = handlers.filter(h => !isPublic(h));
    if (guarded.length > 0 && !config.guards?.length && guards.problems.length === 0) {
      violations.push(
        `${guarded.length} mutating route handler(s) (${listed(guarded.map(h => `${h.entry.name} ${h.route.path}`))}) and no ${GUARD_KEY} — the law cannot tell a guard from any other call. Declare the guards (or list deliberately public routes in ${PUBLIC_KEY})`
      );
    } else if (config.guards?.length) {
      for (const handler of guarded) {
        const problem = this.guardProblem(handler, config.guards);
        if (problem) violations.push(`${where(handler)}: ${handler.entry.name} ${handler.route.path} ${problem}`);
      }
    }
    for (const handler of handlers) {
      const problem = this.bodyProblem(handler, config.validators);
      if (problem) violations.push(`${where(handler)}: ${handler.entry.name} ${handler.route.path} ${problem}`);
    }
    const handled = new Set(routes.map(route => route.path));
    for (const entry of config.publicRoutes.filter(p => !handled.has(p.key))) {
      violations.push(`${PUBLIC_KEY}: '${entry.key}' is no route handler's path — a stale exemption is the next route's silent hole. Remove it or correct the path`);
    }
    return this.result(violations, context);
  }

  private static result(violations: string[], context: LawCheckContext): LawResult {
    return this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        `Call a guard from ${GUARD_KEY} in every POST/PUT/PATCH/DELETE handler, or wrap the handler in one`,
        `List deliberately public handlers in ${PUBLIC_KEY} with the reason (a signed webhook verifies its signature)`,
        `Validate what request.json()/formData() returns with a call from ${VALIDATOR_KEY}, or narrow it with typeof`,
      ],
      context
    );
  }

  private static handlers(graph: NextModuleGraph, routes: readonly NextRoute[]): Handler[] {
    const handlers: Handler[] = [];
    for (const route of routes) {
      const source = graph.source(route.file);
      if (!source) continue;
      for (const entry of moduleExports(source)) {
        if (MUTATING.has(entry.name) || entry.reexportFrom === '*') handlers.push({ route, source, entry });
      }
    }
    return handlers;
  }

  /** The function that handles the request: the export itself, or the one a wrapper is given. */
  private static handlerFunction(handler: Handler): FunctionLike | null {
    const { entry, source } = handler;
    if (entry.fn) return entry.fn;
    const inner = entry.call?.arguments.find(arg => isFunctionLike(source.ts, arg));
    return inner && isFunctionLike(source.ts, inner) ? inner : null;
  }

  private static guardProblem(handler: Handler, guards: readonly string[]): string | null {
    const { entry, source } = handler;
    if (entry.reexportFrom) {
      return `is re-exported from '${entry.reexportFrom}' — its guard cannot be read here. Define the handler in the route file, or list the route in ${PUBLIC_KEY}`;
    }
    if (entry.call && isGuardWrapper(source, entry.call, guards)) return null;
    const scope: TS.Node | null = entry.call ?? entry.fn;
    if (scope && callsGuard(source, scope, guards, false)) return null;
    return `calls no guard (${guards.join(', ')}) — a mutating endpoint anyone can reach. Call one, or list the route in ${PUBLIC_KEY} with the reason`;
  }

  private static bodyProblem(handler: Handler, validators: readonly string[]): string | null {
    const fn = this.handlerFunction(handler);
    const { source } = handler;
    const ts = source.ts;
    const [request] = fn?.parameters ?? [];
    if (!fn?.body || !request || !ts.isIdentifier(request.name)) return null;
    const requestName = request.name.text;
    let reads = false;
    let validated = false;
    const visit = (node: TS.Node): void => {
      if (ts.isTypeOfExpression(node)) validated = true;
      if (ts.isCallExpression(node)) {
        if (this.readsBody(ts, node, requestName)) reads = true;
        if (validators.length > 0 && isGuardCall(source, node, validators)) validated = true;
      }
      ts.forEachChild(node, visit);
    };
    visit(fn.body);
    if (!reads || validated) return null;
    return validators.length > 0
      ? `reads the request body without a validator (${validators.join(', ')}) or a typeof narrowing — the body is whatever the client sent`
      : `reads the request body with no ${VALIDATOR_KEY} declared and no typeof narrowing — the body is whatever the client sent`;
  }

  /** `request.json()`, `request.formData()`, also through `request.clone()`. */
  private static readsBody(ts: typeof TS, call: TS.CallExpression, requestName: string): boolean {
    const callee = call.expression;
    if (!ts.isPropertyAccessExpression(callee) || !BODY_READS.has(callee.name.text)) return false;
    let receiver: TS.Expression = callee.expression;
    if (ts.isCallExpression(receiver) && ts.isPropertyAccessExpression(receiver.expression) && receiver.expression.name.text === 'clone') {
      receiver = receiver.expression.expression;
    }
    return ts.isIdentifier(receiver) && receiver.text === requestName;
  }
}

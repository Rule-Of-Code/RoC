/**
 * Test Rig Keeps Route Guards (#367)
 *
 * A component or e2e test that builds its own router config — copying the
 * app's paths and components instead of importing the app's route table —
 * drops the guards, resolvers and redirects those routes have in the app.
 * The test then passes for a navigation the real app blocks or sends
 * elsewhere, and a broken deep link stays green.
 *
 * The subject is a test file git publishes that sets up a router
 * (`provideRouter([...])`, `RouterTestingModule.withRoutes([...])`,
 * `RouterModule.forRoot/forChild([...])`) with a literal route
 * ({@link REQUIRES_ROUTE_RIG}). Each hand-written route whose full path is
 * also an app route is compared with it: the guard keys the app route has
 * (its own and its parents', see `route-objects.ts`) and the test route
 * lacks are a finding at the test route's line. The app routes are read
 * from the non-test TS files git publishes that hold a guard key.
 */

import type * as TS from 'typescript';
import type {
  FileContaining,
  LawRequirement,
} from '../../types/enhanced-law.types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  readFilesContaining,
  type ContainingFile,
} from '../../utils/law-requirements';
import {
  loadTypeScript,
  parserUnavailable,
  type TypeScriptModule,
} from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';
import { GUARD_KEYS, routesIn, type RouteObject } from './route-objects';
import { subjectResult } from './subject-result';

const SCRIPT = '{ts,mts,cts,js,mjs,cjs}';
const TEST_FILES = [
  `**/*.{spec,test,cy,e2e}.${SCRIPT}`,
  `**/{e2e,cypress,playwright,test,tests,testing,__tests__}/**/*.${SCRIPT}`,
];
const ROUTER_SETUP = String.raw`(?:\bprovideRouter|\bRouterTestingModule\s*\.\s*withRoutes|\bRouterModule\s*\.\s*for(?:Root|Child))\s*\(`;

/** A test file that sets up a router and writes a route path literally. */
export const ROUTE_RIG_FILES: FileContaining = {
  files: TEST_FILES,
  pattern: String.raw`(?<![\s\S])(?=[\s\S]*${ROUTER_SETUP})(?=[\s\S]*\bpath\s*:\s*['"\x60])`,
};

/** Selected where the Angular router is declared and git publishes a test that declares routes by hand. */
export const REQUIRES_ROUTE_RIG: LawRequirement = {
  anyDependency: ['@angular/router'],
  anyFileContaining: [ROUTE_RIG_FILES],
};

/** App files that give a route a guard, a resolver or a redirect. */
const APP_ROUTE_FILES: FileContaining = {
  files: [`**/*.{ts,mts,cts}`],
  pattern: String.raw`\b(?:${GUARD_KEYS.join('|')})\s*:`,
  exclude: [...TEST_FILES, '**/*.d.ts'],
};

const SETUP_METHODS = new Set(['withRoutes', 'forRoot', 'forChild']);
const SETUP_OWNERS = /(?:^|\.)(?:RouterTestingModule|RouterModule)$/;

interface Rig {
  setups: number;
  routes: Array<RouteObject & { rel: string }>;
}

function unwrap(ts: TypeScriptModule, node: TS.Expression): TS.Expression {
  let current = node;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  )
    current = current.expression;
  return current;
}

function isRouterSetup(ts: TypeScriptModule, call: TS.CallExpression): boolean {
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return callee.text === 'provideRouter';
  return (
    ts.isPropertyAccessExpression(callee) &&
    SETUP_METHODS.has(callee.name.text) &&
    SETUP_OWNERS.test(callee.expression.getText())
  );
}

/** The array a router setup is given: written in the call, or a variable of the same file bound to one. */
function routeArray(
  ts: TypeScriptModule,
  sf: TS.SourceFile,
  call: TS.CallExpression
): TS.Node | null {
  const arg = call.arguments[0] ? unwrap(ts, call.arguments[0]) : null;
  if (!arg) return null;
  if (ts.isArrayLiteralExpression(arg)) return arg;
  if (!ts.isIdentifier(arg)) return null;
  let found: TS.Node | null = null;
  const visit = (node: TS.Node): void => {
    if (found) return;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === arg.text &&
      node.initializer
    ) {
      const init = unwrap(ts, node.initializer);
      if (ts.isArrayLiteralExpression(init)) found = init;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function readRig(ts: TypeScriptModule, file: ContainingFile): Rig {
  const sf = ts.createSourceFile(
    file.rel,
    file.content,
    ts.ScriptTarget.Latest,
    true
  );
  const rig: Rig = { setups: 0, routes: [] };
  const visit = (node: TS.Node): void => {
    if (ts.isCallExpression(node) && isRouterSetup(ts, node)) {
      rig.setups++;
      const array = routeArray(ts, sf, node);
      if (array)
        rig.routes.push(
          ...routesIn(ts, sf, array).map(route => ({ ...route, rel: file.rel }))
        );
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return rig;
}

/** Guarded app routes by full path. */
function appRoutes(
  ts: TypeScriptModule,
  files: readonly ContainingFile[]
): Map<string, Array<RouteObject & { rel: string }>> {
  const byPath = new Map<string, Array<RouteObject & { rel: string }>>();
  for (const file of files) {
    const sf = ts.createSourceFile(
      file.rel,
      file.content,
      ts.ScriptTarget.Latest,
      true
    );
    for (const route of routesIn(ts, sf, sf)) {
      if (route.guards.size === 0) continue;
      byPath.set(route.path, [
        ...(byPath.get(route.path) ?? []),
        { ...route, rel: file.rel },
      ]);
    }
  }
  return byPath;
}

/** A hand-written route that drops guards an app route of the same path has. */
function describeLostGuards(
  route: RouteObject & { rel: string },
  app: ReadonlyArray<RouteObject & { rel: string }>
): string | null {
  for (const appRoute of app) {
    const lost = [...appRoute.guards].filter(key => !route.guards.has(key));
    if (lost.length === 0) continue;
    return `${route.rel}:${route.line}: the test re-declares the route '${route.written}' by hand; in the app (${appRoute.rel}:${appRoute.line}) it has ${lost.join(', ')}, which the test route drops — the test passes for navigations the app blocks or redirects; import the route (or its guards) from the app's route file`;
  }
  return null;
}

export class TestRigKeepsRouteGuardsLaw extends LawBase {
  static readonly LAW_NAME = 'Test Rig Keeps Route Guards';

  static check(context: LawCheckContext): LawResult {
    const ignores = context.config.ignores?.global ?? [];
    const specs = readFilesContaining(
      context.projectRoot,
      ROUTE_RIG_FILES,
      ignores
    );
    const ts = loadTypeScript(context.projectRoot);
    const suggestions = [
      "Import the app's route objects (or the guard and resolver list) from its route file instead of copying paths and components",
      "Where a test must stub a guard, keep the key and provide the stub (canMatch: [() => true]) so the shape stays the app's",
    ];
    if (!ts) {
      return subjectResult({
        ...this.empty(context, suggestions),
        nothingRead: `${specs.length} test file(s): ${parserUnavailable(context.projectRoot)}`,
      });
    }
    const rigs = specs.map(file => readRig(ts, file));
    const setups = rigs.reduce((n, rig) => n + rig.setups, 0);
    // A routes variable given to two setups in one file is one declaration: count and report it once.
    const routes = rigs
      .flatMap(rig => rig.routes)
      .filter(route => route.path !== '' && route.path !== '**')
      .filter(
        (route, index, all) =>
          all.findIndex(
            other =>
              other.rel === route.rel &&
              other.line === route.line &&
              other.path === route.path
          ) === index
      );
    const app = appRoutes(
      ts,
      readFilesContaining(context.projectRoot, APP_ROUTE_FILES, ignores)
    );
    const compared = routes.filter(route => app.has(route.path));
    const findings = compared.flatMap(
      route => describeLostGuards(route, app.get(route.path) ?? []) ?? []
    );
    return subjectResult({
      lawName: this.LAW_NAME,
      category: 'TESTING',
      context,
      findings,
      suggestions,
      filesRead: specs.length,
      nothingRead: 'no test file that selected the law could be read',
      judged: setups,
      noSubject:
        '0 router setups (provideRouter, RouterTestingModule.withRoutes, RouterModule.forRoot/forChild — the selecting text was in a comment or a string) — nothing to judge',
      passSummary: `${setups} router setup(s) in ${specs.length} test file(s), ${routes.length} route(s) declared by hand, ${compared.length} of them also a guarded app route (${[...app.values()].flat().length} guarded app route(s) read) — none drops a guard`,
      notSeen:
        'not seen: app routes loaded from another file through loadChildren (their paths are read without the parent prefix), routes built by a function, and test routes passed through a variable of another file',
      metrics: {
        filesRead: specs.length,
        routerSetups: setups,
        handDeclaredRoutes: routes.length,
        comparedRoutes: compared.length,
      },
    });
  }

  private static empty(context: LawCheckContext, suggestions: string[]) {
    return {
      lawName: this.LAW_NAME,
      category: 'TESTING',
      context,
      findings: [],
      suggestions,
      filesRead: 0,
      judged: 0,
      noSubject: '',
      passSummary: '',
      notSeen: '',
      metrics: {
        filesRead: 0,
        routerSetups: 0,
        handDeclaredRoutes: 0,
        comparedRoutes: 0,
      },
    };
  }
}

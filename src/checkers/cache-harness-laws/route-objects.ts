/**
 * Angular route objects, read with the TypeScript compiler.
 *
 * A route object is an object literal with a string `path`. Its full path
 * joins the paths of the routes whose `children` hold it (in the same file),
 * and parameter names are normalised (`:id` and `:itemId` are one segment),
 * so a test route `items/:id` and an app route `:itemId` under `items` are
 * the same deep link. Its guards are the keys that change what a navigation
 * reaches — `canActivate`, `canActivateChild`, `canMatch`, `canLoad`,
 * `canDeactivate`, `resolve`, `redirectTo` — its own, and those of its
 * parents that apply to their children (all but `canDeactivate` and
 * `redirectTo`).
 */

import type * as TS from 'typescript';
import type { TypeScriptModule } from '../../utils/react/tsx-source';

export const GUARD_KEYS = ['canActivate', 'canActivateChild', 'canMatch', 'canLoad', 'canDeactivate', 'resolve', 'redirectTo'] as const;
const INHERITED = new Set(['canActivate', 'canActivateChild', 'canMatch', 'canLoad', 'resolve']);

export interface RouteObject {
  /** Full path, normalised: no leading/trailing slash, `:param` for every parameter. */
  path: string;
  /** As written in the object. */
  written: string;
  line: number;
  /** Guard keys that apply to this route: its own and inherited ones. */
  guards: Set<string>;
}

function propertyName(ts: TypeScriptModule, property: TS.ObjectLiteralElementLike): string | null {
  if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property) && !ts.isMethodDeclaration(property)) return null;
  const name = property.name;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
}

function stringValue(ts: TypeScriptModule, node: TS.Expression): string | null {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : null;
}

/** The literal `path` of an object, or null when it is not a route object. */
function pathOf(ts: TypeScriptModule, object: TS.ObjectLiteralExpression): string | null {
  for (const property of object.properties) {
    if (ts.isPropertyAssignment(property) && propertyName(ts, property) === 'path') return stringValue(ts, property.initializer);
  }
  return null;
}

function ownGuards(ts: TypeScriptModule, object: TS.ObjectLiteralExpression): string[] {
  return object.properties.flatMap(property => {
    const name = propertyName(ts, property);
    return name && (GUARD_KEYS as readonly string[]).includes(name) ? [name] : [];
  });
}

/** The route object whose `children` array holds this one, or null. */
function parentRoute(ts: TypeScriptModule, object: TS.ObjectLiteralExpression): TS.ObjectLiteralExpression | null {
  let node: TS.Node = object.parent;
  while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) node = node.parent;
  if (!ts.isArrayLiteralExpression(node)) return null;
  const holder = node.parent;
  if (!holder || !ts.isPropertyAssignment(holder) || propertyName(ts, holder) !== 'children') return null;
  return ts.isObjectLiteralExpression(holder.parent) && pathOf(ts, holder.parent) !== null ? holder.parent : null;
}

export function normalisePath(path: string): string {
  return path
    .split('/')
    .filter(segment => segment !== '')
    .map(segment => (segment.startsWith(':') ? ':param' : segment))
    .join('/');
}

/** The route of an object literal, with its full path and the guards that apply to it; null when it has no literal path. */
export function routeOf(ts: TypeScriptModule, sf: TS.SourceFile, object: TS.ObjectLiteralExpression): RouteObject | null {
  const written = pathOf(ts, object);
  if (written === null) return null;
  const segments = [written];
  const guards = new Set(ownGuards(ts, object));
  for (let parent = parentRoute(ts, object); parent !== null; parent = parentRoute(ts, parent)) {
    segments.unshift(pathOf(ts, parent) ?? '');
    ownGuards(ts, parent)
      .filter(key => INHERITED.has(key))
      .forEach(key => guards.add(key));
  }
  return {
    path: normalisePath(segments.join('/')),
    written,
    line: sf.getLineAndCharacterOfPosition(object.getStart(sf)).line + 1,
    guards,
  };
}

/** Every route object of a subtree (the subtree itself included). */
export function routesIn(ts: TypeScriptModule, sf: TS.SourceFile, root: TS.Node): RouteObject[] {
  const out: RouteObject[] = [];
  const visit = (node: TS.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const route = routeOf(ts, sf, node);
      if (route) out.push(route);
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return out;
}

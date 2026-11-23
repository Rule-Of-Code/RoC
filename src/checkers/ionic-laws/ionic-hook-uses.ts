/**
 * How a project refers to a class that declares Ionic view hooks: created by
 * Ionic (a route or controller `component`, `loadComponent`, an ion-nav
 * call), composed into a template (an `imports` / `declarations` /
 * `exports` array), or used as a value some other way. Used by Ionic View
 * Hooks Only On Pages.
 */

import type * as TS from 'typescript';
import type { LawCheckContext } from '../../types/law.types';
import { AngularComponents } from '../../utils/ionic/angular-components';
import type { TsxSource } from '../../utils/react/tsx-source';

/** Arrays whose members a template renders. */
const TEMPLATE_ARRAYS = new Set(['imports', 'declarations', 'exports']);
/** ion-nav methods that create the component they are given. */
const NAV_METHODS = new Set([
  'push',
  'setRoot',
  'insert',
  'insertPages',
  'setPages',
]);

/** How every file refers to the hook classes, and which classes extend which. */
export interface Evidence {
  created: Set<string>;
  composed: Map<string, string>;
  byValue: Map<string, string>;
  /** base class name → names of classes that extend it */
  subclasses: Map<string, Set<string>>;
  defaultLoads: Set<string>;
  unresolvedDefaultLoads: number;
}

/** Record what one occurrence of a hook class's name says about how the class is used. */
export function recordUse(
  context: LawCheckContext,
  source: TsxSource,
  node: TS.Identifier,
  evidence: Evidence
): void {
  const ts = source.ts;
  const parent = node.parent;
  const where = `${AngularComponents.relative(context, source.fileName)}:${source.lineOf(node)}`;
  const kind = useKind(ts, node, parent);
  if (kind === 'created') evidence.created.add(node.text);
  if (kind === 'composed' && !evidence.composed.has(node.text))
    evidence.composed.set(node.text, where);
  if (kind === 'value' && !evidence.byValue.has(node.text))
    evidence.byValue.set(node.text, where);
}

/** What one occurrence of a hook class's name means; null when it is not a value use. */
function useKind(
  ts: typeof TS,
  node: TS.Identifier,
  parent: TS.Node
): 'created' | 'composed' | 'value' | null {
  if (isDeclarationOrType(ts, node, parent)) return null;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return insideKey(ts, parent, 'loadComponent') ? 'created' : null;
  }
  if (ts.isShorthandPropertyAssignment(parent)) return 'value';
  return argumentOrElementKind(ts, node, parent);
}

/** A property value, a call argument, or an element of an array. */
function argumentOrElementKind(
  ts: typeof TS,
  node: TS.Identifier,
  parent: TS.Node
): 'created' | 'composed' | 'value' {
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    return keyOf(ts, parent) === 'component' ? 'created' : 'value';
  }
  if (
    ts.isCallExpression(parent) &&
    parent.arguments.includes(node as TS.Expression)
  ) {
    return isNavCall(ts, parent) ? 'created' : 'value';
  }
  return inTemplateArray(ts, parent) ? 'composed' : 'value';
}

/** `nav.push(X)`, `nav.setRoot(X)`, … — ion-nav creates what it is given. */
function isNavCall(ts: typeof TS, call: TS.CallExpression): boolean {
  const callee = call.expression;
  return (
    ts.isPropertyAccessExpression(callee) && NAV_METHODS.has(callee.name.text)
  );
}

/** An element of `imports: [...]` / `declarations: [...]` / `exports: [...]`. */
function inTemplateArray(ts: typeof TS, parent: TS.Node): boolean {
  if (
    !ts.isArrayLiteralExpression(parent) ||
    !ts.isPropertyAssignment(parent.parent)
  )
    return false;
  const key = keyOf(ts, parent.parent);
  return key !== null && TEMPLATE_ARRAYS.has(key);
}

function isDeclarationOrType(
  ts: typeof TS,
  node: TS.Identifier,
  parent: TS.Node
): boolean {
  if (isClassName(ts, node, parent)) return true;
  if (isImportOrTypeNode(ts, parent)) return true;
  // Any other node whose `name` this is — an interface, a variable, an object key — declares, not uses.
  const named =
    !ts.isShorthandPropertyAssignment(parent) &&
    !ts.isPropertyAccessExpression(parent);
  return named && (parent as { name?: TS.Node }).name === node;
}

/** The name of a class declaration or class expression. */
function isClassName(
  ts: typeof TS,
  node: TS.Identifier,
  parent: TS.Node
): boolean {
  return (
    (ts.isClassDeclaration(parent) || ts.isClassExpression(parent)) &&
    parent.name === node
  );
}

/** An import or export specifier, an import clause, or a type position. */
function isImportOrTypeNode(ts: typeof TS, parent: TS.Node): boolean {
  return (
    ts.isImportSpecifier(parent) ||
    ts.isExportSpecifier(parent) ||
    ts.isImportClause(parent) ||
    ts.isExpressionWithTypeArguments(parent) ||
    ts.isTypeReferenceNode(parent) ||
    ts.isQualifiedName(parent) ||
    ts.isTypeQueryNode(parent)
  );
}

/** The key of a property assignment, when it is an identifier or a string. */
export function keyOf(
  ts: typeof TS,
  node: TS.PropertyAssignment
): string | null {
  const name = node.name;
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
}

function insideKey(ts: typeof TS, node: TS.Node, key: string): boolean {
  let current: TS.Node | undefined = node.parent;
  while (current && !ts.isSourceFile(current)) {
    if (ts.isPropertyAssignment(current) && keyOf(ts, current) === key)
      return true;
    current = current.parent;
  }
  return false;
}

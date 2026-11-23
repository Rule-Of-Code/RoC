/**
 * Small syntax helpers the Capacitor bridge laws share: the string an
 * expression stands for, a class's decorators, an object literal's property,
 * the nearest enclosing node of a kind, and the `.name(…)` calls under a
 * node. See capacitor-sources.ts for the bridge reading built on them.
 */

import type * as TS from 'typescript';
import type { TsxSource } from '../react/tsx-source';

/**
 * The string an expression stands for: a literal, or an identifier bound to a
 * `const` string literal in the same file. Null when it is built at runtime
 * or defined elsewhere.
 */
export function stringValue(
  source: TsxSource,
  expression: TS.Expression | undefined
): string | null {
  const ts = source.ts;
  if (!expression) return null;
  if (ts.isStringLiteralLike(expression)) return expression.text;
  if (!ts.isIdentifier(expression)) return null;
  let value: string | null = null;
  source.walk(node => {
    if (
      value === null &&
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === expression.text &&
      node.initializer &&
      ts.isStringLiteralLike(node.initializer) &&
      ts.isVariableDeclarationList(node.parent) &&
      (node.parent.flags & ts.NodeFlags.Const) !== 0
    ) {
      value = node.initializer.text;
    }
  });
  return value;
}

/** The decorator names on a class (`Component`, `Injectable`), with their first argument. */
export function classDecorators(
  source: TsxSource,
  node: TS.ClassLikeDeclaration
): Array<{ name: string; argument: TS.Expression | undefined }> {
  const ts = source.ts;
  const decorators = ts.canHaveDecorators(node)
    ? (ts.getDecorators(node) ?? [])
    : [];
  return decorators.flatMap(decorator => {
    const expression = decorator.expression;
    if (
      ts.isCallExpression(expression) &&
      ts.isIdentifier(expression.expression)
    ) {
      return [
        { name: expression.expression.text, argument: expression.arguments[0] },
      ];
    }
    if (ts.isIdentifier(expression))
      return [{ name: expression.text, argument: undefined }];
    return [];
  });
}

/** The value of a property in an object literal, by name. */
export function objectProperty(
  source: TsxSource,
  object: TS.Expression | undefined,
  name: string
): TS.Expression | undefined {
  const ts = source.ts;
  if (!object || !ts.isObjectLiteralExpression(object)) return undefined;
  for (const property of object.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) &&
      property.name.text === name
    ) {
      return property.initializer;
    }
  }
  return undefined;
}

/** The nearest enclosing node that satisfies `test`, or undefined. */
export function enclosing<T extends TS.Node>(
  node: TS.Node,
  test: (candidate: TS.Node) => candidate is T
): T | undefined {
  let current: TS.Node | undefined = node.parent;
  while (current) {
    if (test(current)) return current;
    current = current.parent;
  }
  return undefined;
}

/** Every call expression under `root` whose callee is `<anything>.<name>(…)`. */
export function methodCalls(
  source: TsxSource,
  root: TS.Node,
  name: string
): TS.CallExpression[] {
  const ts = source.ts;
  const found: TS.CallExpression[] = [];
  const visit = (node: TS.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === name
    ) {
      found.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return found;
}

/**
 * Which numeric literals in a file are already named — read from the
 * TypeScript syntax tree, so only code is read (#424, #431).
 *
 * The text detector blanked strings by hand, skipped a regex literal without
 * blanking it (so `{0,300}` was a "magic number"), blanked whole template
 * literals (so `${text.slice(0, 57)}` was never seen), and accepted a name
 * only in `const X = N` or `key: N` on the same line. Here a literal is a node,
 * strings and regexes hold none, and a literal is named when the code around
 * it gives it a name:
 *
 *  - it initialises a variable, a property, a class field, an enum member, a
 *    parameter or a destructuring default (`before = 50`);
 *  - it is part of a constant expression that does (`24 * 60 * 60 * 1000`) or
 *    an element of a named array;
 *  - it is an element of a `new Set([...])`/`new Map([...])` that initialises
 *    a named const or a class field — the collection names its elements only
 *    as a whole, so built anywhere else they are not named by it;
 *  - it is the fallback of `??` — the left side names it
 *    (`config.thresholds?.max ?? 50`);
 *  - it is the radix argument of `parseInt`.
 */
import type * as TS from 'typescript';

/** One numeric literal in code: its text and its offset in the file. */
export interface NumericLiteralSite {
  text: string;
  start: number;
  named: boolean;
}

/** A literal, a parenthesised one, or arithmetic over nothing but literals. */
function isConstantExpression(ts: typeof TS, node: TS.Expression): boolean {
  if (ts.isNumericLiteral(node)) return true;
  if (ts.isParenthesizedExpression(node) || ts.isPrefixUnaryExpression(node)) {
    return isConstantExpression(
      ts,
      ts.isParenthesizedExpression(node) ? node.expression : node.operand
    );
  }
  return (
    ts.isBinaryExpression(node) &&
    isConstantExpression(ts, node.left) &&
    isConstantExpression(ts, node.right)
  );
}

/** `new Set([...])`, `new Map([...])`: a collection of the values it is given. */
function isCollectionConstruction(ts: typeof TS, node: TS.Node): boolean {
  return (
    ts.isNewExpression(node) &&
    ts.isIdentifier(node.expression) &&
    ['Set', 'Map', 'WeakSet', 'WeakMap'].includes(node.expression.text)
  );
}

/** Where the literal's name comes from, and whether a Set/Map was on the way. */
interface NamingPosition {
  node: TS.Node;
  inCollection: boolean;
}

/**
 * The node whose position names the literal: climb out of the constant
 * expression, the array or the collection the literal is part of.
 */
function namingPosition(ts: typeof TS, literal: TS.Node): NamingPosition {
  let node = literal;
  let inCollection = false;
  for (;;) {
    const parent = node.parent;
    const collection = isCollectionConstruction(ts, parent);
    const climbs =
      ts.isParenthesizedExpression(parent) ||
      ts.isPrefixUnaryExpression(parent) ||
      (ts.isBinaryExpression(parent) && isConstantExpression(ts, parent)) ||
      ts.isArrayLiteralExpression(parent) ||
      ts.isAsExpression(parent) ||
      collection;
    if (!climbs) return { node, inCollection };
    inCollection ||= collection;
    node = parent;
  }
}

/** A Set/Map names its elements only as the initializer of a const or a class field. */
function collectionIsNamed(
  ts: typeof TS,
  parent: TS.Node,
  node: TS.Node
): boolean {
  if (ts.isPropertyDeclaration(parent)) return parent.initializer === node;
  return (
    ts.isVariableDeclaration(parent) &&
    parent.initializer === node &&
    (ts.getCombinedNodeFlags(parent) & ts.NodeFlags.Const) !== 0
  );
}

/** A declaration that gives its initializer a name. */
function initializerIsNamed(
  ts: typeof TS,
  parent: TS.Node,
  node: TS.Node
): boolean {
  return (
    (ts.isVariableDeclaration(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isEnumMember(parent) ||
      ts.isParameter(parent) ||
      ts.isBindingElement(parent)) &&
    parent.initializer === node
  );
}

/** `x ?? N`: the value N stands in for is named on the left. */
function isNullishFallback(
  ts: typeof TS,
  parent: TS.Node,
  node: TS.Node
): boolean {
  return (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken &&
    parent.right === node
  );
}

/** The second argument of `parseInt(...)` / `Number.parseInt(...)`. */
function isRadix(ts: typeof TS, parent: TS.Node, node: TS.Node): boolean {
  if (!ts.isCallExpression(parent) || parent.arguments[1] !== node)
    return false;
  const callee = parent.expression;
  const name = ts.isPropertyAccessExpression(callee) ? callee.name : callee;
  return ts.isIdentifier(name) && name.text === 'parseInt';
}

/** Whether the code around a numeric literal already names it. */
function isNamed(ts: typeof TS, literal: TS.NumericLiteral): boolean {
  const { node, inCollection } = namingPosition(ts, literal);
  const parent = node.parent;
  if (inCollection) return collectionIsNamed(ts, parent, node);
  return (
    initializerIsNamed(ts, parent, node) ||
    isNullishFallback(ts, parent, node) ||
    isRadix(ts, parent, node)
  );
}

/** Every numeric literal written in the code of a file. */
export function numericLiterals(
  ts: typeof TS,
  source: TS.SourceFile
): NumericLiteralSite[] {
  const sites: NumericLiteralSite[] = [];
  const visit = (node: TS.Node): void => {
    if (ts.isNumericLiteral(node)) {
      sites.push({
        text: node.getText(source),
        start: node.getStart(source),
        named: isNamed(ts, node),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return sites;
}

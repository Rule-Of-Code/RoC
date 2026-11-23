import type * as TS from 'typescript';

/**
 * Event handlers that can fail with nothing to catch it (#536).
 *
 * The rule judged the file: an `addEventListener(` anywhere and no `try` or
 * `catch` anywhere. A synchronous three-line handler that removes itself and
 * resolves a promise cannot throw anything worth catching, yet it was a
 * finding; and a file passed when the word `try` appeared in a comment.
 *
 * The handler is judged now. It can fail when it is `async` or awaits,
 * throws, or calls something that throws on bad input or a failed request
 * (`JSON.parse`, `fetch`, `XMLHttpRequest`, `axios`, an HTTP client). It is
 * guarded when its body has a `try` or a `.catch(`. A handler passed by name
 * is looked up among the file's own functions; one defined elsewhere is not
 * judged.
 */
export function findUnguardedListeners(
  ts: typeof TS,
  source: TS.SourceFile
): number[] {
  const functions = namedFunctions(ts, source);
  const lines: number[] = [];
  const visit = (node: TS.Node): void => {
    if (isAddEventListener(ts, node)) {
      const handler = resolveHandler(ts, node.arguments[1], functions);
      if (handler && canFail(ts, handler) && !isGuarded(ts, handler)) {
        lines.push(
          source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return lines;
}

type FunctionLike =
  TS.ArrowFunction | TS.FunctionExpression | TS.FunctionDeclaration;

/** `x.addEventListener(type, handler, …)`. */
function isAddEventListener(
  ts: typeof TS,
  node: TS.Node
): node is TS.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'addEventListener' &&
    node.arguments.length >= 2
  );
}

/** Functions declared by name in the file: `function f` and `const f = () => …`. */
function namedFunctions(
  ts: typeof TS,
  source: TS.SourceFile
): Map<string, FunctionLike> {
  const found = new Map<string, FunctionLike>();
  const visit = (node: TS.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      found.set(node.name.text, node);
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) ||
        ts.isFunctionExpression(node.initializer))
    ) {
      found.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** The handler argument as a function, inline or by name; undefined if not found. */
function resolveHandler(
  ts: typeof TS,
  argument: TS.Expression | undefined,
  functions: Map<string, FunctionLike>
): FunctionLike | undefined {
  if (!argument) return undefined;
  if (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument))
    return argument;
  return ts.isIdentifier(argument) ? functions.get(argument.text) : undefined;
}

/** Calls that throw on bad input or a failed request. */
const FAILING_CALL =
  /^(?:JSON\.parse|fetch|axios(?:\.\w+)?|(?:this\.)?(?:http|httpClient)\.\w+)$/;

/** Whether the handler can fail: async, awaits, throws, or calls a failing API. */
function canFail(ts: typeof TS, handler: FunctionLike): boolean {
  if (
    ts.getModifiers(handler)?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)
  )
    return true;
  let fails = false;
  const visit = (node: TS.Node): void => {
    if (fails || isNestedFunction(ts, node, handler)) return;
    if (
      ts.isAwaitExpression(node) ||
      ts.isThrowStatement(node) ||
      (ts.isNewExpression(node) &&
        node.expression.getText() === 'XMLHttpRequest') ||
      (ts.isCallExpression(node) &&
        FAILING_CALL.test(node.expression.getText()))
    ) {
      fails = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  if (handler.body) visit(handler.body);
  return fails;
}

/** Whether the handler's body has a `try` or a `.catch(`. */
function isGuarded(ts: typeof TS, handler: FunctionLike): boolean {
  let guarded = false;
  const visit = (node: TS.Node): void => {
    if (guarded) return;
    if (
      ts.isTryStatement(node) ||
      (ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'catch')
    ) {
      guarded = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  if (handler.body) visit(handler.body);
  return guarded;
}

/** A function nested in the handler: its own body is not the handler's. */
function isNestedFunction(
  ts: typeof TS,
  node: TS.Node,
  handler: FunctionLike
): boolean {
  return (
    node !== handler &&
    (ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node) ||
      ts.isFunctionDeclaration(node))
  );
}

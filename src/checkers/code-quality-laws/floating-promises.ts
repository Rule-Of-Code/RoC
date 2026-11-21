/**
 * Promises whose rejection nobody can see (#438).
 *
 * Error Handling Completeness counted `await \w+` against `try {` and
 * `.catch(` in the raw file and flagged a file with more than four awaits per
 * handler. An awaited promise is not a gap: its rejection is thrown at the
 * `await`, into the enclosing `try` or out to the caller, who handles it or
 * lets the entry point do so. The gap is a promise that is DROPPED — started
 * as a statement, neither awaited, returned, `void`-ed nor given a rejection
 * handler — whose rejection becomes an unhandled rejection.
 *
 * Without type information "is a promise" is read from the syntax: a
 * `.then(…)` chain, or a call to a function this file declares `async`.
 */
import type * as TS from 'typescript';

/** One dropped promise: the 1-based line it starts on and what it is. */
export interface FloatingPromise {
  line: number;
  kind: 'then-chain' | 'async-call';
}

/** True when the declaration carries the `async` modifier. */
function isAsync(ts: typeof TS, node: TS.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some(
      m => m.kind === ts.SyntaxKind.AsyncKeyword
    )
  );
}

/** Names of the async functions, and of the async methods per class, the file declares. */
function asyncDeclarations(
  ts: typeof TS,
  source: TS.SourceFile
): { functions: Set<string>; methods: Map<string, Set<string>> } {
  const functions = new Set<string>();
  const methods = new Map<string, Set<string>>();
  const visit = (node: TS.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name && isAsync(ts, node))
      functions.add(node.name.text);
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) ||
        ts.isFunctionExpression(node.initializer)) &&
      isAsync(ts, node.initializer)
    )
      functions.add(node.name.text);
    if (ts.isClassDeclaration(node) && node.name) {
      const names = new Set<string>();
      for (const member of node.members)
        if (
          ts.isMethodDeclaration(member) &&
          ts.isIdentifier(member.name) &&
          isAsync(ts, member)
        )
          names.add(member.name.text);
      methods.set(node.name.text, names);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { functions, methods };
}

/** The class a node is written in, if any. */
function enclosingClass(
  ts: typeof TS,
  node: TS.Node
): TS.ClassDeclaration | null {
  let current = node.parent;
  while (current && !ts.isClassDeclaration(current)) current = current.parent;
  return current ?? null;
}

/** `f()`, `this.m()` or `Klass.m()` where f / m is declared async in this file. */
function isAsyncCall(
  ts: typeof TS,
  call: TS.CallExpression,
  declared: ReturnType<typeof asyncDeclarations>
): boolean {
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return declared.functions.has(callee.text);
  if (!ts.isPropertyAccessExpression(callee)) return false;
  const method = callee.name.text;
  const target = callee.expression;
  if (target.kind === ts.SyntaxKind.ThisKeyword) {
    const owner = enclosingClass(ts, call)?.name?.text;
    return !!owner && !!declared.methods.get(owner)?.has(method);
  }
  return (
    ts.isIdentifier(target) && !!declared.methods.get(target.text)?.has(method)
  );
}

/** The method name of `x.name(…)`, or null. */
function methodName(ts: typeof TS, call: TS.CallExpression): string | null {
  return ts.isPropertyAccessExpression(call.expression)
    ? call.expression.name.text
    : null;
}

/**
 * For a promise chain used as a statement: 'handled' when its last
 * rejection-relevant link is `.catch(…)` or a two-argument `.then`, 'open'
 * when it is a one-argument `.then` (or a `.finally` after one), and null
 * when it is not a `.then` chain at all.
 */
function chainState(
  ts: typeof TS,
  expression: TS.Expression
): 'handled' | 'open' | null {
  let current: TS.Expression = expression;
  while (ts.isCallExpression(current)) {
    const name = methodName(ts, current);
    if (name === 'catch') return 'handled';
    if (name === 'then')
      return current.arguments.length >= 2 ? 'handled' : 'open';
    if (name !== 'finally') return null;
    current = (current.expression as TS.PropertyAccessExpression).expression;
  }
  return null;
}

/** Every promise of the file that is started as a statement and dropped. */
export function findFloatingPromises(
  ts: typeof TS,
  source: TS.SourceFile
): FloatingPromise[] {
  const declared = asyncDeclarations(ts, source);
  const found: FloatingPromise[] = [];
  const visit = (node: TS.Node): void => {
    if (ts.isExpressionStatement(node)) {
      let expression = node.expression;
      while (ts.isParenthesizedExpression(expression))
        expression = expression.expression;
      const line =
        source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      const state = chainState(ts, expression);
      if (state === 'open') found.push({ line, kind: 'then-chain' });
      else if (
        state === null &&
        ts.isCallExpression(expression) &&
        isAsyncCall(ts, expression, declared)
      )
        found.push({ line, kind: 'async-call' });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

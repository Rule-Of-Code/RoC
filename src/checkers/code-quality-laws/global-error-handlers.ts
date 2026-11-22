/**
 * A last-resort error handler, recognised in the code (#438).
 *
 * The law looked for the text `ErrorHandler`, `process.on`, `ErrorBoundary`…
 * anywhere in an entry file, so a function named `setupErrorHandlers` that
 * handled only stream errors, `process.on('SIGINT')`, or the word in a
 * comment counted as a global handler. Here the parse is read:
 *
 * - Node: `process.on/once/addListener/prependListener('unhandledRejection' |
 *   'uncaughtException', …)`;
 * - browser: an assignment to `window.onerror`, or
 *   `window.addEventListener('error' | 'unhandledrejection', …)`;
 * - frameworks, by identifier in code: Angular's `ErrorHandler` (provided or
 *   implemented), a class or component whose name ends in `ErrorBoundary` or
 *   `GlobalErrorHandler`, `errorHandlerInterceptor`, `provideHttpClient`,
 *   `provideBrowserGlobalErrorListeners`;
 * - a command-line program: in the package's `bin` entry, `parse()` or
 *   `parseAsync()` called inside a `try` that has a `catch` — together with
 *   a catch in each action, a failure is reported, not dropped (maintainer
 *   decision for 8.0.0).
 */
import type * as TS from 'typescript';

const PROCESS_EVENTS = new Set(['unhandledRejection', 'uncaughtException']);
const WINDOW_EVENTS = new Set(['error', 'unhandledrejection']);
const LISTENER_METHODS = new Set([
  'on',
  'once',
  'addListener',
  'prependListener',
]);
const FRAMEWORK_NAMES = new Set([
  'ErrorHandler',
  'errorHandlerInterceptor',
  'provideHttpClient',
  'provideBrowserGlobalErrorListeners',
]);
const FRAMEWORK_SUFFIXES = ['ErrorBoundary', 'GlobalErrorHandler'];
const CLI_PARSE_METHODS = new Set(['parse', 'parseAsync']);

/** `<object>.<method>(<event>, …)` with the first argument a string. */
function listenerCall(
  ts: typeof TS,
  node: TS.Node
): { object: string; method: string; event: string } | null {
  if (!ts.isCallExpression(node)) return null;
  const callee = node.expression;
  const first = node.arguments[0];
  if (
    !ts.isPropertyAccessExpression(callee) ||
    !ts.isIdentifier(callee.expression) ||
    !first ||
    !ts.isStringLiteralLike(first)
  )
    return null;
  return {
    object: callee.expression.text,
    method: callee.name.text,
    event: first.text,
  };
}

/** `process.on('unhandledRejection', …)` or `window.addEventListener('error', …)`. */
function isRuntimeHandler(ts: typeof TS, node: TS.Node): boolean {
  const call = listenerCall(ts, node);
  if (!call) return false;
  if (call.object === 'process')
    return LISTENER_METHODS.has(call.method) && PROCESS_EVENTS.has(call.event);
  return (
    call.object === 'window' &&
    call.method === 'addEventListener' &&
    WINDOW_EVENTS.has(call.event)
  );
}

/** `window.onerror = …`. */
function isWindowOnError(ts: typeof TS, node: TS.Node): boolean {
  return (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    ts.isPropertyAccessExpression(node.left) &&
    node.left.name.text === 'onerror' &&
    ts.isIdentifier(node.left.expression) &&
    node.left.expression.text === 'window'
  );
}

/** An identifier a framework's global handler is known by. */
function isFrameworkHandlerName(ts: typeof TS, node: TS.Node): boolean {
  if (!ts.isIdentifier(node)) return false;
  return (
    FRAMEWORK_NAMES.has(node.text) ||
    FRAMEWORK_SUFFIXES.some(suffix => node.text.endsWith(suffix))
  );
}

/** True when any node of the file satisfies `test`. */
function anyNode(
  source: TS.SourceFile,
  ts: typeof TS,
  test: (node: TS.Node) => boolean
): boolean {
  let found = false;
  const visit = (node: TS.Node): void => {
    if (found) return;
    if (test(node)) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** A global handler registered or provided in this file's code. */
export function registersGlobalHandler(
  ts: typeof TS,
  source: TS.SourceFile
): boolean {
  return anyNode(
    source,
    ts,
    node =>
      isRuntimeHandler(ts, node) ||
      isWindowOnError(ts, node) ||
      isFrameworkHandlerName(ts, node)
  );
}

/** `x.parse()` / `x.parseAsync()` called inside the block. */
function callsCliParse(ts: typeof TS, block: TS.Block): boolean {
  let found = false;
  const visit = (node: TS.Node): void => {
    if (found) return;
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      CLI_PARSE_METHODS.has(node.expression.name.text)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(block);
  return found;
}

/** A `try { …parse()… } catch` in the file: a CLI entry point that reports what fails. */
export function wrapsCliParse(ts: typeof TS, source: TS.SourceFile): boolean {
  return anyNode(
    source,
    ts,
    node =>
      ts.isTryStatement(node) &&
      node.catchClause !== undefined &&
      callsCliParse(ts, node.tryBlock)
  );
}

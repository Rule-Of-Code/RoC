/**
 * Why a prop value a Server Component passes cannot cross to a Client
 * Component: a plain function (not a Server Function), an instance of a class
 * React's Flight serializer does not accept, or such a value inside an object
 * or array literal. Used by Next Client Props Serializable.
 */

import type * as TS from 'typescript';
import type { TsxSource } from '../../utils/react/tsx-source';

/** Classes React's Flight serializer accepts (react-server-dom renderModelDestructive). */
const SERIALIZABLE_CLASSES = new Set([
  'Date',
  'Map',
  'Set',
  'Array',
  'Object',
  'Promise',
  'FormData',
  'Blob',
  'ReadableStream',
  'ArrayBuffer',
  'DataView',
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
  'Error',
  'TypeError',
  'RangeError',
  'SyntaxError',
  'ReferenceError',
  'EvalError',
  'URIError',
  'AggregateError',
]);

const FUNCTION_PROBLEM =
  "functions cannot be passed from a Server Component to a Client Component unless they are Server Functions ('use server')";

/** Why a prop value cannot cross to the client, or null. Walks object and array literals. */
export function propProblem(
  ts: TsxSource['ts'],
  expression: TS.Expression | undefined,
  depth = 0
): string | null {
  if (!expression || depth > 4) return null;
  const value = unwrapValue(ts, expression);
  if (isPlainFunction(ts, value)) return `is a function — ${FUNCTION_PROBLEM}`;
  if (ts.isNewExpression(value)) return instanceProblem(value);
  if (ts.isObjectLiteralExpression(value)) {
    const values = objectValues(ts, value);
    return values === 'method'
      ? `holds a method — ${FUNCTION_PROBLEM}`
      : firstProblem(ts, values, depth);
  }
  if (ts.isArrayLiteralExpression(value))
    return firstProblem(ts, [...value.elements], depth);
  return null;
}

function objectValues(
  ts: TsxSource['ts'],
  literal: TS.ObjectLiteralExpression
): TS.Expression[] | 'method' {
  const values: TS.Expression[] = [];
  for (const property of literal.properties) {
    if (ts.isMethodDeclaration(property) || ts.isAccessor(property))
      return 'method';
    if (ts.isPropertyAssignment(property)) values.push(property.initializer);
  }
  return values;
}

function firstProblem(
  ts: TsxSource['ts'],
  values: TS.Expression[],
  depth: number
): string | null {
  for (const value of values) {
    const problem = propProblem(ts, value, depth + 1);
    if (problem)
      return problem.startsWith('holds')
        ? problem
        : `holds a value that ${problem}`;
  }
  return null;
}

/** An inline Server Function: its body opens with the `'use server'` directive. */
function isServerFunction(
  ts: TsxSource['ts'],
  fn: TS.ArrowFunction | TS.FunctionExpression
): boolean {
  const body = fn.body;
  if (!body || !ts.isBlock(body)) return false;
  const first = body.statements[0];
  return (
    first !== undefined &&
    ts.isExpressionStatement(first) &&
    ts.isStringLiteral(first.expression) &&
    first.expression.text === 'use server'
  );
}

/** The value inside parentheses, `as` and `satisfies`. */
function unwrapValue(
  ts: TsxSource['ts'],
  expression: TS.Expression
): TS.Expression {
  let value = expression;
  while (
    ts.isParenthesizedExpression(value) ||
    ts.isAsExpression(value) ||
    ts.isSatisfiesExpression(value)
  ) {
    value = value.expression;
  }
  return value;
}

/** An arrow or function expression that is not an inline Server Function. */
function isPlainFunction(ts: TsxSource['ts'], value: TS.Expression): boolean {
  return (
    (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) &&
    !isServerFunction(ts, value)
  );
}

/** Why `new X(…)` cannot cross, or null for one of React's serializable built-ins. */
function instanceProblem(value: TS.NewExpression): string | null {
  const name = value.expression.getText();
  return SERIALIZABLE_CLASSES.has(name)
    ? null
    : `is a \`new ${name}(…)\` — instances of classes other than React's serializable built-ins cannot be passed to a Client Component`;
}

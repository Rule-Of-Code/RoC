/**
 * What a module exports, resolved to the code that runs.
 *
 * A Server Action or a route handler is reached by its EXPORT, and an export
 * can be written five ways: `export async function POST`, `export const POST =
 * async () => …`, `export const POST = withAuth(handler)`, `export { handler as
 * POST }`, `export { POST } from './x'`. A law that reads only the first form
 * passes the other four unread. Each export here carries what it is bound to:
 * a function, a call that builds one (a wrapper), something else, or a
 * re-export this file cannot see into.
 */

import type * as TS from 'typescript';
import type { TsxSource, TypeScriptModule } from './tsx-source';

export type FunctionLike = TS.ArrowFunction | TS.FunctionDeclaration | TS.FunctionExpression;

export interface ModuleExport {
  /** The exported name; `default` for a default export. */
  name: string;
  line: number;
  /** The function the export is, when it is one written in this file. */
  fn: FunctionLike | null;
  /** The call it is built by (`withAuth(handler)`), when it is one. */
  call: TS.CallExpression | null;
  /** `export { x } from './y'` / `export * from`: the module it comes from. */
  reexportFrom: string | null;
}

const hasModifier = (ts: TypeScriptModule, node: TS.Node, kind: TS.SyntaxKind): boolean =>
  (ts.canHaveModifiers(node) ? (ts.getModifiers(node) ?? []) : []).some(m => m.kind === kind);

export function isFunctionLike(ts: TypeScriptModule, node: TS.Node): node is FunctionLike {
  return ts.isArrowFunction(node) || ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node);
}

export function isAsync(ts: TypeScriptModule, fn: FunctionLike): boolean {
  return hasModifier(ts, fn, ts.SyntaxKind.AsyncKeyword);
}

/** Strip `as`, `satisfies`, parentheses and `!` around an expression. */
export function unwrap(ts: TypeScriptModule, expression: TS.Expression): TS.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

/** Top-level bindings by name: function declarations and `const x = …` initialisers. */
function localBindings(source: TsxSource): Map<string, { fn: FunctionLike | null; call: TS.CallExpression | null }> {
  const ts = source.ts;
  const bindings = new Map<string, { fn: FunctionLike | null; call: TS.CallExpression | null }>();
  for (const statement of source.sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      bindings.set(statement.name.text, { fn: statement, call: null });
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      bindings.set(declaration.name.text, classify(ts, declaration.initializer));
    }
  }
  return bindings;
}

function classify(
  ts: TypeScriptModule,
  initializer: TS.Expression | undefined
): { fn: FunctionLike | null; call: TS.CallExpression | null } {
  if (!initializer) return { fn: null, call: null };
  const value = unwrap(ts, initializer);
  if (isFunctionLike(ts, value)) return { fn: value, call: null };
  if (ts.isCallExpression(value)) return { fn: null, call: value };
  return { fn: null, call: null };
}

export function moduleExports(source: TsxSource): ModuleExport[] {
  const locals = localBindings(source);
  return source.sourceFile.statements.flatMap(statement => statementExports(source, statement, locals));
}

type Locals = Map<string, { fn: FunctionLike | null; call: TS.CallExpression | null }>;

function statementExports(source: TsxSource, statement: TS.Statement, locals: Locals): ModuleExport[] {
  const ts = source.ts;
  const line = source.lineOf(statement);
  const exported = hasModifier(ts, statement, ts.SyntaxKind.ExportKeyword);
  if (exported && ts.isFunctionDeclaration(statement)) {
    const isDefault = hasModifier(ts, statement, ts.SyntaxKind.DefaultKeyword);
    const name = isDefault ? 'default' : (statement.name?.text ?? 'default');
    return [{ name, line, fn: statement, call: null, reexportFrom: null }];
  }
  if (exported && ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations
      .filter(declaration => ts.isIdentifier(declaration.name))
      .map(declaration => ({
        name: (declaration.name as TS.Identifier).text,
        line: source.lineOf(declaration),
        ...classify(ts, declaration.initializer),
        reexportFrom: null,
      }));
  }
  if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
    const value = unwrap(ts, statement.expression);
    const local = ts.isIdentifier(value) ? locals.get(value.text) : undefined;
    return [{ name: 'default', line, ...(local ?? classify(ts, value)), reexportFrom: null }];
  }
  if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
    return exportDeclaration(source, statement, locals);
  }
  return [];
}

function exportDeclaration(
  source: TsxSource,
  statement: TS.ExportDeclaration,
  locals: Locals
): ModuleExport[] {
  const ts = source.ts;
  const from =
    statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
      ? statement.moduleSpecifier.text
      : null;
  const line = source.lineOf(statement);
  const clause = statement.exportClause;
  if (!clause || !ts.isNamedExports(clause)) {
    return [{ name: '*', line, fn: null, call: null, reexportFrom: from ?? '*' }];
  }
  return clause.elements
    .filter(element => !element.isTypeOnly)
    .map(element => {
      const name = element.name.text;
      if (from) return { name, line, fn: null, call: null, reexportFrom: from };
      const localName = (element.propertyName ?? element.name).text;
      const local = locals.get(localName) ?? { fn: null, call: null };
      return { name, line, ...local, reexportFrom: null };
    });
}

/**
 * The identifiers of a call's callee chain — `authClient.schema(s).action(fn)`
 * gives action, schema, authClient — and each dotted callee as written. The
 * arguments are not part of the chain.
 */
export function calleeChain(ts: TypeScriptModule, call: TS.CallExpression, source: TsxSource): string[] {
  const names: string[] = [];
  let current: TS.Expression = call.expression;
  for (let depth = 0; depth < 50; depth++) {
    current = unwrap(ts, current);
    if (ts.isPropertyAccessExpression(current)) {
      names.push(current.name.text, current.getText(source.sourceFile));
      current = current.expression;
    } else if (ts.isCallExpression(current)) {
      current = current.expression;
    } else {
      if (ts.isIdentifier(current)) names.push(current.text);
      break;
    }
  }
  return names;
}

/**
 * The calls in `node`'s subtree, not descending into nested functions when
 * `ownBodyOnly` is set (a guard inside a callback that may never run is not a
 * guard of the outer function).
 */
export function callsIn(ts: TypeScriptModule, node: TS.Node, ownBodyOnly: boolean): TS.CallExpression[] {
  const calls: TS.CallExpression[] = [];
  const visit = (current: TS.Node): void => {
    if (ts.isCallExpression(current)) calls.push(current);
    ts.forEachChild(current, child => {
      if (ownBodyOnly && isFunctionLike(ts, child)) return;
      visit(child);
    });
  };
  visit(node);
  return calls;
}

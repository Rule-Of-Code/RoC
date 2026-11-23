/**
 * What a Next.js module binds: the values it exports (by exported name, with
 * the declaration behind each), and the local names its imports bind. Read
 * from the parse of the module, type-only exports and imports excluded.
 */

import type * as TS from 'typescript';
import type { TsxSource } from './tsx-source';

/** A name exported by a module, with the node that defines it. */
export interface ExportedBinding {
  name: string;
  /** The declaration, or the local declaration an `export { x }` points at, when found. */
  node: TS.Node;
  /** The value: a variable's initializer, the function itself, an `export default` expression. */
  value: TS.Node | undefined;
}

/** The local top-level declaration named `name`: a function, class, or variable. */
function localDeclaration(
  source: TsxSource,
  name: string
): ExportedBinding | null {
  const ts = source.ts;
  for (const statement of source.sourceFile.statements) {
    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement)) &&
      statement.name?.text === name
    ) {
      return { name, node: statement, value: statement };
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
        return { name, node: declaration, value: declaration.initializer };
      }
    }
  }
  return null;
}

function hasExportModifier(ts: TsxSource['ts'], node: TS.Node): boolean {
  const modifiers = ts.canHaveModifiers(node)
    ? ts.getModifiers(node)
    : undefined;
  return (
    modifiers?.some(
      modifier => modifier.kind === ts.SyntaxKind.ExportKeyword
    ) ?? false
  );
}

function hasDefaultModifier(ts: TsxSource['ts'], node: TS.Node): boolean {
  const modifiers = ts.canHaveModifiers(node)
    ? ts.getModifiers(node)
    : undefined;
  return (
    modifiers?.some(
      modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword
    ) ?? false
  );
}

/** `export default x`: the default export, through `x` to its local declaration. */
function exportAssignmentBindings(
  source: TsxSource,
  statement: TS.ExportAssignment
): ExportedBinding[] {
  const ts = source.ts;
  if (statement.isExportEquals) return [];
  const expression = statement.expression;
  const local = ts.isIdentifier(expression)
    ? localDeclaration(source, expression.text)
    : null;
  return [
    {
      name: 'default',
      node: local?.node ?? statement,
      value: local ? local.value : expression,
    },
  ];
}

/** `export { a, b as c }` (re-exports from another module keep no local). */
function exportDeclarationBindings(
  source: TsxSource,
  statement: TS.ExportDeclaration
): ExportedBinding[] {
  const ts = source.ts;
  if (
    statement.isTypeOnly ||
    !statement.exportClause ||
    !ts.isNamedExports(statement.exportClause)
  )
    return [];
  return statement.exportClause.elements
    .filter(element => !element.isTypeOnly)
    .map(element => {
      const local = statement.moduleSpecifier
        ? null
        : localDeclaration(source, (element.propertyName ?? element.name).text);
      return {
        name: element.name.text,
        node: local?.node ?? element,
        value: local?.value,
      };
    });
}

/** `export function`, `export default class`, `export const`. */
function exportModifierBindings(
  source: TsxSource,
  statement: TS.Statement
): ExportedBinding[] {
  const ts = source.ts;
  if (!hasExportModifier(ts, statement)) return [];
  if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
    const name = hasDefaultModifier(ts, statement)
      ? 'default'
      : (statement.name?.text ?? 'default');
    return [{ name, node: statement, value: statement }];
  }
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations
      .filter(declaration => ts.isIdentifier(declaration.name))
      .map(declaration => ({
        name: (declaration.name as TS.Identifier).text,
        node: declaration,
        value: declaration.initializer,
      }));
  }
  return [];
}

function exportsOfStatement(
  source: TsxSource,
  statement: TS.Statement
): ExportedBinding[] {
  const ts = source.ts;
  if (ts.isExportAssignment(statement))
    return exportAssignmentBindings(source, statement);
  if (ts.isExportDeclaration(statement))
    return exportDeclarationBindings(source, statement);
  return exportModifierBindings(source, statement);
}

/** Every value a module exports, by exported name (type-only exports excluded). */
export function exportedBindings(
  source: TsxSource
): Map<string, ExportedBinding> {
  const bindings = new Map<string, ExportedBinding>();
  for (const statement of source.sourceFile.statements) {
    for (const binding of exportsOfStatement(source, statement))
      bindings.set(binding.name, binding);
  }
  return bindings;
}

/** Peel parentheses, `as`, `satisfies` and `!` off an expression. */
export function unwrapExpression(
  ts: TsxSource['ts'],
  node: TS.Node | undefined
): TS.Node | undefined {
  let current = node;
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isTypeAssertionExpression(current))
  ) {
    current = current.expression;
  }
  return current;
}

/** True when a function-like node is declared `async`. */
export function isAsyncFunction(
  ts: TsxSource['ts'],
  node: TS.Node | undefined
): boolean {
  const fn = unwrapExpression(ts, node);
  if (
    !fn ||
    !(
      ts.isFunctionDeclaration(fn) ||
      ts.isFunctionExpression(fn) ||
      ts.isArrowFunction(fn)
    )
  ) {
    return false;
  }
  return (
    ts
      .getModifiers(fn)
      ?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword) ?? false
  );
}

/** The local names bound to `imported` (or the default, with 'default') from `module`. */
export function importedNames(
  source: TsxSource,
  modules: readonly string[],
  imported: string
): Set<string> {
  const names = new Set<string>();
  for (const info of source.imports()) {
    if (info.typeOnly || !modules.includes(info.module)) continue;
    if (imported === 'default' && info.defaultName) names.add(info.defaultName);
    for (const named of info.named)
      if (named.imported === imported) names.add(named.local);
  }
  return names;
}

/** Local namespace or default names bound to `module` (`import * as React`, `import React`). */
export function namespaceNames(source: TsxSource, module: string): Set<string> {
  const names = new Set<string>();
  for (const info of source.imports()) {
    if (info.typeOnly || info.module !== module) continue;
    if (info.namespaceName) names.add(info.namespaceName);
    if (info.defaultName) names.add(info.defaultName);
  }
  return names;
}

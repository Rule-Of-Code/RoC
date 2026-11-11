/**
 * The web side of the Capacitor bridge, read as syntax.
 *
 * The bridge laws ask structural questions of TypeScript: which local names
 * are Capacitor plugins, where `<plugin>.addListener('event', …)` is called
 * and what happens to the handle it returns, what `registerPlugin<T>('Name')`
 * names and which methods `T` declares. A regex over the text cannot tell a
 * call from a comment that quotes one, or a plugin from an object that merely
 * has an `addListener` method, so these helpers walk the AST of the project's
 * own TypeScript (`tsx-source.ts`).
 *
 * A plugin is recognised by where it comes from: a named import from a
 * Capacitor plugin package, or a binding initialised by `registerPlugin(…)`.
 * A relative import is followed one module deep, so a local barrel that
 * re-exports a plugin is still seen.
 */

import * as fs from 'fs';
import type * as TS from 'typescript';
import type { LawCheckContext } from '../../types/law.types';
import { PathOperations } from '../path-operations';
import { type ParsedSources, ReactProject } from '../react/react-project';
import { type ImportInfo, TsxSource } from '../react/tsx-source';

/** Packages whose exports are Capacitor plugins (not the CLI or the platform packages). */
export const CAPACITOR_PLUGIN_MODULE =
  /^@(?:capacitor(?:-[\w-]+)?|capawesome(?:-team)?)\/(?!(?:cli|android|ios)$)[\w.-]+$/;

/** The source extensions the bridge laws read. */
export const BRIDGE_SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

const REGISTER_PLUGIN = 'registerPlugin';
const CORE = '@capacitor/core';
const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.js'];

/** Non-test source through the normal scan, parsed; see ParsedSources for the contract. */
export function bridgeSources(context: LawCheckContext): ParsedSources {
  return ReactProject.parse(context, ReactProject.sourceFiles(context, BRIDGE_SOURCE_EXTENSIONS));
}

/** What a local name is bound to: the plugin package, or `registerPlugin` for a local plugin. */
export type PluginBindings = Map<string, string>;

/** One `<plugin>.addListener('<event>', …)` call. */
export interface ListenerCall {
  event: string;
  /** The receiver as written: `App`, `this.plugin`. */
  receiver: string;
  /** The package the receiver comes from, or `registerPlugin`. */
  module: string;
  call: TS.CallExpression;
  line: number;
}

/** The local names of `registerPlugin` imported from @capacitor/core. */
export function registerPluginNames(source: TsxSource): Set<string> {
  const names = new Set<string>();
  for (const info of source.imports()) {
    if (info.module !== CORE) continue;
    for (const { imported, local } of info.named) {
      if (imported === REGISTER_PLUGIN) names.add(local);
    }
  }
  return names;
}

/** Is `node` a call of `registerPlugin(…)` (as imported here)? */
export function isRegisterPluginCall(
  source: TsxSource,
  node: TS.Node,
  names: Set<string> = registerPluginNames(source)
): node is TS.CallExpression {
  const ts = source.ts;
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    names.has(node.expression.text)
  );
}

/**
 * Local names bound to a Capacitor plugin: named or namespace imports from a
 * plugin package, re-exports of one through a relative module (one deep),
 * and variables or class properties initialised by `registerPlugin(…)`.
 */
export function pluginBindings(source: TsxSource): PluginBindings {
  const bindings: PluginBindings = new Map();
  for (const info of source.imports()) {
    if (!info.typeOnly) importedPlugins(source, info, bindings);
  }
  registeredPlugins(source, bindings);
  return bindings;
}

function importedPlugins(source: TsxSource, info: ImportInfo, bindings: PluginBindings): void {
  if (CAPACITOR_PLUGIN_MODULE.test(info.module)) {
    for (const { imported, local } of info.named) {
      if (info.module !== CORE || imported !== REGISTER_PLUGIN) bindings.set(local, info.module);
    }
    if (info.namespaceName) bindings.set(info.namespaceName, info.module);
    return;
  }
  if (!info.module.startsWith('.')) return;
  const reexported = reexportedPlugins(source.fileName, info.module, source);
  for (const { imported, local } of info.named) {
    const module = reexported.get(imported);
    if (module) bindings.set(local, module);
  }
}

/** Variables and class properties initialised by `registerPlugin(…)`. */
function registeredPlugins(source: TsxSource, bindings: PluginBindings): void {
  const registers = registerPluginNames(source);
  source.walk(node => {
    const ts = source.ts;
    if (
      (ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node)) &&
      node.initializer &&
      isRegisterPluginCall(source, node.initializer, registers) &&
      (ts.isIdentifier(node.name) || ts.isPrivateIdentifier(node.name))
    ) {
      bindings.set(node.name.text, REGISTER_PLUGIN);
    }
  });
}

/** The names a relative module exports that are Capacitor plugins. */
function reexportedPlugins(fromFile: string, specifier: string, like: TsxSource): Map<string, string> {
  const found = new Map<string, string>();
  const file = resolveRelative(fromFile, specifier);
  if (!file) return found;
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return found;
  }
  const target = TsxSource.parse(like.ts, file, text);
  const ts = target.ts;
  for (const statement of target.sourceFile.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      CAPACITOR_PLUGIN_MODULE.test(statement.moduleSpecifier.text)
    ) {
      const module = statement.moduleSpecifier.text;
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) found.set(element.name.text, module);
      }
    }
  }
  const registers = registerPluginNames(target);
  target.walk(node => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      isRegisterPluginCall(target, node.initializer, registers)
    ) {
      found.set(node.name.text, REGISTER_PLUGIN);
    }
  });
  return found;
}

/** A relative import resolved to a file on disk, or null. */
export function resolveRelative(fromFile: string, specifier: string): string | null {
  const base = PathOperations.join(PathOperations.getDirectory(fromFile), specifier);
  const candidates = [base, ...RESOLVE_EXTENSIONS.map(ext => `${base}${ext}`)];
  return candidates.find(candidate => isFile(candidate)) ?? null;
}

function isFile(file: string): boolean {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

/** The plugin binding a receiver expression starts from (`App`, `this.plugin`), or null. */
export function receiverBinding(
  source: TsxSource,
  receiver: TS.Expression,
  bindings: PluginBindings
): string | null {
  const ts = source.ts;
  if (ts.isIdentifier(receiver)) return bindings.get(receiver.text) ?? null;
  if (
    ts.isPropertyAccessExpression(receiver) &&
    receiver.expression.kind === ts.SyntaxKind.ThisKeyword
  ) {
    return bindings.get(receiver.name.text) ?? null;
  }
  // A namespace import: `Plugins.App.addListener` → the namespace's package.
  if (ts.isPropertyAccessExpression(receiver) && ts.isIdentifier(receiver.expression)) {
    return bindings.get(receiver.expression.text) ?? null;
  }
  return null;
}

/** Every `<plugin>.addListener('<literal>', …)` call in a source. */
export function listenerCalls(source: TsxSource, bindings: PluginBindings = pluginBindings(source)): ListenerCall[] {
  const ts = source.ts;
  const calls: ListenerCall[] = [];
  source.walk(node => {
    if (!ts.isCallExpression(node)) return;
    const callee = node.expression;
    if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'addListener') return;
    const [first] = node.arguments;
    if (!first || !ts.isStringLiteralLike(first)) return;
    const module = receiverBinding(source, callee.expression, bindings);
    if (!module) return;
    calls.push({
      event: first.text,
      receiver: callee.expression.getText(source.sourceFile),
      module,
      call: node,
      line: source.lineOf(node),
    });
  });
  return calls;
}

/**
 * The string an expression stands for: a literal, or an identifier bound to a
 * `const` string literal in the same file. Null when it is built at runtime
 * or defined elsewhere.
 */
export function stringValue(source: TsxSource, expression: TS.Expression | undefined): string | null {
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
  const decorators = ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];
  return decorators.flatMap(decorator => {
    const expression = decorator.expression;
    if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
      return [{ name: expression.expression.text, argument: expression.arguments[0] }];
    }
    if (ts.isIdentifier(expression)) return [{ name: expression.text, argument: undefined }];
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
export function methodCalls(source: TsxSource, root: TS.Node, name: string): TS.CallExpression[] {
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

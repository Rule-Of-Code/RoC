/**
 * The import graph of a Next app, walked from its routes, for No Test-Only
 * Leakage.
 *
 * Imports are resolved by the TypeScript resolver with the app's own
 * tsconfig — the same `paths` (`@/…`) and `baseUrl` the build uses — so an
 * aliased import is followed exactly as Next follows it. Packages are not
 * followed: a test-only file is the project's own.
 *
 * An edge is GATED when what crosses it is used only under an environment
 * condition: every reference to the imported names sits in a branch of an
 * `if`, a `?:` or an `&&` whose condition reads `process.env`, or a dynamic
 * `import()` sits in such a branch. A re-export and a side-effect import
 * (`import './mocks'`) are never gated: they bring the module in whatever the
 * environment.
 */

import type * as TS from 'typescript';
import type { TsxSource, TypeScriptModule } from '../../utils/react/tsx-source';
import { PathOperations } from '../../utils/path-operations';

export interface ImportEdge {
  /** The resolved file. */
  target: string;
  gated: boolean;
}

/** True when the subtree reads `process.env`. */
export function readsEnvironment(ts: TypeScriptModule, node: TS.Node): boolean {
  let found = false;
  const visit = (current: TS.Node): void => {
    if (found) return;
    if (
      ts.isPropertyAccessExpression(current) &&
      current.name.text === 'env' &&
      ts.isIdentifier(current.expression) &&
      current.expression.text === 'process'
    ) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

/** True when `node` sits in a branch taken only under a condition that reads `process.env`. */
export function underEnvironmentCondition(ts: TypeScriptModule, node: TS.Node): boolean {
  let child: TS.Node = node;
  let parent: TS.Node | undefined = node.parent;
  while (parent) {
    if (isGuardedBranch(ts, parent, child)) return true;
    child = parent;
    parent = parent.parent;
  }
  return false;
}

function isGuardedBranch(ts: TypeScriptModule, parent: TS.Node, child: TS.Node): boolean {
  if (ts.isIfStatement(parent)) {
    return child !== parent.expression && readsEnvironment(ts, parent.expression);
  }
  if (ts.isConditionalExpression(parent)) {
    return child !== parent.condition && readsEnvironment(ts, parent.condition);
  }
  if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    return child === parent.right && readsEnvironment(ts, parent.left);
  }
  return false;
}

/**
 * True when the file stops itself outside the intended environment: an `if`
 * reading `process.env` whose branch returns, throws or calls `notFound()`.
 */
export function selfGated(source: TsxSource): boolean {
  const ts = source.ts;
  let gated = false;
  source.walk(node => {
    if (gated || !ts.isIfStatement(node) || !readsEnvironment(ts, node.expression)) return;
    gated = stops(ts, node.thenStatement);
  });
  return gated;
}

function stops(ts: TypeScriptModule, branch: TS.Node): boolean {
  let found = false;
  const visit = (node: TS.Node): void => {
    if (found) return;
    if (
      ts.isReturnStatement(node) ||
      ts.isThrowStatement(node) ||
      (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'notFound')
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(branch);
  return found;
}

export class ImportGraph {
  private readonly options: TS.CompilerOptions;

  constructor(
    private readonly ts: TypeScriptModule,
    appRoot: string,
    private readonly projectRoot: string
  ) {
    this.options = ImportGraph.compilerOptions(ts, appRoot);
  }

  /** The app's compiler options from its tsconfig (extends followed), or none. */
  private static compilerOptions(ts: TypeScriptModule, appRoot: string): TS.CompilerOptions {
    const configFile = ts.findConfigFile(appRoot, ts.sys.fileExists, 'tsconfig.json');
    if (!configFile) return { allowJs: true, jsx: ts.JsxEmit.Preserve };
    const read = ts.readConfigFile(configFile, ts.sys.readFile);
    if (read.error) return { allowJs: true, jsx: ts.JsxEmit.Preserve };
    const parsed = ts.parseJsonConfigFileContent(
      read.config,
      ts.sys,
      PathOperations.getDirectory(configFile)
    );
    return { allowJs: true, ...parsed.options };
  }

  /** Every project file this source imports, with whether the edge is gated. */
  edges(source: TsxSource): ImportEdge[] {
    const ts = this.ts;
    const edges: ImportEdge[] = [];
    const add = (specifier: string, gated: boolean): void => {
      const target = this.resolve(specifier, source.fileName);
      if (target) edges.push({ target, gated });
    };
    for (const statement of source.sourceFile.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        add(statement.moduleSpecifier.text, this.importIsGated(source, statement));
      } else if (
        ts.isExportDeclaration(statement) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        add(statement.moduleSpecifier.text, false);
      }
    }
    source.walk(node => {
      const specifier = this.loadedModule(node);
      if (specifier !== null) add(specifier, underEnvironmentCondition(ts, node));
    });
    return edges;
  }

  /** `import('x')` or `require('x')` with a literal specifier. */
  private loadedModule(node: TS.Node): string | null {
    const ts = this.ts;
    if (!ts.isCallExpression(node)) return null;
    const isLoad =
      node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === 'require');
    const [argument] = node.arguments;
    return isLoad && argument && ts.isStringLiteralLike(argument) ? argument.text : null;
  }

  /** A static import is gated when every use of what it binds is under an env condition. */
  private importIsGated(source: TsxSource, statement: TS.ImportDeclaration): boolean {
    const ts = this.ts;
    const clause = statement.importClause;
    if (!clause || clause.isTypeOnly) return clause?.isTypeOnly ?? false;
    const names = new Set<string>();
    if (clause.name) names.add(clause.name.text);
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) names.add(bindings.name.text);
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) names.add(element.name.text);
    }
    const uses: TS.Node[] = [];
    source.walk(node => {
      if (ts.isIdentifier(node) && names.has(node.text) && !this.isInImport(node)) uses.push(node);
    });
    return uses.length > 0 && uses.every(use => underEnvironmentCondition(ts, use));
  }

  private isInImport(node: TS.Node): boolean {
    let current: TS.Node | undefined = node.parent;
    while (current) {
      if (this.ts.isImportDeclaration(current)) return true;
      current = current.parent;
    }
    return false;
  }

  /** The project file a specifier resolves to, or null for a package or an unresolved name. */
  private resolve(specifier: string, from: string): string | null {
    const resolved = this.ts.resolveModuleName(specifier, from, this.options, this.ts.sys)
      .resolvedModule;
    if (!resolved || resolved.isExternalLibraryImport) return null;
    const file = PathOperations.resolve(resolved.resolvedFileName);
    if (/\.d\.[cm]?ts$/.test(file) || file.includes('/node_modules/')) return null;
    return PathOperations.isInDirectory(file, this.projectRoot) ? file : null;
  }
}

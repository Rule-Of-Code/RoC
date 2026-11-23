import type * as TS from 'typescript';
import { ExternalBoundary } from '../external-boundary';

/**
 * What Unit Test Quality's mocking checks read of a test file (#429): the
 * network and service clients it loads, and whether its code holds a
 * test double.
 *
 * A dependency to mock is not "any import". A test imports the module it
 * tests; a test may build a temp-dir fixture or spawn the CLI it ships.
 * What a unit test must not reach for real is a network or a shared
 * service — ExternalBoundary, the definition Test Data Management reads
 * too (#491).
 */
export class TestNetworkClients {
  /** The filesystem and a child process: not a boundary (ExternalBoundary). */
  static readonly LOCAL_PROCESS_MODULE = ExternalBoundary.LOCAL_RESOURCE_MODULE;

  /**
   * A hand-written double named for what it is (`fakeClient`, `stubApi`,
   * `mockHttp`), read in the code, where a comment or a string cannot
   * supply it.
   */
  static readonly DOUBLE_NAME_PATTERN = ExternalBoundary.DOUBLE_NAME;

  /**
   * The network and service clients a test file loads, from its syntax tree:
   * `import … from`, a side-effect `import`, `export … from`, `import x =
   * require()`, `require()` and `import()` with a literal specifier. A
   * client named in a comment or a string is not loaded, and a type-only
   * import loads nothing.
   */
  static imported(ts: typeof TS, content: string, fileName: string): string[] {
    const source = ts.createSourceFile(
      fileName,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    const found = new Set<string>();
    const visit = (node: TS.Node): void => {
      const specifier = this.loadedSpecifier(ts, node);
      if (specifier !== null && this.isNetworkClient(specifier)) {
        found.add(specifier);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return [...found];
  }

  /** Whether the CODE of a test file holds a test double. */
  static hasTestDouble(code: string): boolean {
    // Framework doubles, msw/nock, Angular's HTTP testing backend, or a
    // double named by its role: ExternalBoundary, shared with Test Data
    // Management (#491).
    return ExternalBoundary.hasTestDouble(code);
  }

  /** A module specifier naming a client that leaves the machine. */
  private static isNetworkClient(specifier: string): boolean {
    return ExternalBoundary.isClient(specifier);
  }

  /** The module a node loads at run time, or null. */
  private static loadedSpecifier(ts: typeof TS, node: TS.Node): string | null {
    if (ts.isImportDeclaration(node)) {
      return node.importClause?.isTypeOnly
        ? null
        : this.literal(ts, node.moduleSpecifier);
    }
    if (ts.isExportDeclaration(node)) {
      return node.isTypeOnly ? null : this.literal(ts, node.moduleSpecifier);
    }
    if (ts.isImportEqualsDeclaration(node)) {
      return !node.isTypeOnly &&
        ts.isExternalModuleReference(node.moduleReference)
        ? this.literal(ts, node.moduleReference.expression)
        : null;
    }
    return ts.isCallExpression(node) && this.loadsModule(ts, node)
      ? this.literal(ts, node.arguments[0])
      : null;
  }

  /** `require(…)` or `import(…)`. */
  private static loadsModule(ts: typeof TS, call: TS.CallExpression): boolean {
    const callee = call.expression;
    return (
      callee.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(callee) && callee.text === 'require')
    );
  }

  /** The text of a string literal, or null for anything else. */
  private static literal(
    ts: typeof TS,
    node: TS.Node | undefined
  ): string | null {
    return node && ts.isStringLiteralLike(node) ? node.text : null;
  }
}

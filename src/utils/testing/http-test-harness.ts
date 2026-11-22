import type * as TS from 'typescript';

import { CodeText } from '../code-text';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';
import { loadTypeScript } from '../react/tsx-source';

/**
 * Whether a test file drives an HTTP test harness (#551): the way API Testing
 * Standards recognises an API test by what its code does, not by its name.
 * An Angular HTTP layer tested in `user.repository.spec.ts` with
 * `HttpTestingController`, or a server tested with `supertest` in
 * `server.spec.ts`, is an API test whatever the file is called.
 *
 * Read from the syntax tree: a harness named in a comment or inside a
 * fixture string (a detector's test keeps its inputs that way) is not one.
 * Without a loadable `typescript` nothing is read here and the file-name
 * patterns alone decide, so the answer never rests on a regex over text.
 */
export class HttpTestHarness {
  /** A test file by name. */
  static readonly TEST_FILE = /\.(?:spec|test|e2e-spec)\.[cm]?[jt]sx?$/;

  /** Modules whose import is an HTTP test harness, matched whole. */
  static readonly HARNESS_MODULE =
    /^(?:supertest|nock|fetch-mock|msw|msw\/node|@angular\/common\/http\/testing)$/;

  /** Harness use in the code itself. */
  static readonly HARNESS_CALL =
    /\bHttpTestingController\b|\bprovideHttpClientTesting\s*\(|\bHttpClientTestingModule\b|\bsetupServer\s*\(|\bnock\s*\(/;

  /** Whether the test file at `filePath` drives an HTTP test harness. */
  static drives(filePath: string): boolean {
    if (!this.TEST_FILE.test(filePath)) return false;
    const directory = PathOperations.getDirectory(filePath);
    const ts = loadTypeScript(directory);
    if (!ts) return false;
    let content: string;
    try {
      content = FileUtils.readFile(filePath, { encoding: 'utf8' });
    } catch {
      return false;
    }
    return (
      this.importsHarness(ts, content, filePath) ||
      this.HARNESS_CALL.test(CodeText.codeOnly(content, filePath, directory))
    );
  }

  /** Whether the file loads a harness module (import, require, import()). */
  private static importsHarness(
    ts: typeof TS,
    content: string,
    fileName: string
  ): boolean {
    const source = ts.createSourceFile(
      fileName,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    let found = false;
    const visit = (node: TS.Node): void => {
      if (found) return;
      const specifier = this.specifier(ts, node);
      if (specifier !== null && this.HARNESS_MODULE.test(specifier)) {
        found = true;
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return found;
  }

  /** The module an import, `require(…)` or `import(…)` names, or null. */
  private static specifier(ts: typeof TS, node: TS.Node): string | null {
    if (ts.isImportDeclaration(node)) {
      return ts.isStringLiteralLike(node.moduleSpecifier)
        ? node.moduleSpecifier.text
        : null;
    }
    if (!ts.isCallExpression(node)) return null;
    const callee = node.expression;
    const loads =
      callee.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(callee) && callee.text === 'require');
    const argument = node.arguments[0];
    return loads && argument && ts.isStringLiteralLike(argument)
      ? argument.text
      : null;
  }
}

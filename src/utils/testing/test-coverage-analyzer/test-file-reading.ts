import { builtinModules } from 'module';
import type * as TS from 'typescript';

import { CodeText } from '../../code-text';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';

/** Node's own modules: a call into one is not the code under test. */
const NODE_BUILTINS = new Set(builtinModules);

/**
 * Methods every array, string, map or regular expression has. `LAWS.filter(…)`
 * or `PATTERN.test('x')` reads an imported value; it does not run the code
 * under test with an input.
 */
const VALUE_METHOD =
  /^(?:filter|map|forEach|some|every|find|findIndex|reduce|includes|indexOf|join|slice|concat|flat|flatMap|keys|values|entries|test|exec|match|matchAll|replace|split|toString|hasOwnProperty|has|get|startsWith|endsWith|trim|toLowerCase|toUpperCase|sort)$/;

/** A test runner's config switch that resets every mock between tests. */
const MOCK_RESET_SWITCH =
  /["']?\b(?:resetMocks|restoreMocks|clearMocks|mockReset)\b["']?\s*:\s*true\b/;

/** A spy that only silences the console or a standard stream. */
const SILENCED_OUTPUT =
  /\bjest\.spyOn\(\s*(?:console|process\.std(?:out|err))\s*,[^)]*\)\s*\.mockImplementation\b/g;

/** Where Jest and Vitest read their config, at the project root. */
const RUNNER_CONFIG_FILES = [
  'jest.config.js',
  'jest.config.ts',
  'jest.config.mjs',
  'jest.config.cjs',
  'jest.config.json',
  'vitest.config.ts',
  'vitest.config.mts',
  'vitest.config.js',
  'vitest.config.mjs',
];

/**
 * What Unit Test Quality reads of a test file beyond its text (#429): whether
 * it gives the code under test an input, and whether the project's runner
 * resets mocks between tests.
 */
export class TestFileReading {
  /**
   * Whether a test calls the code it imports with an argument — an imported
   * function (`audit(dir)`), a method of an imported binding
   * (`Analyzer.check(root)`) or a class (`new Checker(config)`). A file that
   * only checks that names are exported, or reads a table of constants, has
   * no input, so it has no edge case to test. A Node built-in is not the
   * code under test, and a type-only import loads nothing.
   */
  static callsWithInput(
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
    const imported = this.importedNames(ts, source);
    let found = false;
    const visit = (node: TS.Node): void => {
      if (found) return;
      if (this.isCallWithInput(ts, node, imported)) {
        found = true;
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return found;
  }

  /**
   * Whether the project's Jest or Vitest config resets mocks between tests
   * (`resetMocks`, `restoreMocks`, `clearMocks`, Vitest's `mockReset`), in a
   * root config file or in package.json's `jest` key. Then a `jest.fn()`
   * with no cleanup call in the file is cleaned up by the runner.
   */
  static runnerResetsMocks(projectRoot: string): boolean {
    for (const name of RUNNER_CONFIG_FILES) {
      const file = PathOperations.join(projectRoot, name);
      if (!FileUtils.exists(file)) continue;
      const text = CodeText.stripComments(FileUtils.readFile(file));
      if (MOCK_RESET_SWITCH.test(text)) return true;
    }
    return this.packageJestResetsMocks(projectRoot);
  }

  /**
   * How many mock setups only silence the console or a standard stream
   * (`jest.spyOn(console, 'log').mockImplementation(…)`). Keeping a test's
   * output quiet is not a double of a collaborator, so the excessive-mocking
   * count leaves them out (#429).
   */
  static silencedOutputSetups(content: string): number {
    return (content.match(SILENCED_OUTPUT) ?? []).length;
  }

  /** package.json's `jest` key, read as data. */
  private static packageJestResetsMocks(projectRoot: string): boolean {
    const file = PathOperations.join(projectRoot, 'package.json');
    if (!FileUtils.exists(file)) return false;
    try {
      const jest = (JSON.parse(FileUtils.readFile(file)) as { jest?: unknown })
        .jest;
      return (
        typeof jest === 'object' &&
        jest !== null &&
        MOCK_RESET_SWITCH.test(JSON.stringify(jest))
      );
    } catch {
      // Not JSON: nothing is configured that this law could read.
      return false;
    }
  }

  /** The local names a file imports from modules other than Node's own. */
  private static importedNames(
    ts: typeof TS,
    source: TS.SourceFile
  ): Set<string> {
    const names = new Set<string>();
    for (const statement of source.statements) {
      if (ts.isVariableStatement(statement)) {
        this.addRequired(ts, statement, names);
        continue;
      }
      if (!ts.isImportDeclaration(statement)) continue;
      const clause = statement.importClause;
      if (!clause || clause.isTypeOnly) continue;
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
      if (this.isNodeBuiltin(statement.moduleSpecifier.text)) continue;
      if (clause.name) names.add(clause.name.text);
      this.addNamedBindings(ts, clause.namedBindings, names);
    }
    return names;
  }

  /** `const m = require('m')` or `const { a, b } = require('m')`. */
  private static addRequired(
    ts: typeof TS,
    statement: TS.VariableStatement,
    names: Set<string>
  ): void {
    for (const declaration of statement.declarationList.declarations) {
      const init = declaration.initializer;
      if (
        !init ||
        !ts.isCallExpression(init) ||
        !ts.isIdentifier(init.expression) ||
        init.expression.text !== 'require'
      ) {
        continue;
      }
      const specifier = init.arguments[0];
      if (!specifier || !ts.isStringLiteral(specifier)) continue;
      if (this.isNodeBuiltin(specifier.text)) continue;
      this.addBound(ts, declaration.name, names);
    }
  }

  /** The names a binding pattern introduces. */
  private static addBound(
    ts: typeof TS,
    name: TS.BindingName,
    names: Set<string>
  ): void {
    if (ts.isIdentifier(name)) {
      names.add(name.text);
      return;
    }
    for (const element of name.elements) {
      if (!ts.isOmittedExpression(element))
        this.addBound(ts, element.name, names);
    }
  }

  /** `* as m` or `{ a, b as c }`, without the type-only names. */
  private static addNamedBindings(
    ts: typeof TS,
    bindings: TS.NamedImportBindings | undefined,
    names: Set<string>
  ): void {
    if (!bindings) return;
    if (ts.isNamespaceImport(bindings)) {
      names.add(bindings.name.text);
      return;
    }
    for (const element of bindings.elements) {
      if (!element.isTypeOnly) names.add(element.name.text);
    }
  }

  /** `node:fs`, `path`, `fs/promises`. */
  private static isNodeBuiltin(specifier: string): boolean {
    return NODE_BUILTINS.has(specifier.replace(/^node:/, ''));
  }

  /** A call or `new` of an imported binding, with at least one argument. */
  private static isCallWithInput(
    ts: typeof TS,
    node: TS.Node,
    imported: Set<string>
  ): boolean {
    if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return false;
    if ((node.arguments?.length ?? 0) === 0) return false;
    const callee = this.calleeBinding(ts, node.expression);
    return callee !== null && imported.has(callee);
  }

  /** `f` for `f(…)`, `M` for `M.f(…)`; null for a value method or deeper. */
  private static calleeBinding(
    ts: typeof TS,
    expression: TS.Expression
  ): string | null {
    if (ts.isIdentifier(expression)) return expression.text;
    if (
      ts.isPropertyAccessExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      !VALUE_METHOD.test(expression.name.text)
    ) {
      return expression.expression.text;
    }
    return null;
  }
}

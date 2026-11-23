import type * as TS from 'typescript';

import { loadTypeScript } from '../react/tsx-source';

/**
 * The module-scope `let` / `var` bindings of a test file that its tests
 * share (#552). One definition for Test Data Management and Test Isolation
 * Enforcement, so the two laws cannot disagree about the same declaration.
 *
 * A binding is shared when a top-level `let` / `var` statement declares it
 * with an initialiser — typed or not, one declarator or several — and no
 * `beforeEach` / `afterEach` of the file assigns it a fresh value.
 * Re-creating the value in a hook that runs around every test is the
 * isolation pattern both laws ask for; a type annotation does not decide
 * whether a declaration is shared state. A binding declared without an
 * initialiser (`let logger: Logger;`) is the same pattern spelled the other
 * way and is not shared by declaration.
 *
 * Read from the syntax tree: an assignment inside a string is not one, and a
 * hook that declares its own binding of the same name (`const x = …`)
 * shadows the module binding instead of resetting it. A declaration nested
 * in a describe, a test or a helper is not module scope.
 */
export class ModuleBindings {
  /**
   * The shape of a column-0 `let` with an initialiser: a cheap test of
   * whether a file can hold a shared binding at all. The syntax tree decides.
   */
  static readonly MODULE_LET =
    /^let\s+([A-Za-z_$][\w$]*)(?:\s*:\s*[^=;\n]+)?\s*=(?![=>])/m;

  /** The same for `var`. */
  static readonly MODULE_VAR =
    /^var\s+([A-Za-z_$][\w$]*)(?:\s*:\s*[^=;\n]+)?\s*=(?![=>])/m;

  /** Hooks that run around every test. */
  private static readonly RESET_HOOKS = new Set(['beforeEach', 'afterEach']);

  /** Whether the code has a shared binding. */
  static hasShared(code: string, projectRoot?: string): boolean {
    return this.shared(code, projectRoot).length > 0;
  }

  /**
   * The names of the shared bindings, in order of declaration. Without a
   * loadable `typescript` nothing is read: both laws report their files as
   * not read in that case (#427) and do not reach this.
   */
  static shared(code: string, projectRoot = process.cwd()): string[] {
    if (!this.MODULE_LET.test(code) && !this.MODULE_VAR.test(code)) return [];
    const ts = loadTypeScript(projectRoot);
    if (!ts) return [];
    const source = ts.createSourceFile(
      'module-bindings.ts',
      code,
      ts.ScriptTarget.Latest,
      true
    );
    const declared = this.declaredWithInitialiser(ts, source);
    if (declared.length === 0) return [];
    const hooks = this.resetHooks(ts, source);
    return declared.filter(
      name => !hooks.some(hook => this.resets(ts, hook, name))
    );
  }

  /** Names a top-level `let` / `var` statement declares with a value. */
  private static declaredWithInitialiser(
    ts: typeof TS,
    source: TS.SourceFile
  ): string[] {
    const names: string[] = [];
    for (const statement of source.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      if (statement.declarationList.flags & ts.NodeFlags.Const) continue;
      // `export let` / `declare let`: not the column-0 shape either law read.
      if (ts.getModifiers(statement)?.length) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (declaration.initializer && ts.isIdentifier(declaration.name)) {
          names.push(declaration.name.text);
        }
      }
    }
    return names;
  }

  /** The function passed to every `beforeEach(` / `afterEach(` call. */
  private static resetHooks(ts: typeof TS, source: TS.SourceFile): TS.Node[] {
    const hooks: TS.Node[] = [];
    const visit = (node: TS.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        this.RESET_HOOKS.has(node.expression.text) &&
        node.arguments[0]
      ) {
        hooks.push(node.arguments[0]);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return hooks;
  }

  /**
   * Whether the hook assigns `name = …` and does not declare a binding of
   * its own with that name (which would shadow the module binding).
   */
  private static resets(ts: typeof TS, hook: TS.Node, name: string): boolean {
    let assigned = false;
    let shadowed = false;
    const visit = (node: TS.Node): void => {
      if (
        (ts.isVariableDeclaration(node) || ts.isParameter(node)) &&
        ts.isIdentifier(node.name) &&
        node.name.text === name
      ) {
        shadowed = true;
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(node.left) &&
        node.left.text === name
      ) {
        assigned = true;
      }
      ts.forEachChild(node, visit);
    };
    visit(hook);
    return assigned && !shadowed;
  }
}

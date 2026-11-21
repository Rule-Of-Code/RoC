/**
 * The exported classes and functions of one parsed file, and whether each
 * carries JSDoc — what Code Documentation Standards judges.
 *
 * Read from the syntax tree: only top-level declarations, and a docblock is
 * one of the comments right before the declaration, where the compiler, IDEs
 * and TypeDoc look for it.
 */

import type * as TS from 'typescript';
import type { TsxSource } from '../../utils/react/tsx-source';

/** One exported class or function the law judges, with whether it is documented. */
export interface ExportedDeclaration {
  kind: 'class' | 'function';
  name: string;
  /** 1-based line of the declaration's first token (its first decorator, if any). */
  line: number;
  documented: boolean;
}

/** Expression wrappers seen through when deciding whether a value is a function. */
const WRAPPERS = [
  'isParenthesizedExpression',
  'isAsExpression',
  'isNonNullExpression',
  'isTypeAssertionExpression',
  'isSatisfiesExpression',
] as const;

/** Finds a file's exported classes/functions and the JSDoc around them. */
export class ExportedDeclarations {
  /**
   * The exported classes and functions declared at the top level of a file.
   *
   * Exported: an `export` modifier (`export default` included), or a local
   * declaration named in an `export { … }` list or by `export default name`.
   * A function is a function declaration, or a `const`/`let`/`var` whose
   * initializer is an arrow function or a function expression. Overloads of
   * one function are one declaration, documented when any of them is.
   */
  static of(source: TsxSource): ExportedDeclaration[] {
    const { ts, sourceFile } = source;
    const exportedByName = this.namesExportedByList(ts, sourceFile);
    const found: ExportedDeclaration[] = [];
    const overloads = new Map<string, ExportedDeclaration>();

    for (const statement of sourceFile.statements) {
      const isFunction = ts.isFunctionDeclaration(statement);
      for (const declaration of this.declarationsOf(
        source,
        statement,
        exportedByName
      )) {
        const first = isFunction ? overloads.get(declaration.name) : undefined;
        if (first) {
          first.documented = first.documented || declaration.documented;
          continue;
        }
        if (isFunction) overloads.set(declaration.name, declaration);
        found.push(declaration);
      }
    }

    return found;
  }

  /** The exported classes/functions one top-level statement declares. */
  private static declarationsOf(
    source: TsxSource,
    statement: TS.Statement,
    exportedByName: ReadonlySet<string>
  ): ExportedDeclaration[] {
    const { ts } = source;
    if (
      ts.isClassDeclaration(statement) ||
      ts.isFunctionDeclaration(statement)
    ) {
      const name = statement.name?.text ?? 'default';
      if (!this.hasExportModifier(ts, statement) && !exportedByName.has(name)) {
        return [];
      }
      const kind = ts.isClassDeclaration(statement) ? 'class' : 'function';
      return [this.declaration(source, statement, kind, name)];
    }
    if (ts.isVariableStatement(statement)) {
      return this.functionVariables(source, statement, exportedByName);
    }
    if (ts.isExportAssignment(statement)) {
      return this.defaultExpression(source, statement);
    }
    return [];
  }

  /** `export const f = () => …` / `= function …`, one per such variable. */
  private static functionVariables(
    source: TsxSource,
    statement: TS.VariableStatement,
    exportedByName: ReadonlySet<string>
  ): ExportedDeclaration[] {
    const { ts } = source;
    const exportedStatement = this.hasExportModifier(ts, statement);
    return statement.declarationList.declarations.flatMap(variable => {
      if (!ts.isIdentifier(variable.name)) return [];
      const name = variable.name.text;
      if (!exportedStatement && !exportedByName.has(name)) return [];
      if (!this.isFunctionValue(ts, variable.initializer)) return [];
      // The JSDoc of a variable sits on its statement.
      return [this.declaration(source, statement, 'function', name)];
    });
  }

  /**
   * `export default () => …`, `export default function () {}` written as an
   * expression, `export default class {}` as an expression.
   */
  private static defaultExpression(
    source: TsxSource,
    statement: TS.ExportAssignment
  ): ExportedDeclaration[] {
    const { ts } = source;
    if (statement.isExportEquals) return [];
    const expression = this.unwrap(ts, statement.expression);
    if (ts.isClassExpression(expression)) {
      return [this.declaration(source, statement, 'class', 'default')];
    }
    if (this.isFunctionValue(ts, expression)) {
      return [this.declaration(source, statement, 'function', 'default')];
    }
    return [];
  }

  private static declaration(
    source: TsxSource,
    node: TS.Node,
    kind: ExportedDeclaration['kind'],
    name: string
  ): ExportedDeclaration {
    return {
      kind,
      name,
      line: source.lineOf(node),
      documented: this.hasJsDoc(source.ts, source.sourceFile, node),
    };
  }

  /**
   * Local names exported by `export { a, b as c }` (no `from`) and by
   * `export default a`. A re-export from another module is judged in that
   * module, where the declaration is.
   */
  private static namesExportedByList(
    ts: TsxSource['ts'],
    sourceFile: TS.SourceFile
  ): Set<string> {
    return new Set(
      sourceFile.statements.flatMap(statement => [
        ...this.localNamesInExportList(ts, statement),
        ...this.defaultExportedName(ts, statement),
      ])
    );
  }

  /** `export { a, b as c }` without `from`: the local names a and b (values, not types). */
  private static localNamesInExportList(
    ts: TsxSource['ts'],
    statement: TS.Statement
  ): string[] {
    if (!ts.isExportDeclaration(statement)) return [];
    if (statement.moduleSpecifier || statement.isTypeOnly) return [];
    const clause = statement.exportClause;
    if (!clause || !ts.isNamedExports(clause)) return [];
    return clause.elements
      .filter(element => !element.isTypeOnly)
      .map(element => (element.propertyName ?? element.name).text);
  }

  /** `export default a`: the local name a. */
  private static defaultExportedName(
    ts: TsxSource['ts'],
    statement: TS.Statement
  ): string[] {
    return ts.isExportAssignment(statement) &&
      !statement.isExportEquals &&
      ts.isIdentifier(statement.expression)
      ? [statement.expression.text]
      : [];
  }

  private static hasExportModifier(
    ts: TsxSource['ts'],
    node: TS.ClassDeclaration | TS.FunctionDeclaration | TS.VariableStatement
  ): boolean {
    return (node.modifiers ?? []).some(
      modifier => modifier.kind === ts.SyntaxKind.ExportKeyword
    );
  }

  /** An arrow function or function expression, seen through parentheses, `as`, `satisfies` and `!`. */
  private static isFunctionValue(
    ts: TsxSource['ts'],
    expression: TS.Expression | undefined
  ): boolean {
    if (!expression) return false;
    const value = this.unwrap(ts, expression);
    return ts.isArrowFunction(value) || ts.isFunctionExpression(value);
  }

  private static unwrap(
    ts: TsxSource['ts'],
    expression: TS.Expression
  ): TS.Expression {
    let value = expression;
    while (WRAPPERS.some(name => this.is(ts, name, value))) {
      value = (value as TS.ParenthesizedExpression).expression;
    }
    return value;
  }

  /** `ts[name](node)`, false when this TypeScript has no such guard (`satisfies` is TS 4.9+). */
  private static is(
    ts: TsxSource['ts'],
    name: (typeof WRAPPERS)[number],
    node: TS.Node
  ): boolean {
    const guard: unknown = Reflect.get(ts, name);
    return typeof guard === 'function' && guard(node) === true;
  }

  /**
   * A non-empty JSDoc block among the comments right before the node — the
   * block the compiler attaches to it. Comments between a decorator and the
   * class are not before the node and do not count, as they do not for the
   * compiler, IDEs or TypeDoc.
   */
  private static hasJsDoc(
    ts: TsxSource['ts'],
    sourceFile: TS.SourceFile,
    node: TS.Node
  ): boolean {
    const text = sourceFile.text;
    return (ts.getLeadingCommentRanges(text, node.pos) ?? []).some(range =>
      this.isJsDocBlock(ts, text.slice(range.pos, range.end), range.kind)
    );
  }

  /** A non-empty JSDoc block before the first line of code of the file (after a shebang). */
  static hasFileHeader(source: TsxSource): boolean {
    const { ts, sourceFile } = source;
    const text = sourceFile.text;
    return (ts.getLeadingCommentRanges(text, 0) ?? []).some(range =>
      this.isJsDocBlock(ts, text.slice(range.pos, range.end), range.kind)
    );
  }

  /**
   * A block comment that opens with two stars and has text or a tag in it. An
   * empty block (two stars and nothing after them) is not documentation.
   */
  private static isJsDocBlock(
    ts: TsxSource['ts'],
    comment: string,
    kind: TS.SyntaxKind
  ): boolean {
    if (kind !== ts.SyntaxKind.MultiLineCommentTrivia) return false;
    if (!comment.startsWith('/**') || comment === '/**/') return false;
    const body = comment
      .slice(3, -2)
      .split('\n')
      .map(line => line.trim().replace(/^\*+/, '').trim())
      .join('');
    return body.length > 0;
  }
}

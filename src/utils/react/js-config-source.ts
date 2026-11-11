/**
 * A JavaScript or TypeScript configuration file (`next.config.ts`,
 * `vite.config.mjs`, `webpack.config.js`, `.size-limit.js`) read as syntax.
 *
 * The performance laws used to search these files for words: `optimization`,
 * `bundle`, `performance`. A word in a comment passed, and so did a key that
 * turns the feature OFF (`minify: false` contains `minify`). Reading the parse
 * answers the question that was meant: which properties are written, with
 * which values. A comment is not a node, so it can never satisfy a check.
 *
 * Only the file itself is read. A value imported from another module, or
 * computed at run time, is not resolved — callers say so in their limits.
 */

import * as fs from 'fs';
import type * as TS from 'typescript';
import { PathOperations } from '../path-operations';
import { loadTypeScript, parserUnavailable, TsxSource } from './tsx-source';

export type ConfigRead =
  | { source: TsxSource; unread: null }
  | { source: null; unread: string };

function propertyName(ts: typeof TS, name: TS.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
}

export class JsConfigSource {
  /** Parse `file` with the project's TypeScript; `unread` says why it could not be. */
  static read(projectRoot: string, file: string): ConfigRead {
    const relative = PathOperations.getRelative(projectRoot, file);
    const ts = loadTypeScript(projectRoot);
    if (!ts) {
      return { source: null, unread: `${relative}: ${parserUnavailable(projectRoot)}` };
    }
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      return { source: null, unread: `${relative}: could not be read` };
    }
    return { source: TsxSource.parse(ts, file, text), unread: null };
  }

  /**
   * Every value written for a property named `name`, anywhere in the file:
   * `{ name: value }` and `something.name = value`.
   */
  static valuesOf(source: TsxSource, name: string): TS.Expression[] {
    const ts = source.ts;
    const found: TS.Expression[] = [];
    source.walk(node => {
      if (ts.isPropertyAssignment(node) && propertyName(ts, node.name) === name) {
        found.push(node.initializer);
        return;
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(node.left) &&
        node.left.name.text === name
      ) {
        found.push(node.right);
      }
    });
    return found;
  }

  /** A property or method named `name` is declared (`headers() {}`, `headers: fn`). */
  static declares(source: TsxSource, name: string): boolean {
    const ts = source.ts;
    let declared = false;
    source.walk(node => {
      if (
        (ts.isMethodDeclaration(node) || ts.isPropertyAssignment(node)) &&
        propertyName(ts, node.name) === name
      ) {
        declared = true;
      }
    });
    return declared;
  }

  /** The node is the literal `true` / `false`. */
  static isBoolean(source: TsxSource, node: TS.Node, value: boolean): boolean {
    const kind = value ? source.ts.SyntaxKind.TrueKeyword : source.ts.SyntaxKind.FalseKeyword;
    return node.kind === kind;
  }

  /** The text of a string literal, or null for anything else. */
  static stringOf(source: TsxSource, node: TS.Node): string | null {
    return source.ts.isStringLiteralLike(node) ? node.text : null;
  }

  /** Some value of `name` is the literal `value`. */
  static hasBoolean(source: TsxSource, name: string, value: boolean): boolean {
    return this.valuesOf(source, name).some(node => this.isBoolean(source, node, value));
  }

  /**
   * The local names `module` is bound to: ESM default, namespace and named
   * imports, and `const x = require('module')` / `const { a } = require('module')`.
   */
  static importedNames(source: TsxSource, module: string): string[] {
    const ts = source.ts;
    const names: string[] = [];
    for (const info of source.imports()) {
      if (info.module !== module || info.typeOnly) continue;
      if (info.defaultName) names.push(info.defaultName);
      if (info.namespaceName) names.push(info.namespaceName);
      names.push(...info.named.map(binding => binding.local));
    }
    source.walk(node => {
      if (!ts.isVariableDeclaration(node) || !node.initializer) return;
      if (!this.isRequireOf(source, node.initializer, module)) return;
      if (ts.isIdentifier(node.name)) {
        names.push(node.name.text);
      } else if (ts.isObjectBindingPattern(node.name)) {
        for (const element of node.name.elements) {
          if (ts.isIdentifier(element.name)) names.push(element.name.text);
        }
      }
    });
    return names;
  }

  /** `require('module')`, or `require('module')(...)` wrapped around it. */
  private static isRequireOf(source: TsxSource, node: TS.Expression, module: string): boolean {
    const ts = source.ts;
    let current: TS.Expression = node;
    while (ts.isCallExpression(current)) {
      if (
        ts.isIdentifier(current.expression) &&
        current.expression.text === 'require' &&
        current.arguments.length === 1
      ) {
        const argument = current.arguments[0];
        return argument !== undefined && this.stringOf(source, argument) === module;
      }
      current = current.expression;
    }
    return false;
  }

  /** 1-based lines where one of `names` is called directly: `name(...)`. */
  static callsOf(source: TsxSource, names: readonly string[]): number[] {
    if (names.length === 0) return [];
    const ts = source.ts;
    const lines: number[] = [];
    source.walk(node => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        names.includes(node.expression.text)
      ) {
        lines.push(source.lineOf(node));
      }
    });
    return lines;
  }
}

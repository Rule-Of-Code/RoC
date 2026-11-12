/**
 * TSX read as syntax, not as text.
 *
 * A regex over `.tsx` cannot tell an attribute from a string that looks like
 * one, a multi-line `<button>` from two lines, or a comment from code. The
 * laws that judge JSX — an `<img>` without dimensions, a `<button>` without a
 * type, `dangerouslySetInnerHTML` without a sanitizer — need the parse.
 *
 * The parser is the project's own `typescript`, resolved from the audited
 * project first: a project with `.tsx` files compiles them with it, so it is
 * there, and RoC does not ship a second copy of a 20 MB compiler. When it
 * cannot be resolved, `loadTypeScript` returns null and a law that needs it
 * reports that it could not read the files. It never passes for want of a
 * parser: a law that inspected nothing is the vacuous green this tool refuses.
 *
 * `ts.createSourceFile` parses without type-checking, so it is fast and needs
 * no tsconfig, and it is the same parse the compiler does: no dialect drift.
 */

import type * as TS from 'typescript';

export type TypeScriptModule = typeof TS;

const loaded = new Map<string, TypeScriptModule | null>();

/**
 * The `typescript` module the audited project compiles with, or — when the
 * project has none of its own but RoC can resolve one — that one. Null when
 * neither resolves; memoised per project root.
 */
export function loadTypeScript(projectRoot: string): TypeScriptModule | null {
  if (loaded.has(projectRoot)) return loaded.get(projectRoot) ?? null;
  let ts: TypeScriptModule | null = null;
  try {
    const entry = require.resolve('typescript', { paths: [projectRoot, __dirname] });
    ts = require(entry) as TypeScriptModule;
  } catch {
    ts = null;
  }
  loaded.set(projectRoot, ts);
  return ts;
}

/** The message a law gives when it needed the parser and could not load it. */
export function parserUnavailable(projectRoot: string): string {
  return `could not load the 'typescript' package from ${projectRoot} — the .tsx/.jsx files were NOT read. Install typescript in the project (it compiles these files) so this law can inspect them`;
}

/** One JSX attribute as written. */
export interface JsxAttributeInfo {
  name: string;
  /** `string`: `a="x"` · `expression`: `a={x}` · `bare`: `<input disabled />` */
  kind: 'bare' | 'expression' | 'string';
  /** The literal for `string`, the expression's source text for `expression`, '' for `bare`. */
  value: string;
}

/** One JSX opening or self-closing element. */
export interface JsxElementInfo {
  /** Tag as written: `button`, `Image`, `motion.div`, `ion-input`. */
  tag: string;
  attributes: JsxAttributeInfo[];
  /** A `{...props}` spread: what it sets cannot be read from this file. */
  hasSpread: boolean;
  /** 1-based line of the opening `<`. */
  line: number;
  selfClosing: boolean;
  node: TS.JsxOpeningLikeElement;
}

/** One import declaration. */
export interface ImportInfo {
  module: string;
  defaultName: string | null;
  namespaceName: string | null;
  /** Imported names as bound locally (`{ a as b }` → `b`), with what they import. */
  named: Array<{ imported: string; local: string }>;
  /** `import type …` — erased at compile time, so it pulls nothing into a bundle. */
  typeOnly: boolean;
  line: number;
}

export class TsxSource {
  readonly sourceFile: TS.SourceFile;

  private constructor(
    readonly ts: TypeScriptModule,
    readonly fileName: string,
    readonly text: string
  ) {
    const kind = /\.(?:tsx|jsx)$/.test(fileName)
      ? ts.ScriptKind.TSX
      : /\.(?:js|mjs|cjs)$/.test(fileName)
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;
    this.sourceFile = ts.createSourceFile(
      fileName,
      text,
      ts.ScriptTarget.Latest,
      true,
      kind
    );
  }

  static parse(ts: TypeScriptModule, fileName: string, text: string): TsxSource {
    return new TsxSource(ts, fileName, text);
  }

  /** 1-based line of a node's first token. */
  lineOf(node: TS.Node): number {
    return (
      this.sourceFile.getLineAndCharacterOfPosition(node.getStart(this.sourceFile)).line + 1
    );
  }

  /**
   * The parser's syntax errors, as `line N: message`. `createSourceFile` never
   * throws: on an error it folds the rest of the file into the bad node, so a
   * law that walks the tree without asking here reads half a file and passes.
   * (`parseDiagnostics` is internal, present since TS 1.x.)
   */
  parseErrors(): string[] {
    const diagnostics =
      (this.sourceFile as unknown as { parseDiagnostics?: readonly TS.Diagnostic[] })
        .parseDiagnostics ?? [];
    return diagnostics.map(diagnostic => {
      const line =
        diagnostic.start === undefined
          ? 0
          : this.sourceFile.getLineAndCharacterOfPosition(diagnostic.start).line + 1;
      return `line ${line}: ${this.ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`;
    });
  }

  private valueNames?: ReadonlySet<string>;

  /**
   * Every name this file uses as a VALUE — what survives compilation.
   *
   * A name used only where a type goes (an annotation, `as T`, a generic
   * argument, `implements`, `typeof x` inside a type, an interface or a type
   * alias) is erased, and so is an import none of whose bindings is used as a
   * value: TypeScript and SWC drop it from the emitted module even without the
   * `type` keyword. `class A extends B` keeps `B` (a value).
   *
   * Over-approximates: every identifier outside a type counts, a property
   * name included. That can only keep an import, never drop one that runs.
   */
  valueReferences(): ReadonlySet<string> {
    if (this.valueNames) return this.valueNames;
    const ts = this.ts;
    const names = new Set<string>();
    const recurse = (node: TS.Node): void => {
      if (
        ts.isImportDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node)
      ) {
        return;
      }
      if (ts.isHeritageClause(node) && node.token === ts.SyntaxKind.ImplementsKeyword) return;
      if (ts.isExpressionWithTypeArguments(node)) {
        // `extends Base<T>`: Base is a value, T is a type.
        recurse(node.expression);
        return;
      }
      if (ts.isTypeNode(node)) return;
      if (ts.isIdentifier(node)) names.add(node.text);
      ts.forEachChild(node, recurse);
    };
    recurse(this.sourceFile);
    this.valueNames = names;
    return names;
  }

  /** Visit every node, depth first. */
  walk(visit: (node: TS.Node) => void): void {
    const recurse = (node: TS.Node): void => {
      visit(node);
      this.ts.forEachChild(node, recurse);
    };
    recurse(this.sourceFile);
  }

  /**
   * The directive prologue: `'use client'`, `'use server'`, `'use strict'`.
   * Only string statements BEFORE the first other statement count — the same
   * rule React and the bundlers apply, so a `'use client'` below an import is
   * not a directive and is not reported as one.
   */
  directives(): string[] {
    const found: string[] = [];
    for (const statement of this.sourceFile.statements) {
      if (
        this.ts.isExpressionStatement(statement) &&
        this.ts.isStringLiteral(statement.expression)
      ) {
        found.push(statement.expression.text);
        continue;
      }
      break;
    }
    return found;
  }

  imports(): ImportInfo[] {
    const result: ImportInfo[] = [];
    for (const statement of this.sourceFile.statements) {
      if (!this.ts.isImportDeclaration(statement)) continue;
      if (!this.ts.isStringLiteral(statement.moduleSpecifier)) continue;
      result.push(this.importInfo(statement, statement.moduleSpecifier.text));
    }
    return result;
  }

  private importInfo(statement: TS.ImportDeclaration, module: string): ImportInfo {
    const ts = this.ts;
    const clause = statement.importClause;
    const info: ImportInfo = {
      module,
      defaultName: clause?.name?.text ?? null,
      namespaceName: null,
      named: [],
      typeOnly: clause?.isTypeOnly ?? false,
      line: this.lineOf(statement),
    };
    const bindings = clause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) {
      info.namespaceName = bindings.name.text;
    } else if (bindings && ts.isNamedImports(bindings)) {
      info.named = bindings.elements
        .filter(element => !element.isTypeOnly)
        .map(element => ({
          imported: (element.propertyName ?? element.name).text,
          local: element.name.text,
        }));
    }
    return info;
  }

  /** Every JSX opening and self-closing element, in source order. */
  jsxElements(): JsxElementInfo[] {
    const ts = this.ts;
    const elements: JsxElementInfo[] = [];
    this.walk(node => {
      if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return;
      const attributes: JsxAttributeInfo[] = [];
      let hasSpread = false;
      for (const property of node.attributes.properties) {
        if (ts.isJsxSpreadAttribute(property)) {
          hasSpread = true;
          continue;
        }
        attributes.push(this.attribute(property));
      }
      elements.push({
        tag: node.tagName.getText(this.sourceFile),
        attributes,
        hasSpread,
        line: this.lineOf(node),
        selfClosing: ts.isJsxSelfClosingElement(node),
        node,
      });
    });
    return elements;
  }

  private attribute(property: TS.JsxAttribute): JsxAttributeInfo {
    const ts = this.ts;
    const name = property.name.getText(this.sourceFile);
    const initializer = property.initializer;
    if (!initializer) return { name, kind: 'bare', value: '' };
    if (ts.isStringLiteral(initializer)) {
      return { name, kind: 'string', value: initializer.text };
    }
    if (ts.isJsxExpression(initializer)) {
      const expression = initializer.expression;
      if (expression && ts.isStringLiteralLike(expression)) {
        return { name, kind: 'string', value: expression.text };
      }
      return {
        name,
        kind: 'expression',
        value: expression ? expression.getText(this.sourceFile) : '',
      };
    }
    return { name, kind: 'expression', value: initializer.getText(this.sourceFile) };
  }
}

/** The attribute named `name` on an element, if written. */
export function jsxAttribute(
  element: JsxElementInfo,
  name: string
): JsxAttributeInfo | undefined {
  return element.attributes.find(attribute => attribute.name === name);
}

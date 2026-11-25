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

import { AsyncLocalStorage } from 'async_hooks';
import type * as TS from 'typescript';

export type TypeScriptModule = typeof TS;

/** Where the parser the laws use came from, for one project (#667). */
export interface TypeScriptSource {
  ts: TypeScriptModule | null;
  /** The project's own `typescript` package, when it has one. */
  projectVersion: string | null;
  /** The version of the module in `ts`. */
  usedVersion: string | null;
  /** The project's own package, or the one RoC resolves itself. */
  from: 'project' | 'roc' | null;
}

const sources = new Map<string, TypeScriptSource>();

/**
 * The API the laws call. A `typescript` package without it cannot parse for
 * them: TypeScript 7.0's package exports only its version (the API moved to
 * `typescript/unstable/*`), so `ts.ScriptTarget.Latest` and `ts.sys.readFile`
 * crashed 29 laws with "Check failed" (#667). Checked by what the package
 * offers, never by its version number.
 */
export function hasCompilerApi(
  candidate: unknown
): candidate is TypeScriptModule {
  const ts = candidate as Partial<TypeScriptModule> | null | undefined;
  return (
    !!ts &&
    typeof ts.createSourceFile === 'function' &&
    typeof ts.forEachChild === 'function' &&
    typeof ts.ScriptTarget === 'object' &&
    typeof ts.ScriptKind === 'object' &&
    typeof ts.sys?.readFile === 'function'
  );
}

function requireFrom(paths: string[], id: string): unknown {
  try {
    return require(require.resolve(id, { paths })) as unknown;
  } catch {
    return null;
  }
}

function versionFrom(paths: string[], id: string): string | null {
  const manifest = requireFrom(paths, `${id}/package.json`) as {
    version?: unknown;
  } | null;
  return typeof manifest?.version === 'string' ? manifest.version : null;
}

/**
 * The package names RoC resolves its own parser from, in order: its runtime
 * dependency `@ruleofcode/ts-api` (an alias of typescript 6, whose API parses
 * TypeScript 7 code too), then a `typescript` RoC resolves from its own
 * install (its build dependency, when present).
 */
const OWN_TYPESCRIPT = ['@ruleofcode/ts-api', 'typescript'];

/**
 * The parser for a project: its own `typescript` when that package has the
 * compiler API — the version the project builds with — or else the one RoC
 * resolves from its own install, checked the same way. Memoised per root.
 */
export function typeScriptSource(projectRoot: string): TypeScriptSource {
  const known = sources.get(projectRoot);
  if (known) return known;
  const projectVersion = versionFrom([projectRoot], 'typescript');
  const own = requireFrom([projectRoot], 'typescript');
  let source: TypeScriptSource = {
    ts: null,
    projectVersion,
    usedVersion: null,
    from: null,
  };
  if (hasCompilerApi(own)) {
    source = {
      ts: own,
      projectVersion,
      usedVersion: own.version,
      from: 'project',
    };
  } else {
    for (const id of OWN_TYPESCRIPT) {
      const roc = requireFrom([__dirname], id);
      if (hasCompilerApi(roc)) {
        source = {
          ts: roc,
          projectVersion,
          usedVersion: roc.version,
          from: 'roc',
        };
        break;
      }
    }
  }
  sources.set(projectRoot, source);
  return source;
}

/**
 * The `typescript` module the audited project compiles with, or — when the
 * project has none with the compiler API — the one RoC resolves itself. Null
 * when neither has it.
 */
export function loadTypeScript(projectRoot: string): TypeScriptModule | null {
  const scope = parserUse.getStore();
  if (scope) scope.used = true;
  return typeScriptSource(projectRoot).ts;
}

/** Whether a law asked for the parser during its run (AsyncLocalStorage: per law, also in parallel). */
const parserUse = new AsyncLocalStorage<{ used: boolean }>();

/** Run one law's check and say whether it asked for the parser (#667). */
export async function runWithParserUse<T>(
  check: () => T | Promise<T>
): Promise<{ value: T; usedParser: boolean }> {
  const scope = { used: false };
  const value = await parserUse.run(scope, async () => await check());
  return { value, usedParser: scope.used };
}

/**
 * What a run says when the project's own `typescript` has no compiler API
 * (#667): which TypeScript parsed instead, or that none could. Null when the
 * project's package parsed, or there is none to speak of.
 */
export function typeScriptSourceNote(projectRoot: string): string | null {
  const { projectVersion, usedVersion, from } = typeScriptSource(projectRoot);
  if (!projectVersion || from === 'project') return null;
  return from === 'roc'
    ? `project typescript ${projectVersion} offers no JS API; parsed with RoC's typescript ${usedVersion ?? '?'} (parsing needs no type-checking, so the versions need not match)`
    : `the project's typescript ${projectVersion} has no compiler API, and RoC resolved no TypeScript that has one — the laws that parse were NOT read`;
}

/**
 * An array a TypeScript node carries under a name the typings do not declare:
 * `parseDiagnostics` on a SourceFile (internal, present since TS 1.x) or
 * `decorators` on a node (public before TS 4.8, removed after). The audited
 * project may load any TypeScript version, so the value is checked at run time
 * instead of asserted: anything but an array reads as none.
 */
export function internalArray<T>(node: object, name: string): readonly T[] {
  const value: unknown = Reflect.get(node, name);
  return Array.isArray(value) ? value : [];
}

/** The message a law gives when it needed the parser and could not load it. */
export function parserUnavailable(
  projectRoot: string,
  // Neutral: a caller that does not name its files must not be told they
  // were ".tsx/.jsx" — No Focused Tests and the request-path reader said so
  // of .ts files (#427).
  notRead = 'the files this law parses'
): string {
  const { projectVersion } = typeScriptSource(projectRoot);
  // A package that is there but has no compiler API (TypeScript 7.0) is not
  // "missing": installing it again would change nothing (#667).
  if (projectVersion) {
    return `the project's typescript ${projectVersion} has no compiler API (TypeScript 7.0 ships none) and RoC resolved no TypeScript that has one — ${notRead} were NOT read`;
  }
  return `could not load the 'typescript' package from ${projectRoot} — ${notRead} were NOT read. Install typescript in the project (it compiles these files) so this law can inspect them`;
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

/**
 * One file parsed with `ts.createSourceFile` (TSX, JS or TS by extension,
 * without type-checking), with the reads the laws share: node lines, parse
 * errors, names used as values, directives, imports and JSX elements.
 */
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

  static parse(
    ts: TypeScriptModule,
    fileName: string,
    text: string
  ): TsxSource {
    return new TsxSource(ts, fileName, text);
  }

  /** 1-based line of a node's first token. */
  lineOf(node: TS.Node): number {
    return (
      this.sourceFile.getLineAndCharacterOfPosition(
        node.getStart(this.sourceFile)
      ).line + 1
    );
  }

  /**
   * The parser's syntax errors, as `line N: message`. `createSourceFile` never
   * throws: on an error it folds the rest of the file into the bad node, so a
   * law that walks the tree without asking here reads half a file and passes.
   * (`parseDiagnostics` is internal, present since TS 1.x.)
   */
  parseErrors(): string[] {
    const diagnostics = internalArray<TS.Diagnostic>(
      this.sourceFile,
      'parseDiagnostics'
    );
    return diagnostics.map(diagnostic => {
      const line =
        diagnostic.start === undefined
          ? 0
          : this.sourceFile.getLineAndCharacterOfPosition(diagnostic.start)
              .line + 1;
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
      if (
        ts.isHeritageClause(node) &&
        node.token === ts.SyntaxKind.ImplementsKeyword
      )
        return;
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

  private importInfo(
    statement: TS.ImportDeclaration,
    module: string
  ): ImportInfo {
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
      if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node))
        return;
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
    return {
      name,
      kind: 'expression',
      value: initializer.getText(this.sourceFile),
    };
  }
}

/** The attribute named `name` on an element, if written. */
export function jsxAttribute(
  element: JsxElementInfo,
  name: string
): JsxAttributeInfo | undefined {
  return element.attributes.find(attribute => attribute.name === name);
}

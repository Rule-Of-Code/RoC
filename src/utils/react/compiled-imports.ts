/**
 * Which top-level import and re-export statements survive compilation: the
 * one rule every import graph of the React/Next laws applies (the Next module
 * graph, the client/server module graph, the test-only graph), so the graphs
 * cannot disagree about the same import again.
 *
 * TypeScript and SWC drop an import none of whose bindings is used as a
 * value (`import { Row } from './db'` used only as `: Row`), and every
 * `import type` / `export type … from`. A dropped import loads nothing: no
 * module behind it reaches a bundle or runs.
 *
 * Exceptions, where the import stays:
 * - a JavaScript file (it has no types, every import is a value import);
 * - an import with no bindings (`import './polyfill'`, a side effect);
 * - the nearest tsconfig (or jsconfig) sets `verbatimModuleSyntax` or
 *   `preserveValueImports`, or `importsNotUsedAsValues` to preserve/error:
 *   the compiler then keeps every import not written `import type`
 *   (`import { type A } from 'a'` becomes `import {} from 'a'`, which still
 *   loads 'a');
 * - that config cannot be read, or an `extends` of it cannot: whether the
 *   compiler keeps the import is unknown, so the edge is kept, never dropped.
 *
 * `export { X } from './m'` stays an edge even when X is a type: under
 * `isolatedModules` (which Next requires) re-exporting a type that way does
 * not compile, so the form that compiles is `export type`, which is dropped.
 */

import type * as TS from 'typescript';
import { PathOperations } from '../path-operations';
import type { TsxSource, TypeScriptModule } from './tsx-source';

/** TS6053 "File not found" and TS5083 "Cannot read file": an `extends` that did not load. */
const EXTENDS_NOT_LOADED = new Set([6053, 5083]);

const JAVASCRIPT = /\.(?:[cm]?js|jsx)$/;

export class CompiledImports {
  private readonly keepsByConfig = new Map<string, boolean>();

  constructor(private readonly ts: TypeScriptModule) {}

  /**
   * The module a top-level statement loads at runtime: the specifier of an
   * import or `export … from` the compiler keeps; null for any other
   * statement and for one the compiler drops.
   */
  runtimeSpecifier(source: TsxSource, statement: TS.Statement): string | null {
    const ts = this.ts;
    if (ts.isImportDeclaration(statement)) {
      if (!ts.isStringLiteral(statement.moduleSpecifier)) return null;
      return this.erased(source, statement) ? null : statement.moduleSpecifier.text;
    }
    if (
      ts.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      return statement.moduleSpecifier.text;
    }
    return null;
  }

  /** True when the compiler removes this import declaration from the emitted module. */
  erased(source: TsxSource, statement: TS.ImportDeclaration): boolean {
    const ts = this.ts;
    const clause = statement.importClause;
    if (!clause) return false;
    if (clause.isTypeOnly) return true;
    if (JAVASCRIPT.test(source.fileName)) return false;
    if (this.keepsImports(source.fileName)) return false;
    const locals: string[] = [];
    if (clause.name) locals.push(clause.name.text);
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) locals.push(bindings.name.text);
    const named = bindings && ts.isNamedImports(bindings) ? bindings.elements : [];
    for (const element of named) {
      if (!element.isTypeOnly) locals.push(element.name.text);
    }
    // `import { type A, type B } from 'x'`: every binding a type.
    if (locals.length === 0) return named.length > 0;
    const used = source.valueReferences();
    return !locals.some(name => used.has(name));
  }

  /**
   * Whether the compiler keeps every import not written `import type` for
   * this file — or cannot be told otherwise, because its config is unreadable.
   */
  private keepsImports(fileName: string): boolean {
    const ts = this.ts;
    const dir = PathOperations.getDirectory(fileName);
    const configFile =
      ts.findConfigFile(dir, ts.sys.fileExists, 'tsconfig.json') ??
      ts.findConfigFile(dir, ts.sys.fileExists, 'jsconfig.json');
    if (!configFile) return false;
    const known = this.keepsByConfig.get(configFile);
    if (known !== undefined) return known;
    const keeps = this.readKeepsImports(configFile);
    this.keepsByConfig.set(configFile, keeps);
    return keeps;
  }

  private readKeepsImports(configFile: string): boolean {
    const ts = this.ts;
    const read = ts.readConfigFile(configFile, ts.sys.readFile);
    if (read.error) return true;
    // A host that lists no files: only the options are wanted.
    const host: TS.ParseConfigHost = {
      useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
      readDirectory: () => [],
      fileExists: file => ts.sys.fileExists(file),
      readFile: file => ts.sys.readFile(file),
    };
    const parsed = ts.parseJsonConfigFileContent(
      read.config,
      host,
      PathOperations.getDirectory(configFile),
      undefined,
      configFile
    );
    if (parsed.errors.some(error => EXTENDS_NOT_LOADED.has(error.code))) return true;
    const options = parsed.options as TS.CompilerOptions & { preserveValueImports?: boolean };
    const preserving =
      options.importsNotUsedAsValues === ts.ImportsNotUsedAsValues.Preserve ||
      options.importsNotUsedAsValues === ts.ImportsNotUsedAsValues.Error;
    return Boolean(options.verbatimModuleSyntax || options.preserveValueImports || preserving);
  }
}

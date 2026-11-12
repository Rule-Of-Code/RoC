/**
 * The module graph of a Next app, as the bundler would follow it.
 *
 * A `'use client'` file pulls every module it imports into the browser
 * bundle, and so does each of those, transitively. Which modules that is
 * cannot be read off one file: it takes resolution — relative paths, tsconfig
 * `paths`, workspace packages linked through node_modules, package `exports`.
 * This module asks the project's own TypeScript (`ts.resolveModuleName`, with
 * the compiler options of the nearest tsconfig) instead of guessing, and
 * walks only first-party source: a resolved file inside the workspace and
 * outside node_modules is followed; a package is a leaf, known by its name.
 *
 * A walk never drops what it could not follow. An import it cannot resolve,
 * or a file it cannot read, is returned as `unresolved`, and the laws report
 * it — the graph past it was not inspected, so it is not passed.
 *
 * Next's own rule: a `'use server'` module imported from client code becomes
 * a reference to a server endpoint, not bundled code, so a client walk stops
 * at one (React's server-function boundary).
 */

import * as fs from 'fs';
import { builtinModules } from 'module';
import type * as TS from 'typescript';
import type { LawCheckContext } from '../../types/law.types';
import { PathOperations } from '../path-operations';
import { loadTypeScript, parserUnavailable, TsxSource, type TypeScriptModule } from './tsx-source';
import { ReactProject, type NextApp } from './react-project';
import { routerLayout, specialFile } from './next-routes';

/**
 * Modules that must never reach the browser bundle: the Node built-ins Next
 * does NOT polyfill for the client (the polyfilled ones — crypto, path,
 * buffer, stream, … — are listed in next/dist/build/webpack-config.js) and
 * the common database drivers and ORMs. A name covers its subpaths.
 */
export const DEFAULT_SERVER_MODULES: readonly string[] = [
  'fs',
  'child_process',
  'net',
  'tls',
  'dgram',
  'dns',
  'cluster',
  'worker_threads',
  'http2',
  'inspector',
  'repl',
  'v8',
  'pg',
  'postgres',
  'mysql',
  'mysql2',
  'better-sqlite3',
  'sqlite3',
  '@libsql/client',
  '@neondatabase/serverless',
  '@planetscale/database',
  '@prisma/client',
  'drizzle-orm',
  'kysely',
  'knex',
  'sequelize',
  'typeorm',
  'mongodb',
  'mongoose',
  'redis',
  'ioredis',
];

/** Packages Next resolves itself, with no node_modules entry needed. */
const NEXT_PROVIDED = new Set(['server-only', 'client-only']);

const ASSET = /\.(?:css|scss|sass|less|styl|svg|png|jpe?g|gif|webp|avif|ico|bmp|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|txt|md|mdx|html|wasm|glsl)$/i;

const NODE_BUILTINS = new Set(builtinModules);

export interface ModuleImport {
  specifier: string;
  line: number;
}

export type Resolution =
  | { kind: 'asset' }
  | { kind: 'external'; packageName: string }
  | { kind: 'source'; file: string }
  | { kind: 'unresolved'; reason: string };

export interface Unresolved {
  from: string;
  specifier: string;
  line: number;
  reason: string;
}

export interface Visit {
  source: TsxSource;
  /** The module that imported this one first; null for an entry. */
  via: string | null;
}

export interface WalkResult {
  modules: Map<string, Visit>;
  unresolved: Unresolved[];
}

/** `node:fs/promises` → `fs/promises`. */
const withoutNodeScheme = (specifier: string): string => specifier.replace(/^node:/, '');

/** The package a bare specifier names: `@a/b/c` → `@a/b`, `x/y` → `x`. */
export function packageNameOf(specifier: string): string {
  const bare = withoutNodeScheme(specifier);
  const parts = bare.split('/');
  return bare.startsWith('@') ? parts.slice(0, 2).join('/') : (parts[0] ?? bare);
}

/** Whether `specifier` is one of `modules` or a subpath of one. */
export function isListedModule(specifier: string, modules: readonly string[]): boolean {
  const bare = withoutNodeScheme(specifier);
  return modules.some(name => {
    const listed = withoutNodeScheme(name);
    return bare === listed || bare.startsWith(`${listed}/`);
  });
}

export class NextModuleGraph {
  /** Files that could not be read or parsed, as messages. */
  readonly unread: string[] = [];
  private readonly sources = new Map<string, TsxSource | null>();
  private readonly options = new Map<string, TS.CompilerOptions>();
  private readonly resolutions = new Map<string, Resolution>();
  private readonly realRoot: string;
  private readonly rootKey: string;

  private constructor(
    readonly context: LawCheckContext,
    readonly ts: TypeScriptModule
  ) {
    this.realRoot = NextModuleGraph.canonical(context.projectRoot);
    this.rootKey = NextModuleGraph.key(this.realRoot);
  }

  /** A graph for the project, or the reason it cannot be built (no TypeScript). */
  static create(context: LawCheckContext): NextModuleGraph | string {
    const ts = loadTypeScript(context.projectRoot);
    return ts ? new NextModuleGraph(context, ts) : parserUnavailable(context.projectRoot);
  }

  /**
   * The real path with forward slashes: the scan, the resolver and a symlinked
   * workspace package must name one file the same way (a temp dir may be an
   * 8.3 short name on Windows, a package a link in node_modules).
   */
  static canonical(file: string): string {
    try {
      return PathOperations.normalize(fs.realpathSync.native(file));
    } catch {
      return PathOperations.normalize(file);
    }
  }

  private static key(file: string): string {
    const normal = PathOperations.normalize(file);
    return process.platform === 'win32' ? normal.toLowerCase() : normal;
  }

  relative(file: string): string {
    return PathOperations.getRelative(this.realRoot, NextModuleGraph.canonical(file));
  }

  /** The parsed file, or null (recorded in `unread`) when it cannot be read. */
  source(file: string): TsxSource | null {
    const normal = NextModuleGraph.canonical(file);
    if (this.sources.has(normal)) return this.sources.get(normal) ?? null;
    let parsed: TsxSource | null = null;
    try {
      parsed = TsxSource.parse(this.ts, normal, fs.readFileSync(normal, 'utf8'));
    } catch {
      this.unread.push(`${this.relative(normal)}: could not be read`);
    }
    const syntaxError = parsed?.parseErrors()[0];
    if (syntaxError) {
      this.unread.push(`${this.relative(normal)}: could not be parsed (${syntaxError}) — its code was NOT read`);
      parsed = null;
    }
    this.sources.set(normal, parsed);
    return parsed;
  }

  /** Parse every file; the unreadable ones land in `unread`. */
  sourcesOf(files: readonly string[]): TsxSource[] {
    return files.map(file => this.source(file)).filter((s): s is TsxSource => s !== null);
  }

  /**
   * Every import that brings code in: static imports (not `import type`, not
   * an import whose every binding is a type), `export … from`, side-effect
   * imports, and `import('x')` / `require('x')` with a literal name.
   *
   * In a TypeScript file an import none of whose bindings is used as a value
   * is erased by the compiler (`import { Row } from './db'` used only as
   * `: Row`), so it is no edge — counted, it put a server module in the
   * client bundle that never reaches it.
   */
  importsOf(source: TsxSource): ModuleImport[] {
    const ts = this.ts;
    const found: ModuleImport[] = [];
    for (const statement of source.sourceFile.statements) {
      const module = this.staticSpecifier(statement, source);
      if (module) found.push({ specifier: module, line: source.lineOf(statement) });
    }
    source.walk(node => {
      if (!ts.isCallExpression(node)) return;
      const [first] = node.arguments;
      if (!first || !ts.isStringLiteralLike(first)) return;
      const dynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const requireCall = ts.isIdentifier(node.expression) && node.expression.text === 'require';
      if (dynamicImport || requireCall) found.push({ specifier: first.text, line: source.lineOf(node) });
    });
    return found;
  }

  private staticSpecifier(statement: TS.Statement, source: TsxSource): string | null {
    const ts = this.ts;
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const clause = statement.importClause;
      if (clause?.isTypeOnly) return null;
      const bindings = clause?.namedBindings;
      const onlyTypes =
        clause !== undefined &&
        !clause.name &&
        bindings !== undefined &&
        ts.isNamedImports(bindings) &&
        bindings.elements.length > 0 &&
        bindings.elements.every(element => element.isTypeOnly);
      if (onlyTypes || (clause && this.erasedByCompiler(clause, source))) return null;
      return statement.moduleSpecifier.text;
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

  /**
   * True when a TypeScript file imports bindings and uses none of them as a
   * value, so the emitted module has no such import. A JavaScript file keeps
   * every import; an import with no bindings is a side-effect import and stays.
   *
   * `export { X } from './m'` stays an edge even when X is a type: under
   * `isolatedModules` (which Next requires) re-exporting a type that way does
   * not compile, so the form that compiles is `export type`, already skipped.
   */
  private erasedByCompiler(clause: TS.ImportClause, source: TsxSource): boolean {
    const ts = this.ts;
    if (/\.(?:[cm]?js|jsx)$/.test(source.fileName)) return false;
    // verbatimModuleSyntax (and its predecessor preserveValueImports) keeps
    // every import not written `import type` — the edge is real there.
    const options = this.compilerOptions(source.fileName) as TS.CompilerOptions & {
      preserveValueImports?: boolean;
    };
    if (options.verbatimModuleSyntax || options.preserveValueImports) return false;
    const locals: string[] = [];
    if (clause.name) locals.push(clause.name.text);
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) locals.push(bindings.name.text);
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        if (!element.isTypeOnly) locals.push(element.name.text);
      }
    }
    if (locals.length === 0) return false;
    const used = source.valueReferences();
    return !locals.some(name => used.has(name));
  }

  /** Where `specifier`, imported from `fromFile`, leads. */
  resolve(specifier: string, fromFile: string): Resolution {
    const cacheKey = `${PathOperations.getDirectory(fromFile)}\0${specifier}`;
    const cached = this.resolutions.get(cacheKey);
    if (cached) return cached;
    const resolution = this.resolveUncached(specifier, fromFile);
    this.resolutions.set(cacheKey, resolution);
    return resolution;
  }

  private resolveUncached(specifier: string, fromFile: string): Resolution {
    const bare = !specifier.startsWith('.') && !specifier.startsWith('/');
    if (specifier.startsWith('node:') || (bare && NODE_BUILTINS.has(packageNameOf(specifier)))) {
      return { kind: 'external', packageName: packageNameOf(specifier) };
    }
    if (NEXT_PROVIDED.has(specifier)) return { kind: 'external', packageName: specifier };
    const path = specifier.replace(/[?#].*$/, '');
    if (ASSET.test(path)) return { kind: 'asset' };
    const result = this.ts.resolveModuleName(path, fromFile, this.compilerOptions(fromFile), this.ts.sys);
    const resolved = result.resolvedModule?.resolvedFileName;
    if (!resolved) {
      return { kind: 'unresolved', reason: 'could not be resolved — the modules behind it were NOT read' };
    }
    const file = NextModuleGraph.canonical(resolved);
    if (!this.isFirstParty(file)) {
      return bare
        ? { kind: 'external', packageName: packageNameOf(specifier) }
        : { kind: 'unresolved', reason: `resolves outside the workspace (${file})` };
    }
    if (/\.d\.[cm]?ts$/.test(file)) return this.implementationOf(file);
    if (/\.json$/.test(file)) return { kind: 'asset' };
    return { kind: 'source', file };
  }

  /** A first-party `.d.ts` resolves to the JS beside it, which is what is bundled. */
  private implementationOf(declaration: string): Resolution {
    const stem = declaration.replace(/\.d\.[cm]?ts$/, '');
    for (const ext of ['.js', '.mjs', '.jsx', '.cjs']) {
      if (fs.existsSync(stem + ext)) return { kind: 'source', file: stem + ext };
    }
    return {
      kind: 'unresolved',
      reason: `resolves only to a type declaration (${this.relative(declaration)}) — the code behind it was NOT read`,
    };
  }

  private isFirstParty(file: string): boolean {
    const key = NextModuleGraph.key(file);
    return key.startsWith(`${this.rootKey}/`) && !key.includes('/node_modules/');
  }

  private compilerOptions(fromFile: string): TS.CompilerOptions {
    const ts = this.ts;
    const dir = PathOperations.getDirectory(fromFile);
    const configFile =
      ts.findConfigFile(dir, ts.sys.fileExists, 'tsconfig.json') ??
      ts.findConfigFile(dir, ts.sys.fileExists, 'jsconfig.json');
    const key = configFile ?? '';
    const known = this.options.get(key);
    if (known) return known;
    let options: TS.CompilerOptions = {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    };
    if (configFile) {
      const read = ts.readConfigFile(configFile, ts.sys.readFile);
      if (!read.error) {
        const host = { ...ts.sys, readDirectory: (): string[] => [] };
        const parsed = ts.parseJsonConfigFileContent(
          read.config,
          host,
          PathOperations.getDirectory(configFile),
          undefined,
          configFile
        );
        options = { ...options, ...parsed.options };
      }
    }
    options = { ...options, allowJs: true, resolveJsonModule: true };
    this.options.set(key, options);
    return options;
  }

  /**
   * Breadth-first from `entries`, following first-party source. `stop`
   * decides which reached modules are boundaries (not entered, not counted).
   */
  walk(entries: readonly string[], stop: (source: TsxSource) => boolean = () => false): WalkResult {
    const modules = new Map<string, Visit>();
    const unresolved: Unresolved[] = [];
    const queue: string[] = [];
    for (const entry of entries) {
      const source = this.source(entry);
      const normal = NextModuleGraph.canonical(entry);
      if (source && !modules.has(normal)) {
        modules.set(normal, { source, via: null });
        queue.push(normal);
      }
    }
    while (queue.length > 0) {
      const file = queue.shift() as string;
      const visit = modules.get(file) as Visit;
      for (const item of this.importsOf(visit.source)) {
        const reached = this.follow(file, item, modules, unresolved, stop);
        if (reached) queue.push(reached);
      }
    }
    return { modules, unresolved };
  }

  /** One import of `file`: the newly reached module to visit, or null. */
  private follow(
    file: string,
    { specifier, line }: ModuleImport,
    modules: Map<string, Visit>,
    unresolved: Unresolved[],
    stop: (source: TsxSource) => boolean
  ): string | null {
    const resolution = this.resolve(specifier, file);
    if (resolution.kind === 'unresolved') {
      unresolved.push({ from: file, specifier, line, reason: resolution.reason });
      return null;
    }
    if (resolution.kind !== 'source' || modules.has(resolution.file)) return null;
    const next = this.source(resolution.file);
    if (!next) {
      unresolved.push({ from: file, specifier, line, reason: 'could not be read' });
      return null;
    }
    if (stop(next)) return null;
    modules.set(resolution.file, { source: next, via: file });
    return resolution.file;
  }

  /** `a.tsx → b.ts → c.ts`, from the entry that reached `file`. */
  chain(modules: Map<string, Visit>, file: string): string {
    const steps: string[] = [];
    let current: string | null = file;
    while (current && steps.length < 20) {
      steps.unshift(this.relative(current));
      current = modules.get(current)?.via ?? null;
    }
    return steps.join(' → ');
  }

  /** The message for an import the walk could not follow. */
  describeUnresolved(item: Unresolved): string {
    return `${this.relative(item.from)}:${item.line}: import '${item.specifier}' ${item.reason}`;
  }
}

/** Whether the file opens with the `'use server'` directive. */
export const isServerModule = (source: TsxSource): boolean =>
  source.directives().includes('use server');

/** Whether the file opens with the `'use client'` directive. */
export const isClientModule = (source: TsxSource): boolean =>
  source.directives().includes('use client');

/**
 * The client bundle's entry points: every non-test source file that opens
 * with `'use client'`, and each app's `instrumentation-client` file.
 */
export function clientEntries(graph: NextModuleGraph, apps: readonly NextApp[]): string[] {
  const entries = graph
    .sourcesOf(ReactProject.sourceFiles(graph.context))
    .filter(isClientModule)
    .map(source => source.fileName);
  for (const app of apps) {
    const dir = routerLayout(app).conventionDir;
    const file = dir ? specialFile(dir, 'instrumentation-client') : null;
    if (file) entries.push(NextModuleGraph.canonical(file));
  }
  return [...new Set(entries)];
}

/** The client graph: every module a client entry bundles, stopping at `'use server'` modules. */
export function clientGraph(graph: NextModuleGraph, apps: readonly NextApp[]): WalkResult {
  return graph.walk(clientEntries(graph, apps), isServerModule);
}

/** The names of `process.env` reads, by form. */
export interface EnvRead {
  /** The literal name, or null for a computed or whole-object use. */
  name: string | null;
  line: number;
  /** The expression as written, for messages. */
  text: string;
}

/**
 * Every use of `process.env` in a file: `process.env.X` and
 * `process.env['X']` give the name; `process.env[expr]`, destructuring and
 * passing `process.env` around give null — Next inlines only the literal forms.
 */
export function envReads(source: TsxSource): EnvRead[] {
  const ts = source.ts;
  const reads: EnvRead[] = [];
  source.walk(node => {
    if (!isProcessEnv(ts, node)) return;
    const parent = node.parent;
    const text = (n: TS.Node): string => n.getText(source.sourceFile);
    if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
      reads.push({ name: parent.name.text, line: source.lineOf(parent), text: text(parent) });
    } else if (ts.isElementAccessExpression(parent) && parent.expression === node) {
      const argument = parent.argumentExpression;
      const name = ts.isStringLiteralLike(argument) ? argument.text : null;
      reads.push({ name, line: source.lineOf(parent), text: text(parent) });
    } else {
      reads.push({ name: null, line: source.lineOf(node), text: text(parent) });
    }
  });
  return reads;
}

function isProcessEnv(ts: TypeScriptModule, node: TS.Node): node is TS.PropertyAccessExpression {
  return (
    ts.isPropertyAccessExpression(node) &&
    node.name.text === 'env' &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'process'
  );
}

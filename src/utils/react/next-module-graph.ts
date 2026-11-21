/**
 * The one module graph of the Next laws, as Next and its bundler follow it.
 *
 * A `'use client'` file pulls every module it imports into the browser
 * bundle, and so does each of those, transitively. Which modules that is
 * cannot be read off one file: it takes resolution — relative paths,
 * tsconfig/jsconfig `paths` and `baseUrl`, package.json `imports`, workspace
 * packages linked through node_modules, package `exports`. This module asks
 * the project's own TypeScript (`ts.resolveModuleName`, with the compiler
 * options of the nearest tsconfig.json or jsconfig.json) under bundler
 * resolution — how Next's bundlers resolve, whatever `moduleResolution` the
 * config names — and walks only first-party source: a resolved file inside
 * the workspace and outside node_modules is followed (a workspace package
 * linked into node_modules is first-party); an installed package is a leaf,
 * known by its name.
 *
 * A walk never drops what it could not follow. An import it cannot resolve
 * (a package that is not installed, an alias no config maps, a path that
 * leaves the workspace, a type declaration with no code beside it), a file
 * it cannot read, and a config it cannot read are returned, and the laws
 * report them: the graph past them was not inspected, so it is not passed.
 *
 * What differs between the laws is a parameter of the walk, not a second
 * graph: where it stops (`'use server'` from the client, `'use client'` from
 * the server), whether a boundary module is part of the result, and whether
 * `import()` / `require()` are edges.
 */

import * as fs from 'fs';
import { builtinModules } from 'module';
import type * as TS from 'typescript';
import type { LawCheckContext } from '../../types/law.types';
import { PathOperations } from '../path-operations';
import { CompiledImports } from './compiled-imports';
import {
  loadTypeScript,
  parserUnavailable,
  TsxSource,
  type TypeScriptModule,
} from './tsx-source';

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

/** Stylesheets, images, fonts, media, data and shaders: loaded by a loader, not code to walk. */
const ASSET =
  /\.(?:css|scss|sass|less|styl|svg|png|jpe?g|gif|webp|avif|ico|bmp|json|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|txt|md|mdx|html|wasm|glsl)$/i;

const NODE_BUILTINS = new Set(builtinModules);

/** The configs Next reads compiler options from, in the order it looks for them. */
const CONFIG_FILES = ['tsconfig.json', 'jsconfig.json'];

/** TS6053 "File not found" and TS5083 "Cannot read file": an `extends` that did not load. */
const EXTENDS_NOT_LOADED = new Set([6053, 5083]);

/** Why an import was not followed when it resolved to nothing at all. */
export const NOT_RESOLVED =
  'could not be resolved — the modules behind it were NOT read';

/** One import of a module: a kept static import or re-export, or an `import()` / `require()` call. */
export interface ModuleImport {
  specifier: string;
  line: number;
  /** The import statement, or the call for `import()` / `require()`. */
  node: TS.Node;
  /** A kept static import or re-export, a `require('x')`, or an `import('x')`. */
  kind: 'static' | 'require' | 'import';
}

/** Which calls are edges: `require()` is bundled in the same chunk, `import()` is a chunk of its own. */
export interface CallEdges {
  require: boolean;
  dynamicImport: boolean;
}

export type Resolution =
  | { kind: 'asset' }
  | { kind: 'external'; packageName: string }
  | { kind: 'source'; file: string }
  | { kind: 'unresolved'; reason: string };

/** An import a walk followed, with where it led. */
export interface ModuleEdge extends ModuleImport {
  resolution: Resolution;
}

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
  /** The imports the walk followed out of this module (none for a boundary module). */
  edges: ModuleEdge[];
}

export interface WalkResult {
  modules: Map<string, Visit>;
  unresolved: Unresolved[];
  /** Configs the walk resolved under but could not read: what they map was not resolved. */
  configs: string[];
}

/** How a walk follows the graph: the parameters that differ between the laws. */
export interface WalkOptions {
  /** A boundary module: its imports are not followed. */
  stop?: (source: TsxSource) => boolean;
  /**
   * `'module'`: a boundary module reached is in the result, without edges.
   * `'outside'` (default): it is not in the result at all.
   */
  boundary?: 'module' | 'outside';
  /** Follow `require()` as an edge (default true). */
  require?: boolean;
  /** Follow `import()` as an edge (default true). */
  dynamicImport?: boolean;
  /** An import of `file` that Next strips from the bundle being walked. */
  skip?: (file: string, source: TsxSource, item: ModuleImport) => boolean;
}

interface LoadedConfig {
  options: TS.CompilerOptions;
  /** Why the config (or a config it extends) could not be read, or null. */
  problem: string | null;
}

/** `node:fs/promises` → `fs/promises`. */
const withoutNodeScheme = (specifier: string): string =>
  specifier.replace(/^node:/, '');

/** The package a bare specifier names: `@a/b/c` → `@a/b`, `x/y` → `x`. */
export function packageNameOf(specifier: string): string {
  const bare = withoutNodeScheme(specifier);
  const parts = bare.split('/');
  return bare.startsWith('@')
    ? parts.slice(0, 2).join('/')
    : (parts[0] ?? bare);
}

/** True for a specifier that is neither relative nor absolute (a package, an alias, `#x`). */
export function isBareSpecifier(specifier: string): boolean {
  return !specifier.startsWith('.') && !specifier.startsWith('/');
}

/** Whether `specifier` is one of `modules` or a subpath of one. */
export function isListedModule(
  specifier: string,
  modules: readonly string[]
): boolean {
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
  /** The config file that governs a directory ('' when none), by directory key. */
  private readonly configOfDir = new Map<string, string>();
  private readonly configs = new Map<string, LoadedConfig>();
  private readonly resolutions = new Map<string, Resolution>();
  private readonly realRoot: string;
  private readonly rootKey: string;
  private readonly compiled: CompiledImports;

  private constructor(
    readonly context: LawCheckContext,
    readonly ts: TypeScriptModule
  ) {
    this.realRoot = NextModuleGraph.canonical(context.projectRoot);
    this.rootKey = NextModuleGraph.key(this.realRoot);
    this.compiled = new CompiledImports(ts);
  }

  /** A graph for the project, or the reason it cannot be built (no TypeScript). */
  static create(context: LawCheckContext): NextModuleGraph | string {
    const ts = loadTypeScript(context.projectRoot);
    return ts
      ? new NextModuleGraph(context, ts)
      : parserUnavailable(context.projectRoot);
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
    return PathOperations.getRelative(
      this.realRoot,
      NextModuleGraph.canonical(file)
    );
  }

  /** The parsed file, or null (recorded in `unread`) when it cannot be read. */
  source(file: string): TsxSource | null {
    const normal = NextModuleGraph.canonical(file);
    if (this.sources.has(normal)) return this.sources.get(normal) ?? null;
    let parsed: TsxSource | null = null;
    try {
      parsed = TsxSource.parse(
        this.ts,
        normal,
        fs.readFileSync(normal, 'utf8')
      );
    } catch {
      this.unread.push(`${this.relative(normal)}: could not be read`);
    }
    const syntaxError = parsed?.parseErrors()[0];
    if (syntaxError) {
      this.unread.push(
        `${this.relative(normal)}: could not be parsed (${syntaxError}) — its code was NOT read`
      );
      parsed = null;
    }
    this.sources.set(normal, parsed);
    return parsed;
  }

  /** Parse every file; the unreadable ones land in `unread`. */
  sourcesOf(files: readonly string[]): TsxSource[] {
    return files
      .map(file => this.source(file))
      .filter((s): s is TsxSource => s !== null);
  }

  /**
   * Every import that brings code in: the static imports and `export … from`
   * the compiler keeps (see CompiledImports — an import used only as a type
   * is erased, so it is no edge), side-effect imports, and — as `calls`
   * asks — `require('x')` and `import('x')` with a literal name.
   */
  importsOf(
    source: TsxSource,
    calls: CallEdges = { require: true, dynamicImport: true }
  ): ModuleImport[] {
    const ts = this.ts;
    const found: ModuleImport[] = [];
    for (const statement of source.sourceFile.statements) {
      const module = this.compiled.runtimeSpecifier(source, statement);
      if (module)
        found.push({
          specifier: module,
          line: source.lineOf(statement),
          node: statement,
          kind: 'static',
        });
    }
    if (!calls.require && !calls.dynamicImport) return found;
    source.walk(node => {
      if (!ts.isCallExpression(node)) return;
      const [first] = node.arguments;
      if (!first || !ts.isStringLiteralLike(first)) return;
      const dynamicImport =
        node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const requireCall =
        ts.isIdentifier(node.expression) && node.expression.text === 'require';
      if (
        (dynamicImport && calls.dynamicImport) ||
        (requireCall && calls.require)
      )
        found.push({
          specifier: first.text,
          line: source.lineOf(node),
          node,
          kind: dynamicImport ? 'import' : 'require',
        });
    });
    return found;
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

  /** Why the config that governs `file` could not be read, or null. */
  configProblem(file: string): string | null {
    return this.configFor(file).problem;
  }

  private resolveUncached(specifier: string, fromFile: string): Resolution {
    const bare = isBareSpecifier(specifier);
    if (
      specifier.startsWith('node:') ||
      (bare && NODE_BUILTINS.has(packageNameOf(specifier)))
    ) {
      return { kind: 'external', packageName: packageNameOf(specifier) };
    }
    if (NEXT_PROVIDED.has(specifier))
      return { kind: 'external', packageName: specifier };
    // A query or a fragment is the bundler's, not the file's; a leading `#`
    // is a package.json `imports` name, not a fragment.
    const path = specifier.replace(/\?.*$/, '').replace(/(.)#.*$/, '$1');
    if (ASSET.test(path)) return { kind: 'asset' };
    const result = this.ts.resolveModuleName(
      path,
      fromFile,
      this.configFor(fromFile).options,
      this.ts.sys
    ).resolvedModule;
    if (!result) return { kind: 'unresolved', reason: NOT_RESOLVED };
    const file = NextModuleGraph.canonical(result.resolvedFileName);
    if (!this.isFirstParty(file)) {
      const installed =
        result.isExternalLibraryImport === true ||
        NextModuleGraph.key(file).includes('/node_modules/');
      return installed
        ? {
            kind: 'external',
            packageName: bare ? packageNameOf(specifier) : specifier,
          }
        : {
            kind: 'unresolved',
            reason: `resolves outside the workspace (${file})`,
          };
    }
    if (/\.d\.[cm]?ts$/.test(file)) return this.implementationOf(file);
    if (ASSET.test(file)) return { kind: 'asset' };
    return { kind: 'source', file };
  }

  /** A first-party `.d.ts` resolves to the JS beside it, which is what is bundled. */
  private implementationOf(declaration: string): Resolution {
    const stem = declaration.replace(/\.d\.[cm]?ts$/, '');
    for (const ext of ['.js', '.mjs', '.jsx', '.cjs']) {
      if (fs.existsSync(stem + ext))
        return { kind: 'source', file: stem + ext };
    }
    return {
      kind: 'unresolved',
      reason: `resolves only to a type declaration (${this.relative(declaration)}) — the code behind it was NOT read`,
    };
  }

  private isFirstParty(file: string): boolean {
    const key = NextModuleGraph.key(file);
    return (
      key.startsWith(`${this.rootKey}/`) && !key.includes('/node_modules/')
    );
  }

  /** The nearest tsconfig.json or jsconfig.json at or above the file, up to the project root. */
  private configFileOf(dir: string): string {
    const dirKey = NextModuleGraph.key(dir);
    const known = this.configOfDir.get(dirKey);
    if (known !== undefined) return known;
    let found = '';
    for (const name of CONFIG_FILES) {
      const candidate = PathOperations.join(dir, name);
      if (fs.existsSync(candidate)) {
        found = candidate;
        break;
      }
    }
    if (!found) {
      const parent = PathOperations.getDirectory(dir);
      const insideRoot = NextModuleGraph.key(parent).startsWith(this.rootKey);
      if (dirKey !== this.rootKey && parent !== dir && insideRoot)
        found = this.configFileOf(parent);
    }
    this.configOfDir.set(dirKey, found);
    return found;
  }

  private configFor(fromFile: string): LoadedConfig {
    const file = this.configFileOf(PathOperations.getDirectory(fromFile));
    const known = this.configs.get(file);
    if (known) return known;
    const loaded = file ? this.load(file) : { options: {}, problem: null };
    const ts = this.ts;
    const config: LoadedConfig = {
      problem: loaded.problem,
      options: {
        ...loaded.options,
        // Next's bundlers resolve like `moduleResolution: bundler` (package
        // `exports` and `imports` included) whatever the config names, and
        // read .js/.json as well as TS whatever the config allows.
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        allowJs: true,
        resolveJsonModule: true,
        jsx: loaded.options.jsx ?? ts.JsxEmit.Preserve,
      },
    };
    this.configs.set(file, config);
    return config;
  }

  /** The options of a config file; what cannot be read is named in `problem`. */
  private load(file: string): LoadedConfig {
    const ts = this.ts;
    const where = this.relative(file);
    const read = ts.readConfigFile(file, name => ts.sys.readFile(name));
    if (read.error) {
      return {
        options: {},
        problem: `${where}: could not be parsed (${ts.flattenDiagnosticMessageText(read.error.messageText, ' ')}) — its path aliases were not resolved`,
      };
    }
    // A host that lists no files: only the options are wanted, and listing
    // `include` would walk the whole repository for nothing.
    const host: TS.ParseConfigHost = {
      useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
      readDirectory: () => [],
      fileExists: name => ts.sys.fileExists(name),
      readFile: name => ts.sys.readFile(name),
    };
    const parsed = ts.parseJsonConfigFileContent(
      read.config,
      host,
      PathOperations.getDirectory(file),
      undefined,
      file
    );
    const extendsError = parsed.errors.find(error =>
      EXTENDS_NOT_LOADED.has(error.code)
    );
    return {
      options: parsed.options,
      problem: extendsError
        ? `${where}: ${ts.flattenDiagnosticMessageText(extendsError.messageText, ' ')} — its path aliases were not resolved`
        : null,
    };
  }

  /**
   * Breadth-first from `entries`, following first-party source; the options
   * say where the walk stops and which imports are edges.
   */
  walk(entries: readonly string[], options: WalkOptions = {}): WalkResult {
    const stop = options.stop ?? (() => false);
    const keepBoundary = options.boundary === 'module';
    const calls: CallEdges = {
      require: options.require ?? true,
      dynamicImport: options.dynamicImport ?? true,
    };
    const modules = new Map<string, Visit>();
    const unresolved: Unresolved[] = [];
    const configs = new Set<string>();
    const queue: string[] = [];
    const enter = (
      file: string,
      source: TsxSource,
      via: string | null
    ): void => {
      const boundary = stop(source);
      if (boundary && !keepBoundary) return;
      modules.set(file, { source, via, edges: [] });
      if (!boundary) queue.push(file);
    };
    for (const entry of entries) {
      const file = NextModuleGraph.canonical(entry);
      const source = this.source(file);
      if (source && !modules.has(file)) enter(file, source, null);
    }
    while (queue.length > 0) {
      const file = queue.shift() as string;
      const visit = modules.get(file) as Visit;
      const imports = this.importsOf(visit.source, calls).filter(
        item => !options.skip?.(file, visit.source, item)
      );
      const problem = imports.length > 0 ? this.configProblem(file) : null;
      if (problem) configs.add(problem);
      for (const item of imports) {
        const resolution = this.resolve(item.specifier, file);
        visit.edges.push({ ...item, resolution });
        const reached = this.reached(file, item, resolution, unresolved);
        if (reached && !modules.has(reached.file))
          enter(reached.file, reached.source, file);
      }
    }
    return { modules, unresolved, configs: [...configs] };
  }

  /** The module an import leads to, or null (an unread one recorded in `unresolved`). */
  private reached(
    file: string,
    { specifier, line }: ModuleImport,
    resolution: Resolution,
    unresolved: Unresolved[]
  ): { file: string; source: TsxSource } | null {
    if (resolution.kind === 'unresolved') {
      unresolved.push({
        from: file,
        specifier,
        line,
        reason: resolution.reason,
      });
      return null;
    }
    if (resolution.kind !== 'source') return null;
    const source = this.source(resolution.file);
    if (!source) {
      unresolved.push({
        from: file,
        specifier,
        line,
        reason: 'could not be read',
      });
      return null;
    }
    return { file: resolution.file, source };
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

/** The names of `process.env` reads, by form. */
export interface EnvRead {
  /** The literal name, or null for a computed or whole-object use. */
  name: string | null;
  line: number;
  /** The expression as written, for messages. */
  text: string;
  /**
   * True only for `process.env.X` and `process.env['X']`, the forms Next
   * replaces at build time. A destructured name is read, but never inlined:
   * in the browser it is undefined.
   */
  inlined: boolean;
  /** Where it is read, for telling code Next strips from a bundle. */
  node: TS.Node;
}

/**
 * Every use of `process.env` in a file: `process.env.X` and
 * `process.env['X']` give the name (inlined); `const { X, Y: y } =
 * process.env` (and the same assignment) gives X and Y, not inlined, with a
 * rest element or a computed key as a null read; `process.env[expr]` and
 * passing `process.env` around give null — Next inlines only the literal
 * forms.
 */
export function envReads(source: TsxSource): EnvRead[] {
  const ts = source.ts;
  const reads: EnvRead[] = [];
  source.walk(node => {
    if (!isProcessEnv(ts, node)) return;
    const parent = node.parent;
    const text = (n: TS.Node): string => n.getText(source.sourceFile);
    if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
      reads.push({
        name: parent.name.text,
        line: source.lineOf(parent),
        text: text(parent),
        inlined: true,
        node: parent,
      });
    } else if (
      ts.isElementAccessExpression(parent) &&
      parent.expression === node
    ) {
      const argument = parent.argumentExpression;
      const name = ts.isStringLiteralLike(argument) ? argument.text : null;
      reads.push({
        name,
        line: source.lineOf(parent),
        text: text(parent),
        inlined: name !== null,
        node: parent,
      });
    } else {
      const destructured = destructuredEnvReads(source, node);
      reads.push(
        ...(destructured ?? [
          {
            name: null,
            line: source.lineOf(node),
            text: text(parent),
            inlined: false,
            node,
          },
        ])
      );
    }
  });
  return reads;
}

/**
 * The names a destructuring of `process.env` reads — `const { A, B: b } =
 * process.env` or `({ A } = process.env)`, through parentheses and `as` —
 * or null when `env` is not destructured there.
 */
function destructuredEnvReads(
  source: TsxSource,
  env: TS.Expression
): EnvRead[] | null {
  const ts = source.ts;
  let value: TS.Node = env;
  while (
    ts.isParenthesizedExpression(value.parent) ||
    ts.isAsExpression(value.parent) ||
    ts.isNonNullExpression(value.parent) ||
    // By kind: the project's own TypeScript may predate `satisfies` (4.9).
    value.parent.kind === ts.SyntaxKind.SatisfiesExpression
  ) {
    value = value.parent;
  }
  const holder = value.parent;
  const elements: Array<{
    key: TS.Node | undefined;
    rest: boolean;
    at: TS.Node;
  }> = [];
  if (
    ts.isVariableDeclaration(holder) &&
    holder.initializer === value &&
    ts.isObjectBindingPattern(holder.name)
  ) {
    for (const element of holder.name.elements) {
      elements.push({
        key: element.propertyName ?? element.name,
        rest: element.dotDotDotToken !== undefined,
        at: element,
      });
    }
  } else if (
    ts.isBinaryExpression(holder) &&
    holder.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    holder.right === value &&
    ts.isObjectLiteralExpression(holder.left)
  ) {
    for (const property of holder.left.properties) {
      elements.push({
        key: property.name,
        rest: ts.isSpreadAssignment(property),
        at: property,
      });
    }
  } else {
    return null;
  }
  return elements.map(({ key, rest, at }) => {
    const literal =
      key && (ts.isIdentifier(key) || ts.isStringLiteralLike(key)) && !rest
        ? key.text
        : null;
    const written = at.getText(source.sourceFile);
    return {
      name: literal,
      line: source.lineOf(at),
      text: literal
        ? `${literal} (destructured from process.env)`
        : `${written} (destructured from process.env)`,
      inlined: false,
      node: at,
    };
  });
}

function isProcessEnv(
  ts: TypeScriptModule,
  node: TS.Node
): node is TS.PropertyAccessExpression {
  return (
    ts.isPropertyAccessExpression(node) &&
    node.name.text === 'env' &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'process'
  );
}

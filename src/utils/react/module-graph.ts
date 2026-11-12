/**
 * The static import graph of React source, resolved the way a bundler does.
 *
 * Which modules end up in a browser bundle is decided by imports, not by
 * folders: a `'use client'` file pulls in everything it imports statically,
 * and everything those import. `import()`, `next/dynamic` and `React.lazy`
 * split the target into its own chunk, loaded on demand, so they are NOT
 * edges here. Neither is an import the compiler erases because it is used
 * only as a type — the rule every import graph shares (CompiledImports).
 *
 * Specifiers are resolved by the project's own TypeScript
 * (`ts.resolveModuleName`) with the options of the nearest tsconfig.json —
 * so relative imports, index files and `compilerOptions.paths` aliases
 * (`@/*`) resolve exactly as the compiler resolves them — under bundler
 * resolution, which is how Next's bundlers read them. A module that resolves
 * into node_modules is a package: the graph records its specifier and does
 * not walk into it.
 */

import * as fs from 'fs';
import type * as TS from 'typescript';
import type { LawCheckContext } from '../../types/law.types';
import { PathOperations } from '../path-operations';
import { CompiledImports } from './compiled-imports';
import { ReactProject } from './react-project';
import { TsxSource, type TypeScriptModule } from './tsx-source';

/** Specifiers that name a stylesheet, an image, a font or data — not code to walk. */
const ASSET = /\.(?:css|scss|sass|less|styl|svg|png|jpe?g|gif|webp|avif|ico|bmp|json|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|txt|md|mdx|html|wasm)(?:\?.*)?$/i;

export type Resolution =
  | { kind: 'asset' }
  | { kind: 'external'; specifier: string }
  | { kind: 'local'; file: string }
  | { kind: 'types' }
  | { kind: 'unresolved'; reason: string };

/** One static import or re-export of a module. */
export interface ImportEdge {
  specifier: string;
  line: number;
  resolution: Resolution;
}

/** A module of the graph: its parse, its edges, and how it was first reached. */
export interface GraphNode {
  source: TsxSource;
  edges: ImportEdge[];
  /** The module that first imported this one; null for an entry. */
  parent: string | null;
}

export interface ModuleGraph {
  nodes: Map<string, GraphNode>;
  /** What could not be read or resolved: the graph below it is unknown. */
  unread: string[];
}

interface TsconfigOptions {
  options: TS.CompilerOptions;
  /** One resolution cache per option set: a cache shared across option sets answers wrongly. */
  cache?: TS.ModuleResolutionCache;
  /** The `paths` keys, for telling an unresolved alias from a package name. */
  aliasPatterns: string[];
}

/** Resolves import specifiers with the compiler options of the nearest tsconfig.json. */
export class ModuleResolver {
  private readonly byConfig = new Map<string, TsconfigOptions | string>();
  readonly problems: string[] = [];

  constructor(
    private readonly ts: TypeScriptModule,
    private readonly context: LawCheckContext
  ) {}

  resolve(specifier: string, fromFile: string): Resolution {
    const config = this.configFor(fromFile);
    if (typeof config === 'string') return { kind: 'unresolved', reason: config };
    const result = this.ts.resolveModuleName(specifier, fromFile, config.options, this.ts.sys, config.cache)
      .resolvedModule;
    const relativeOrAlias =
      specifier.startsWith('.') || specifier.startsWith('/') || this.isAlias(specifier, config);
    if (!result) {
      if (ASSET.test(specifier)) return { kind: 'asset' };
      return relativeOrAlias
        ? { kind: 'unresolved', reason: `'${specifier}' did not resolve to a file` }
        : { kind: 'external', specifier };
    }
    const resolved = PathOperations.normalize(result.resolvedFileName);
    if (result.isExternalLibraryImport || resolved.includes('/node_modules/')) {
      return { kind: 'external', specifier };
    }
    if (resolved.endsWith('.d.ts') || ASSET.test(resolved)) {
      return resolved.endsWith('.d.ts') ? { kind: 'types' } : { kind: 'asset' };
    }
    return { kind: 'local', file: resolved };
  }

  private isAlias(specifier: string, config: TsconfigOptions): boolean {
    return config.aliasPatterns.some(pattern => {
      const star = pattern.indexOf('*');
      if (star < 0) return specifier === pattern;
      return specifier.startsWith(pattern.slice(0, star)) && specifier.endsWith(pattern.slice(star + 1));
    });
  }

  /** The nearest tsconfig.json at or above the file, up to the project root. */
  private nearestTsconfig(fromFile: string): string | null {
    const root = PathOperations.normalize(this.context.projectRoot).toLowerCase();
    let dir = PathOperations.getDirectory(fromFile);
    for (;;) {
      const candidate = PathOperations.join(dir, 'tsconfig.json');
      if (fs.existsSync(candidate)) return candidate;
      const parent = PathOperations.getDirectory(dir);
      const atRoot = dir.toLowerCase() === root;
      if (atRoot || parent === dir || !parent.toLowerCase().startsWith(root)) return null;
      dir = parent;
    }
  }

  private configFor(fromFile: string): TsconfigOptions | string {
    const tsconfig = this.nearestTsconfig(fromFile) ?? '';
    const known = this.byConfig.get(tsconfig);
    if (known !== undefined) return known;
    const loaded = tsconfig ? this.load(tsconfig) : { options: {}, aliasPatterns: [] };
    const result =
      typeof loaded === 'string'
        ? loaded
        : {
            aliasPatterns: loaded.aliasPatterns,
            cache: this.ts.createModuleResolutionCache(
              PathOperations.getDirectory(tsconfig || this.context.projectRoot),
              this.ts.sys.useCaseSensitiveFileNames ? name => name : name => name.toLowerCase()
            ),
            options: {
              ...loaded.options,
              // Next's bundlers resolve like `moduleResolution: bundler`, and
              // read .js/.json as well as TS whatever the tsconfig allows.
              module: this.ts.ModuleKind.ESNext,
              moduleResolution: this.ts.ModuleResolutionKind.Bundler,
              allowJs: true,
              resolveJsonModule: true,
              jsx: loaded.options.jsx ?? this.ts.JsxEmit.Preserve,
            },
          };
    if (typeof result === 'string') this.problems.push(result);
    this.byConfig.set(tsconfig, result);
    return result;
  }

  private load(tsconfig: string): TsconfigOptions | string {
    const ts = this.ts;
    const where = ReactProject.relative(this.context, tsconfig);
    const read = ts.readConfigFile(tsconfig, file => ts.sys.readFile(file));
    if (read.error) {
      return `${where}: could not be parsed (${ts.flattenDiagnosticMessageText(read.error.messageText, ' ')}) — its path aliases were not resolved`;
    }
    // A host that lists no files: only the options are wanted, and listing
    // `include` would walk the whole repository for nothing.
    const host: TS.ParseConfigHost = {
      useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
      readDirectory: () => [],
      fileExists: file => ts.sys.fileExists(file),
      readFile: file => ts.sys.readFile(file),
    };
    const parsed = ts.parseJsonConfigFileContent(
      read.config,
      host,
      PathOperations.getDirectory(tsconfig),
      undefined,
      tsconfig
    );
    const extendsError = parsed.errors.find(error => error.code === 6053 || error.code === 5083);
    if (extendsError) {
      return `${where}: ${ts.flattenDiagnosticMessageText(extendsError.messageText, ' ')} — its path aliases were not resolved`;
    }
    return { options: parsed.options, aliasPatterns: Object.keys(parsed.options.paths ?? {}) };
  }
}

/**
 * The specifier and line of every static import and re-export the compiler
 * keeps (see CompiledImports: an import used only as a type is erased, so it
 * pulls nothing into a bundle).
 */
export function staticImports(
  source: TsxSource,
  compiled: CompiledImports
): Array<{ specifier: string; line: number; statement: TS.Statement }> {
  const found: Array<{ specifier: string; line: number; statement: TS.Statement }> = [];
  for (const statement of source.sourceFile.statements) {
    const specifier = compiled.runtimeSpecifier(source, statement);
    if (specifier !== null) found.push({ specifier, line: source.lineOf(statement), statement });
  }
  return found;
}

export interface GraphOptions {
  /** Already-parsed modules, reused instead of reading the file again. */
  parsed: Map<string, TsxSource>;
  /**
   * Include this module but do not walk its imports — a `'use client'` file
   * seen from the server side, a `'use server'` file seen from the client.
   */
  stopAt?: (source: TsxSource, isEntry: boolean) => boolean;
  /** Skip edges of a module (an import used only in server-side data functions). */
  skipEdge?: (source: TsxSource, statement: TS.Statement, isEntry: boolean) => boolean;
}

/** Walk the static imports from `entries`, breadth first. */
export function buildModuleGraph(
  context: LawCheckContext,
  ts: TypeScriptModule,
  resolver: ModuleResolver,
  entries: readonly string[],
  options: GraphOptions
): ModuleGraph {
  const nodes = new Map<string, GraphNode>();
  const unread: string[] = [];
  const compiled = new CompiledImports(ts);
  const queue: Array<{ file: string; parent: string | null }> = entries.map(file => ({
    file: PathOperations.normalize(file),
    parent: null,
  }));
  while (queue.length > 0) {
    const { file, parent } = queue.shift() as { file: string; parent: string | null };
    if (nodes.has(file)) continue;
    const source = options.parsed.get(file) ?? readSource(ts, file);
    if (!source) {
      unread.push(unreadMessage(context, file, parent));
      continue;
    }
    options.parsed.set(file, source);
    const node: GraphNode = { source, edges: [], parent };
    nodes.set(file, node);
    if (options.stopAt?.(source, parent === null)) continue;
    node.edges.push(...edgesOf(source, file, parent === null, resolver, compiled, options));
    for (const edge of node.edges) {
      const resolution = edge.resolution;
      if (resolution.kind === 'local') queue.push({ file: resolution.file, parent: file });
      else if (resolution.kind === 'unresolved') unread.push(unresolvedMessage(context, file, edge.line, resolution.reason));
    }
  }
  return { nodes, unread: [...new Set([...resolver.problems, ...unread])] };
}

function unreadMessage(context: LawCheckContext, file: string, parent: string | null): string {
  const importer = parent ? ReactProject.relative(context, parent) : 'an entry';
  return `${ReactProject.relative(context, file)}: could not be read (imported by ${importer})`;
}

function unresolvedMessage(context: LawCheckContext, file: string, line: number, reason: string): string {
  return `${ReactProject.relative(context, file)}:${line}: ${reason} — the modules below it were not read`;
}

function edgesOf(
  source: TsxSource,
  file: string,
  isEntry: boolean,
  resolver: ModuleResolver,
  compiled: CompiledImports,
  options: GraphOptions
): ImportEdge[] {
  return staticImports(source, compiled)
    .filter(({ statement }) => !options.skipEdge?.(source, statement, isEntry))
    .map(({ specifier, line }) => ({ specifier, line, resolution: resolver.resolve(specifier, file) }));
}

function readSource(ts: TypeScriptModule, file: string): TsxSource | null {
  try {
    const source = TsxSource.parse(ts, file, fs.readFileSync(file, 'utf8'));
    // A file with a syntax error is half a tree: unread, like one that failed to load.
    return source.parseErrors().length > 0 ? null : source;
  } catch {
    return null;
  }
}

/** Parsed sources keyed by normalized path. */
export function sourcesByFile(sources: readonly TsxSource[]): Map<string, TsxSource> {
  return new Map(sources.map(source => [PathOperations.normalize(source.fileName), source]));
}

/** The chain of importers from an entry down to `file`, for messages. */
export function importChain(context: LawCheckContext, graph: ModuleGraph, file: string): string {
  const chain: string[] = [];
  let current: string | null = file;
  while (current && chain.length < 20) {
    chain.unshift(ReactProject.relative(context, current));
    current = graph.nodes.get(current)?.parent ?? null;
  }
  return chain.join(' → ');
}

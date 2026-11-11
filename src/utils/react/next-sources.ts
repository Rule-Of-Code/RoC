/**
 * What the Next.js client/server laws read together: every Next app of the
 * workspace, its scanned React source parsed once, and the two module graphs
 * the `'use client'` directive draws.
 *
 * The client graph is every module that ships to the browser: each
 * `'use client'` module and everything it imports statically, plus — in the
 * Pages Router, where every page is a client entry — each page and `_app`.
 * A `'use server'` module seen from the client is a reference to a Server
 * Function, not code in the bundle, so the walk stops there. Next removes
 * `getServerSideProps` / `getStaticProps` / `getStaticPaths` and the imports
 * only they use from a page's client bundle, so those imports are not edges.
 *
 * The server graph is every module that renders as a Server Component: the
 * App Router's special files and what they import, stopping at each
 * `'use client'` module — the boundary where props are serialized.
 */

import type * as TS from 'typescript';
import type { LawCheckContext } from '../../types/law.types';
import { PathOperations } from '../path-operations';
import {
  buildModuleGraph,
  type ModuleGraph,
  ModuleResolver,
  sourcesByFile,
} from './module-graph';
import { type AppFile, NextAppFiles, type PagesFile } from './next-app-files';
import { type NextApp, ReactProject } from './react-project';
import { loadTypeScript, type TsxSource, type TypeScriptModule } from './tsx-source';

const DATA_FUNCTIONS = new Set(['getServerSideProps', 'getStaticProps', 'getStaticPaths']);

export interface NextSources {
  apps: NextApp[];
  /** Scanned, non-test React source (ignores applied). */
  files: string[];
  /** Every scanned file that parsed, by normalized path. */
  parsed: Map<string, TsxSource>;
  /** Files that were not read — each one a violation for the law that needed it. */
  unread: string[];
  appFiles: AppFile[];
  pagesFiles: PagesFile[];
  /** The parser; null when it could not be loaded (then `unread` says so). */
  ts: TypeScriptModule | null;
}

/** True when a module's directive prologue holds `directive`. */
export function hasDirective(source: TsxSource, directive: 'use client' | 'use server'): boolean {
  return source.directives().includes(directive);
}

export class NextSourcesLoader {
  /** Scan, parse and classify the workspace's React source for the Next laws. */
  static load(context: LawCheckContext, extensions?: readonly string[]): NextSources {
    const apps = ReactProject.nextApps(context.projectRoot);
    const files = ReactProject.sourceFiles(context, extensions).map(file => PathOperations.normalize(file));
    const { sources, unread } = ReactProject.parse(context, files);
    return {
      apps,
      files,
      parsed: sourcesByFile(sources),
      unread,
      appFiles: NextAppFiles.appFiles(apps, files),
      pagesFiles: NextAppFiles.pagesFiles(apps, files),
      ts: loadTypeScript(context.projectRoot),
    };
  }

  /** True when some Next app of the workspace has an App Router or Pages Router directory. */
  static hasRouter(sources: NextSources): boolean {
    return sources.apps.some(app => app.appDirs.length > 0 || app.pagesDirs.length > 0);
  }

  /** True when some Next app has an App Router directory. */
  static hasAppRouter(sources: NextSources): boolean {
    return sources.apps.some(app => app.appDirs.length > 0);
  }

  /** The Pages Router files that ship to the browser: pages, `_app`, `_error` — not `_document`, not `api/`. */
  static clientPages(sources: NextSources): PagesFile[] {
    return sources.pagesFiles.filter(page => !page.api && page.special !== '_document');
  }

  /** Every module that ships to the browser, walked from the client entries. */
  static clientGraph(context: LawCheckContext, sources: NextSources): ModuleGraph {
    const ts = sources.ts;
    if (!ts) return { nodes: new Map(), unread: [] };
    const pageEntries = new Set(this.clientPages(sources).map(page => page.file));
    const entries = [
      ...[...sources.parsed.values()]
        .filter(source => hasDirective(source, 'use client'))
        .map(source => PathOperations.normalize(source.fileName)),
      ...pageEntries,
    ];
    return buildModuleGraph(context, ts, new ModuleResolver(ts, context), entries, {
      parsed: sources.parsed,
      stopAt: source => hasDirective(source, 'use server'),
      skipEdge: (source, statement, isEntry) =>
        isEntry &&
        pageEntries.has(PathOperations.normalize(source.fileName)) &&
        usedOnlyByDataFunctions(source, statement),
    });
  }

  /** Every module that renders on the server, walked from the App Router's special files. */
  static serverGraph(context: LawCheckContext, sources: NextSources): ModuleGraph {
    const ts = sources.ts;
    if (!ts) return { nodes: new Map(), unread: [] };
    const entries = sources.appFiles.filter(appFile => appFile.kind !== null).map(appFile => appFile.file);
    return buildModuleGraph(context, ts, new ModuleResolver(ts, context), entries, {
      parsed: sources.parsed,
      stopAt: source => hasDirective(source, 'use client'),
    });
  }
}

/** The local names an import declaration binds. */
function boundNames(ts: TypeScriptModule, statement: TS.ImportDeclaration): string[] {
  const clause = statement.importClause;
  if (!clause) return [];
  const names = clause.name ? [clause.name.text] : [];
  const bindings = clause.namedBindings;
  if (bindings && ts.isNamespaceImport(bindings)) names.push(bindings.name.text);
  if (bindings && ts.isNamedImports(bindings)) names.push(...bindings.elements.map(element => element.name.text));
  return names;
}

/** The top-level declarations of `getServerSideProps` / `getStaticProps` / `getStaticPaths`. */
function dataFunctionNodes(source: TsxSource): TS.Node[] {
  const ts = source.ts;
  const nodes: TS.Node[] = [];
  for (const statement of source.sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && DATA_FUNCTIONS.has(statement.name.text)) {
      nodes.push(statement);
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && DATA_FUNCTIONS.has(declaration.name.text)) nodes.push(declaration);
    }
  }
  return nodes;
}

/**
 * True when every reference to what an import binds sits inside a Pages
 * Router data function: Next strips those functions, then the import, from
 * the client bundle.
 */
export function usedOnlyByDataFunctions(source: TsxSource, statement: TS.Statement): boolean {
  const ts = source.ts;
  if (!ts.isImportDeclaration(statement)) return false;
  const names = new Set(boundNames(ts, statement));
  if (names.size === 0) return false;
  const dataNodes = dataFunctionNodes(source);
  if (dataNodes.length === 0) return false;
  let usedElsewhere = false;
  let used = false;
  source.walk(node => {
    if (usedElsewhere || !ts.isIdentifier(node) || !names.has(node.text)) return;
    if (node.pos >= statement.pos && node.end <= statement.end) return;
    used = true;
    const inside = dataNodes.some(data => node.pos >= data.pos && node.end <= data.end);
    if (!inside) usedElsewhere = true;
  });
  return used && !usedElsewhere;
}

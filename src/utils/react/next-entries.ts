/**
 * Where Next's own module graphs start, and the walks the Next laws make
 * from there over the one module graph (next-module-graph.ts).
 *
 * Client entries — what Next bundles for the browser on its own: every
 * `'use client'` module, every Pages Router page with `_app` and `_error`
 * (every page ships to the browser; `pages/api/**` and `_document` do not),
 * and `instrumentation-client`. Next strips `getServerSideProps`,
 * `getStaticProps` and `getStaticPaths` from a page's client bundle, and the
 * imports only they use, so those are not client code.
 *
 * Server entries — what Next itself loads on the server: the App Router's
 * special files (page, layout, route, …;
 * next/dist/docs/01-app/03-api-reference/03-file-conventions), every Pages
 * Router file, proxy/middleware/instrumentation beside the router, and every
 * `'use server'` module. Nothing imports these from client code, so they are
 * where a server module graph starts. Next reads `app/` over `src/app/` (and
 * `pages/` over `src/pages/`) when both exist (next-routes.ts).
 */

import * as fs from 'fs';
import type * as TS from 'typescript';
import { PathOperations } from '../path-operations';
import {
  isClientModule,
  isServerModule,
  type ModuleImport,
  NextModuleGraph,
  type WalkResult,
} from './next-module-graph';
import {
  nextRoutes,
  type RouterLayout,
  routerLayout,
  specialFile,
  specialFileName,
} from './next-routes';
import { ReactProject, type NextApp } from './react-project';
import type { TsxSource, TypeScriptModule } from './tsx-source';

/** The App Router file conventions Next loads by name. */
export const APP_ENTRY_FILES = new Set([
  'page',
  'layout',
  'template',
  'default',
  'route',
  'loading',
  'error',
  'global-error',
  'not-found',
  'global-not-found',
  'forbidden',
  'unauthorized',
  'opengraph-image',
  'twitter-image',
  'icon',
  'apple-icon',
  'sitemap',
  'robots',
  'manifest',
]);

/** The files beside the router that Next loads on the server. */
export const CONVENTION_FILES = ['proxy', 'middleware', 'instrumentation'];

/** The Pages Router functions Next runs on the server only and strips from the client bundle. */
const DATA_FUNCTIONS = new Set([
  'getServerSideProps',
  'getStaticProps',
  'getStaticPaths',
]);

/**
 * The choices a law makes on the one graph (#287): which calls are edges,
 * and whether a boundary module is in the result.
 */
export interface GraphChoice {
  /** Follow `require()`: the bundler puts the module in the same chunk. */
  require: boolean;
  /**
   * Follow `import()`: a chunk of its own, loaded on demand — still browser
   * code, and still rendered on the server, but not first-load JavaScript.
   */
  dynamicImport: boolean;
  /** `'module'`: a boundary module is in the result, without edges; `'outside'`: it is not. */
  boundary: 'module' | 'outside';
}

/** What the laws that read the code itself choose: every import that runs, boundaries left out. */
export const EVERY_IMPORT: GraphChoice = {
  require: true,
  dynamicImport: true,
  boundary: 'outside',
};

export interface ClientWalk extends WalkResult {
  /** The Pages Router pages among the entries: their data functions are not client code. */
  pages: Set<string>;
}

/** The client bundle's entry points (see the module comment). */
export function clientEntries(
  graph: NextModuleGraph,
  apps: readonly NextApp[]
): { entries: string[]; pages: Set<string> } {
  const entries = graph
    .sourcesOf(ReactProject.sourceFiles(graph.context))
    .filter(isClientModule)
    .map(source => NextModuleGraph.canonical(source.fileName));
  const pages = new Set<string>();
  for (const app of apps) {
    const layout = routerLayout(app);
    for (const file of clientPages(layout)) {
      const page = NextModuleGraph.canonical(file);
      pages.add(page);
      entries.push(page);
    }
    const dir = layout.conventionDir;
    const file = dir ? specialFile(dir, 'instrumentation-client') : null;
    if (file) entries.push(NextModuleGraph.canonical(file));
  }
  return { entries: [...new Set(entries)], pages };
}

/** The client graph: every module a client entry bundles, stopping at `'use server'` modules. */
export function clientGraph(
  graph: NextModuleGraph,
  apps: readonly NextApp[],
  choice: GraphChoice = EVERY_IMPORT
): ClientWalk {
  const { entries, pages } = clientEntries(graph, apps);
  const walk = graph.walk(entries, {
    ...choice,
    stop: isServerModule,
    skip: (file, source, item) =>
      pages.has(file) && strippedFromClient(source, item),
  });
  return { ...walk, pages };
}

/** Every module Next loads on the server (see the module comment), as canonical paths. */
export function nextServerEntries(
  graph: NextModuleGraph,
  apps: readonly NextApp[]
): string[] {
  const files: string[] = [];
  for (const app of apps) {
    const layout = routerLayout(app);
    if (layout.appDir) collectAppEntries(layout.appDir, files);
    const dir = layout.conventionDir;
    if (dir)
      files.push(
        ...CONVENTION_FILES.map(name => specialFile(dir, name)).filter(
          (f): f is string => f !== null
        )
      );
    if (layout.pagesDir) files.push(...pagesSpecials(layout.pagesDir));
  }
  files.push(
    ...nextRoutes(apps.map(routerLayout))
      .filter(r => r.kind === 'pages')
      .map(r => r.file)
  );
  files.push(
    ...graph
      .sourcesOf(ReactProject.sourceFiles(graph.context))
      .filter(isServerModule)
      .map(source => source.fileName)
  );
  return withoutClientModules(graph, files);
}

/** The server graph: every module Next loads on the server, stopping at `'use client'` modules. */
export function serverGraph(
  graph: NextModuleGraph,
  apps: readonly NextApp[],
  choice: GraphChoice = EVERY_IMPORT
): WalkResult & { entries: string[] } {
  const entries = nextServerEntries(graph, apps);
  return {
    ...graph.walk(entries, { ...choice, stop: isClientModule }),
    entries,
  };
}

/**
 * The Server Component graph: the App Router's special files of the router
 * Next reads, and what they import, stopping at `'use client'` modules —
 * the boundary where props are serialized. A `'use client'` special file is
 * a boundary too.
 */
export function serverComponentGraph(
  graph: NextModuleGraph,
  apps: readonly NextApp[],
  choice: GraphChoice
): WalkResult {
  const files: string[] = [];
  for (const app of apps) {
    const appDir = routerLayout(app).appDir;
    if (appDir) collectAppEntries(appDir, files);
  }
  return graph.walk(
    files.map(file => NextModuleGraph.canonical(file)),
    { ...choice, stop: isClientModule }
  );
}

/** Whether the code at `node` of a page entry is in a data function Next strips from the client. */
export function strippedFromPage(
  walk: ClientWalk,
  file: string,
  node: TS.Node
): boolean {
  const visit = walk.modules.get(file);
  return (
    walk.pages.has(file) &&
    visit !== undefined &&
    dataFunctionNodes(visit.source).some(
      data => node.pos >= data.pos && node.end <= data.end
    )
  );
}

function withoutClientModules(
  graph: NextModuleGraph,
  files: readonly string[]
): string[] {
  const entries = new Set<string>();
  for (const file of files) {
    const source = graph.source(file);
    if (source && !isClientModule(source))
      entries.add(NextModuleGraph.canonical(file));
  }
  return [...entries];
}

/** The Pages Router files that ship to the browser: routed pages, `_app`, `_error`. */
function clientPages(layout: RouterLayout): string[] {
  if (!layout.pagesDir) return [];
  const routed = nextRoutes([{ ...layout, appDir: null }])
    .filter(route => route.path !== '/api' && !route.path.startsWith('/api/'))
    .map(route => route.file);
  const specials = ['_app', '_error']
    .map(name => specialFile(layout.pagesDir as string, name))
    .filter((f): f is string => f !== null);
  return [...routed, ...specials];
}

/** `_app`, `_document` and `_error`: rendered on the server with every page. */
function pagesSpecials(pagesDir: string): string[] {
  return ['_app', '_document', '_error']
    .map(name => specialFile(pagesDir, name))
    .filter((f): f is string => f !== null);
}

function collectAppEntries(dir: string, files: string[]): void {
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = PathOperations.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && !entry.name.startsWith('_'))
        collectAppEntries(abs, files);
      continue;
    }
    const name = specialFileName(entry.name);
    if (name && APP_ENTRY_FILES.has(name)) files.push(abs);
  }
}

/** An import of a page that Next strips from its client bundle. */
function strippedFromClient(source: TsxSource, item: ModuleImport): boolean {
  if (item.kind === 'static') return usedOnlyByDataFunctions(source, item.node);
  return dataFunctionNodes(source).some(
    data => item.node.pos >= data.pos && item.node.end <= data.end
  );
}

/** The local names an import declaration binds. */
function boundNames(
  ts: TypeScriptModule,
  statement: TS.ImportDeclaration
): string[] {
  const clause = statement.importClause;
  if (!clause) return [];
  const names = clause.name ? [clause.name.text] : [];
  const bindings = clause.namedBindings;
  if (bindings && ts.isNamespaceImport(bindings))
    names.push(bindings.name.text);
  if (bindings && ts.isNamedImports(bindings))
    names.push(...bindings.elements.map(element => element.name.text));
  return names;
}

/** The top-level declarations of `getServerSideProps` / `getStaticProps` / `getStaticPaths`. */
function dataFunctionNodes(source: TsxSource): TS.Node[] {
  const ts = source.ts;
  const nodes: TS.Node[] = [];
  for (const statement of source.sourceFile.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name &&
      DATA_FUNCTIONS.has(statement.name.text)
    ) {
      nodes.push(statement);
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        DATA_FUNCTIONS.has(declaration.name.text)
      )
        nodes.push(declaration);
    }
  }
  return nodes;
}

/**
 * True when every reference to what an import binds sits inside a Pages
 * Router data function: Next strips those functions, then the import, from
 * the client bundle.
 */
function usedOnlyByDataFunctions(
  source: TsxSource,
  statement: TS.Node
): boolean {
  const ts = source.ts;
  if (!ts.isImportDeclaration(statement)) return false;
  const names = new Set(boundNames(ts, statement));
  if (names.size === 0) return false;
  const dataNodes = dataFunctionNodes(source);
  if (dataNodes.length === 0) return false;
  let usedElsewhere = false;
  let used = false;
  source.walk(node => {
    if (usedElsewhere || !ts.isIdentifier(node) || !names.has(node.text))
      return;
    if (node.pos >= statement.pos && node.end <= statement.end) return;
    used = true;
    const inside = dataNodes.some(
      data => node.pos >= data.pos && node.end <= data.end
    );
    if (!inside) usedElsewhere = true;
  });
  return used && !usedElsewhere;
}

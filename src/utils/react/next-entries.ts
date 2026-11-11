/**
 * The modules Next itself loads on the server: the App Router's special files
 * (page, layout, route, …; next/dist/docs/01-app/03-api-reference/03-file-conventions),
 * every Pages Router page, proxy/middleware/instrumentation beside the router,
 * and every `'use server'` module. Nothing imports these from client code, so
 * they are where a server module graph starts.
 */

import * as fs from 'fs';
import { PathOperations } from '../path-operations';
import { isClientModule, isServerModule, NextModuleGraph } from './next-module-graph';
import { nextRoutes, routerLayout, specialFile, specialFileName } from './next-routes';
import { ReactProject, type NextApp } from './react-project';

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

export function nextServerEntries(graph: NextModuleGraph, apps: readonly NextApp[]): string[] {
  const files: string[] = [];
  for (const app of apps) {
    const layout = routerLayout(app);
    if (layout.appDir) collectAppEntries(layout.appDir, files);
    const dir = layout.conventionDir;
    if (dir) files.push(...CONVENTION_FILES.map(name => specialFile(dir, name)).filter((f): f is string => f !== null));
  }
  files.push(...nextRoutes(apps.map(routerLayout)).filter(r => r.kind === 'pages').map(r => r.file));
  files.push(
    ...graph
      .sourcesOf(ReactProject.sourceFiles(graph.context))
      .filter(isServerModule)
      .map(source => source.fileName)
  );
  const entries = new Set<string>();
  for (const file of files) {
    const source = graph.source(file);
    if (source && !isClientModule(source)) entries.add(NextModuleGraph.canonical(file));
  }
  return [...entries];
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
      if (entry.name !== 'node_modules' && !entry.name.startsWith('_')) collectAppEntries(abs, files);
      continue;
    }
    const name = specialFileName(entry.name);
    if (name && APP_ENTRY_FILES.has(name)) files.push(abs);
  }
}

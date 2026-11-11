/**
 * A Next app's routes, read from the filesystem the way Next reads them.
 *
 * Next picks `app/` over `src/app/` (and `pages/` over `src/pages/`) when
 * both exist — `findDir` in next/dist/lib/find-pages-dir.js — and looks for
 * proxy/middleware/instrumentation only in the parent of the pages (else app)
 * directory (next/dist/build/index.js). The default page extensions are tsx,
 * ts, jsx and js (next/dist/server/config-shared.js). A route path drops
 * route groups `(group)` and parallel slots `@slot`; a folder starting with
 * `_` is private and opts its whole subtree out of routing.
 */

import * as fs from 'fs';
import { PathOperations } from '../path-operations';
import { REACT_TEST_FILE, type NextApp } from './react-project';

/** Next's default `pageExtensions`. */
export const PAGE_EXTENSIONS = ['tsx', 'ts', 'jsx', 'js'];

const SPECIAL_FILE = new RegExp(`^([\\w-]+)\\.(?:${PAGE_EXTENSIONS.join('|')})$`);

export interface RouterLayout {
  app: NextApp;
  /** The App Router directory Next uses, if any. */
  appDir: string | null;
  /** The Pages Router directory Next uses, if any. */
  pagesDir: string | null;
  /** Where Next looks for proxy/middleware/instrumentation: the parent of pagesDir || appDir. */
  conventionDir: string | null;
}

export type SegmentKind = 'catchAll' | 'dynamic' | 'optionalCatchAll' | 'static';

export interface RouteSegment {
  kind: SegmentKind;
  /** As written: `users`, `[id]`, `[...slug]`. */
  text: string;
}

export interface NextRoute {
  app: NextApp;
  file: string;
  /** `page` or `route` (App Router), `pages` (Pages Router). */
  kind: 'page' | 'pages' | 'route';
  /** `/api/users/[id]` — dynamic segments as written. */
  path: string;
  segments: RouteSegment[];
}

export function routerLayout(app: NextApp): RouterLayout {
  const pick = (name: string): string | null => {
    for (const dir of [name, `src/${name}`]) {
      const abs = PathOperations.join(app.root, dir);
      if (isDirectory(abs)) return abs;
    }
    return null;
  };
  const appDir = pick('app');
  const pagesDir = pick('pages');
  const base = pagesDir ?? appDir;
  return { app, appDir, pagesDir, conventionDir: base ? PathOperations.getDirectory(base) : null };
}

/** The special file `<name>.<page ext>` directly in `dir`, if present. */
export function specialFile(dir: string, name: string): string | null {
  for (const ext of PAGE_EXTENSIONS) {
    const file = PathOperations.join(dir, `${name}.${ext}`);
    if (isFile(file)) return file;
  }
  return null;
}

/** The base name of a Next special file (`page`, `route`, `layout`), or null. */
export function specialFileName(file: string): string | null {
  const match = SPECIAL_FILE.exec(PathOperations.getFilename(file));
  return match ? (match[1] ?? null) : null;
}

export function segmentOf(text: string): RouteSegment {
  if (/^\[\[\.\.\.[^\]]+\]\]$/.test(text)) return { kind: 'optionalCatchAll', text };
  if (/^\[\.\.\.[^\]]+\]$/.test(text)) return { kind: 'catchAll', text };
  if (/^\[[^\]]+\]$/.test(text)) return { kind: 'dynamic', text };
  return { kind: 'static', text };
}

/** Every page and route handler of every app's router. */
export function nextRoutes(layouts: readonly RouterLayout[]): NextRoute[] {
  const routes: NextRoute[] = [];
  for (const layout of layouts) {
    if (layout.appDir) collectAppRoutes(layout, layout.appDir, routes);
    if (layout.pagesDir) collectPagesRoutes(layout, layout.pagesDir, [], routes);
  }
  return routes;
}

/** The route path of an App Router file, or null when a private folder hides it. */
export function appRouteSegments(appDir: string, file: string): RouteSegment[] | null {
  const dirs = PathOperations.getRelative(appDir, PathOperations.getDirectory(file))
    .split('/')
    .filter(part => part && part !== '.');
  const segments: RouteSegment[] = [];
  for (const dir of dirs) {
    if (dir.startsWith('_')) return null;
    if (/^\(.*\)$/.test(dir) || dir.startsWith('@')) continue;
    segments.push(segmentOf(dir));
  }
  return segments;
}

export function routePath(segments: readonly RouteSegment[]): string {
  return `/${segments.map(segment => segment.text).join('/')}`;
}

function collectAppRoutes(layout: RouterLayout, dir: string, routes: NextRoute[]): void {
  for (const entry of readDir(dir)) {
    const abs = PathOperations.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('_')) continue;
      collectAppRoutes(layout, abs, routes);
      continue;
    }
    const name = specialFileName(entry.name);
    if (name !== 'page' && name !== 'route') continue;
    const segments = appRouteSegments(layout.appDir ?? dir, abs);
    if (!segments) continue;
    routes.push({ app: layout.app, file: abs, kind: name, path: routePath(segments), segments });
  }
}

function collectPagesRoutes(
  layout: RouterLayout,
  dir: string,
  trail: string[],
  routes: NextRoute[]
): void {
  for (const entry of readDir(dir)) {
    const abs = PathOperations.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      collectPagesRoutes(layout, abs, [...trail, entry.name], routes);
      continue;
    }
    const name = specialFileName(entry.name);
    if (!name || REACT_TEST_FILE.test(entry.name) || entry.name.endsWith('.d.ts')) continue;
    if (trail.length === 0 && ['_app', '_document', '_error'].includes(name)) continue;
    const parts = name === 'index' ? trail : [...trail, name];
    const segments = parts.map(segmentOf);
    routes.push({ app: layout.app, file: abs, kind: 'pages', path: routePath(segments), segments });
  }
}

function readDir(dir: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function isDirectory(path: string): boolean {
  try {
    return fs.statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isFile(path: string): boolean {
  try {
    return fs.statSync(path).isFile();
  } catch {
    return false;
  }
}

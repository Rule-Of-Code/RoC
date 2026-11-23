/**
 * The files of a Next.js app, read the way Next reads them.
 *
 * App Router: a route segment is a directory under `app/` (or `src/app/`); its
 * behaviour lives in special files named by convention — `page`, `layout`,
 * `loading`, `route`, … — with one of the default page extensions. A folder
 * named `_x` is private: it and everything under it is out of routing. A
 * folder named `(x)` is a route group and `@x` a parallel-route slot: both
 * are segments on disk that do not appear in the URL. A segment inherits from
 * every ancestor segment — layouts nest, and a `loading` file wraps the page
 * and every segment below it.
 *
 * Pages Router: every file under `pages/` (or `src/pages/`) is a route,
 * except `pages/api/**` (route handlers) and the `_app`, `_document` and
 * `_error` specials.
 *
 * Custom `pageExtensions` in next.config are not read: the four defaults are
 * what Next uses unless the project overrides them.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PathOperations } from '../path-operations';
import { type NextApp, ReactProject } from './react-project';

export {
  exportedBindings,
  type ExportedBinding,
  importedNames,
  isAsyncFunction,
  namespaceNames,
  unwrapExpression,
} from './next-module-bindings';

/** Next's default `pageExtensions`. */
export const NEXT_PAGE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

/** The App Router's special files that this module classifies. */
export type AppFileKind =
  | 'default'
  | 'error'
  | 'global-error'
  | 'layout'
  | 'loading'
  | 'not-found'
  | 'page'
  | 'route'
  | 'template';

const APP_FILE =
  /^(page|layout|template|loading|error|global-error|not-found|route|default)\.(?:tsx|ts|jsx|js)$/;
const PAGES_SPECIAL = /^_(?:app|document|error)$/;
const PAGE_EXTENSION = /\.(?:tsx|ts|jsx|js)$/;

/** One file inside an App Router directory. */
export interface AppFile {
  app: NextApp;
  appDir: string;
  file: string;
  /** The special file this is, or null for any other module under `app/`. */
  kind: AppFileKind | null;
  /** The directory of the file — its route segment. */
  segmentDir: string;
}

/** One route file inside a Pages Router directory. */
export interface PagesFile {
  app: NextApp;
  pagesDir: string;
  file: string;
  /** `_app`, `_document`, `_error`, or null for a routed page. */
  special: string | null;
  /** True for `pages/api/**` — a route handler, not a page. */
  api: boolean;
  /** The URL the page serves (`/blog/[slug]`), '' for specials and API routes. */
  route: string;
}

/** `a/b/c` relative to `from`, forward slashes; null when outside it. */
function inside(from: string, file: string): string | null {
  const rel = PathOperations.getRelative(from, file).replace(/\\/g, '/');
  if (rel.startsWith('..') || PathOperations.isAbsolute(rel)) return null;
  return rel;
}

/**
 * Lists and classifies the App Router and Pages Router files of the
 * project's Next apps (special file kind, route segment, served URL), walks a
 * segment's ancestors, and gives the result or message a law returns when
 * the router directory it judges does not exist.
 */
export class NextAppFiles {
  /**
   * Classify `file` against an App Router directory: null when the file is not
   * under it or sits in a private `_folder` (out of routing).
   */
  static appFile(app: NextApp, appDir: string, file: string): AppFile | null {
    const rel = inside(appDir, file);
    if (rel === null) return null;
    const parts = rel.split('/');
    if (parts.slice(0, -1).some(part => part.startsWith('_'))) return null;
    const match = APP_FILE.exec(parts[parts.length - 1] ?? '');
    return {
      app,
      appDir,
      file,
      kind: match ? (match[1] as AppFileKind) : null,
      segmentDir: PathOperations.getDirectory(file),
    };
  }

  /** Every scanned file under an App Router directory of any Next app. */
  static appFiles(
    apps: readonly NextApp[],
    files: readonly string[]
  ): AppFile[] {
    const found: AppFile[] = [];
    for (const file of files) {
      const owner = this.owningAppDir(apps, file);
      if (!owner) continue;
      const appFile = this.appFile(owner.app, owner.appDir, file);
      if (appFile) found.push(appFile);
    }
    return found;
  }

  /** Every scanned page-extension file under a Pages Router directory. */
  static pagesFiles(
    apps: readonly NextApp[],
    files: readonly string[]
  ): PagesFile[] {
    const found: PagesFile[] = [];
    for (const app of apps) {
      for (const pagesDir of app.pagesDirs) {
        for (const file of files) {
          const rel = inside(pagesDir, file);
          if (rel === null || !PAGE_EXTENSION.test(rel)) continue;
          found.push(this.pagesFile(app, pagesDir, file, rel));
        }
      }
    }
    return found;
  }

  private static pagesFile(
    app: NextApp,
    pagesDir: string,
    file: string,
    rel: string
  ): PagesFile {
    const withoutExt = rel.replace(PAGE_EXTENSION, '');
    const special = PAGES_SPECIAL.test(withoutExt) ? withoutExt : null;
    const api = withoutExt === 'api' || withoutExt.startsWith('api/');
    const route =
      special || api
        ? ''
        : `/${withoutExt.replace(/(?:^|\/)index$/, '')}`.replace(/\/$/, '') ||
          '/';
    return { app, pagesDir, file, special, api, route };
  }

  /** The deepest App Router directory containing `file`, with its app. */
  static owningAppDir(
    apps: readonly NextApp[],
    file: string
  ): { app: NextApp; appDir: string } | null {
    let best: { app: NextApp; appDir: string } | null = null;
    for (const app of apps) {
      for (const appDir of app.appDirs) {
        if (inside(appDir, file) === null) continue;
        if (!best || appDir.length > best.appDir.length) best = { app, appDir };
      }
    }
    return best;
  }

  /** `segmentDir`, then each parent up to and including `appDir`. */
  static segmentChain(appDir: string, segmentDir: string): string[] {
    const chain: string[] = [];
    let dir = segmentDir;
    for (;;) {
      chain.push(dir);
      if (PathOperations.normalize(dir) === PathOperations.normalize(appDir))
        break;
      const parent = PathOperations.getDirectory(dir);
      if (parent === dir || inside(appDir, parent) === null) break;
      dir = parent;
    }
    return chain;
  }

  /** The URL a segment directory serves: route groups and slots removed. */
  static routeOf(appDir: string, segmentDir: string): string {
    const rel = inside(appDir, segmentDir) ?? '';
    const parts = rel
      .split('/')
      .filter(
        part => part !== '' && !/^\(.*\)$/.test(part) && !part.startsWith('@')
      );
    return `/${parts.join('/')}`;
  }

  /** The special file of `kind` directly in `dir`, among `appFiles`. */
  static specialIn(
    appFiles: readonly AppFile[],
    dir: string,
    kind: AppFileKind
  ): AppFile | undefined {
    const wanted = PathOperations.normalize(dir);
    return appFiles.find(
      appFile =>
        appFile.kind === kind &&
        PathOperations.normalize(appFile.segmentDir) === wanted
    );
  }

  /** The routed pages of the App Router: `page.*` files outside private folders. */
  static pages(appFiles: readonly AppFile[]): AppFile[] {
    return appFiles.filter(appFile => appFile.kind === 'page');
  }

  /**
   * Passing result for a law about one router when no app declares that
   * router's directory: the subject does not exist, and the message says so
   * rather than "compliance verified".
   */
  static withoutSubject(
    lawName: string,
    subject: string,
    context: LawCheckContext
  ): LawResult {
    return {
      lawName: lawName.toLowerCase().replace(/\s+/g, '-'),
      passed: true,
      message: `${lawName}: ${subject}`,
      violations: [],
      suggestions: [],
      score: 100,
      config: context.config,
    };
  }

  /** The violation a law gives when `next` is declared but no router directory exists. */
  static noRouterDirectory(context: LawCheckContext): string {
    return `${ReactProject.relative(context, context.projectRoot) || '.'}: \`next\` is declared but no app/, src/app/, pages/ or src/pages/ directory was found beside any package.json declaring it — no route was inspected`;
  }
}

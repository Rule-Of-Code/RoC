/**
 * Nx / monorepo aware workspace helpers.
 *
 * Many analyzers historically resolved app files at `<root>/src/...` and the Angular
 * workspace config at `<root>/angular.json`. In an Nx (or other monorepo) workspace the
 * app lives at `apps/<app>/src/...` and there is no root `angular.json` — each project is
 * configured via its own `project.json`. These helpers resolve both layouts so the
 * performance/quality analyzers work in standard AND monorepo workspaces out-of-the-box.
 */

import { glob } from 'glob';
import * as fs from 'fs';
import { PathOperations } from './path-operations';

export class NxWorkspace {
  /**
   * Common monorepo project folders (plus the workspace root, via the empty brace
   * option). `libs/*​/*​/` is here because Nx nests libraries by domain —
   * `libs/<domain>/<type>/` (libs/events/data-access) is the layout `nx g lib` produces
   * for a scoped library, and a one-level pattern sees none of them.
   */
  private static readonly PROJECT_DIRS =
    '{,apps/*/,apps/*/*/,libs/*/,libs/*/*/,packages/*/,packages/*/*/,projects/*/}';

  private static readonly IGNORE = [
    '**/node_modules/**',
    '**/dist/**',
    '**/.angular/**',
    '**/.nx/**',
    '**/coverage/**',
  ];

  /**
   * Resolve a source-relative path (e.g. `src/index.html`) to the first existing file at
   * the workspace root OR under any monorepo app/lib. Falls back to the root path.
   */
  static resolveSourceFile(projectRoot: string, relPath: string): string {
    const rootPath = PathOperations.join(projectRoot, relPath);
    if (fs.existsSync(rootPath)) {
      return rootPath;
    }
    const matches = glob.sync(`${this.PROJECT_DIRS}${relPath}`, {
      cwd: projectRoot,
      absolute: true,
      ignore: this.IGNORE,
    });
    return matches[0] ?? rootPath;
  }

  /**
   * Every existing match of a source-relative path across the workspace: the root AND
   * each monorepo app/lib. Use this when the answer must consider ALL apps (e.g. "does
   * any app configure a global error handler?"), not just the first one found.
   *
   * Resolution is by folder pattern (apps/<name>/…), so an app is matched by its
   * LAYOUT, never by a hardcoded name — which is the whole point. A non-default
   * `sourceRoot` declared in project.json is not read; the standard apps/<name>/src
   * layout is.
   */
  static resolveSourceFiles(projectRoot: string, relPath: string): string[] {
    const matches = glob.sync(`${this.PROJECT_DIRS}${relPath}`, {
      cwd: projectRoot,
      absolute: true,
      ignore: this.IGNORE,
    });
    return [...new Set(matches)];
  }

  /**
   * Combined content of the Angular workspace build config(s): the root `angular.json`
   * (if present) plus every `project.json` in the workspace. Lets keyword-based checks
   * (e.g. `optimization`, `budgets`, `serviceWorker`) work in Nx workspaces.
   */
  static getBuildConfigContent(projectRoot: string): string {
    const paths: string[] = [];
    const angularJson = PathOperations.join(projectRoot, 'angular.json');
    if (fs.existsSync(angularJson)) {
      paths.push(angularJson);
    }
    paths.push(
      ...glob.sync(`${this.PROJECT_DIRS}project.json`, {
        cwd: projectRoot,
        absolute: true,
        ignore: this.IGNORE,
      })
    );

    return paths
      .map(p => {
        try {
          return fs.readFileSync(p, 'utf8');
        } catch {
          return '';
        }
      })
      .join('\n');
  }
}

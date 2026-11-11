/**
 * The index.html files a project's apps are built from.
 *
 * Read the way the Angular application builder reads them
 * (@angular/build `normalizeOptions`): the build target's `index` option —
 * a workspace-relative string, or `{ input }` — and, when it is absent,
 * `<sourceRoot>/index.html`. `index: false` means the app has no index. The
 * targets come from the root `angular.json` and from every Nx `project.json`.
 * A workspace without either (a Vite or CRA app) is looked up at the places
 * those tools use: `index.html`, `src/index.html`, `public/index.html`.
 */

import * as fs from 'fs';
import { glob } from 'glob';
import { PathOperations } from '../path-operations';

export interface AppIndex {
  /** Absolute path of the index file. */
  file: string;
  /** Where it was named: `apps/web/project.json`, or `default location`. */
  declaredIn: string;
}

type Json = Record<string, unknown>;

const PROJECT_JSON = '{apps/*/,apps/*/*/,libs/*/,libs/*/*/,packages/*/,packages/*/*/,projects/*/,}project.json';
const FALLBACKS = ['index.html', 'src/index.html', 'public/index.html'];

function asObject(value: unknown): Json | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : null;
}

function readJson(file: string): Json | null {
  try {
    return asObject(JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')));
  } catch {
    return null;
  }
}

export class AppIndexes {
  /** Every index file the project's app build targets name; may name files that do not exist. */
  static find(projectRoot: string): AppIndex[] {
    const found: AppIndex[] = [];
    const angularJson = readJson(PathOperations.join(projectRoot, 'angular.json'));
    for (const project of Object.values(asObject(angularJson?.projects) ?? {})) {
      const declared = this.fromProject(projectRoot, asObject(project), 'architect', 'angular.json');
      if (declared) found.push(declared);
    }
    const projectFiles = glob.sync(PROJECT_JSON, {
      cwd: projectRoot,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**'],
    });
    for (const file of projectFiles) {
      const where = PathOperations.getRelative(projectRoot, file).replace(/\\/g, '/');
      const project = readJson(file);
      const root = PathOperations.getRelative(projectRoot, PathOperations.getDirectory(file));
      const declared = this.fromProject(projectRoot, { root, ...project }, 'targets', where);
      if (declared) found.push(declared);
    }
    if (found.length > 0 || angularJson || projectFiles.length > 0) return found;
    return FALLBACKS.map(name => PathOperations.join(projectRoot, name))
      .filter(file => fs.existsSync(file))
      .slice(0, 1)
      .map(file => ({ file, declaredIn: 'default location' }));
  }

  /** The index a project's build target uses, or null when it has no browser build. */
  private static fromProject(
    projectRoot: string,
    project: Json | null,
    targetsKey: string,
    declaredIn: string
  ): AppIndex | null {
    const build = asObject(asObject(project?.[targetsKey])?.build);
    const executor = String(build?.executor ?? build?.builder ?? '');
    if (!/angular|ionic/i.test(executor) || /:(?:server|ng-packagr|package)/i.test(executor)) {
      return null;
    }
    const options = asObject(build?.options) ?? {};
    const index = options.index;
    if (index === false) return null;
    const input = typeof index === 'string' ? index : asObject(index)?.input;
    if (typeof input === 'string') {
      return { file: PathOperations.join(projectRoot, input), declaredIn };
    }
    const root = typeof project?.root === 'string' ? project.root : '';
    const sourceRoot =
      typeof project?.sourceRoot === 'string' ? project.sourceRoot : PathOperations.join(root, 'src');
    return { file: PathOperations.join(projectRoot, sourceRoot, 'index.html'), declaredIn };
  }
}

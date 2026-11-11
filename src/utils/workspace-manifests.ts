/**
 * Every package.json in the workspace — the root and each monorepo package —
 * with what the performance laws ask of it: dependencies and scripts.
 *
 * Reading only the root manifest made a monorepo invisible: a Next app in
 * `apps/web` declares `next`, its analyzer and its `size-limit` script in its
 * OWN manifest, and the workspace root declares none of them.
 */

import { FileSystemOperations } from './file-system-operations';
import { NxWorkspace } from './nx-workspace';
import { PathOperations } from './path-operations';

export interface WorkspaceManifest {
  /** The directory holding this package.json. */
  dir: string;
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
  /** The parsed manifest, for keys a caller reads itself (`size-limit`). */
  raw: Record<string, unknown>;
}

type RawManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, unknown>;
};

export class WorkspaceManifests {
  /** Every readable package.json; an unreadable one declares nothing. */
  static all(projectRoot: string): WorkspaceManifest[] {
    const result: WorkspaceManifest[] = [];
    for (const file of NxWorkspace.resolveSourceFiles(projectRoot, 'package.json')) {
      let raw: RawManifest & Record<string, unknown>;
      try {
        raw = FileSystemOperations.readJsonFile<RawManifest & Record<string, unknown>>(file);
      } catch {
        continue;
      }
      if (!raw || typeof raw !== 'object') continue;
      const scripts: Record<string, string> = {};
      for (const [name, command] of Object.entries(raw.scripts ?? {})) {
        if (typeof command === 'string') scripts[name] = command;
      }
      result.push({
        dir: PathOperations.getDirectory(file),
        dependencies: { ...(raw.dependencies ?? {}), ...(raw.devDependencies ?? {}) },
        scripts,
        raw,
      });
    }
    return result;
  }

  /** Every script command in every manifest. */
  static scriptCommands(projectRoot: string): string[] {
    return this.all(projectRoot).flatMap(manifest => Object.values(manifest.scripts));
  }

  /** True when any manifest declares `name` as a dependency or devDependency. */
  static declares(projectRoot: string, name: string): boolean {
    return this.all(projectRoot).some(manifest => name in manifest.dependencies);
  }
}

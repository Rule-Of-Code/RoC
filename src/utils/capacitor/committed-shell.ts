/**
 * The native shell as the COMMIT holds it, not as this disk happens to.
 *
 * The native-shell laws speak of "the committed native shell", and a clean
 * CI checkout of a commit sees only what git tracks. Reading the working tree
 * instead lets a file nobody committed decide the verdict: an `android/`
 * that `.gitignore` excludes still sits on the developer's disk, so the local
 * run is green and the checkout of the same commit is red (or the reverse).
 *
 * So, where git can answer, this view lists and reads TRACKED files only,
 * from the index (`git ls-files`, `git show :path`) — the same source the
 * signing-secrets law reads publishable files from. A file present on disk
 * but not tracked comes back as `untracked`, so a law can say why it did not
 * read it instead of passing over it. Where git cannot answer (no git, not a
 * work tree) the view reads the disk, as before.
 *
 * Paths are absolute in and out; git is asked with paths relative to the
 * project root.
 */

import * as fs from 'fs';
import { readFromIndex, trackedFiles, gitExposure } from '../git/git-layout';
import { PathOperations } from '../path-operations';
import { filesUnder } from './native-plugins';

export type CommittedRead =
  /** The tracked content (or, without git, the file on disk). */
  | { state: 'read'; text: string }
  /** Neither tracked nor on disk. */
  | { state: 'absent' }
  /** On disk, not tracked: a clean checkout does not have it. */
  | { state: 'untracked'; ignored: boolean }
  /** Tracked, but its content could not be read from the index. */
  | { state: 'unreadable' };

export class CommittedShell {
  private constructor(
    private readonly projectRoot: string,
    /** Tracked files (relative, forward slashes), or null when git cannot answer. */
    private readonly tracked: Set<string> | null
  ) {}

  /** The tracked view of the given directories (null `tracked` = no git: read the disk). */
  static of(projectRoot: string, dirs: readonly string[]): CommittedShell {
    const scopes = dirs.map(dir => CommittedShell.rel(projectRoot, dir) || '.');
    return new CommittedShell(projectRoot, trackedFiles(projectRoot, scopes));
  }

  /** A view that reads the disk only — for files that are git-ignored by design. */
  static onDisk(projectRoot: string): CommittedShell {
    return new CommittedShell(projectRoot, null);
  }

  /** True when git answered, so the verdict is that of the index. */
  get fromGit(): boolean {
    return this.tracked !== null;
  }

  read(file: string): CommittedRead {
    if (!this.tracked) {
      try {
        return fs.existsSync(file) ? { state: 'read', text: fs.readFileSync(file, 'utf8') } : { state: 'absent' };
      } catch {
        return { state: 'unreadable' };
      }
    }
    const rel = CommittedShell.rel(this.projectRoot, file);
    if (this.tracked.has(rel)) {
      const text = readFromIndex(this.projectRoot, rel);
      return text === null ? { state: 'unreadable' } : { state: 'read', text };
    }
    if (!fs.existsSync(file)) return { state: 'absent' };
    return { state: 'untracked', ignored: gitExposure(this.projectRoot, [rel])?.get(rel) === 'ignored' };
  }

  /** The text when the file is read, else null. */
  text(file: string): string | null {
    const read = this.read(file);
    return read.state === 'read' ? read.text : null;
  }

  /** True when the directory holds a tracked file (without git: exists on disk). */
  hasDir(dir: string): boolean {
    if (!this.tracked) return fs.existsSync(dir);
    const prefix = `${CommittedShell.rel(this.projectRoot, dir)}/`;
    for (const file of this.tracked) if (file.startsWith(prefix)) return true;
    return false;
  }

  /** Names of the immediate subdirectories of `dir` that hold a tracked file (without git: on disk), sorted. */
  childDirs(dir: string): string[] {
    if (!this.tracked) {
      try {
        return fs
          .readdirSync(dir, { withFileTypes: true })
          .filter(entry => entry.isDirectory())
          .map(entry => entry.name)
          .sort();
      } catch {
        return [];
      }
    }
    const prefix = `${CommittedShell.rel(this.projectRoot, dir)}/`;
    const names = new Set<string>();
    for (const file of this.tracked) {
      if (!file.startsWith(prefix)) continue;
      const rest = file.slice(prefix.length);
      const slash = rest.indexOf('/');
      if (slash > 0) names.add(rest.slice(0, slash));
    }
    return [...names].sort();
  }

  /** Every tracked file under `dir` (recursively) with one of `extensions` (without git: on disk). */
  filesUnder(dir: string, extensions: readonly string[]): string[] {
    if (!this.tracked) return filesUnder(dir, extensions);
    const prefix = `${CommittedShell.rel(this.projectRoot, dir)}/`;
    return [...this.tracked]
      .filter(file => file.startsWith(prefix) && extensions.some(ext => file.endsWith(ext)))
      .sort()
      .map(file => PathOperations.join(this.projectRoot, file));
  }

  /**
   * The path git knows the file by. Capacitor's CLI prints real paths, and a
   * project root reached through a junction or a short (8.3) name would
   * otherwise give a `../` path that matches nothing in the index.
   */
  private static rel(projectRoot: string, file: string): string {
    const direct = PathOperations.getRelative(projectRoot, file);
    if (!direct.startsWith('..') && !PathOperations.isAbsolute(direct)) return direct;
    const real = (p: string): string => {
      try {
        return fs.realpathSync.native(p);
      } catch {
        // A file that does not exist: resolve its nearest existing parent.
        const parent = PathOperations.getDirectory(p);
        return parent === PathOperations.normalize(p) ? p : PathOperations.join(real(parent), p.slice(parent.length + 1));
      }
    };
    return PathOperations.getRelative(real(projectRoot), real(file));
  }
}

/** Why a file the law needs was not read, in words for a finding. */
export function notReadReason(read: Exclude<CommittedRead, { state: 'read' }>): string {
  switch (read.state) {
    case 'absent':
      return 'does not exist';
    case 'unreadable':
      return 'is tracked by git but could not be read from the index';
    case 'untracked':
      return read.ignored
        ? 'exists on this disk but git ignores it, so a clean checkout of the commit does not have it'
        : 'exists on this disk but is not tracked by git, so a clean checkout of the commit does not have it';
  }
}

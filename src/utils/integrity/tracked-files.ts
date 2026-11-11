/**
 * The files git tracks — what CI checks out and what a migrator in production
 * reads — rather than whatever happens to be on the auditing machine's disk.
 *
 * A migration that exists only on a laptop is not part of the chain the
 * database will run, and a journal that is gitignored is not the journal the
 * deploy sees. The integrity laws judge the committed tree, so they ask git.
 *
 * "Could not ask" is returned as a reason, never as an empty list: an empty
 * list would read as "nothing to check" and pass.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export type TrackedFiles =
  | { ok: true; files: string[] }
  | { ok: false; reason: string };

/** git ls-files output can be large in a monorepo; 256 MB is far above any real index. */
const MAX_BUFFER = 256 * 1024 * 1024;

/**
 * Absolute paths of the tracked files under `projectRoot` that match the git
 * pathspecs (`*.sql` matches at any depth: git's `*` crosses `/`). A tracked
 * file deleted from the working tree is left out — it is not there to read.
 */
export function trackedFiles(projectRoot: string, pathspecs: readonly string[]): TrackedFiles {
  let out: string;
  try {
    out = execFileSync('git', ['ls-files', '-z', '--', ...pathspecs], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: MAX_BUFFER,
      windowsHide: true,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message.split('\n')[0] : String(error);
    return { ok: false, reason: `could not list the files git tracks (${detail})` };
  }
  const files = out
    .split('\0')
    .filter(rel => rel.length > 0)
    .map(rel => path.resolve(projectRoot, rel))
    .filter(file => fs.existsSync(file));
  return { ok: true, files };
}

/** A path relative to the project root with forward slashes, for messages. */
export function relativePath(projectRoot: string, file: string): string {
  return path.relative(projectRoot, file).replace(/\\/g, '/');
}

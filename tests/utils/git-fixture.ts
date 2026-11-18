/**
 * A throwaway git work tree for the tests that ask what git publishes.
 */
import { execFileSync } from '../../src/utils/child-process';
import { project } from '../checkers/toolkit-fixture';

/**
 * git in this fixture's own repository, whatever GIT_* the runner inherited:
 * the shared door strips the repository-local variables (#372).
 */
export function gitIn(root: string, ...args: string[]): void {
  execFileSync('git', args, { cwd: root, stdio: 'ignore' });
}

/** A project that is a git work tree, with `track` added to the index. */
export function repo(files: Record<string, string>, track: readonly string[] = []): string {
  const root = project(files);
  gitIn(root, 'init', '-q');
  if (track.length > 0) gitIn(root, 'add', '--', ...track);
  return root;
}

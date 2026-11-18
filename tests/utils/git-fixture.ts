/**
 * A throwaway git work tree for the tests that ask what git publishes.
 */
import { execFileSync } from 'child_process';
import { project } from '../checkers/toolkit-fixture';

/** git in this fixture's own repository, whatever GIT_* the runner inherited. */
export function gitIn(root: string, ...args: string[]): void {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  execFileSync('git', args, { cwd: root, env, stdio: 'ignore' });
}

/** A project that is a git work tree, with `track` added to the index. */
export function repo(files: Record<string, string>, track: readonly string[] = []): string {
  const root = project(files);
  gitIn(root, 'init', '-q');
  if (track.length > 0) gitIn(root, 'add', '--', ...track);
  return root;
}

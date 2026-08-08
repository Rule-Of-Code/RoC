/**
 * Where a repository's git directory, hooks and config ACTUALLY live.
 *
 * `<root>/.git` is a directory only in a primary checkout. In a linked worktree
 * (`git worktree add`) it is a FILE holding `gitdir: …`, and the shared config
 * and hooks live in the main repository's git directory. Detectors that joined
 * `.git/hooks` or `.git/config` onto the project root therefore reported "no
 * hooks" and "unable to read Git configuration" for a worktree whose hooks had
 * just blocked a push — the concern was met, the law said otherwise.
 *
 * Hooks are a second trap: `core.hooksPath` moves them wherever the project
 * says (husky points it at `.husky`), so `<gitdir>/hooks` is the DEFAULT, not
 * the answer. We ask git, and fall back to the filesystem only when git cannot
 * be run at all.
 */

import { execSync } from 'child_process';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';

/** Run a git command and return trimmed stdout, or null when it fails. */
function git(command: string, projectRoot: string): string | null {
  try {
    const out = execSync(command, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const value = out.toString().trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Absolute `p`, or `p` resolved against `projectRoot`. */
function absolute(p: string, projectRoot: string): string {
  return PathOperations.isAbsolute(p) ? p : PathOperations.join(projectRoot, p);
}

/**
 * The COMMON git directory — the main repository's, even when called from a
 * linked worktree. This is where the shared config and the default hooks live.
 */
export function resolveGitCommonDir(projectRoot: string): string | null {
  const fromGit = git('git rev-parse --git-common-dir', projectRoot);
  if (fromGit) return absolute(fromGit, projectRoot);

  // No usable git binary: fall back to the layout we can see. A `.git` FILE is
  // a worktree pointer — read the gitdir it names rather than treating the file
  // as a directory.
  const dotGit = PathOperations.join(projectRoot, '.git');
  if (!FileUtils.exists(dotGit)) return null;

  const content = FileUtils.readFile(dotGit);
  const pointer = content?.match(/^gitdir:\s*(.+)$/m)?.[1]?.trim();
  if (!pointer) return dotGit; // a real .git directory

  // <main>/.git/worktrees/<name> → the common dir is two levels up.
  const worktreeGitDir = absolute(pointer, projectRoot);
  const parent = PathOperations.getParent(
    PathOperations.getParent(worktreeGitDir)
  );
  return FileUtils.exists(parent) ? parent : worktreeGitDir;
}

/**
 * The directory git will actually consult for hooks: `core.hooksPath` when the
 * project sets one (husky does), otherwise `<common git dir>/hooks`. Returns
 * null only when there is no repository to ask about.
 */
export function resolveGitHooksDir(projectRoot: string): string | null {
  const configured = git('git config --get core.hooksPath', projectRoot);
  if (configured) return absolute(configured, projectRoot);

  const commonDir = resolveGitCommonDir(projectRoot);
  return commonDir ? PathOperations.join(commonDir, 'hooks') : null;
}

/**
 * The repository config file governing this working tree — the main
 * repository's, when called from a linked worktree.
 */
export function resolveGitConfigPath(projectRoot: string): string | null {
  const commonDir = resolveGitCommonDir(projectRoot);
  return commonDir ? PathOperations.join(commonDir, 'config') : null;
}

/**
 * Index mode of every TRACKED file under `dir`, keyed by basename.
 *
 * The git index is the only portable carrier of the executable bit. NTFS has
 * none: `fs.stat().mode` reports 0o666 for every file on Windows and `chmod` is
 * a no-op there, so reading the filesystem reports every hook as
 * non-executable on a platform where that cannot be fixed. `git ls-files -s`
 * answers the same question identically everywhere — `100755` executable,
 * `100644` not.
 *
 * Untracked files are absent from the result on purpose: git holds no mode for
 * them, and neither can a consumer commit one. Husky's generated `_` directory
 * is entirely untracked (its own .gitignore is `*`), so nothing there is ours
 * to judge.
 */
export function trackedModesByBasename(
  projectRoot: string,
  dir: string
): Map<string, string> {
  const modes = new Map<string, string>();
  const out = git(`git ls-files -s -z -- "${dir}"`, projectRoot);
  if (!out) return modes;

  for (const record of out.split('\0')) {
    if (!record) continue;
    // "<mode> <sha> <stage>\t<path>"
    const tabAt = record.indexOf('\t');
    if (tabAt < 0) continue;
    const mode = record.slice(0, record.indexOf(' '));
    const filePath = record.slice(tabAt + 1);
    const basename = filePath.split('/').pop();
    if (mode && basename) modes.set(basename, mode);
  }
  return modes;
}

/**
 * The hook names git itself will run. Anything else in a hooks directory is
 * support material — husky keeps `.gitignore`, `husky.sh` and `h` in there —
 * and judging those as hooks produces findings about files git never executes.
 */
export const GIT_HOOK_NAMES: readonly string[] = [
  'applypatch-msg',
  'pre-applypatch',
  'post-applypatch',
  'pre-commit',
  'pre-merge-commit',
  'prepare-commit-msg',
  'commit-msg',
  'post-commit',
  'pre-rebase',
  'post-checkout',
  'post-merge',
  'pre-push',
  'pre-receive',
  'update',
  'proc-receive',
  'post-receive',
  'post-update',
  'reference-transaction',
  'push-to-checkout',
  'pre-auto-gc',
  'post-rewrite',
  'sendemail-validate',
  'fsmonitor-watchman',
  'post-index-change',
];

/** True when git would run a file of this name as a hook. */
export function isGitHookName(name: string): boolean {
  return GIT_HOOK_NAMES.includes(name);
}

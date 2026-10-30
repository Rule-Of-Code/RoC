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

import { execSync, spawnSync } from 'child_process';
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
 * THIS working tree's git directory — the per-worktree one, not the shared
 * one. In a linked worktree that is `<main>/.git/worktrees/<name>`, and it is
 * where the state of an operation in progress lives: `MERGE_HEAD`,
 * `rebase-merge`, `rebase-apply`, `CHERRY_PICK_HEAD`.
 *
 * Distinct from {@link resolveGitCommonDir} on purpose. Config and hooks are
 * SHARED between worktrees; an in-progress rebase is not — asking the common
 * dir about it would report the main checkout's state while judging this one.
 */
export function resolveGitDir(projectRoot: string): string | null {
  const fromGit = git('git rev-parse --git-dir', projectRoot);
  if (fromGit) return absolute(fromGit, projectRoot);

  const dotGit = PathOperations.join(projectRoot, '.git');
  if (!FileUtils.exists(dotGit)) return null;

  const pointer = FileUtils.readFile(dotGit)?.match(/^gitdir:\s*(.+)$/m)?.[1];
  return pointer ? absolute(pointer.trim(), projectRoot) : dotGit;
}

/**
 * Every remote URL configured for this repository.
 *
 * Asking git is what makes this correct in a linked worktree, a submodule, and
 * a repository whose config lives somewhere unusual — reading `.git/config` as
 * a path answers only for a primary checkout, and answers WRONG rather than
 * not at all: the read fails, the host goes unrecognised, and a law that means
 * "this host protects branches server-side" concludes it does not.
 */
export function resolveRemoteUrls(projectRoot: string): string[] {
  const out = git('git config --get-regexp "^remote\\..*\\.url$"', projectRoot);
  if (out) {
    return out
      .split('\n')
      .map(line => line.slice(line.indexOf(' ') + 1).trim())
      .filter(url => url.length > 0);
  }

  // No usable git binary: read the config git would have read.
  const configPath = resolveGitConfigPath(projectRoot);
  const content = configPath ? FileUtils.readFile(configPath) : null;
  if (!content) return [];

  return [...content.matchAll(/^\s*url\s*=\s*(.+)$/gm)]
    .map(m => m[1]?.trim() ?? '')
    .filter(url => url.length > 0);
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
 * Where a file stands with git — the question a "committed secret" check is
 * actually asking.
 *
 * - `tracked`: in the index. Committed, or about to be; still true after the
 *   working copy is deleted, because deleting a file does not untrack it.
 * - `unignored`: on disk, untracked, and not ignored — `git add -A` commits it.
 * - `ignored`: on disk, untracked, and ignored. This is the CORRECT state of a
 *   local `.env`, and a check that reads the disk cannot tell it from the
 *   committed one.
 * - `absent`: none of the above.
 */
export type GitExposure = 'tracked' | 'unignored' | 'ignored' | 'absent';

/** Run git with arguments (no shell); null when it cannot run at all. */
function gitRun(
  args: string[],
  projectRoot: string,
  input?: string
): { status: number; stdout: string } | null {
  const result = spawnSync('git', args, {
    cwd: projectRoot,
    encoding: 'utf8',
    windowsHide: true,
    input,
  });
  if (result.error || result.status === null) return null;
  return { status: result.status, stdout: result.stdout ?? '' };
}

/**
 * The {@link GitExposure} of each path (relative to `projectRoot`), or null
 * when git cannot answer — no git binary, or not inside a working tree. The
 * caller then falls back to the filesystem, saying less but not nothing.
 */
export function gitExposure(
  projectRoot: string,
  paths: readonly string[]
): Map<string, GitExposure> | null {
  const inside = gitRun(['rev-parse', '--is-inside-work-tree'], projectRoot);
  if (!inside || inside.status !== 0 || inside.stdout.trim() !== 'true') {
    return null;
  }

  const listed = gitRun(['ls-files', '-z', '--', ...paths], projectRoot);
  if (!listed || listed.status !== 0) return null;
  const tracked = new Set(listed.stdout.split('\0').filter(Boolean));

  const onDisk = paths.filter(
    p =>
      !tracked.has(p) && FileUtils.exists(PathOperations.join(projectRoot, p))
  );
  const ignored = ignoredAmong(projectRoot, onDisk);
  if (!ignored) return null;

  const states = new Map<string, GitExposure>();
  for (const p of paths) {
    if (tracked.has(p)) states.set(p, 'tracked');
    else if (ignored.has(p)) states.set(p, 'ignored');
    else if (onDisk.includes(p)) states.set(p, 'unignored');
    else states.set(p, 'absent');
  }
  return states;
}

/**
 * Which of these untracked paths git ignores; null when git errors.
 *
 * check-ignore exits 1 when none of the paths is ignored; only 128 is an
 * error. It never reports tracked paths, which is why the caller separates
 * those out first. `-z` is accepted only together with `--stdin`.
 */
function ignoredAmong(
  projectRoot: string,
  untracked: readonly string[]
): Set<string> | null {
  const ignored = new Set<string>();
  if (untracked.length === 0) return ignored;

  const checked = gitRun(
    ['check-ignore', '-z', '--stdin'],
    projectRoot,
    untracked.map(p => `${p}\0`).join('')
  );
  if (!checked || checked.status > 1) return null;
  for (const p of checked.stdout.split('\0')) if (p) ignored.add(p);
  return ignored;
}

/**
 * A tracked file's content as the INDEX holds it — what is committed or
 * staged, rather than whatever the working copy says. Null when git cannot
 * read it.
 */
export function readFromIndex(
  projectRoot: string,
  filePath: string
): string | null {
  // `:./path` is relative to the working directory; bare `:path` would be
  // relative to the repository root, which differs in a monorepo package.
  const shown = gitRun(['show', `:./${filePath}`], projectRoot);
  return shown && shown.status === 0 ? shown.stdout : null;
}

/**
 * The content of each file that git could publish, read from where git would
 * publish it from: a tracked file from the INDEX (so a committed secret is
 * found even after the working copy is deleted), an unignored one from disk.
 * Ignored, untracked files are left out — they never leave the machine, and a
 * working local `.env` holds real values by definition.
 *
 * Without git, every file present on disk is returned, as before.
 */
export function readPublishableFiles(
  projectRoot: string,
  files: readonly string[]
): Array<{ file: string; content: string }> {
  const fromDisk = (file: string): string | null => {
    const filePath = PathOperations.join(projectRoot, file);
    if (!FileUtils.exists(filePath)) return null;
    try {
      return FileUtils.readFile(filePath);
    } catch {
      return null;
    }
  };

  const states = gitExposure(projectRoot, files);
  const read: Array<{ file: string; content: string }> = [];
  for (const file of files) {
    const state = states?.get(file);
    const content = !states
      ? fromDisk(file)
      : state === 'tracked'
        ? readFromIndex(projectRoot, file)
        : state === 'unignored'
          ? fromDisk(file)
          : null;
    if (content) read.push({ file, content });
  }
  return read;
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

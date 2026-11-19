/**
 * The one door through which the CLI starts a child process.
 *
 * Every child (git, npm, npx husky, a framework CLI, …) is started with
 * `cwd` = the directory it is about, and with an environment from which the
 * variables that tell git WHICH repository to use have been removed.
 *
 * Why: git exports `GIT_DIR` (and, depending on the operation, `GIT_INDEX_FILE`,
 * `GIT_WORK_TREE`, `GIT_PREFIX`, …) to the hooks it runs. In a linked worktree
 * `GIT_DIR` names `<main>/.git/worktrees/<name>`. Those variables outrank
 * `cwd`: a git command started with them — directly, or by a tool such as husky
 * that calls git itself — answers about, and WRITES to, the repository they
 * name, not the one in `cwd`. A RoC command run from another repository's hook
 * (or from a test runner a hook started, or a CI step that exports them) then
 * read the other repository's branch, history and tags, and `init` wrote
 * `core.hooksPath` into the other repository's shared config while the target
 * got none (#372).
 *
 * The list is git's own: `git rev-parse --local-env-vars` prints the variables
 * git itself clears before it runs a command in a different repository (a
 * submodule) — exactly the situation of a child started for a target directory.
 * The output of git 2.54 is reproduced below; `GIT_NAMESPACE` (the "Git
 * Repository" section of `git help environment`, which scopes every ref name)
 * and the `GIT_CONFIG_KEY_<n>` / `GIT_CONFIG_VALUE_<n>` pairs that
 * `GIT_CONFIG_COUNT` announces are added for the same reason.
 *
 * Deliberately KEPT: `GIT_CEILING_DIRECTORIES` and
 * `GIT_DISCOVERY_ACROSS_FILESYSTEM`. They name no repository; they only bound
 * how far git searches upward from `cwd`, and removing a user's bound would
 * let git discover a repository the user fenced off. Everything not
 * repository-local (credentials, `GIT_SSH_COMMAND`, `GIT_TERMINAL_PROMPT`,
 * trace switches, author identity, PATH, …) passes through untouched.
 *
 * `tests/utils/child-process-guard.test.ts` fails the build when any file under
 * `src/` imports `child_process` other than this one.
 */

import * as nodeChildProcess from 'child_process';
import type {
  ChildProcess,
  ExecFileSyncOptions,
  ExecFileSyncOptionsWithStringEncoding,
  ExecSyncOptions,
  ExecSyncOptionsWithStringEncoding,
  SpawnOptions,
  SpawnSyncOptions,
  SpawnSyncOptionsWithStringEncoding,
  SpawnSyncReturns,
} from 'child_process';

/**
 * `git rev-parse --local-env-vars` (git 2.54), plus `GIT_NAMESPACE`.
 * Upper case; matched case-insensitively (Windows environment names are).
 */
export const REPOSITORY_LOCAL_GIT_VARIABLES: readonly string[] = [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_CONFIG',
  'GIT_CONFIG_PARAMETERS',
  'GIT_CONFIG_COUNT',
  'GIT_OBJECT_DIRECTORY',
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_IMPLICIT_WORK_TREE',
  'GIT_GRAFT_FILE',
  'GIT_INDEX_FILE',
  'GIT_NO_REPLACE_OBJECTS',
  'GIT_REPLACE_REF_BASE',
  'GIT_PREFIX',
  'GIT_SHALLOW_FILE',
  'GIT_COMMON_DIR',
  'GIT_NAMESPACE',
];

const LOCAL = new Set(REPOSITORY_LOCAL_GIT_VARIABLES);
/** The numbered pairs `GIT_CONFIG_COUNT` announces. */
const CONFIG_PAIR = /^GIT_CONFIG_(?:KEY|VALUE)_\d+$/;

/** True when `name` makes git pick a repository other than `cwd`'s. */
export function isRepositoryLocalGitVariable(name: string): boolean {
  const upper = name.toUpperCase();
  return LOCAL.has(upper) || CONFIG_PAIR.test(upper);
}

/**
 * `base` (default: this process's environment) without the repository-local
 * git variables. A new object; `base` is not modified.
 */
export function childEnvironment(
  base: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(base)) {
    if (!isRepositoryLocalGitVariable(name)) env[name] = value;
  }
  return env;
}

/** Options with the target directory made mandatory. */
type Targeted<T> = Omit<T, 'cwd'> & { cwd: string };

function targeted<T extends { env?: NodeJS.ProcessEnv }>(options: T): T {
  return { ...options, env: childEnvironment(options.env ?? process.env) };
}

/** `child_process.execSync`, in `cwd`, with {@link childEnvironment}. */
export function execSync(
  command: string,
  options: Targeted<ExecSyncOptionsWithStringEncoding>
): string;
export function execSync(
  command: string,
  options: Targeted<ExecSyncOptions>
): string | Buffer;
export function execSync(
  command: string,
  options: Targeted<ExecSyncOptions>
): string | Buffer {
  return nodeChildProcess.execSync(command, targeted(options));
}

/** `child_process.execFileSync` (no shell), in `cwd`, with {@link childEnvironment}. */
export function execFileSync(
  file: string,
  args: readonly string[],
  options: Targeted<ExecFileSyncOptionsWithStringEncoding>
): string;
export function execFileSync(
  file: string,
  args: readonly string[],
  options: Targeted<ExecFileSyncOptions>
): string | Buffer;
export function execFileSync(
  file: string,
  args: readonly string[],
  options: Targeted<ExecFileSyncOptions>
): string | Buffer {
  return nodeChildProcess.execFileSync(file, args, targeted(options));
}

/** `child_process.spawnSync` (no shell), in `cwd`, with {@link childEnvironment}. */
export function spawnSync(
  file: string,
  args: readonly string[],
  options: Targeted<SpawnSyncOptionsWithStringEncoding>
): SpawnSyncReturns<string>;
export function spawnSync(
  file: string,
  args: readonly string[],
  options: Targeted<SpawnSyncOptions>
): SpawnSyncReturns<string | Buffer>;
export function spawnSync(
  file: string,
  args: readonly string[],
  options: Targeted<SpawnSyncOptions>
): SpawnSyncReturns<string | Buffer> {
  return nodeChildProcess.spawnSync(file, args, targeted(options));
}

/**
 * `child_process.spawn` (no shell), in `cwd`, with {@link childEnvironment}:
 * the asynchronous door, for a caller that must act on the child while it
 * runs (close its stdout, wait for its exit with a deadline).
 */
export function spawn(
  file: string,
  args: readonly string[],
  options: Targeted<SpawnOptions>
): ChildProcess {
  return nodeChildProcess.spawn(file, args, targeted(options));
}

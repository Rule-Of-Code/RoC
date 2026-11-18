/**
 * Is a git hook actually configured?
 *
 * This lived twice — once in Git Hook Compliance, once (differently, and wrongly)
 * in Git Hooks Standards — and the two answers disagreed. On a stock repository,
 * where git ships `pre-commit.sample` and nothing else, Compliance called the hook
 * unconfigured and FAILED while Standards called it fine and PASSED: two laws, one
 * repo, opposite verdicts. A consumer could satisfy neither without contradicting
 * the other.
 *
 * One implementation, one answer. Both laws read it from here now, so they cannot
 * drift apart again.
 */

import { FileUtils } from './file-utils';
import { configuredHooksPath, resolveGitHooksDir } from './git/git-layout';
import { PathOperations } from './path-operations';

export type GitHookStatus = 'active' | 'missing' | 'sample';

/** Hook content this short that mentions "sample" is git's own template. */
const SAMPLE_CONTENT_LIMIT = 200;

/** True when the file at `hookPath` is git's own `*.sample`-style template. */
function isSampleContent(hookPath: string): boolean {
  try {
    const content = FileUtils.readFile(hookPath);
    return content.includes('sample') && content.length < SAMPLE_CONTENT_LIMIT;
  } catch {
    return false; // Unreadable: do not invent a finding.
  }
}

/** Whether git, in this checkout, will run a hook — and where it looked. */
export interface HookInstallation {
  installed: boolean;
  /** The directory git runs hooks from here; null outside a repository. */
  hooksDir: string | null;
  /** `core.hooksPath` as configured; null when unset. */
  hooksPath: string | null;
  /** Why it is not installed; empty when it is. */
  reason: string;
}

/**
 * Will git run `hook` in the checkout at `projectRoot`?
 *
 * Git runs `<hooksDir>/<hook>`, where hooksDir is `core.hooksPath` when set and
 * `<common git dir>/hooks` otherwise — asked of git (worktrees, a relative
 * hooksPath), never assumed from a committed file. The file must exist and not
 * be git's sample template.
 *
 * Husky 9 points `core.hooksPath` at `.husky/_`, a generated directory whose
 * `<hook>` stubs all hand over to its runner `h`, and `h` runs the user script
 * `.husky/<hook>` — or does nothing, successfully, when that script is absent.
 * So in that layout (a runner `h` beside the stub) the user script one level
 * up must exist too.
 */
export function hookInstallation(
  projectRoot: string,
  hook: string
): HookInstallation {
  const hooksDir = resolveGitHooksDir(projectRoot);
  const hooksPath = configuredHooksPath(projectRoot);
  const result = (reason: string): HookInstallation => ({
    installed: reason === '',
    hooksDir,
    hooksPath,
    reason,
  });
  if (!hooksDir) return result('not a git repository');

  const where = hooksPath
    ? `core.hooksPath (${hooksPath})`
    : `${hooksDir} (core.hooksPath is unset)`;
  if (!FileUtils.isDirectory(hooksDir)) {
    return result(`git runs hooks from ${where}, which does not exist`);
  }
  const hookPath = PathOperations.join(hooksDir, hook);
  if (!FileUtils.exists(hookPath)) {
    return result(`git runs hooks from ${where}, which has no ${hook}`);
  }
  if (isSampleContent(hookPath)) {
    return result(`${hook} in ${where} is git's sample template`);
  }
  const runner = PathOperations.join(hooksDir, 'h');
  const userScript = PathOperations.join(
    PathOperations.getParent(hooksDir),
    hook
  );
  if (FileUtils.exists(runner) && !FileUtils.exists(userScript)) {
    return result(`${where} hands ${hook} to ${userScript}, which is missing`);
  }
  return result('');
}

/**
 * Resolve whether `hook` is configured for real.
 *
 * - `.husky/<hook>` present → active. Modern Husky commits hooks there and points
 *   core.hooksPath at it, so `.git/hooks/<hook>` legitimately holds only the
 *   `.sample`. Missing this is what made the naive check false-fail husky repos.
 * - no `.git/hooks/<hook>` → `sample` when git's template is still sitting there,
 *   `missing` when even that is gone.
 * - a real hook file → active, unless it is git's short template text.
 */
export function resolveGitHookStatus(
  projectRoot: string,
  hooksDir: string,
  hook: string
): GitHookStatus {
  if (FileUtils.exists(PathOperations.join(projectRoot, '.husky', hook))) {
    return 'active';
  }

  const hookPath = PathOperations.join(hooksDir, hook);
  const sampleHookPath = PathOperations.join(hooksDir, `${hook}.sample`);

  if (!FileUtils.exists(hookPath)) {
    return FileUtils.exists(sampleHookPath) ? 'sample' : 'missing';
  }

  try {
    const hookContent = FileUtils.readFile(hookPath);
    return hookContent.includes('sample') &&
      hookContent.length < SAMPLE_CONTENT_LIMIT
      ? 'sample'
      : 'active';
  } catch (_error) {
    return 'active'; // Unreadable: do not invent a finding.
  }
}

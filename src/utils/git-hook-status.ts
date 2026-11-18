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

export type GitHookStatus =
  | 'active'
  | 'missing'
  | 'sample'
  /** Committed in .husky/, but git does not run it in this checkout. */
  | 'not-installed'
  /** The same, in a CI checkout, where hooks are not installed by design. */
  | 'ci-not-installed';

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
  const userScript = missingUserScript(hooksDir, hook);
  if (userScript) {
    return result(`${where} hands ${hook} to ${userScript}, which is missing`);
  }
  return result('');
}

/**
 * Husky 9's layout (a runner `h` beside the `<hook>` stub): the user script
 * one level up that the runner would execute, when it is missing; else null.
 */
function missingUserScript(hooksDir: string, hook: string): string | null {
  if (!FileUtils.exists(PathOperations.join(hooksDir, 'h'))) return null;
  const userScript = PathOperations.join(PathOperations.getParent(hooksDir), hook);
  return FileUtils.exists(userScript) ? null : userScript;
}

/**
 * A CI checkout, where hooks are not installed by design: CI systems set `CI`
 * (GitHub Actions, GitLab CI, CircleCI, Bitbucket Pipelines, Travis, …), and
 * `HUSKY=0` is husky's own switch for "do not install the hooks here".
 */
export function isCiCheckout(env: NodeJS.ProcessEnv = process.env): boolean {
  const ci = (env.CI ?? '').trim().toLowerCase();
  return (ci !== '' && ci !== 'false' && ci !== '0') || env.HUSKY === '0';
}

/**
 * Resolve whether `hook` is configured AND installed.
 *
 * - `.husky/<hook>` committed: configured in the repository. It is `active`
 *   only when git runs it in this checkout ({@link hookInstallation}: the
 *   resolved hooks directory holds it). A committed file used to count as
 *   active on its own, so a clone with `core.hooksPath` unset, where no hook
 *   could run, passed both hook laws. Not installed is `not-installed` in a
 *   developer checkout and `ci-not-installed` in a CI checkout
 *   ({@link isCiCheckout}), where that is the design and not a finding.
 * - otherwise the resolved hooks directory: `sample` when only git's template
 *   is there, `missing` when even that is gone, `active` for a real hook.
 */
export function resolveGitHookStatus(
  projectRoot: string,
  hooksDir: string,
  hook: string
): GitHookStatus {
  if (FileUtils.exists(PathOperations.join(projectRoot, '.husky', hook))) {
    if (hookInstallation(projectRoot, hook).installed) return 'active';
    return isCiCheckout() ? 'ci-not-installed' : 'not-installed';
  }

  const hookPath = PathOperations.join(hooksDir, hook);
  const sampleHookPath = PathOperations.join(hooksDir, `${hook}.sample`);

  if (!FileUtils.exists(hookPath)) {
    return FileUtils.exists(sampleHookPath) ? 'sample' : 'missing';
  }
  if (isSampleContent(hookPath)) return 'sample';
  // A husky 9 stub whose user script is gone runs nothing, successfully.
  return missingUserScript(hooksDir, hook) ? 'missing' : 'active';
}

/**
 * The finding for committed hooks git does not run here, or null. Shared by
 * both hook laws so they word it, and decide it, the same way.
 */
export function notInstalledFinding(
  projectRoot: string,
  hooks: readonly string[]
): string | null {
  if (hooks.length === 0) return null;
  const reason = hookInstallation(projectRoot, hooks[0] ?? '').reason;
  return (
    `Hooks committed in .husky/ but not installed in this checkout: ` +
    `${hooks.join(', ')} (${reason}); run \`npx husky\` at the repository root`
  );
}

/**
 * What a passing hook verdict was based on, for the result message and
 * metrics: the hooks git runs in this checkout, or, in a CI checkout, only
 * the committed configuration.
 */
export function hookVerdictBasis(statuses: Record<string, GitHookStatus>): {
  checked: 'installed-in-this-checkout' | 'committed-configuration-only';
  note: string | null;
} {
  const ciOnly = Object.entries(statuses)
    .filter(([, status]) => status === 'ci-not-installed')
    .map(([hook]) => hook);
  if (ciOnly.length === 0) {
    return { checked: 'installed-in-this-checkout', note: null };
  }
  return {
    checked: 'committed-configuration-only',
    note:
      `${ciOnly.join(', ')}: committed in .husky/, not installed in this CI ` +
      'checkout (hooks are not installed in CI by design; installation not checked)',
  };
}

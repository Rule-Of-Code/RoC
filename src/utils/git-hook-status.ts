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
import { PathOperations } from './path-operations';

export type GitHookStatus = 'active' | 'missing' | 'sample';

/** Hook content this short that mentions "sample" is git's own template. */
const SAMPLE_CONTENT_LIMIT = 200;

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

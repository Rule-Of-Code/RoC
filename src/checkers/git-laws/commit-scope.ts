/**
 * What a commit-history law actually looked at.
 *
 * The three laws that read history (`commit-message-standards`,
 * `commit-description-standards`, `commit-size-control`) scope themselves with
 * `thresholds.git.*.baseline`, and that scoping is correct. What the output
 * never said is WHICH baseline was resolved and how far behind it is — and a
 * baseline resolves against the LOCAL ref, so a branch that has not been pulled
 * puts commits already merged upstream inside the scanned range.
 *
 * A reporter lost an afternoon to exactly that: a foreign commit reported by
 * position, read as unfixable shared history. They rebased (which could not
 * help, the commit being upstream already), dropped two of their own commits,
 * recovered them from the reflog, told their team lead the gate was broken, and
 * began drafting an issue against a tool that was working correctly. `git pull`
 * was the fix.
 *
 * The facts are all known at the point of the check: the law resolves the ref to
 * build the range, and the range is what it iterates. Saying so is the whole
 * fix — a correct result should not be indistinguishable from a broken one.
 */

import { execSync } from 'child_process';

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

/**
 * How many commits `ref` is behind its own upstream, or null when it has no
 * upstream to compare against (a purely local branch, or a detached HEAD).
 */
function commitsBehindUpstream(
  ref: string,
  projectRoot: string
): { count: number; upstream: string } | null {
  const upstream = git(
    `git rev-parse --abbrev-ref --symbolic-full-name "${ref}@{upstream}"`,
    projectRoot
  );
  if (!upstream) return null;

  const count = git(
    `git rev-list --count "${ref}..${upstream}"`,
    projectRoot
  );
  const behind = Number(count);
  if (!Number.isFinite(behind)) return null;

  return { count: behind, upstream };
}

/**
 * One line naming the scope a commit-history law selected, for the suggestion
 * list — so it is printed exactly when the law has something to report and the
 * reader needs to know what was measured.
 */
export function describeCommitScope(
  projectRoot: string,
  baseline: string | undefined,
  maxCommits: number
): string {
  if (!baseline) {
    return `Scope: the last ${maxCommits} commits on this branch. Set thresholds.git.*.baseline to a ref to measure only commits made after adopting the law.`;
  }

  const range = `${baseline}..HEAD`;
  const scanned = git(`git rev-list --count ${range}`, projectRoot);
  const counted = scanned ? `${scanned} commits` : 'the commits';
  const drift = commitsBehindUpstream(baseline, projectRoot);

  if (drift && drift.count > 0) {
    return `Scope: ${counted} in ${range} — and '${baseline}' is ${drift.count} behind ${drift.upstream}, so commits already merged upstream are inside this range. Run 'git pull' on ${baseline} before trusting these findings.`;
  }

  return `Scope: ${counted} in ${range}, from thresholds.git.*.baseline. A commit reported here that is not yours is a sign the baseline needs updating.`;
}

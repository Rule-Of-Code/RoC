/**
 * Commit Message Standards Law
 * Enforces conventional commit message format
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { describeCommitScope } from './commit-scope';
import { GitLawBase } from './git-law-base';

export class CommitMessageStandardsLaw extends GitLawBase {
  private static readonly LAW_NAME = 'Commit Message Standards';

  static check(context: LawCheckContext): LawResult {
    // Early git repository validation
    const gitValidationResult = this.validateGitRepository(
      context,
      this.LAW_NAME
    );
    if (gitValidationResult) {
      return gitValidationResult;
    }

    const { projectRoot } = context;
    const violations: string[] = [];

    // Scope is configurable so RoC can be adopted in an EXISTING repo: skip
    // merge commits and/or only check commits after a baseline ref (old and
    // auto-generated commits exempt; new commits enforced). Read outside the
    // try, so the scope can still be reported when the analysis throws.
    const commitCfg = context.config.thresholds?.git?.commitMessage;

    try {
      const ignoreMerges = commitCfg?.ignoreMergeCommits !== false; // default: true
      const range = commitCfg?.baseline
        ? `${commitCfg.baseline}..HEAD`
        : `-${commitCfg?.maxCommits ?? 10}`;
      const logResult = this.executeGitCommand(
        `git log ${
          ignoreMerges ? '--no-merges ' : ''
        }--pretty=format:"%s" ${range}`,
        projectRoot
      );

      if (!logResult.success) {
        violations.push('Unable to read git history');
        return this.createResult(
          violations,
          this.LAW_NAME,
          'GIT_LAW',
          ['Check git repository status'],
          context
        );
      }

      const commits = logResult.stdout
        .split('\n')
        .filter(line => line.trim().length > 0);

      if (commits.length === 0) {
        // An empty range is NOT a violation: with a configured baseline it means
        // there are no new authored commits to enforce (e.g. only a merge sits
        // after the baseline), and otherwise it means recent history is empty or
        // merge-only. Either way there are zero bad commit messages → compliant.
        const note = commitCfg?.baseline
          ? `No authored commits after baseline ${commitCfg.baseline} — nothing to enforce`
          : 'No (non-merge) commits in the scanned range';
        return this.createResult(
          [],
          this.LAW_NAME,
          'GIT_LAW',
          [note],
          context
        );
      }

      // Conventional commit pattern. The subject length is NOT bounded here — a
      // single configurable limit (maxCommitMessageLength) is the only authority,
      // so the format check and the length check can never disagree.
      const conventionalPattern =
        /^(feat|fix|docs|style|refactor|test|chore|perf|build|ci|revert)(\(.+\))?!?: .+/;

      // Auto-generated commits we do NOT author: merge commits (incl. Bitbucket
      // "Merged in…" / GitHub "Merge pull request…"), reverts, and the initial
      // commit. These are EXEMPT from BOTH the format AND the length checks —
      // Bitbucket/GitHub compose merge/squash subjects server-side (they never
      // pass through the local commit-msg hook), so a >72 squash subject must not
      // block a by-the-book release.
      const isExemptCommit = (commit: string): boolean =>
        /^(merge\b|merged\b|revert\b)/i.test(commit) ||
        commit.toLowerCase().includes('initial commit');

      const maxLength =
        context.config.thresholds?.git?.maxCommitMessageLength ?? 72;

      commits.forEach((commit: string, index: number) => {
        if (isExemptCommit(commit)) {
          return;
        }

        if (!conventionalPattern.test(commit)) {
          violations.push(
            `Commit ${
              index + 1
            }: "${commit}" doesn't follow conventional format`
          );
        }

        // Check commit message length (authored commits only)
        if (commit.length > maxLength) {
          violations.push(
            `Commit ${index + 1}: "${commit.substring(
              0,
              50
            )}..." is too long (${commit.length} chars, max ${maxLength})`
          );
        }
      });
    } catch (_error) {
      violations.push(
        'Could not analyze commit messages (git repository required)'
      );
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'GIT_LAW',
      [
        // The scope leads, because a commit reported here that the reader did
        // not write is a stale baseline, not shared history they must rewrite.
        describeCommitScope(
          context.projectRoot,
          commitCfg?.baseline,
          commitCfg?.maxCommits ?? 10
        ),
        'Use conventional commit format: type(scope): description',
        'Keep commit messages under 72 characters',
        'Use types: feat, fix, docs, style, refactor, test, chore',
        'Write descriptive commit messages',
      ],
      context
    );
  }
}

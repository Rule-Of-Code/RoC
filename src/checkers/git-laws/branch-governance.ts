/**
 * Branch Governance Law
 * Enforces proper Git branch naming and workflow
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CodeNamingAnalyzer } from '../../utils';
import {
  branchConventionSuggestion,
  followsBranchConvention,
} from '../../utils/git/branch-naming';
import { GitLawBase } from './git-law-base';

export class BranchGovernanceLaw extends GitLawBase {
  private static readonly LAW_NAME = 'Branch Governance';
  private static readonly LAW_TYPE = 'GIT_LAW';

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

    const currentBranch = this.getCurrentBranch(projectRoot);
    if (!currentBranch) {
      // A detached HEAD names no branch — and that is a legitimate state, not a
      // governance failure: CI checkouts, `git bisect`, and tag checkouts all
      // produce one. This law governs how branches are NAMED and used; with no
      // branch there is nothing to govern and nothing to violate. Reporting one
      // failed every CI run of every consumer, which teaches teams to waive the
      // law rather than fix anything. We report the situation and pass.
      // (createResult drops suggestions on a passing law, so the explanation
      // lives where a reader will actually find it: this law's detectionLimits.)
      return this.createResult([], this.LAW_NAME, this.LAW_TYPE, [], context);
    }

    // This law governs BRANCHES. It used to merge CodeNamingAnalyzer output —
    // TypeScript identifier casing under src/ — into its violations, so a
    // camelCase problem in a component failed "Branch Governance", which tells
    // the reader nothing true about their branch. Source naming has its own law
    // (Naming Convention Enforcement) built on the same analyzer, so dropping it
    // here loses no detection; it only stops misattributing the finding.
    const suggestions: string[] = [];

    // One shared rule, because this law and Feature Branch Protection judged
    // branch names independently and disagreed — including on `chore/`, which
    // the other law's own advice recommends.
    const strictProtectedBranches = ['main', 'master']; // Stricter protection for production branches
    const developmentBranches = ['develop', 'development']; // More permissive for development

    if (strictProtectedBranches.includes(currentBranch)) {
      // Check if there are uncommitted changes on strict protected branches
      if (this.hasUncommittedChanges(projectRoot)) {
        violations.push(
          `Direct work on ${currentBranch} branch detected - use feature branches`
        );
      }
    } else if (developmentBranches.includes(currentBranch)) {
      // Develop branch is allowed for direct work in active development
      // No violation for uncommitted changes
    } else if (!followsBranchConvention(currentBranch, context.config)) {
      violations.push(
        `Branch name "${currentBranch}" doesn't follow convention. ${branchConventionSuggestion(context.config)}`
      );
      suggestions.push(branchConventionSuggestion(context.config));
    }

    // Check for proper remote tracking
    try {
      const trackingResult = this.executeGitCommand(
        'git rev-parse --abbrev-ref @{upstream}',
        projectRoot
      );

      if (!trackingResult.success) {
        // A local branch without an upstream is a NORMAL transient state before
        // its first push — NOT a governance violation. Flagging it would block the
        // pre-commit hook on every freshly-created branch. Surface as guidance.
        suggestions.push(
          `Branch "${currentBranch}" has no upstream yet — push with -u when ready`
        );
      }
    } catch (_error) {
      suggestions.push('Unable to check remote tracking status');
    }

    // A long-running feature branch has too many commits UNIQUE to the branch,
    // not the repo's entire history (see checkLongRunningBranch).
    const maxCommits =
      context.config.thresholds?.git?.maxCommitsPerBranch ?? 1000; // Allow long-running branches in mature projects
    violations.push(
      ...this.checkLongRunningBranch(currentBranch, projectRoot, maxCommits)
    );

    return this.createResult(
      violations,
      this.LAW_NAME,
      this.LAW_TYPE,
      [
        ...suggestions,
        'Use proper branch naming: feature/hotfix/bugfix/release/<name>',
        'Set up remote tracking for branches',
        'Avoid direct work on main/master/develop',
        'Keep feature branches small (< 20 commits)',
      ],
      context
    );
  }

  /**
   * Commits UNIQUE to the branch versus its closest integration base — NOT the
   * repo's entire history. `git rev-list --count <branch>` counts every ancestor,
   * so in a mature repo (> maxCommits commits total) it trips every branch, even a
   * one-commit one — a downstream consumer saw 1004 for a 7-commit branch. We
   * measure the branch against develop/main/master (whichever is present, closest
   * base wins), skip the integration branches themselves (they are not feature
   * branches), and skip entirely when no base is available (e.g. a single-branch
   * CI checkout) rather than fall back to full-history depth.
   */
  private static checkLongRunningBranch(
    currentBranch: string,
    projectRoot: string,
    maxCommits: number
  ): string[] {
    const integrationBranches = ['develop', 'development', 'main', 'master'];
    if (integrationBranches.includes(currentBranch)) return [];

    try {
      const aheadOfBase: number[] = [];
      for (const base of integrationBranches) {
        const baseExists = this.executeGitCommand(
          `git rev-parse --verify --quiet ${base}`,
          projectRoot
        );
        if (!baseExists.success) continue;
        const ahead = this.executeGitCommand(
          `git rev-list --count ${base}..${currentBranch}`,
          projectRoot
        );
        if (!ahead.success) continue;
        const n = parseInt(ahead.stdout.trim(), 10);
        if (!Number.isNaN(n)) aheadOfBase.push(n);
      }

      if (aheadOfBase.length === 0) return [];
      const commitCount = Math.min(...aheadOfBase);
      return commitCount > maxCommits
        ? [
            `Feature branch has ${commitCount} commits ahead of its base (max ${maxCommits}) - consider breaking into smaller branches`,
          ]
        : [];
    } catch (_error) {
      // Non-critical check, continue
      return [];
    }
  }
}

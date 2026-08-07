/**
 * Git Law Base Class
 * Base functionality for Git-specific law implementations
 */

import { execSync } from 'child_process';
import type { LawCheckContext, LawResult } from '../../types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { LawBase } from '../law-base';

export class GitLawBase extends LawBase {
  public static isGitRepository(projectRoot: string): boolean {
    return FileUtils.exists(PathOperations.join(projectRoot, '.git'));
  }

  protected static executeGitCommand(
    command: string,
    projectRoot: string
  ): { success: boolean; stdout: string; stderr: string } {
    try {
      const result = execSync(command, {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return {
        success: true,
        stdout: result.toString(),
        stderr: '',
      };
    } catch (error: unknown) {
      const execError = error as { message?: string };
      return {
        success: false,
        stdout: '',
        stderr: execError.message ?? 'Command failed',
      };
    }
  }

  /**
   * The branch this working tree is on, or null when nothing names one.
   *
   * `git branch --show-current` prints an EMPTY string on a detached HEAD —
   * and a detached HEAD is the NORMAL state in CI: GitHub Actions, GitLab,
   * Jenkins, CircleCI and Bitbucket Pipelines all check out a commit, not a
   * branch. It is also what `git bisect` and a tag checkout produce. Treating
   * that empty string as "unknown" made every CI run report a branch-governance
   * violation about a branch that was never in question. When git has no branch
   * to give, we ask the CI system which branch it is building.
   */
  protected static getCurrentBranch(projectRoot: string): string | null {
    try {
      const result = execSync('git branch --show-current', {
        cwd: projectRoot,
        encoding: 'utf8',
      });
      const branch = result.trim();
      if (branch) return branch;
    } catch {
      // Not a branch checkout (or not a repo) — try the CI environment below.
    }
    return this.branchFromCiEnvironment();
  }

  /**
   * The branch a CI system says it is building, on a detached checkout.
   *
   * Pull-request builds are asked for the SOURCE branch first: that is the
   * branch whose name the governance rules are about. GitHub's GITHUB_REF_NAME
   * is last because on a pull_request event it holds a synthetic `7/merge` ref,
   * which names no branch and is skipped.
   */
  private static branchFromCiEnvironment(): string | null {
    const candidates = [
      process.env.GITHUB_HEAD_REF, // GitHub Actions — pull_request source
      process.env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME, // GitLab — merge request
      process.env.CI_COMMIT_BRANCH, // GitLab — push
      process.env.BITBUCKET_BRANCH, // Bitbucket Pipelines
      process.env.CIRCLE_BRANCH, // CircleCI
      process.env.BRANCH_NAME, // Jenkins multibranch
      process.env.GIT_BRANCH, // Jenkins git plugin
      process.env.GITHUB_REF_NAME, // GitHub Actions — push
    ];

    for (const candidate of candidates) {
      const name = candidate?.trim();
      if (!name) continue;
      if (/^\d+\/merge$/.test(name)) continue; // synthetic PR merge ref
      return name;
    }
    return null;
  }

  protected static hasUncommittedChanges(projectRoot: string): boolean {
    try {
      // `--untracked-files=no`: only TRACKED modifications (staged or unstaged)
      // count as "direct work on a protected branch". Untracked files — `.claude/`,
      // local scratch, build output, caches not yet in .gitignore — are NOT edits to
      // the branch's committed code and must not trip "Direct work on master". This
      // also unblocks a by-the-book tag-only push from master: the tree is clean of
      // tracked changes even when stray untracked files are present.
      const result = execSync('git status --porcelain --untracked-files=no', {
        cwd: projectRoot,
        encoding: 'utf8',
      });
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Common Git repository validation with standard error result
   */
  protected static validateGitRepository(
    context: LawCheckContext,
    lawName: string,
    category = 'Version Control'
  ): LawResult | null {
    if (!this.isGitRepository(context.projectRoot)) {
      return this.createResult(
        ['No Git repository found'],
        lawName,
        category,
        ['Initialize Git repository: git init'],
        context
      );
    }
    return null;
  }
}

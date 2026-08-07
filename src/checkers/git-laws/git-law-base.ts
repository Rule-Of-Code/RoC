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

  protected static getCurrentBranch(projectRoot: string): string | null {
    try {
      const result = execSync('git branch --show-current', {
        cwd: projectRoot,
        encoding: 'utf8',
      });
      return result.trim();
    } catch {
      return null;
    }
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

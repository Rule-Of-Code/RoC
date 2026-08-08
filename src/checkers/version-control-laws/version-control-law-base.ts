/**
 * Version Control Law Base Class
 * Base functionality for version control-related laws
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { resolveGitConfigPath } from '../../utils/git/git-layout';
import { PathOperations } from '../../utils/path-operations';
import { LawBase } from '../law-base';

export class VersionControlLawBase extends LawBase {
  // Inherits createResult() from LawBase

  /**
   * Common check for Git repository existence
   * Returns result immediately if no Git repository is found
   */
  static checkGitRepository(
    context: LawCheckContext,
    lawName: string
  ): LawResult | null {
    if (!this.hasGitRepository(context.projectRoot)) {
      const violations = ['No Git repository found'];
      const suggestions = ['Initialize Git repository: git init'];
      return this.createResult(
        violations,
        lawName,
        'VERSION_CONTROL',
        suggestions,
        context
      );
    }
    return null;
  }

  /**
   * Checks if project has Git initialized
   */
  static hasGitRepository(projectRoot: string): boolean {
    return FileUtils.exists(PathOperations.join(projectRoot, '.git'));
  }

  /**
   * Gets Git configuration
   */
  static getGitConfig(projectRoot: string): string | null {
    // The config that governs THIS working tree: in a linked worktree it lives in
    // the main repository's git dir, not under `<root>/.git` (a pointer file there).
    const gitConfigPath =
      resolveGitConfigPath(projectRoot) ??
      PathOperations.join(projectRoot, '.git/config');
    if (FileUtils.exists(gitConfigPath)) {
      try {
        return FileUtils.readFile(gitConfigPath);
      } catch (_error) {
        return null;
      }
    }
    return null;
  }

  /**
   * Checks for gitignore file
   */
  static hasGitignore(projectRoot: string): boolean {
    return FileUtils.exists(PathOperations.join(projectRoot, '.gitignore'));
  }
}

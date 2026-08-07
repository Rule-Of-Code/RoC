/**
 * Git Law Utilities
 * Consolidates duplicate import patterns and initialization logic for git-based laws
 */

import type { LawCheckContext } from '../types/law.types';
import { CheckerUtils } from './checker-utils';
import { FileSystemOperations } from './file-system-operations';
import { FileUtils } from './file-utils';
import { PathOperations } from './path-operations';

export class GitLawUtilities {
  /**
   * Standard imports used by all git laws
   * Consolidates the duplicate import sets at the top of each git law file
   */
  static readonly getStandardImports = () => ({
    FileSystemOperations,
    FileUtils,
    CheckerUtils,
    PathOperations,
  });

  /**
   * Creates a git law check context with common violation handling
   * Used by all git law implementations
   */
  static createGitLawCheckContext(context: LawCheckContext) {
    return {
      violations: [] as string[],
      suggestions: [] as string[],
      ...context,
    };
  }

  /**
   * Standard initialization for all git law checks
   * Validates git repository exists before checking
   */
  static initializeGitLawCheck(
    projectRoot: string,
    _lawName: string
  ): { valid: boolean; violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    if (!this.isGitRepository(projectRoot)) {
      violations.push('No Git repository found');
      suggestions.push('Initialize Git repository: git init');
      return { valid: false, violations, suggestions };
    }

    return { valid: true, violations, suggestions };
  }

  /**
   * Checks if a directory contains a .git folder
   */
  static isGitRepository(projectRoot: string): boolean {
    const gitPath = PathOperations.join(projectRoot, '.git');
    return FileUtils.exists(gitPath);
  }

  /**
   * Gets .gitignore content if it exists
   */
  static getGitIgnoreContent(projectRoot: string): string | null {
    try {
      const gitIgnorePath = PathOperations.join(projectRoot, '.gitignore');
      if (FileUtils.exists(gitIgnorePath)) {
        return FileUtils.readFile(gitIgnorePath, { encoding: 'utf8' });
      }
    } catch (_error) {
      // Silent fail
    }
    return null;
  }

  /**
   * Checks if .gitignore exists
   */
  static hasGitIgnore(projectRoot: string): boolean {
    const gitIgnorePath = PathOperations.join(projectRoot, '.gitignore');
    return FileUtils.exists(gitIgnorePath);
  }

  /**
   * Gets hook files from .git/hooks directory
   */
  static getGitHooks(projectRoot: string): string[] {
    try {
      const hooksPath = PathOperations.join(projectRoot, '.git', 'hooks');
      if (FileUtils.exists(hooksPath)) {
        return FileSystemOperations.readDirectory(hooksPath).map(f => f.name);
      }
    } catch (_error) {
      // Silent fail
    }
    return [];
  }

  /**
   * Checks if a specific hook is installed
   */
  static hasGitHook(projectRoot: string, hookName: string): boolean {
    const hookPath = PathOperations.join(
      projectRoot,
      '.git',
      'hooks',
      hookName
    );
    return FileUtils.exists(hookPath);
  }

  /**
   * Gets git configuration values
   */
  static getGitConfig(projectRoot: string, configKey: string): string | null {
    try {
      const configPath = PathOperations.join(projectRoot, '.git', 'config');
      if (FileUtils.exists(configPath)) {
        const content = FileUtils.readFile(configPath, { encoding: 'utf8' });
        // Simple grep for config key
        const lines = content.split('\n');
        for (const line of lines) {
          if (line.includes(configKey)) {
            return line.trim();
          }
        }
      }
    } catch (_error) {
      // Silent fail
    }
    return null;
  }

  /**
   * Checks for branch protection configuration
   */
  static hasBranchProtection(projectRoot: string): boolean {
    return (
      this.hasGitHook(projectRoot, 'pre-receive') ||
      this.hasGitHook(projectRoot, 'update') ||
      FileUtils.exists(
        PathOperations.join(projectRoot, '.github', 'branch-protection.yml')
      ) ||
      FileUtils.exists(PathOperations.join(projectRoot, '.gitlab-ci.yml'))
    );
  }

  /**
   * Checks if commit message validation is configured
   */
  static hasCommitMessageValidation(projectRoot: string): boolean {
    return (
      this.hasGitHook(projectRoot, 'commit-msg') ||
      FileUtils.exists(
        PathOperations.join(projectRoot, '.commitlintrc.json')
      ) ||
      FileUtils.exists(PathOperations.join(projectRoot, '.commitlintrc.yml')) ||
      FileUtils.exists(PathOperations.join(projectRoot, 'commitlint.config.js'))
    );
  }

  /**
   * Checks if pre-commit hooks are configured
   */
  static hasPreCommitHooks(projectRoot: string): boolean {
    return (
      this.hasGitHook(projectRoot, 'pre-commit') ||
      FileUtils.exists(
        PathOperations.join(projectRoot, '.husky', 'pre-commit')
      ) ||
      FileUtils.exists(
        PathOperations.join(projectRoot, '.pre-commit-config.yaml')
      )
    );
  }

  /**
   * Consolidates common git law result creation
   */
  static createGitLawResult(
    violations: string[],
    lawName: string,
    category: string,
    suggestions: string[],
    context: LawCheckContext
  ) {
    return {
      lawName,
      category,
      status: violations.length === 0 ? 'pass' : 'fail',
      violations,
      suggestions,
      context,
    };
  }
}

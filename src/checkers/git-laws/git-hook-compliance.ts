/**
 * Git Hook Compliance Law Implementation
 * Ensures proper git hooks are configured and functional
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { FileUtils } from '../../utils';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { FileSystemOperations } from '../../utils/file-system-operations';
import type { GitHookStatus } from '../../utils/git-hook-status';
import { resolveGitHookStatus } from '../../utils/git-hook-status';
import { PathOperations } from '../../utils/path-operations';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { GitLawBase } from './git-law-base';

export class GitHookComplianceLaw extends GitLawBase {
  static check(context: LawCheckContext): LawResult {
    // Validate Git repository using base class
    const gitValidationResult = this.validateGitRepository(
      context,
      'Git Hook Compliance',
      'Version Control'
    );
    if (gitValidationResult) {
      return gitValidationResult;
    }

    const violations: string[] = [];
    const suggestions: string[] = [];

    // `.pre-commit-config.yaml` is the Python-native husky: the framework OWNS
    // the hooks and installs them into `.git/hooks` on `pre-commit install`.
    // A Python project that configures it has satisfied the hook concern, so
    // the husky/package.json detectors below must not demand their own
    // substrate on top of it.
    const hookFrameworkSatisfied = this.hasPythonHookFramework(
      context.projectRoot
    );

    if (!hookFrameworkSatisfied) {
      // Check for essential git hooks
      const hooksAnalysis = this.checkEssentialHooks(
        context.projectRoot,
        context.config
      );
      violations.push(...hooksAnalysis.violations);
      suggestions.push(...hooksAnalysis.suggestions);

      // Check for automated hook management
      const automationAnalysis = this.checkHookAutomation(
        context.projectRoot,
        context.config
      );
      violations.push(...automationAnalysis.violations);
      suggestions.push(...automationAnalysis.suggestions);
    }

    // Check hook permissions and execution
    const executableAnalysis = this.checkHookExecutability(
      context.projectRoot,
      context.config,
      hookFrameworkSatisfied
    );
    violations.push(...executableAnalysis.violations);
    suggestions.push(...executableAnalysis.suggestions);

    return GitLawBase.createResult(
      violations,
      'Git Hook Compliance',
      'Version Control',
      suggestions,
      context
    );
  }

  private static checkEssentialHooks(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const { violations, suggestions, exists, hooksDir } =
      this.initializeHooksCheck(projectRoot, true);
    if (!exists) {
      return { violations, suggestions };
    }

    const essentialHooks = ['pre-commit', 'pre-push', 'commit-msg'];
    const { missingHooks, sampleHooks } = this.analyzeHookStatus(
      hooksDir,
      essentialHooks,
      projectRoot
    );

    this.addHookViolations(missingHooks, sampleHooks, violations, suggestions);

    return { violations, suggestions };
  }

  private static analyzeHookStatus(
    hooksDir: string,
    essentialHooks: string[],
    projectRoot: string
  ): { missingHooks: string[]; sampleHooks: string[] } {
    const missingHooks: string[] = [];
    const sampleHooks: string[] = [];

    for (const hook of essentialHooks) {
      const hookStatus = this.getHookStatus(hooksDir, hook, projectRoot);

      if (hookStatus === 'missing') {
        missingHooks.push(hook);
      } else if (hookStatus === 'sample') {
        sampleHooks.push(hook);
      }
    }

    return { missingHooks, sampleHooks };
  }

  private static getHookStatus(
    hooksDir: string,
    hook: string,
    projectRoot: string
  ): GitHookStatus {
    // Shared with Git Hooks Standards so the two laws cannot disagree about the
    // same repository again — see src/utils/git-hook-status.ts.
    return resolveGitHookStatus(projectRoot, hooksDir, hook);
  }

  private static addHookViolations(
    missingHooks: string[],
    sampleHooks: string[],
    violations: string[],
    suggestions: string[]
  ): void {
    if (missingHooks.length > 0) {
      violations.push(
        `Missing essential git hooks: ${missingHooks.join(', ')}`
      );
      suggestions.push('Create essential git hooks for quality control');
    }

    if (sampleHooks.length > 0) {
      violations.push(`Sample hooks not configured: ${sampleHooks.join(', ')}`);
      suggestions.push(
        'Configure sample hooks or create custom implementations'
      );
    }
  }

  private static checkHookAutomation(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const packageJson = ProjectTypeDetector.getPackageJson(projectRoot);
    if (packageJson) {
      const devDeps = ((packageJson as Record<string, unknown>)
        .devDependencies ?? {}) as Record<string, unknown>;
      const scripts = (packageJson as Record<string, unknown>).scripts ?? {};

      // Check for hook management tools
      const hookTools = ['husky', 'pre-commit', 'ghooks', 'yorkie'];

      const hasHookTools = hookTools.some(tool => devDeps[tool]);
      if (!hasHookTools) {
        violations.push('No git hook automation tool configured');
        suggestions.push('Install husky for automated git hook management');
      }

      // Check for lint-staged (commonly used with hooks)
      if (!devDeps['lint-staged']) {
        suggestions.push(
          'Consider lint-staged for running linters on staged files'
        );
      }

      // Check for hook-related scripts
      const hookScripts = Object.keys(scripts).filter(
        script =>
          script.includes('hook') ||
          script.includes('husky') ||
          script.includes('prepare')
      );

      if (hookScripts.length === 0 && hasHookTools) {
        suggestions.push('Add hook setup scripts to package.json');
      }
    }

    // Check for hook configuration files
    const configFiles = [
      '.huskyrc',
      '.huskyrc.json',
      '.huskyrc.js',
      'husky.config.js',
      '.lintstagedrc',
      '.lintstagedrc.json',
      'lint-staged.config.js',
    ];

    const hasHookConfig = configFiles.some(file =>
      FileUtils.exists(PathOperations.join(projectRoot, file))
    );

    if (!hasHookConfig) {
      suggestions.push(
        'Create hook configuration files for better maintainability'
      );
    }

    return { violations, suggestions };
  }

  private static checkHookExecutability(
    projectRoot: string,
    config: RuleOfCodeConfig,
    hookFrameworkSatisfied = false
  ): { violations: string[]; suggestions: string[] } {
    const { violations, suggestions, exists, hooksDir } =
      this.initializeHooksCheck(projectRoot, false);
    if (!exists) {
      return { violations, suggestions };
    }

    try {
      // Read .git/hooks directory directly (can't use CheckerUtils because .git is ignored)
      const allHookFiles = FileSystemOperations.readDirectory(hooksDir);

      const hookFiles = allHookFiles
        .filter((entry: { name: string }) => !entry.name.endsWith('.sample'))
        .filter((entry: { isFile: () => boolean }) => entry.isFile())
        .map((entry: { name: string }) => entry.name);

      const nonExecutableHooks: string[] = [];

      for (const hookFile of hookFiles) {
        const hookPath = PathOperations.join(hooksDir, hookFile);
        try {
          const stats = FileUtils.getFileStats(hookPath);
          // Check if file is executable (permission bit)
          if (stats && !(stats.mode & parseInt('111', 8))) {
            nonExecutableHooks.push(hookFile);
          }

          // Check if hook has proper shebang
          const hookContent = FileUtils.readFile(hookPath);
          if (!hookContent.startsWith('#!')) {
            suggestions.push(
              `Add shebang to ${hookFile} hook (#!/bin/sh or #!/usr/bin/env node)`
            );
          }
        } catch (_error) {
          violations.push(`Cannot access hook file: ${hookFile}`);
        }
      }

      if (nonExecutableHooks.length > 0) {
        violations.push(
          `Non-executable hooks found: ${nonExecutableHooks.join(', ')}`
        );
        suggestions.push('Make hooks executable: chmod +x .git/hooks/*');
      }

      // Check if hooks directory is empty (excluding samples)
      if (hookFiles.length === 0) {
        this.addEmptyHooksDirectoryFindings(
          allHookFiles,
          hookFrameworkSatisfied,
          violations,
          suggestions
        );
      }
    } catch (_error) {
      violations.push('Cannot read hooks directory');
      suggestions.push('Check .git/hooks directory permissions');
    }

    return { violations, suggestions };
  }

  /**
   * Helper: Findings for a `.git/hooks` directory with no active hooks.
   * A configured hook framework installs them itself, so nothing is missing.
   */
  private static addEmptyHooksDirectoryFindings(
    allHookFiles: { name: string }[],
    hookFrameworkSatisfied: boolean,
    violations: string[],
    suggestions: string[]
  ): void {
    if (hookFrameworkSatisfied) {
      return;
    }

    // Read sample files directly
    const sampleFiles = allHookFiles.filter((entry: { name: string }) =>
      entry.name.endsWith('.sample')
    );

    if (sampleFiles.length > 0) {
      suggestions.push(
        'Configure sample hooks or install hook management tools'
      );
    } else {
      violations.push('No git hooks configured');
      suggestions.push('Set up git hooks for code quality enforcement');
    }
  }

  /**
   * Helper: Are the hooks owned by a Python-native hook framework?
   * (`.pre-commit-config.yaml` / a `pre-commit` entry in the gate config)
   */
  private static hasPythonHookFramework(projectRoot: string): boolean {
    return (
      PythonSatisfaction.isPython(projectRoot) &&
      PythonSatisfaction.hasHookFramework(projectRoot)
    );
  }

  /**
   * Helper: Initialize result arrays and check hooks directory
   */
  private static initializeHooksCheck(
    projectRoot: string,
    requireDirectory = false
  ): {
    violations: string[];
    suggestions: string[];
    hooksDir: string;
    exists: boolean;
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const hooksDir = this.getHooksDirectory(projectRoot);
    const hooksDirCheck = this.checkHooksDirectoryExists(
      hooksDir,
      requireDirectory ? violations : undefined,
      requireDirectory ? suggestions : undefined
    );

    return {
      violations,
      suggestions,
      hooksDir,
      exists: hooksDirCheck.exists,
    };
  }

  /**
   * Helper: Get hooks directory path
   */
  private static getHooksDirectory(projectRoot: string): string {
    return PathOperations.join(projectRoot, '.git', 'hooks');
  }

  /**
   * Helper: Check if hooks directory exists and update violations if needed
   */
  private static checkHooksDirectoryExists(
    hooksDir: string,
    violations?: string[],
    suggestions?: string[]
  ): { exists: boolean } {
    const exists = FileUtils.exists(hooksDir);

    if (!exists && violations && suggestions) {
      violations.push('Git hooks directory not found');
      suggestions.push('Ensure .git/hooks directory exists');
    }

    return { exists };
  }
}

/**
 * Git Hooks Standards Law
 * Ensures proper Git hooks configuration
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { FileUtils } from '../../utils/file-utils';
import { resolveGitHookStatus } from '../../utils/git-hook-status';
import { resolveGitHooksDir } from '../../utils/git/git-layout';
import { PathOperations } from '../../utils/path-operations';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { VersionControlLawBase } from './version-control-law-base';
export class GitHooksStandardsLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for Git repository
    const gitCheckResult = VersionControlLawBase.checkGitRepository(
      context,
      'Git Hooks Standards'
    );
    if (gitCheckResult) return gitCheckResult;

    // `.pre-commit-config.yaml` is the Python-native husky: the framework OWNS
    // the hooks and installs them into `.git/hooks` on `pre-commit install`. A
    // Python project that configures it has satisfied the hook concern, so the
    // `.git/hooks`/husky detectors below must not demand their own substrate on
    // top of it. Same gate as the sister law (Git Hook Compliance) — and it
    // requires a Python project, so JS/TS husky detection is unchanged.
    if (!this.hasPythonHookFramework(context.projectRoot)) {
      const hooksAnalysis = this.checkHooksDirectory(context.projectRoot);
      violations.push(...hooksAnalysis.violations);
      suggestions.push(...hooksAnalysis.suggestions);

      // Check for pre-commit hook tools
      const preCommitTools = this.checkPreCommitTools(context.projectRoot);
      violations.push(...preCommitTools.violations);
      suggestions.push(...preCommitTools.suggestions);
    }

    // Check package.json scripts for Git workflow
    const scriptAnalysis = this.analyzePackageScripts(context.projectRoot);
    suggestions.push(...scriptAnalysis.suggestions);

    return VersionControlLawBase.createResult(
      violations,
      'Git Hooks Standards',
      'VERSION_CONTROL',
      suggestions,
      context
    );
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
   * Helper: The `.git/hooks` directory and the hooks it contains
   */
  private static checkHooksDirectory(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    // Where git ACTUALLY looks: core.hooksPath when the project sets one (husky
    // does), and the main repository's git dir from a linked worktree, where
    // `<root>/.git` is a pointer file and the naive join found nothing.
    const hooksDir =
      resolveGitHooksDir(projectRoot) ??
      PathOperations.join(projectRoot, '.git/hooks');
    if (!FileUtils.exists(hooksDir)) {
      return {
        violations: ['Git hooks directory missing'],
        suggestions: [`Git hooks directory should exist (${hooksDir})`],
      };
    }

    return this.analyzeGitHooks(projectRoot, hooksDir);
  }

  private static analyzeGitHooks(
    projectRoot: string,
    hooksDir: string
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const recommendedHooks = [
      { name: 'pre-commit', purpose: 'Run linting and tests before commit' },
      { name: 'commit-msg', purpose: 'Validate commit message format' },
    ];

    // One shared answer with Git Hook Compliance (src/utils/git-hook-status.ts).
    //
    // This used to ask a different question and get the opposite answer: a
    // missing hook was only a SUGGESTION, and the sample check read the hook
    // file's CONTENT for the literal string '.sample' — which a real hook never
    // contains — so a stock repo passed here while Compliance failed it. It also
    // knew nothing about committed `.husky/<hook>`, the modern layout.
    for (const hook of recommendedHooks) {
      const status = resolveGitHookStatus(projectRoot, hooksDir, hook.name);
      if (status === 'active') {
        continue;
      }
      violations.push(
        status === 'sample'
          ? `${hook.name} hook is still git's unconfigured sample`
          : `${hook.name} hook is not configured`
      );
      suggestions.push(`Configure ${hook.name} hook: ${hook.purpose}`);
    }

    return { violations, suggestions };
  }

  private static checkPreCommitTools(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for pre-commit configuration files
    const preCommitConfigs = [
      '.pre-commit-config.yaml',
      'husky.config.js',
      '.huskyrc',
    ];

    const hasPreCommitTool = preCommitConfigs.some(config =>
      FileUtils.exists(PathOperations.join(projectRoot, config))
    );

    if (!hasPreCommitTool) {
      suggestions.push(
        'Consider using pre-commit tools like Husky or pre-commit'
      );
      suggestions.push('Add automated code quality checks before commits');
    }

    // Check package.json for husky
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (FileUtils.exists(packageJsonPath)) {
      try {
        const packageJson = FileSystemOperations.readJsonFile(
          packageJsonPath,
          {}
        ) as Record<string, unknown>;

        if ((packageJson.devDependencies as Record<string, unknown>)['husky']) {
          if (
            !packageJson.husky &&
            !FileUtils.exists(PathOperations.join(projectRoot, '.husky'))
          ) {
            violations.push('Husky installed but not configured');
            suggestions.push(
              'Configure Husky hooks in package.json or .husky directory'
            );
          }
        }
      } catch (_error) {
        suggestions.push(
          'Check package.json format for pre-commit tool configuration'
        );
      }
    }

    return { violations, suggestions };
  }

  private static analyzePackageScripts(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');

    if (FileUtils.exists(packageJsonPath)) {
      try {
        const packageJson = FileSystemOperations.readJsonFile(
          packageJsonPath,
          {}
        ) as Record<string, unknown>;
        const scripts = packageJson.scripts as
          | Record<string, unknown>
          | undefined;
        if (!scripts) return { violations: [], suggestions };

        // Recommended scripts for Git workflow
        const recommendedScripts = [
          { name: 'precommit', purpose: 'Run before commits' },
          { name: 'prepush', purpose: 'Run before pushes' },
          { name: 'lint:fix', purpose: 'Auto-fix linting issues' },
        ];

        for (const script of recommendedScripts) {
          if (
            !scripts[script.name] &&
            !scripts[script.name.replace(':', '-')]
          ) {
            suggestions.push(
              `Consider adding '${script.name}' script: ${script.purpose}`
            );
          }
        }
      } catch (_error) {
        // Continue if package.json can't be parsed
      }
    }

    return { violations: [], suggestions };
  }
}

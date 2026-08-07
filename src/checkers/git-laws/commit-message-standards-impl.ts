/**
 * Commit Message Standards Law Implementation
 * Enforces conventional commit format with proper semantic meaning
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ProjectTypeDetectorValidation } from '../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { GitLawBase } from './git-law-base';
import { GitLawUtilities } from './shared-git-utilities';

export class CommitMessageStandardsLaw {
  static check(context: LawCheckContext): LawResult {
    // Early git repository validation
    const gitValidationResult = GitLawUtilities.validateGitRepository(
      context,
      'Commit Message Standards'
    );
    if (gitValidationResult) {
      return gitValidationResult;
    }

    const { violations, suggestions } =
      GitLawUtilities.initializeGitValidation();

    // Check for conventional commits configuration
    const conventionalCommitsAnalysis = this.checkConventionalCommitsConfig(
      context.projectRoot
    );
    violations.push(...conventionalCommitsAnalysis.violations);
    suggestions.push(...conventionalCommitsAnalysis.suggestions);

    // Check recent commit messages
    const commitAnalysis = this.analyzeRecentCommits(context.projectRoot);
    violations.push(...commitAnalysis.violations);
    suggestions.push(...commitAnalysis.suggestions);

    return GitLawBase.createResult(
      violations,
      'Commit Message Standards',
      'Version Control',
      suggestions,
      context
    );
  }

  private static checkConventionalCommitsConfig(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Use ProjectTypeDetectorValidation to get package.json content
    const packageJson = ProjectTypeDetectorValidation.getPackageJson(
      projectRoot
    ) as Record<string, unknown> | null;

    if (packageJson && Object.keys(packageJson).length > 0) {
      const devDeps = (packageJson.devDependencies ?? {}) as Record<
        string,
        string
      >;

      // Check for commit message tools
      const commitTools = [
        '@commitlint/cli',
        '@commitlint/config-conventional',
        'commitizen',
        'cz-conventional-changelog',
      ];

      const hasCommitTool = commitTools.some(tool => devDeps[tool]);
      if (!hasCommitTool) {
        violations.push('No conventional commit tools configured');
        suggestions.push(
          'Install @commitlint/cli and @commitlint/config-conventional'
        );
      }

      // Check for husky pre-commit hooks
      if (!devDeps.husky && !packageJson.husky) {
        suggestions.push('Configure Husky to enforce commit message standards');
      }
    }

    // Check for commitlint configuration
    const commitlintConfigs = [
      'commitlint.config.js',
      '.commitlintrc.js',
      '.commitlintrc.json',
      'package.json', // commitlint config can be in package.json
    ];

    const hasCommitlintConfig = commitlintConfigs.some(config => {
      const configPath = PathOperations.join(projectRoot, config);
      if (FileUtils.exists(configPath)) {
        if (config === 'package.json') {
          try {
            const packageData = ProjectTypeDetectorValidation.getPackageJson(
              projectRoot
            ) as Record<string, unknown>;
            return !!packageData.commitlint;
          } catch {
            return false;
          }
        }
        return true;
      }
      return false;
    });

    if (!hasCommitlintConfig) {
      violations.push('No commitlint configuration found');
      suggestions.push(
        'Create commitlint.config.js with conventional commit rules'
      );
    }

    return { violations, suggestions };
  }

  private static analyzeRecentCommits(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // This is a basic implementation - in a real scenario you'd use git CLI
    // For now, we'll check for common commit message patterns in any git logs
    try {
      // Check if there are any git commit templates or conventions documented
      const gitTemplatesPath = PathOperations.join(projectRoot, '.gitmessage');
      if (!FileUtils.exists(gitTemplatesPath)) {
        suggestions.push(
          'Create .gitmessage template for consistent commit format'
        );
      }

      // Check for CONTRIBUTING.md with commit guidelines
      const contributingPaths = [
        'CONTRIBUTING.md',
        'docs/CONTRIBUTING.md',
        '.github/CONTRIBUTING.md',
      ];

      const hasContributingGuide = contributingPaths.some(contributingPath =>
        FileUtils.exists(PathOperations.join(projectRoot, contributingPath))
      );

      if (!hasContributingGuide) {
        suggestions.push(
          'Document commit message standards in CONTRIBUTING.md'
        );
      }

      // Check for commit message patterns in documentation
      const readmePath = PathOperations.join(projectRoot, 'README.md');
      if (FileUtils.exists(readmePath)) {
        const readmeContent = FileUtils.readFile(readmePath);
        if (
          !readmeContent.toLowerCase().includes('conventional commit') &&
          !readmeContent.toLowerCase().includes('commit message')
        ) {
          suggestions.push('Document commit message standards in README.md');
        }
      }
    } catch (_error) {
      // Continue if git analysis fails
    }

    return { violations, suggestions };
  }
}

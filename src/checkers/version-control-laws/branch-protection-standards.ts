/**
 * Branch Protection Standards Law
 * CodeNamingAnalyzer: Ensures proper branch protection and naming conventions
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { VersionControlLawBase } from './version-control-law-base';
export class BranchProtectionStandardsLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for Git repository
    const gitCheckResult = VersionControlLawBase.checkGitRepository(
      context,
      'Branch Protection Standards'
    );
    if (gitCheckResult) return gitCheckResult;

    // Analyze Git configuration
    const gitConfigAnalysis = this.analyzeGitConfiguration(context.projectRoot);
    violations.push(...gitConfigAnalysis.violations);
    suggestions.push(...gitConfigAnalysis.suggestions);

    // Check for branch naming convention documentation
    const branchConventionAnalysis = this.checkBranchConventions(
      context.projectRoot
    );
    suggestions.push(...branchConventionAnalysis.suggestions);

    // Check for repository protection indicators
    const protectionAnalysis = this.analyzeRepositoryProtection(
      context.projectRoot
    );
    suggestions.push(...protectionAnalysis.suggestions);

    return VersionControlLawBase.createResult(
      violations,
      'Branch Protection Standards',
      'VERSION_CONTROL',
      suggestions,
      context
    );
  }

  private static analyzeGitConfiguration(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const gitConfig = VersionControlLawBase.getGitConfig(projectRoot);
    if (!gitConfig) {
      violations.push('Unable to read Git configuration');
      suggestions.push('Ensure Git repository is properly initialized');
      return { violations, suggestions };
    }

    // Check for remote configuration
    if (!gitConfig.includes('[remote')) {
      suggestions.push(
        'Consider configuring remote repository for collaboration'
      );
    }

    // Check for branch configuration
    if (!gitConfig.includes('[branch')) {
      suggestions.push('Configure default branch tracking and merge behavior');
    }

    return { violations, suggestions };
  }

  private static checkBranchConventions(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const suggestions: string[] = [];

    // Check for documentation about branching conventions
    const conventionFiles = [
      'CONTRIBUTING.md',
      'docs/BRANCHING.md',
      'docs/GIT_WORKFLOW.md',
      '.github/CONTRIBUTING.md',
    ];

    const hasConventionDoc = conventionFiles.some(file =>
      FileUtils.exists(PathOperations.join(projectRoot, file))
    );

    if (!hasConventionDoc) {
      suggestions.push(
        'CodeNamingAnalyzer: Document branch naming conventions (feature/, bugfix/, hotfix/)'
      );
      suggestions.push('Create CONTRIBUTING.md with Git workflow guidelines');
    }

    // Check package.json for commitizen or conventional commits
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (FileUtils.exists(packageJsonPath)) {
      try {
        const packageJson = FileSystemOperations.readJsonFile(
          packageJsonPath,
          {}
        ) as Record<string, unknown>;

        const devDeps = packageJson.devDependencies as
          | Record<string, unknown>
          | undefined;
        if (!devDeps?.['commitizen'] && !devDeps?.['@commitlint/cli']) {
          suggestions.push(
            'Consider using commitizen or commitlint for consistent commit messages'
          );
        }
      } catch (_error) {
        // Continue if package.json can't be parsed
      }
    }

    return { violations: [], suggestions };
  }

  private static analyzeRepositoryProtection(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const suggestions: string[] = [];

    // Check for GitHub/GitLab specific files that indicate repository settings
    const ciFiles = [
      '.github/workflows',
      '.gitlab-ci.yml',
      'bitbucket-pipelines.yml',
    ];

    const hasCIConfig = ciFiles.some(file =>
      FileUtils.exists(PathOperations.join(projectRoot, file))
    );

    if (hasCIConfig) {
      suggestions.push(
        'Ensure CI checks are required before merging to main branch'
      );
      suggestions.push(
        'Configure branch protection rules on your Git hosting platform'
      );
    } else {
      suggestions.push(
        'Consider setting up CI/CD pipeline for automated testing'
      );
    }

    // Check for security policy files
    const securityFiles = [
      'SECURITY.md',
      '.github/SECURITY.md',
      'docs/SECURITY.md',
    ];

    const hasSecurityPolicy = securityFiles.some(file =>
      FileUtils.exists(PathOperations.join(projectRoot, file))
    );

    if (!hasSecurityPolicy) {
      suggestions.push(
        'Create SECURITY.md to document security vulnerability reporting'
      );
    }

    return { violations: [], suggestions };
  }
}

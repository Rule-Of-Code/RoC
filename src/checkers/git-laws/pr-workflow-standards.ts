/**
 * Pull Request Workflow Standards Law Implementation
 * Enforces mandatory PR reviews and checks before merging
 */

import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ConfigFileUtils } from '../../utils/config-file-utils';
import { FileUtils } from '../../utils/file-utils';
import { CiCdDetector } from '../../utils/ci-cd-detector';
import { PathOperations } from '../../utils/path-operations';
import { hasCiConfig } from '../../utils/project-discovery';
import { GitLawBase } from './git-law-base';

export class PRWorkflowStandardsLaw extends GitLawBase {
  static check(context: LawCheckContext): LawResult {
    // Validate Git repository using base class
    const gitValidationResult = this.validateGitRepository(
      context,
      'PR Workflow Standards',
      'Version Control'
    );
    if (gitValidationResult) {
      return gitValidationResult;
    }

    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for PR workflow configuration
    const workflowAnalysis = this.checkPRWorkflowConfig(
      context.projectRoot,
      context.config
    );
    violations.push(...workflowAnalysis.violations);
    suggestions.push(...workflowAnalysis.suggestions);

    // Check for code review requirements
    const reviewAnalysis = this.checkCodeReviewRequirements(
      context.projectRoot
    );
    violations.push(...reviewAnalysis.violations);
    suggestions.push(...reviewAnalysis.suggestions);

    // Check for automated checks
    const automationAnalysis = this.checkAutomatedChecks(
      context.projectRoot,
      context.config
    );
    violations.push(...automationAnalysis.violations);
    suggestions.push(...automationAnalysis.suggestions);

    return GitLawBase.createResult(
      violations,
      'PR Workflow Standards',
      'Version Control',
      suggestions,
      context
    );
  }

  private static checkPRWorkflowConfig(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for GitHub PR templates and workflows
    const githubDir = PathOperations.join(projectRoot, '.github');
    if (FileUtils.exists(githubDir)) {
      // Check for PR templates
      const prTemplates = [
        '.github/pull_request_template.md',
        '.github/PULL_REQUEST_TEMPLATE.md',
        '.github/PULL_REQUEST_TEMPLATE',
      ];

      const hasPRTemplate = prTemplates.some(template =>
        FileUtils.exists(PathOperations.join(projectRoot, template))
      );

      if (!hasPRTemplate) {
        violations.push('No PR template configured');
        suggestions.push(
          'Create .github/pull_request_template.md for consistent PR format'
        );
      }

      // Check for CI/CD workflow configuration from ANY provider — GitHub
      // Actions, Bitbucket Pipelines, GitLab CI, … — not only GitHub.
      if (!CiCdDetector.hasAnyCiConfig(projectRoot, config)) {
        violations.push('No CI/CD workflows configured');
        suggestions.push(
          'Set up CI/CD workflows (GitHub Actions, Bitbucket Pipelines, GitLab CI, …) for automated PR checks'
        );
      }

      // Check for CODEOWNERS file
      const codeownersFiles = [
        '.github/CODEOWNERS',
        'CODEOWNERS',
        'docs/CODEOWNERS',
      ];

      const hasCodeowners = codeownersFiles.some(file =>
        FileUtils.exists(PathOperations.join(projectRoot, file))
      );

      if (!hasCodeowners) {
        suggestions.push(
          'Create CODEOWNERS file for automatic review assignments'
        );
      }
    } else {
      suggestions.push(
        'Configure .github directory with PR templates and workflows'
      );
    }

    return { violations, suggestions };
  }

  private static checkCodeReviewRequirements(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for branch protection documentation
    const protectionDocs = [
      'docs/BRANCH_PROTECTION.md',
      'docs/WORKFLOW.md',
      'CONTRIBUTING.md',
    ];

    const hasBranchProtectionDocs = protectionDocs.some(doc =>
      FileUtils.exists(PathOperations.join(projectRoot, doc))
    );

    if (!hasBranchProtectionDocs) {
      suggestions.push('Document branch protection rules and PR requirements');
    }

    // Check for review requirements in documentation
    const readmePath = PathOperations.join(projectRoot, 'README.md');
    if (FileUtils.exists(readmePath)) {
      const readmeContent = FileUtils.readFile(readmePath);
      if (
        !readmeContent.toLowerCase().includes('pull request') &&
        !readmeContent.toLowerCase().includes('code review')
      ) {
        suggestions.push('Document PR and code review process in README.md');
      }
    }

    return { violations, suggestions };
  }

  private static checkAutomatedChecks(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const packageJson =
      ConfigFileUtils.readPackageJson<Record<string, unknown>>(projectRoot);
    const scripts = packageJson.scripts as Record<string, unknown> | undefined;
    if (!scripts) return { violations, suggestions };

    // Check for PR-related scripts
    const prScripts = ['precommit', 'prepush', 'test', 'lint', 'build'];

    const missingScripts = prScripts.filter(script => !scripts[script]);
    if (missingScripts.length) {
      violations.push(
        `Missing automated check scripts: ${missingScripts.join(', ')}`
      );
      suggestions.push(
        'Add automated scripts for PR validation (test, lint, build)'
      );
    }

    // Check for status checks tools
    const devDeps = packageJson.devDependencies as
      | Record<string, unknown>
      | undefined;
    if (!devDeps) return { violations, suggestions };
    const statusCheckTools = [
      'husky',
      'lint-staged',
      'prettier',
      'eslint',
      'jest',
    ];

    const missingTools = statusCheckTools.filter(tool => !devDeps[tool]);
    if (missingTools.length > 2) {
      suggestions.push(
        'Consider adding more automated quality tools for PR checks'
      );
    }

    // Shared discovery — see project-discovery. This was one of six private
    // copies of the provider list, each missing something different.
    const hasCIConfig = hasCiConfig(projectRoot, config);

    if (!hasCIConfig) {
      violations.push('No CI/CD configuration for automated PR checks');
      suggestions.push('Set up CI/CD pipeline for automated PR validation');
    }

    return { violations, suggestions };
  }
}

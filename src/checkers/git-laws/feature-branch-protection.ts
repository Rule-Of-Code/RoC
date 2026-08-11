/**
 * Feature Branch Protection Law Implementation
 * CodeNamingAnalyzer: Ensures feature branches follow naming conventions and protection rules
 */

import { execSync } from 'child_process';
import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils';
import { CheckerUtils } from '../../utils/checker-utils';
import { CodeNamingAnalyzer } from '../../utils/naming';
import { PathOperations } from '../../utils/path-operations';
import { ciConfigContent } from '../../utils/project-discovery';
import { GitLawBase } from './git-law-base';

export class FeatureBranchProtectionLaw extends GitLawBase {
  static check(context: LawCheckContext): LawResult {
    // Validate Git repository using base class
    const gitValidationResult = this.validateGitRepository(
      context,
      'Feature Branch Protection',
      'Version Control'
    );
    if (gitValidationResult) {
      return gitValidationResult;
    }

    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for branch naming conventions
    const namingAnalysis = this.checkBranchNaming(context.projectRoot);
    violations.push(...namingAnalysis.violations);
    suggestions.push(...namingAnalysis.suggestions);

    // Check for branch protection policies
    const protectionAnalysis = this.checkBranchProtectionPolicies(
      context.projectRoot,
      context.config
    );
    violations.push(...protectionAnalysis.violations);
    suggestions.push(...protectionAnalysis.suggestions);

    // Check current branch follows conventions
    const currentBranchAnalysis = this.checkCurrentBranch(
      context.projectRoot,
      context.config
    );
    violations.push(...currentBranchAnalysis.violations);
    suggestions.push(...currentBranchAnalysis.suggestions);

    return GitLawBase.createResult(
      violations,
      'Feature Branch Protection',
      'Version Control',
      suggestions,
      context
    );
  }

  private static checkBranchNaming(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for branch naming documentation
    const branchingDocs = [
      'docs/BRANCHING.md',
      'docs/WORKFLOW.md',
      'CONTRIBUTING.md',
      'docs/GIT_WORKFLOW.md',
    ];

    const hasBranchingDocs = branchingDocs.some(doc => {
      const docPath = PathOperations.join(projectRoot, doc);
      if (FileUtils.exists(docPath)) {
        const content = FileUtils.readFile(docPath);
        return (
          content.toLowerCase().includes('feature/') ||
          content.toLowerCase().includes('branch naming') ||
          content.toLowerCase().includes('branch convention')
        );
      }
      return false;
    });

    if (!hasBranchingDocs) {
      violations.push(
        'CodeNamingAnalyzer: No branch naming conventions documented'
      );
      suggestions.push(
        'CodeNamingAnalyzer: Document branch naming conventions (feature/, bugfix/, hotfix/)'
      );
    }

    // Check for git hooks that enforce naming
    const preCommitHookPath = PathOperations.join(
      projectRoot,
      '.git',
      'hooks',
      'pre-commit'
    );
    if (FileUtils.exists(preCommitHookPath)) {
      try {
        const hookContent = FileUtils.readFile(preCommitHookPath);
        if (
          !hookContent.includes('branch') &&
          !hookContent.includes('feature')
        ) {
          suggestions.push('Add branch naming validation to git hooks');
        }
      } catch (_error) {
        // Continue if hook can't be read
      }
    } else {
      suggestions.push(
        'CodeNamingAnalyzer: Create git hooks to enforce branch naming conventions'
      );
    }

    return { violations, suggestions };
  }

  private static checkBranchProtectionPolicies(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for GitHub branch protection documentation
    const protectionFiles = [
      '.github/BRANCH_PROTECTION.md',
      'docs/BRANCH_PROTECTION.md',
      'docs/PROTECTION_RULES.md',
    ];

    const hasProtectionDocs = protectionFiles.some(file => {
      const filePath = PathOperations.join(projectRoot, file);
      if (FileUtils.exists(filePath)) {
        const content = FileUtils.readFile(filePath);
        return (
          content.toLowerCase().includes('protection') ||
          content.toLowerCase().includes('required review') ||
          content.toLowerCase().includes('status check')
        );
      }
      return false;
    });

    if (!hasProtectionDocs) {
      suggestions.push(
        'Document branch protection rules and required status checks'
      );
    }

    // One CI discovery for the whole tool: this kept a three-provider list, so
    // a repository on any other provider — or with its config at a declared
    // path — was told to configure something it already had.
    const pipelineText = ciConfigContent(projectRoot, config);
    const hasBranchValidation =
      /branches:|pull_request|feature|branch/i.test(pipelineText);

    if (!hasBranchValidation) {
      suggestions.push('Configure CI/CD to run on feature branch pushes');
    }

    return { violations, suggestions };
  }

  private static checkCurrentBranch(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    try {
      const currentBranch = execSync('git branch --show-current', {
        cwd: projectRoot,
        encoding: 'utf8',
      }).trim();

      if (
        currentBranch &&
        currentBranch !== 'main' &&
        currentBranch !== 'master' &&
        currentBranch !== 'develop'
      ) {
        // Check if current branch follows naming conventions.
        // Source-identifier naming is deliberately NOT merged in here — see the
        // note in branch-governance.ts. It belongs to Naming Convention
        // Enforcement, not to a verdict about a branch.
        const validPrefixes = [
          'feature/',
          'bugfix/',
          'hotfix/',
          'release/',
          'chore/',
        ];
        const followsConvention = validPrefixes.some(prefix =>
          currentBranch.startsWith(prefix)
        );

        if (!followsConvention) {
          violations.push(
            `Branch '${currentBranch}' doesn't follow naming convention`
          );
          suggestions.push(
            'Use branch prefixes: feature/, bugfix/, hotfix/, release/, chore/'
          );
        }

        // Check for descriptive branch names (minimum length)
        const minLength = config.thresholds?.git?.minBranchNameLength ?? 10;
        if (currentBranch.length < minLength) {
          violations.push(
            `Branch name should be more descriptive (min ${minLength} chars)`
          );
          suggestions.push(
            'Use descriptive branch names: feature/add-user-authentication'
          );
        }
      }
    } catch (_error) {
      // Can't check current branch, repository might be in detached HEAD state
      suggestions.push(
        'Ensure you are working on a properly named feature branch'
      );
    }

    return { violations, suggestions };
  }
}

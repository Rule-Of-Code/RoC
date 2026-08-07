/**
 * Git History Integrity Law Implementation
 * Ensures clean git history without force pushes to protected branches
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { FileUtils } from '../../utils';
import { CheckerUtils } from '../../utils/checker-utils';
import { PathOperations } from '../../utils/path-operations';
import { GitLawBase } from './git-law-base';
import { GitLawUtilities } from './shared-git-utilities';
export class GitHistoryIntegrityLaw {
  static check(context: LawCheckContext): LawResult {
    // Early git repository validation
    const gitValidationResult = GitLawUtilities.validateGitRepository(
      context,
      'Git History Integrity'
    );
    if (gitValidationResult) {
      return gitValidationResult;
    }

    const { violations, suggestions } =
      GitLawUtilities.initializeGitValidation();

    // Check for force push protection
    const forcePushAnalysis = this.checkForcePushProtection(
      context.projectRoot,
      context.config
    );
    violations.push(...forcePushAnalysis.violations);
    suggestions.push(...forcePushAnalysis.suggestions);

    // Check for rebase policies
    const rebaseAnalysis = this.checkRebasePolicies(
      context.projectRoot,
      context.config
    );
    violations.push(...rebaseAnalysis.violations);
    suggestions.push(...rebaseAnalysis.suggestions);

    // Check for history preservation rules
    const historyAnalysis = this.checkHistoryPreservation(
      context.projectRoot,
      context.config
    );
    violations.push(...historyAnalysis.violations);
    suggestions.push(...historyAnalysis.suggestions);

    return GitLawBase.createResult(
      violations,
      'Git History Integrity',
      'Version Control',
      suggestions,
      context
    );
  }

  private static readonly CONTRIBUTING_DOC = 'CONTRIBUTING.md';

  /** Where a project may declare its force-push / history-rewrite policy. */
  private static readonly PROTECTION_POLICY_DOCS = [
    'docs/BRANCH_PROTECTION.md',
    '.github/BRANCH_PROTECTION.md',
    'docs/GIT_WORKFLOW.md',
    GitHistoryIntegrityLaw.CONTRIBUTING_DOC,
  ];

  /** True when a pre-push hook exists AND mentions guarding force-push. */
  private static hasPrePushForceGuard(projectRoot: string): boolean {
    const prePushHookPath = PathOperations.join(
      projectRoot,
      '.git',
      'hooks',
      'pre-push'
    );
    if (!FileUtils.exists(prePushHookPath)) {
      return false;
    }
    try {
      return FileUtils.readFile(prePushHookPath).includes('force');
    } catch (_error) {
      return false;
    }
  }

  /** True when the project declares a force-push / history-rewrite policy. */
  private static hasDeclaredProtectionPolicy(projectRoot: string): boolean {
    return this.PROTECTION_POLICY_DOCS.some(doc => {
      const docPath = PathOperations.join(projectRoot, doc);
      if (!FileUtils.exists(docPath)) {
        return false;
      }
      try {
        const content = FileUtils.readFile(docPath).toLowerCase();
        return (
          content.includes('force push') ||
          content.includes('force-push') ||
          content.includes('rewrite history')
        );
      } catch (_error) {
        return false;
      }
    });
  }

  /**
   * The law's verdict rests here, and only here.
   *
   * Until v7.13.0 all three analyzers pushed to `suggestions` and never to
   * `violations`, so this law returned passed:true for ANY git repository — a
   * law that reports compliance while verifying nothing, which is the exact
   * unearned confidence this project exists to destroy.
   *
   * The honest bar: a repo must show force-push protection SOMEHOW. It is
   * satisfiable two ways on purpose — server-side rulesets (Bitbucket, GitHub,
   * Azure) are not readable from a clone, so demanding a local hook would
   * false-fail every server-protected repo and be unsatisfiable without
   * ceremony. Either a real pre-push guard OR a declared policy counts.
   */
  private static checkForcePushProtection(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const hasHookGuard = this.hasPrePushForceGuard(projectRoot);
    const hasPolicy = this.hasDeclaredProtectionPolicy(projectRoot);

    if (!hasHookGuard && !hasPolicy) {
      violations.push(
        'No force-push protection found: no pre-push hook guarding force-push, and no declared policy naming "force push" or "rewrite history". Server-side branch protection cannot be read from a clone — declare the policy (CONTRIBUTING.md, docs/BRANCH_PROTECTION.md) so it is verifiable.'
      );
    }
    if (!hasHookGuard) {
      suggestions.push('Add force push protection to pre-push hook');
    }
    if (!hasPolicy) {
      suggestions.push(
        'Document force push policies in branch protection guidelines'
      );
    }

    return { violations, suggestions };
  }

  private static checkRebasePolicies(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for git config settings
    const gitConfigPath = PathOperations.join(projectRoot, '.git', 'config');
    if (FileUtils.exists(gitConfigPath)) {
      try {
        const gitConfig = FileUtils.readFile(gitConfigPath);

        // Check for rebase policies
        if (
          !gitConfig.includes('pull.rebase') &&
          !gitConfig.includes('branch.autosetupmerge')
        ) {
          suggestions.push(
            'Configure git rebase policy: git config pull.rebase true'
          );
        }
      } catch (_error) {
        // Continue if git config can't be read
      }
    }

    // Check for global gitconfig recommendations
    const contributingPath = PathOperations.join(
      projectRoot,
      this.CONTRIBUTING_DOC
    );
    if (FileUtils.exists(contributingPath)) {
      const contributing = FileUtils.readFile(contributingPath);
      if (
        !contributing.toLowerCase().includes('rebase') &&
        !contributing.toLowerCase().includes('git history')
      ) {
        suggestions.push(
          'Document rebase and git history policies in CONTRIBUTING.md'
        );
      }
    }

    return { violations, suggestions };
  }

  private static checkHistoryPreservation(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for merge vs rebase documentation
    const workflowDocs = [
      'docs/WORKFLOW.md',
      'docs/GIT_WORKFLOW.md',
      this.CONTRIBUTING_DOC,
    ];

    const hasWorkflowDocs = workflowDocs.some(doc => {
      const docPath = PathOperations.join(projectRoot, doc);
      if (FileUtils.exists(docPath)) {
        const content = FileUtils.readFile(docPath);
        return (
          content.toLowerCase().includes('merge') ||
          content.toLowerCase().includes('history') ||
          content.toLowerCase().includes('git workflow')
        );
      }
      return false;
    });

    if (!hasWorkflowDocs) {
      suggestions.push(
        'Document git workflow and history preservation policies'
      );
    }

    // Check for CI/CD history validation
    const ciFiles = [
      '.github/workflows',
      '.gitlab-ci.yml',
      'bitbucket-pipelines.yml',
    ];

    const hasCIValidation = ciFiles.some(file => {
      const filePath = PathOperations.join(projectRoot, file);
      if (FileUtils.exists(filePath)) {
        if (file.includes('workflows')) {
          // Check GitHub workflows directory
          try {
            const workflows = CheckerUtils.findFilesByExtension(
              filePath,
              ['yml', 'yaml'],
              config
            );
            return workflows.some((workflow: string) => {
              const workflowContent = FileUtils.readFile(
                PathOperations.join(filePath, workflow),
                { encoding: 'utf8' }
              );
              return (
                workflowContent.includes('git log') ||
                workflowContent.includes('history') ||
                workflowContent.includes('commit')
              );
            });
          } catch (_error) {
            return false;
          }
        } else {
          // Check other CI files
          try {
            const content = FileUtils.readFile(filePath);
            return content.includes('git log') || content.includes('history');
          } catch (_error) {
            return false;
          }
        }
      }
      return false;
    });

    if (!hasCIValidation) {
      suggestions.push('Add git history validation to CI/CD pipeline');
    }

    return { violations, suggestions };
  }
}

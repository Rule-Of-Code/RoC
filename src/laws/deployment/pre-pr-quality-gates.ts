import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ProjectTypeDetectorValidation } from '../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../utils/file-utils';
import { resolveRemoteUrls } from '../../utils/git/git-layout';
import { PathOperations } from '../../utils/path-operations';
import { ciConfigContent } from '../../utils/project-discovery';
import { DeploymentValidationUtilities } from './shared-deployment-utilities';
// Interfaces for pre-PR quality gates analysis
interface PreCommitHooksAnalysis {
  hasPreCommitHooks: boolean;
  hooks: string[];
  violations: string[];
  suggestions: string[];
}

interface PRTemplateAnalysis {
  hasPRTemplate: boolean;
  templates: string[];
  violations: string[];
  suggestions: string[];
}

/**
 * Pre-PR Quality Gates Law
 *
 * Comprehensive pre-PR validation that ensures:
 * - All PRs pass quality gates before review
 * - Pre-commit hooks validation
 * - PR templates and checklists
 * - Automated status checks
 * - Branch protection rules
 * - Required status checks
 * - Quality gate validation before merge
 *
 * Professional implementation following pre-PR quality gate best practices
 */
export class PrePrQualityGatesLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot } = context;

    // 1. Check for pre-commit hooks
    const preCommitHooks = this.analyzePreCommitHooks(projectRoot);
    if (!preCommitHooks.hasPreCommitHooks) {
      violations.push('Missing pre-commit hooks for quality validation');
      suggestions.push(
        'Install and configure pre-commit hooks with husky or similar'
      );
      score -= 25;
    }

    // 2. Check for PR templates
    const prTemplates = this.analyzePRTemplates(projectRoot);
    if (!prTemplates.hasPRTemplate) {
      violations.push('Missing pull request templates');
      suggestions.push('Create PR templates with quality checklists');
      score -= 20;
    }

    // 3. Check for branch protection rules
    const branchProtection = this.analyzeBranchProtection(projectRoot);
    if (!branchProtection.hasBranchProtection) {
      violations.push('Missing branch protection configuration');
      suggestions.push(
        'Configure branch protection rules with required status checks'
      );
      score -= 20;
    }

    // 4. Check for required status checks configuration
    const statusChecks = this.analyzeStatusChecks(projectRoot, context.config);
    if (!statusChecks.hasRequiredStatusChecks) {
      violations.push('Missing required status checks configuration');
      suggestions.push(
        'Configure required CI/CD status checks for PR validation'
      );
      score -= 15;
    }

    // 5. Check for automated PR validation
    const prValidation = this.analyzePRValidation(projectRoot);
    if (!prValidation.hasPRValidation) {
      suggestions.push('Add automated PR validation workflows');
      score -= 10;
    }

    // 6. Check for code review requirements
    const codeReview = this.analyzeCodeReviewRequirements(projectRoot);
    if (!codeReview.hasCodeReviewRequirements) {
      suggestions.push('Configure minimum code review requirements');
      score -= 10;
    }

    return {
      passed: violations.length === 0,
      message: this.generateMessage(
        violations.length,
        preCommitHooks,
        prTemplates
      ),
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score: Math.max(0, score),
      fixable: true,
      config: context.config,
    };
  }

  private static analyzePreCommitHooks(
    projectRoot: string
  ): PreCommitHooksAnalysis {
    // Check for husky configuration
    const huskyDir = PathOperations.join(projectRoot, '.husky');
    const hasHusky = FileUtils.exists(huskyDir);

    // Check for pre-commit configuration
    const preCommitConfig = PathOperations.join(
      projectRoot,
      '.pre-commit-config.yaml'
    );
    const hasPreCommitConfig = FileUtils.exists(preCommitConfig);

    // Check package.json for husky configuration
    let hasHuskyInPackageJson = false;
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (FileUtils.exists(packageJsonPath)) {
      try {
        const deps =
          ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
        hasHuskyInPackageJson = deps.husky !== undefined;
      } catch (_error) {
        // Skip if can't read dependencies
      }
    }

    const hasPreCommitHooks =
      hasHusky || hasPreCommitConfig || hasHuskyInPackageJson;

    return {
      hasPreCommitHooks,
      hooks: hasPreCommitHooks ? ['husky', 'pre-commit'] : [],
      violations: hasPreCommitHooks ? [] : ['Missing pre-commit hooks'],
      suggestions: hasPreCommitHooks ? [] : ['Setup husky or pre-commit hooks'],
    };
  }

  private static analyzePRTemplates(projectRoot: string): PRTemplateAnalysis {
    const prTemplatePaths = [
      '.github/pull_request_template.md',
      '.github/pull_request_template.yml',
      '.github/PULL_REQUEST_TEMPLATE.md',
      '.github/PULL_REQUEST_TEMPLATE/pull_request_template.md',
      'docs/pull_request_template.md',
      // Bitbucket and Azure DevOps keep the PR description template in project
      // settings, not in the repository. These are the paths a team CAN use
      // there; demanding a .github/ file from a Bitbucket repo asks for an
      // artifact that host does not read (a backend consumer).
      '.bitbucket/pull_request_template.md',
      'PULL_REQUEST_TEMPLATE.md',
      'docs/PULL_REQUEST_TEMPLATE.md',
      '.azuredevops/pull_request_template.md',
    ];

    let hasPRTemplate = false;
    let _templateQuality = 'none';

    for (const templatePath of prTemplatePaths) {
      const fullPath = PathOperations.join(projectRoot, templatePath);
      if (FileUtils.exists(fullPath)) {
        hasPRTemplate = true;
        try {
          const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });
          _templateQuality = this.assessTemplateQuality(content);
        } catch (_error) {
          _templateQuality = 'basic';
        }
        break;
      }
    }

    return {
      hasPRTemplate,
      templates: hasPRTemplate ? ['Pull request template'] : [],
      violations: hasPRTemplate ? [] : ['Missing PR template'],
      suggestions: hasPRTemplate ? [] : ['Add pull request template'],
    };
  }

  private static analyzeBranchProtection(projectRoot: string): {
    hasBranchProtection: boolean;
    branchRules: string[];
  } {
    // Check for GitHub branch protection configuration
    const githubDir = PathOperations.join(projectRoot, '.github');
    let hasBranchProtection = false;

    if (FileUtils.exists(githubDir)) {
      // Look for branch protection configuration files
      const branchProtectionFiles = [
        'branch_protection.yml',
        'branch-protection.yml',
        'settings.yml',
      ];

      for (const file of branchProtectionFiles) {
        const filePath = PathOperations.join(githubDir, file);
        if (FileUtils.exists(filePath)) {
          hasBranchProtection = true;
          break;
        }
      }
    }

    // Check for GitLab branch protection (in .gitlab-ci.yml)
    const gitlabCiPath = PathOperations.join(projectRoot, '.gitlab-ci.yml');
    if (!hasBranchProtection && FileUtils.exists(gitlabCiPath)) {
      try {
        const content = FileUtils.readFile(gitlabCiPath, { encoding: 'utf8' });
        if (/only.*master|only.*main|protected/i.test(content)) {
          hasBranchProtection = true;
        }
      } catch (_error) {
        // Skip if can't read file
      }
    }

    // On Bitbucket (and on GitHub without the settings app), branch protection
    // is configured SERVER-SIDE: there is no file in the repository to read, and
    // no file the team can add to satisfy us. Reporting "missing branch
    // protection" there is reporting the limits of our vision as a fact about
    // their repo — and the only way to silence it is to commit a decorative
    // YAML that protects nothing (a backend consumer).
    if (!hasBranchProtection && this.isServerSideProtectionHost(projectRoot)) {
      return { hasBranchProtection: true, branchRules: ['server-side'] };
    }

    return {
      hasBranchProtection,
      branchRules: hasBranchProtection ? ['main', 'master'] : [],
    };
  }

  /**
   * Does this repo live on a host where branch protection is server-side and
   * therefore invisible to a static scan?
   */
  private static isServerSideProtectionHost(projectRoot: string): boolean {
    if (FileUtils.exists(PathOperations.join(projectRoot, 'bitbucket-pipelines.yml'))) {
      return true;
    }

    // Ask git for the remotes rather than joining `.git/config` onto the root.
    // `<root>/.git` is a directory only in a primary checkout; in a linked
    // worktree it is a FILE holding a pointer, so the read failed and the host
    // went unrecognised — the same commit in the same repository passed from
    // one directory and failed from another.
    return resolveRemoteUrls(projectRoot).some(url =>
      /bitbucket\.org|dev\.azure\.com|visualstudio\.com/i.test(url)
    );
  }

  private static analyzeStatusChecks(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): {
    hasRequiredStatusChecks: boolean;
  } {
    // Shared discovery, over the COMBINED text of every CI config. The list
    // here named GitHub workflows by exact filename (`ci.yml`, `pr.yml`), so a
    // repository whose checks live in `gates.yml` had none as far as this law
    // was concerned.
    // Two ways a repository can have required checks, and only one of them is
    // visible in a build file.
    //
    // On hosts where "required for merge" is configured at the trigger or in
    // repository settings — which is most of them outside GitHub Actions —
    // there is nothing in the pipeline YAML for a keyword to match, however
    // real the gate is. Demanding the GitHub shape of it asked those projects
    // for an artefact their host does not read. The sibling check three lines
    // below already accepts a server-side host as evidence of branch
    // protection; the same reasoning applies here.
    const pipelineContent = ciConfigContent(projectRoot, config);
    const hasPipeline = pipelineContent.length > 0;

    return {
      hasRequiredStatusChecks:
        this.hasStatusCheckConfiguration(pipelineContent) ||
        (hasPipeline && this.isServerSideProtectionHost(projectRoot)),
    };
  }

  private static analyzePRValidation(projectRoot: string): {
    hasPRValidation: boolean;
  } {
    // Check for PR validation workflows
    const prValidationFiles = [
      '.github/workflows/pr-validation.yml',
      '.github/workflows/pull-request.yml',
      '.github/workflows/validate-pr.yml',
    ];

    let hasPRValidation = false;

    for (const file of prValidationFiles) {
      const filePath = PathOperations.join(projectRoot, file);
      if (FileUtils.exists(filePath)) {
        hasPRValidation = true;
        break;
      }
    }

    // Also check if main CI runs on PR
    const mainCiPath = PathOperations.join(
      projectRoot,
      '.github/workflows/ci.yml'
    );
    if (!hasPRValidation && FileUtils.exists(mainCiPath)) {
      try {
        const content = FileUtils.readFile(mainCiPath, { encoding: 'utf8' });
        if (/pull_request|pr/i.test(content)) {
          hasPRValidation = true;
        }
      } catch (_error) {
        // Skip if can't read file
      }
    }

    return { hasPRValidation };
  }

  private static analyzeCodeReviewRequirements(projectRoot: string): {
    hasCodeReviewRequirements: boolean;
  } {
    // This would typically be configured at the repository level
    // For now, check for CODEOWNERS file
    const codeOwnersPath = PathOperations.join(
      projectRoot,
      '.github/CODEOWNERS'
    );
    const hasCodeOwners = FileUtils.exists(codeOwnersPath);

    return { hasCodeReviewRequirements: hasCodeOwners };
  }

  private static assessTemplateQuality(content: string): string {
    const qualityIndicators = [
      /checklist/i,
      /checkbox/i,
      /\[.\]/, // Checkbox syntax
      /description/i,
      /testing/i,
      /changes/i,
    ];

    const matches = qualityIndicators.filter(pattern =>
      pattern.test(content)
    ).length;

    if (matches >= 4) return 'comprehensive';
    if (matches >= 2) return 'good';
    return 'basic';
  }

  private static hasStatusCheckConfiguration(content: string): boolean {
    const statusCheckPatterns = [
      /on:\s*\[?pull_request/i,
      /pull_request:/i,
      /pull-requests:/i, // Bitbucket Pipelines
      /pipelines:/i, // Bitbucket Pipelines
      /status.*check/i,
      /required.*check/i,
      /build.*check/i,
      /test.*check/i,
    ];

    return statusCheckPatterns.some(pattern => pattern.test(content));
  }

  private static generateMessage(
    violationCount: number,
    preCommitHooks: PreCommitHooksAnalysis,
    prTemplates: PRTemplateAnalysis
  ): string {
    if (violationCount === 0) {
      return '✅ Pre-PR Quality Gates: Comprehensive PR validation configured';
    }

    const missingItems = [];
    if (!preCommitHooks.hasPreCommitHooks)
      missingItems.push('Pre-commit hooks');
    if (!prTemplates.hasPRTemplate) missingItems.push('PR templates');

    return `⚠️ Pre-PR Quality Gates: Missing ${missingItems.join(', ')}`;
  }
}

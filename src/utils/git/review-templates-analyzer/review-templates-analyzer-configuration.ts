import { GITHUB_PATHS, REVIEW_TEMPLATE_SECTIONS } from '../../constants';
import { PathOperations } from '../../path-operations';

/**
 * Review Templates Analyzer Configuration
 * Centralized configuration for review templates and PR templates analysis
 */
export class ReviewTemplatesAnalyzerConfiguration {
  /**
   * Get PR template file paths to check
   */
  static getPRTemplatePaths(): string[] {
    return [
      GITHUB_PATHS.PR_TEMPLATE,
      GITHUB_PATHS.PR_TEMPLATE_UPPERCASE,
      GITHUB_PATHS.PR_TEMPLATE_DEFAULT,
      GITHUB_PATHS.PR_TEMPLATE_DEFAULT_UPPERCASE,
      GITHUB_PATHS.PR_TEMPLATE_DOCS,
      // Bitbucket and Azure DevOps keep the PR description template in project
      // settings; these are the paths a team CAN use in-repo there. Looking only
      // under .github/ asks for an artifact those hosts do not read.
      'PULL_REQUEST_TEMPLATE.md',
      'docs/PULL_REQUEST_TEMPLATE.md',
      '.bitbucket/pull_request_template.md',
      '.azuredevops/pull_request_template.md',
    ];
  }

  /**
   * Get issue template file paths to check
   */
  static getIssueTemplatePaths(): string[] {
    return [GITHUB_PATHS.ISSUE_TEMPLATE, GITHUB_PATHS.ISSUE_TEMPLATE_UPPERCASE];
  }

  /**
   * Get issue template directory path
   */
  static getIssueTemplateDirectory(): string {
    return GITHUB_PATHS.ISSUE_TEMPLATE_DIR;
  }

  /**
   * Get CODEOWNERS file path
   */
  static getCodeOwnersPath(): string {
    return GITHUB_PATHS.CODEOWNERS;
  }

  /**
   * Get automated reviewer configuration paths
   */
  static getAutomatedReviewerPaths(): {
    reviewersPath: string;
    reviewAssignmentPath: string;
  } {
    return {
      reviewersPath: GITHUB_PATHS.REVIEWERS,
      reviewAssignmentPath: GITHUB_PATHS.REVIEW_ASSIGNMENT,
    };
  }

  /**
   * Get required PR template sections
   */
  static getRequiredPRTemplateSections(): string[] {
    return [
      REVIEW_TEMPLATE_SECTIONS.DESCRIPTION,
      REVIEW_TEMPLATE_SECTIONS.CHANGES,
      REVIEW_TEMPLATE_SECTIONS.TESTING,
      REVIEW_TEMPLATE_SECTIONS.CHECKLIST,
    ];
  }

  /**
   * Get PR template analysis thresholds
   */
  static getPRTemplateThresholds(): {
    minimumSectionsRequired: number;
  } {
    return {
      minimumSectionsRequired: 2,
    };
  }

  /**
   * Get CODEOWNERS analysis thresholds
   */
  static getCodeOwnersThresholds(): {
    minimumRulesForGranularity: number;
  } {
    return {
      minimumRulesForGranularity: 3,
    };
  }

  /**
   * Get issue template analysis thresholds
   */
  static getIssueTemplateThresholds(): {
    minimumTemplatesForMultiplicity: number;
  } {
    return {
      minimumTemplatesForMultiplicity: 2,
    };
  }

  /**
   * Get violation messages
   */
  static getViolationMessages(): {
    noPRTemplate: string;
    noCODEOWNERSRules: string;
    errorReadingCODEOWNERS: string;
  } {
    return {
      noPRTemplate: 'No Pull Request template found',
      noCODEOWNERSRules: 'CODEOWNERS file exists but has no ownership rules',
      errorReadingCODEOWNERS: 'Error reading CODEOWNERS file',
    };
  }

  /**
   * Get suggestion messages
   */
  static getSuggestionMessages(): {
    createPRTemplate: string;
    includePRSections: string;
    enhancePRTemplate: string;
    createIssueTemplates: string;
    addIssueTemplateTypes: string;
    addIssueTemplatesToDirectory: string;
    considerMultipleIssueTemplates: string;
    createCODEOWNERS: string;
    defineCodeOwnership: string;
    addOwnershipPatterns: string;
    considerGranularOwnership: string;
    considerAutomatedReviewers: string;
    useGitHubReviewSettings: string;
  } {
    return {
      createPRTemplate: 'Create .github/pull_request_template.md',
      includePRSections:
        'Include sections for: description, changes, testing, checklist',
      enhancePRTemplate:
        'Enhance PR template with more sections (description, testing, checklist)',
      createIssueTemplates: 'Create issue templates for better issue reporting',
      addIssueTemplateTypes:
        'Add templates for bug reports, feature requests, and questions',
      addIssueTemplatesToDirectory:
        'Add issue templates to .github/ISSUE_TEMPLATE/',
      considerMultipleIssueTemplates:
        'Consider adding multiple issue templates (bug, feature, question)',
      createCODEOWNERS:
        'Create .github/CODEOWNERS file for automatic review assignment',
      defineCodeOwnership:
        'Define code ownership patterns for different parts of the codebase',
      addOwnershipPatterns: 'Add ownership patterns to CODEOWNERS file',
      considerGranularOwnership:
        'Consider adding more granular code ownership rules',
      considerAutomatedReviewers:
        'Consider setting up automated reviewer assignment',
      useGitHubReviewSettings:
        'Use GitHub settings or external tools for review distribution',
    };
  }

  /**
   * Build full project path helper
   */
  static buildProjectPath(projectRoot: string, relativePath: string): string {
    return PathOperations.join(projectRoot, relativePath);
  }

  /**
   * Build issue template directory path
   */
  static buildIssueTemplateDirectoryPath(projectRoot: string): string {
    return this.buildProjectPath(projectRoot, this.getIssueTemplateDirectory());
  }

  /**
   * Build CODEOWNERS path
   */
  static buildCodeOwnersPath(projectRoot: string): string {
    return this.buildProjectPath(projectRoot, this.getCodeOwnersPath());
  }

  /**
   * Get file utilities configuration
   */
  static getFileUtilsConfig(): Record<string, unknown> {
    return {};
  }

  /**
   * Get newline character for string parsing
   */
  static getNewlineChar(): string {
    return '\n';
  }

  /**
   * Get comment prefix character
   */
  static getCommentPrefix(): string {
    return '#';
  }

  /**
   * Parse content into lines
   */
  static parseContentLines(content: string): string[] {
    return content.split(this.getNewlineChar());
  }

  /**
   * Filter out comment and empty lines
   */
  static filterCommentLines(lines: string[]): string[] {
    return lines.filter(
      line =>
        line.trim().length > 0 &&
        !line.trim().startsWith(this.getCommentPrefix())
    );
  }

  /**
   * Find first existing path from a list of candidates
   */
  static findFirstExistingPath(
    projectRoot: string,
    paths: string[],
    fileUtils: { exists: (path: string) => boolean }
  ): string | null {
    for (const path of paths) {
      const fullPath = this.buildProjectPath(projectRoot, path);
      if (fileUtils.exists(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  /**
   * Check if any of the paths exist
   */
  static anyPathExists(
    paths: string[],
    fileUtils: { exists: (path: string) => boolean }
  ): boolean {
    return paths.some(path => fileUtils.exists(path));
  }
}

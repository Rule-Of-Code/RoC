import type { RuleOfCodeConfig } from '../../../config/types';
import { FileUtils } from '../../file-utils';
import { ReviewTemplatesAnalyzerConfiguration } from './review-templates-analyzer-configuration';

/**
 * Review Templates Analyzer Validation
 * Specialized validation utilities for review templates analysis
 */
export class ReviewTemplatesAnalyzerValidation {
  /**
   * Validate review templates in the project
   */
  static validateReviewTemplates(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    this.validatePRTemplates(projectRoot, violations, suggestions);
    this.validateIssueTemplates(projectRoot, suggestions, config);
    this.validateCodeOwners(projectRoot, violations, suggestions);
    this.validateAutomatedReviewers(projectRoot, suggestions);

    return { violations, suggestions };
  }

  /**
   * Validate PR templates exist and have proper content
   */
  static validatePRTemplates(
    projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const prTemplatePaths =
      ReviewTemplatesAnalyzerConfiguration.getPRTemplatePaths();
    const messages =
      ReviewTemplatesAnalyzerConfiguration.getViolationMessages();
    const suggestionMessages =
      ReviewTemplatesAnalyzerConfiguration.getSuggestionMessages();

    const foundPath =
      ReviewTemplatesAnalyzerConfiguration.findFirstExistingPath(
        projectRoot,
        prTemplatePaths,
        FileUtils
      );

    if (foundPath) {
      this.analyzePRTemplateContent(foundPath, suggestions);
    } else {
      violations.push(messages.noPRTemplate);
      suggestions.push(suggestionMessages.createPRTemplate);
      suggestions.push(suggestionMessages.includePRSections);
    }
  }

  /**
   * Analyze PR template content for completeness
   */
  static analyzePRTemplateContent(
    fullPath: string,
    suggestions: string[]
  ): void {
    try {
      const content = FileUtils.readFile(fullPath).toLowerCase();
      const requiredSections =
        ReviewTemplatesAnalyzerConfiguration.getRequiredPRTemplateSections();
      const { minimumSectionsRequired } =
        ReviewTemplatesAnalyzerConfiguration.getPRTemplateThresholds();
      const { enhancePRTemplate } =
        ReviewTemplatesAnalyzerConfiguration.getSuggestionMessages();

      let sectionsFound = 0;
      for (const section of requiredSections) {
        if (content.includes(section)) {
          sectionsFound++;
        }
      }

      if (sectionsFound < minimumSectionsRequired) {
        suggestions.push(enhancePRTemplate);
      }
    } catch (_error) {
      // Skip if can't read template
    }
  }

  /**
   * Validate issue templates exist
   */
  static validateIssueTemplates(
    projectRoot: string,
    suggestions: string[],
    config: RuleOfCodeConfig
  ): void {
    const issueTemplatePaths =
      ReviewTemplatesAnalyzerConfiguration.getIssueTemplatePaths();
    const issueTemplateDir =
      ReviewTemplatesAnalyzerConfiguration.buildIssueTemplateDirectoryPath(
        projectRoot
      );
    const allPaths = [...issueTemplatePaths, issueTemplateDir];
    const { createIssueTemplates, addIssueTemplateTypes } =
      ReviewTemplatesAnalyzerConfiguration.getSuggestionMessages();

    const foundPath =
      ReviewTemplatesAnalyzerConfiguration.findFirstExistingPath(
        projectRoot,
        allPaths,
        FileUtils
      );

    if (foundPath) {
      this.analyzeIssueTemplateDirectory(foundPath, suggestions, config);
    } else {
      suggestions.push(createIssueTemplates);
      suggestions.push(addIssueTemplateTypes);
    }
  }

  /**
   * Analyze issue template directory for multiple templates
   */
  static analyzeIssueTemplateDirectory(
    fullPath: string,
    suggestions: string[],
    config: RuleOfCodeConfig
  ): void {
    const { addIssueTemplatesToDirectory, considerMultipleIssueTemplates } =
      ReviewTemplatesAnalyzerConfiguration.getSuggestionMessages();
    const { minimumTemplatesForMultiplicity } =
      ReviewTemplatesAnalyzerConfiguration.getIssueTemplateThresholds();

    // If it's a directory, check for multiple templates
    if (FileUtils.isDirectory(fullPath)) {
      try {
        const templates = FileUtils.safeReadDirectory(fullPath, config);

        if (templates.length === 0) {
          suggestions.push(addIssueTemplatesToDirectory);
        } else if (templates.length < minimumTemplatesForMultiplicity) {
          suggestions.push(considerMultipleIssueTemplates);
        }
      } catch (_error) {
        // Skip if can't read directory
      }
    }
  }

  /**
   * Validate CODEOWNERS file exists and has content
   */
  static validateCodeOwners(
    projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const codeownersPath =
      ReviewTemplatesAnalyzerConfiguration.buildCodeOwnersPath(projectRoot);
    const { createCODEOWNERS, defineCodeOwnership } =
      ReviewTemplatesAnalyzerConfiguration.getSuggestionMessages();

    if (!FileUtils.exists(codeownersPath)) {
      suggestions.push(createCODEOWNERS);
      suggestions.push(defineCodeOwnership);
      return;
    }

    this.analyzeCodeOwnersFile(codeownersPath, violations, suggestions);
  }

  /**
   * Analyze CODEOWNERS file content
   */
  static analyzeCodeOwnersFile(
    codeownersPath: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const { noCODEOWNERSRules, errorReadingCODEOWNERS } =
      ReviewTemplatesAnalyzerConfiguration.getViolationMessages();
    const { addOwnershipPatterns, considerGranularOwnership } =
      ReviewTemplatesAnalyzerConfiguration.getSuggestionMessages();
    const { minimumRulesForGranularity } =
      ReviewTemplatesAnalyzerConfiguration.getCodeOwnersThresholds();

    try {
      const codeownersContent = FileUtils.readFile(codeownersPath);
      const lines =
        ReviewTemplatesAnalyzerConfiguration.parseContentLines(
          codeownersContent
        );
      const nonCommentLines =
        ReviewTemplatesAnalyzerConfiguration.filterCommentLines(lines);

      if (nonCommentLines.length === 0) {
        violations.push(noCODEOWNERSRules);
        suggestions.push(addOwnershipPatterns);
      } else if (nonCommentLines.length < minimumRulesForGranularity) {
        suggestions.push(considerGranularOwnership);
      }
    } catch (_error) {
      violations.push(errorReadingCODEOWNERS);
    }
  }

  /**
   * Validate automated reviewer setup
   */
  static validateAutomatedReviewers(
    projectRoot: string,
    suggestions: string[]
  ): void {
    const reviewerPaths =
      ReviewTemplatesAnalyzerConfiguration.getAutomatedReviewerPaths();
    const { considerAutomatedReviewers, useGitHubReviewSettings } =
      ReviewTemplatesAnalyzerConfiguration.getSuggestionMessages();

    const reviewersPath = ReviewTemplatesAnalyzerConfiguration.buildProjectPath(
      projectRoot,
      reviewerPaths.reviewersPath
    );
    const reviewAssignmentPath =
      ReviewTemplatesAnalyzerConfiguration.buildProjectPath(
        projectRoot,
        reviewerPaths.reviewAssignmentPath
      );

    const hasAnyReviewerConfig =
      ReviewTemplatesAnalyzerConfiguration.anyPathExists(
        [reviewersPath, reviewAssignmentPath],
        FileUtils
      );

    if (!hasAnyReviewerConfig) {
      suggestions.push(considerAutomatedReviewers);
      suggestions.push(useGitHubReviewSettings);
    }
  }
}

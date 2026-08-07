import type { RuleOfCodeConfig } from '../../../config/types';
import { FileUtils } from '../../file-utils';
import { ReviewGuidelinesAnalyzerConfiguration } from './review-guidelines-analyzer-configuration';

/**
 * Review Guidelines Analyzer Validation
 * Specialized validation utilities for code review guidelines analysis
 */
export class ReviewGuidelinesAnalyzerValidation {
  /**
   * Validate review guidelines in the project
   */
  static validateReviewGuidelines(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const hasGuidelines = ReviewGuidelinesAnalyzerValidation.validateGuidelines(
      projectRoot,
      suggestions
    );
    if (!hasGuidelines) {
      ReviewGuidelinesAnalyzerValidation.addNoGuidelinesViolations(
        violations,
        suggestions
      );
    }

    ReviewGuidelinesAnalyzerValidation.validateChecklist(
      projectRoot,
      suggestions
    );
    ReviewGuidelinesAnalyzerValidation.validateStyleGuide(
      projectRoot,
      suggestions
    );

    return { violations, suggestions };
  }

  /**
   * Validate guideline files exist and have proper content
   */
  static validateGuidelines(
    projectRoot: string,
    suggestions: string[]
  ): boolean {
    const guidelinePaths =
      ReviewGuidelinesAnalyzerConfiguration.GUIDELINE_PATHS;

    for (const guidelinePath of guidelinePaths) {
      const fullPath = ReviewGuidelinesAnalyzerConfiguration.buildProjectPath(
        projectRoot,
        guidelinePath
      );
      if (FileUtils.exists(fullPath)) {
        ReviewGuidelinesAnalyzerValidation.analyzeGuidelineContent(
          fullPath,
          guidelinePath,
          suggestions
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Analyze guideline file content for completeness
   */
  static analyzeGuidelineContent(
    fullPath: string,
    guidelinePath: string,
    suggestions: string[]
  ): void {
    try {
      const content = FileUtils.readFile(fullPath).toLowerCase();
      const requiredTopics =
        ReviewGuidelinesAnalyzerConfiguration.REQUIRED_TOPICS;
      const thresholds =
        ReviewGuidelinesAnalyzerConfiguration.CONTENT_ANALYSIS_THRESHOLDS;
      const messages =
        ReviewGuidelinesAnalyzerConfiguration.SUGGESTION_MESSAGES;

      const topicsCovered = requiredTopics.filter(topic =>
        content.includes(topic)
      ).length;

      if (topicsCovered < thresholds.minimumTopicsCovered) {
        suggestions.push(
          messages.enhanceGuidelineContent.replace('{}', guidelinePath)
        );
        suggestions.push(messages.includeReviewSections);
      }
    } catch (_error) {
      // Skip if can't read file
    }
  }

  /**
   * Add violations when no guidelines are found
   */
  static addNoGuidelinesViolations(
    violations: string[],
    suggestions: string[]
  ): void {
    const violationMessages =
      ReviewGuidelinesAnalyzerConfiguration.VIOLATION_MESSAGES;
    const suggestionMessages =
      ReviewGuidelinesAnalyzerConfiguration.SUGGESTION_MESSAGES;

    violations.push(violationMessages.noGuidelinesFound);
    suggestions.push(suggestionMessages.createGuidelines);
    suggestions.push(suggestionMessages.includeGuidelineTopics);
  }

  /**
   * Generic helper for validating and suggesting paths
   * @private
   */
  private static validatePathsAndAddSuggestions(
    projectRoot: string,
    paths: readonly string[],
    suggestions: string[],
    suggestionMsgs: readonly string[]
  ): void {
    const hasPath = ReviewGuidelinesAnalyzerValidation.pathExists(
      projectRoot,
      paths
    );
    if (!hasPath) {
      suggestionMsgs.forEach(msg => suggestions.push(msg));
    }
  }

  /**
   * Validate review checklist exists
   */
  static validateChecklist(projectRoot: string, suggestions: string[]): void {
    const checklistPaths =
      ReviewGuidelinesAnalyzerConfiguration.CHECKLIST_PATHS;
    const messages = ReviewGuidelinesAnalyzerConfiguration.SUGGESTION_MESSAGES;

    ReviewGuidelinesAnalyzerValidation.validatePathsAndAddSuggestions(
      projectRoot,
      checklistPaths,
      suggestions,
      [messages.createChecklist, messages.includeChecklistItems]
    );
  }

  /**
   * Validate style guide exists
   */
  static validateStyleGuide(projectRoot: string, suggestions: string[]): void {
    const styleGuidePaths =
      ReviewGuidelinesAnalyzerConfiguration.STYLE_GUIDE_PATHS;
    const messages = ReviewGuidelinesAnalyzerConfiguration.SUGGESTION_MESSAGES;

    ReviewGuidelinesAnalyzerValidation.validatePathsAndAddSuggestions(
      projectRoot,
      styleGuidePaths,
      suggestions,
      [messages.createStyleGuide, messages.defineStyleStandards]
    );
  }

  /**
   * Check if any of the specified paths exist
   */
  static pathExists(projectRoot: string, paths: readonly string[]): boolean {
    return paths.some(pathToCheck => {
      const fullPath = ReviewGuidelinesAnalyzerConfiguration.buildProjectPath(
        projectRoot,
        pathToCheck
      );
      return FileUtils.exists(fullPath);
    });
  }
}

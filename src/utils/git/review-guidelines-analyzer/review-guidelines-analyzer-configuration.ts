import { PathOperations } from '../../path-operations';
import { StringTemplateUtils } from '../../string-template-utils';

/**
 * Review Guidelines Analyzer Configuration
 * Centralized configuration for code review guidelines analysis patterns
 */
export class ReviewGuidelinesAnalyzerConfiguration {
  private static readonly Config = ReviewGuidelinesAnalyzerConfiguration;

  /**
   * Guideline file paths to check (RULE 1: 100% internal coverage)
   */
  static readonly GUIDELINE_PATHS = [
    'CODE_REVIEW.md',
    'CONTRIBUTING.md',
    'docs/CODE_REVIEW.md',
    'docs/CONTRIBUTING.md',
    '.github/CODE_REVIEW.md',
    '.github/CONTRIBUTING.md',
    'docs/development/code-review.md',
  ] as readonly string[];

  /**
   * Checklist file paths to check (RULE 1: 100% internal coverage)
   */
  static readonly CHECKLIST_PATHS = [
    'REVIEW_CHECKLIST.md',
    'docs/REVIEW_CHECKLIST.md',
    '.github/REVIEW_CHECKLIST.md',
  ] as readonly string[];

  /**
   * Style guide file paths to check (RULE 1: 100% internal coverage)
   */
  static readonly STYLE_GUIDE_PATHS = [
    'STYLE_GUIDE.md',
    'docs/STYLE_GUIDE.md',
    '.github/STYLE_GUIDE.md',
    'docs/coding-standards.md',
  ] as readonly string[];

  /**
   * Required guideline topics for content analysis (RULE 1: 100% internal coverage)
   */
  static readonly REQUIRED_TOPICS = [
    'review',
    'checklist',
    'approval',
    'feedback',
    'standards',
  ] as readonly string[];

  /**
   * Content analysis thresholds (RULE 1: 100% internal coverage)
   */
  static readonly CONTENT_ANALYSIS_THRESHOLDS = {
    minimumTopicsCovered: 3,
  } as const;

  /**
   * Violation messages (RULE 1: 100% internal coverage)
   */
  static readonly VIOLATION_MESSAGES = {
    noGuidelinesFound: 'No code review guidelines found',
  } as const;

  /**
   * Suggestion messages (RULE 1: 100% internal coverage)
   */
  static readonly SUGGESTION_MESSAGES = {
    createGuidelines:
      'Create CODE_REVIEW.md or add review section to CONTRIBUTING.md',
    includeGuidelineTopics:
      'Include review checklist, standards, and approval process',
    enhanceGuidelineContent:
      'Enhance {0} with more comprehensive review topics',
    includeReviewSections:
      'Include sections on: review checklist, approval process, feedback guidelines',
    createChecklist: 'Create a review checklist for consistent code reviews',
    includeChecklistItems:
      'Include items like: testing, documentation, performance, security',
    createStyleGuide: 'Create coding style guide for consistent code quality',
    defineStyleStandards:
      'Define standards for naming, formatting, and architecture',
  } as const;

  /**
   * Public message builder API
   * RULE 1: Uses centralized StringTemplateUtils instead of duplicate logic
   */
  static buildMessage(templateKey: string, ...args: string[]): string {
    const messages = this.SUGGESTION_MESSAGES as unknown as Record<
      string,
      string
    >;
    const template = messages[templateKey] ?? '';
    return StringTemplateUtils.formatTemplate(template, ...args);
  }

  /**
   * Get project file paths helper (RULE 2: Direct utility usage)
   */
  static buildProjectPath(projectRoot: string, relativePath: string): string {
    return PathOperations.join(projectRoot, relativePath);
  }
}

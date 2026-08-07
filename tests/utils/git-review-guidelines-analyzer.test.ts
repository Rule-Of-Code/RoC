/**
 * Git Review Guidelines Analyzer Tests
 * Tests for ReviewGuidelinesAnalyzer, ReviewGuidelinesAnalyzerConfiguration,
 * and ReviewGuidelinesAnalyzerValidation classes
 */
import { DEFAULT_CONFIG } from '../../src/config/types';
import { FileUtils } from '../../src/utils/file-utils';
import {
  ReviewGuidelinesAnalyzer,
  ReviewGuidelinesAnalyzerConfiguration,
  ReviewGuidelinesAnalyzerValidation,
} from '../../src/utils/git/review-guidelines-analyzer';
import { PathOperations } from '../../src/utils/path-operations';

// Workspace root which has review guidelines
const WORKSPACE_ROOT = PathOperations.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..'
);

describe('ReviewGuidelinesAnalyzer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('rga-test-');
  });

  afterEach(() => {
    if (tempDir && FileUtils.exists(tempDir)) {
      FileUtils.deleteDirectory(tempDir);
    }
  });

  // ============================================
  // ReviewGuidelinesAnalyzerConfiguration Tests
  // ============================================
  describe('ReviewGuidelinesAnalyzerConfiguration', () => {
    describe('GUIDELINE_PATHS', () => {
      it('should be a readonly array', () => {
        expect(
          Array.isArray(ReviewGuidelinesAnalyzerConfiguration.GUIDELINE_PATHS)
        ).toBe(true);
      });

      it('should contain CODE_REVIEW.md', () => {
        expect(ReviewGuidelinesAnalyzerConfiguration.GUIDELINE_PATHS).toContain(
          'CODE_REVIEW.md'
        );
      });

      it('should contain CONTRIBUTING.md', () => {
        expect(ReviewGuidelinesAnalyzerConfiguration.GUIDELINE_PATHS).toContain(
          'CONTRIBUTING.md'
        );
      });

      it('should contain docs/CODE_REVIEW.md', () => {
        expect(ReviewGuidelinesAnalyzerConfiguration.GUIDELINE_PATHS).toContain(
          'docs/CODE_REVIEW.md'
        );
      });

      it('should contain docs/CONTRIBUTING.md', () => {
        expect(ReviewGuidelinesAnalyzerConfiguration.GUIDELINE_PATHS).toContain(
          'docs/CONTRIBUTING.md'
        );
      });

      it('should contain .github/CODE_REVIEW.md', () => {
        expect(ReviewGuidelinesAnalyzerConfiguration.GUIDELINE_PATHS).toContain(
          '.github/CODE_REVIEW.md'
        );
      });

      it('should contain .github/CONTRIBUTING.md', () => {
        expect(ReviewGuidelinesAnalyzerConfiguration.GUIDELINE_PATHS).toContain(
          '.github/CONTRIBUTING.md'
        );
      });

      it('should have multiple paths', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.GUIDELINE_PATHS.length
        ).toBeGreaterThan(3);
      });
    });

    describe('CHECKLIST_PATHS', () => {
      it('should be a readonly array', () => {
        expect(
          Array.isArray(ReviewGuidelinesAnalyzerConfiguration.CHECKLIST_PATHS)
        ).toBe(true);
      });

      it('should contain REVIEW_CHECKLIST.md', () => {
        expect(ReviewGuidelinesAnalyzerConfiguration.CHECKLIST_PATHS).toContain(
          'REVIEW_CHECKLIST.md'
        );
      });

      it('should contain docs/REVIEW_CHECKLIST.md', () => {
        expect(ReviewGuidelinesAnalyzerConfiguration.CHECKLIST_PATHS).toContain(
          'docs/REVIEW_CHECKLIST.md'
        );
      });

      it('should contain .github/REVIEW_CHECKLIST.md', () => {
        expect(ReviewGuidelinesAnalyzerConfiguration.CHECKLIST_PATHS).toContain(
          '.github/REVIEW_CHECKLIST.md'
        );
      });

      it('should have at least 3 paths', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.CHECKLIST_PATHS.length
        ).toBeGreaterThanOrEqual(3);
      });
    });

    describe('STYLE_GUIDE_PATHS', () => {
      it('should be a readonly array', () => {
        expect(
          Array.isArray(ReviewGuidelinesAnalyzerConfiguration.STYLE_GUIDE_PATHS)
        ).toBe(true);
      });

      it('should contain STYLE_GUIDE.md', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.STYLE_GUIDE_PATHS
        ).toContain('STYLE_GUIDE.md');
      });

      it('should contain docs/STYLE_GUIDE.md', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.STYLE_GUIDE_PATHS
        ).toContain('docs/STYLE_GUIDE.md');
      });

      it('should contain .github/STYLE_GUIDE.md', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.STYLE_GUIDE_PATHS
        ).toContain('.github/STYLE_GUIDE.md');
      });

      it('should contain docs/coding-standards.md', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.STYLE_GUIDE_PATHS
        ).toContain('docs/coding-standards.md');
      });
    });

    describe('REQUIRED_TOPICS', () => {
      it('should be a readonly array', () => {
        expect(
          Array.isArray(ReviewGuidelinesAnalyzerConfiguration.REQUIRED_TOPICS)
        ).toBe(true);
      });

      it('should contain review topic', () => {
        expect(ReviewGuidelinesAnalyzerConfiguration.REQUIRED_TOPICS).toContain(
          'review'
        );
      });

      it('should contain checklist topic', () => {
        expect(ReviewGuidelinesAnalyzerConfiguration.REQUIRED_TOPICS).toContain(
          'checklist'
        );
      });

      it('should contain approval topic', () => {
        expect(ReviewGuidelinesAnalyzerConfiguration.REQUIRED_TOPICS).toContain(
          'approval'
        );
      });

      it('should contain feedback topic', () => {
        expect(ReviewGuidelinesAnalyzerConfiguration.REQUIRED_TOPICS).toContain(
          'feedback'
        );
      });

      it('should contain standards topic', () => {
        expect(ReviewGuidelinesAnalyzerConfiguration.REQUIRED_TOPICS).toContain(
          'standards'
        );
      });

      it('should have exactly 5 topics', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.REQUIRED_TOPICS.length
        ).toBe(5);
      });
    });

    describe('CONTENT_ANALYSIS_THRESHOLDS', () => {
      it('should be a readonly object', () => {
        expect(
          typeof ReviewGuidelinesAnalyzerConfiguration.CONTENT_ANALYSIS_THRESHOLDS
        ).toBe('object');
      });

      it('should have minimumTopicsCovered property', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.CONTENT_ANALYSIS_THRESHOLDS
            .minimumTopicsCovered
        ).toBeDefined();
      });

      it('should have minimumTopicsCovered as 3', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.CONTENT_ANALYSIS_THRESHOLDS
            .minimumTopicsCovered
        ).toBe(3);
      });
    });

    describe('VIOLATION_MESSAGES', () => {
      it('should be a readonly object', () => {
        expect(
          typeof ReviewGuidelinesAnalyzerConfiguration.VIOLATION_MESSAGES
        ).toBe('object');
      });

      it('should have noGuidelinesFound message', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.VIOLATION_MESSAGES
            .noGuidelinesFound
        ).toBeDefined();
        expect(
          ReviewGuidelinesAnalyzerConfiguration.VIOLATION_MESSAGES
            .noGuidelinesFound
        ).toBe('No code review guidelines found');
      });
    });

    describe('SUGGESTION_MESSAGES', () => {
      it('should be a readonly object', () => {
        expect(
          typeof ReviewGuidelinesAnalyzerConfiguration.SUGGESTION_MESSAGES
        ).toBe('object');
      });

      it('should have createGuidelines message', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.SUGGESTION_MESSAGES
            .createGuidelines
        ).toBeDefined();
        expect(
          ReviewGuidelinesAnalyzerConfiguration.SUGGESTION_MESSAGES
            .createGuidelines.length
        ).toBeGreaterThan(0);
      });

      it('should have includeGuidelineTopics message', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.SUGGESTION_MESSAGES
            .includeGuidelineTopics
        ).toBeDefined();
      });

      it('should have enhanceGuidelineContent message', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.SUGGESTION_MESSAGES
            .enhanceGuidelineContent
        ).toBeDefined();
      });

      it('should have includeReviewSections message', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.SUGGESTION_MESSAGES
            .includeReviewSections
        ).toBeDefined();
      });

      it('should have createChecklist message', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.SUGGESTION_MESSAGES
            .createChecklist
        ).toBeDefined();
      });

      it('should have includeChecklistItems message', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.SUGGESTION_MESSAGES
            .includeChecklistItems
        ).toBeDefined();
      });

      it('should have createStyleGuide message', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.SUGGESTION_MESSAGES
            .createStyleGuide
        ).toBeDefined();
      });

      it('should have defineStyleStandards message', () => {
        expect(
          ReviewGuidelinesAnalyzerConfiguration.SUGGESTION_MESSAGES
            .defineStyleStandards
        ).toBeDefined();
      });
    });

    describe('buildMessage()', () => {
      it('should return formatted message with arguments', () => {
        const result = ReviewGuidelinesAnalyzerConfiguration.buildMessage(
          'enhanceGuidelineContent',
          'CODE_REVIEW.md'
        );

        expect(typeof result).toBe('string');
      });

      it('should return empty string for non-existent key', () => {
        const result = ReviewGuidelinesAnalyzerConfiguration.buildMessage(
          'nonExistentKey',
          'arg1'
        );

        expect(result).toBe('');
      });

      it('should handle template with no arguments', () => {
        const result =
          ReviewGuidelinesAnalyzerConfiguration.buildMessage(
            'createGuidelines'
          );

        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('buildProjectPath()', () => {
      it('should join project root with relative path', () => {
        const result = ReviewGuidelinesAnalyzerConfiguration.buildProjectPath(
          '/project',
          'CODE_REVIEW.md'
        );

        expect(result).toContain('/project');
        expect(result).toContain('CODE_REVIEW.md');
      });

      it('should handle nested paths', () => {
        const result = ReviewGuidelinesAnalyzerConfiguration.buildProjectPath(
          '/project',
          'docs/CODE_REVIEW.md'
        );

        expect(result).toContain('/project');
        expect(result).toContain('docs');
        expect(result).toContain('CODE_REVIEW.md');
      });

      it('should use PathOperations.join internally', () => {
        const projectRoot = '/test-project';
        const relativePath = 'CONTRIBUTING.md';

        const result = ReviewGuidelinesAnalyzerConfiguration.buildProjectPath(
          projectRoot,
          relativePath
        );
        const expected = PathOperations.join(projectRoot, relativePath);

        expect(result).toBe(expected);
      });
    });
  });

  // ============================================
  // ReviewGuidelinesAnalyzerValidation Tests
  // ============================================
  describe('ReviewGuidelinesAnalyzerValidation', () => {
    describe('validateGuidelines()', () => {
      it('should return false when no guideline files exist', () => {
        const suggestions: string[] = [];

        const result = ReviewGuidelinesAnalyzerValidation.validateGuidelines(
          tempDir,
          suggestions
        );

        expect(result).toBe(false);
      });

      it('should return true when CONTRIBUTING.md exists', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'CONTRIBUTING.md'),
          '# Contributing\n\nReview guidelines here.'
        );
        const suggestions: string[] = [];

        const result = ReviewGuidelinesAnalyzerValidation.validateGuidelines(
          tempDir,
          suggestions
        );

        expect(result).toBe(true);
      });

      it('should return true when CODE_REVIEW.md exists', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'CODE_REVIEW.md'),
          '# Code Review\n\nGuidelines here.'
        );
        const suggestions: string[] = [];

        const result = ReviewGuidelinesAnalyzerValidation.validateGuidelines(
          tempDir,
          suggestions
        );

        expect(result).toBe(true);
      });

      it('should return true when docs/CONTRIBUTING.md exists', () => {
        FileUtils.createDirectory(PathOperations.join(tempDir, 'docs'));
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'docs', 'CONTRIBUTING.md'),
          '# Contributing\n\nGuidelines.'
        );
        const suggestions: string[] = [];

        const result = ReviewGuidelinesAnalyzerValidation.validateGuidelines(
          tempDir,
          suggestions
        );

        expect(result).toBe(true);
      });

      it('should return true when .github/CONTRIBUTING.md exists', () => {
        FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.github', 'CONTRIBUTING.md'),
          '# Contributing\n\nGuidelines.'
        );
        const suggestions: string[] = [];

        const result = ReviewGuidelinesAnalyzerValidation.validateGuidelines(
          tempDir,
          suggestions
        );

        expect(result).toBe(true);
      });
    });

    describe('analyzeGuidelineContent()', () => {
      it('should add suggestions when content lacks required topics', () => {
        const guidelinePath = PathOperations.join(tempDir, 'CONTRIBUTING.md');
        FileUtils.writeFile(
          guidelinePath,
          '# Contributing\n\nBasic content without proper topics.'
        );
        const suggestions: string[] = [];

        ReviewGuidelinesAnalyzerValidation.analyzeGuidelineContent(
          guidelinePath,
          'CONTRIBUTING.md',
          suggestions
        );

        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should not add suggestions when content has enough topics', () => {
        const guidelinePath = PathOperations.join(tempDir, 'CONTRIBUTING.md');
        FileUtils.writeFile(
          guidelinePath,
          '# Contributing\n\n## Review Process\n\n## Checklist\n\n## Approval\n\n## Feedback Guidelines\n\n## Standards'
        );
        const suggestions: string[] = [];

        ReviewGuidelinesAnalyzerValidation.analyzeGuidelineContent(
          guidelinePath,
          'CONTRIBUTING.md',
          suggestions
        );

        expect(suggestions.length).toBe(0);
      });

      it('should handle file read errors gracefully', () => {
        const suggestions: string[] = [];

        // Should not throw when file doesn't exist
        expect(() => {
          ReviewGuidelinesAnalyzerValidation.analyzeGuidelineContent(
            '/non/existent/path',
            'CONTRIBUTING.md',
            suggestions
          );
        }).not.toThrow();
      });
    });

    describe('addNoGuidelinesViolations()', () => {
      it('should add violation when no guidelines found', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];

        ReviewGuidelinesAnalyzerValidation.addNoGuidelinesViolations(
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThan(0);
        expect(violations).toContain('No code review guidelines found');
      });

      it('should add suggestions when no guidelines found', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];

        ReviewGuidelinesAnalyzerValidation.addNoGuidelinesViolations(
          violations,
          suggestions
        );

        expect(suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('validateChecklist()', () => {
      it('should add suggestions when no checklist exists', () => {
        const suggestions: string[] = [];

        ReviewGuidelinesAnalyzerValidation.validateChecklist(
          tempDir,
          suggestions
        );

        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should not add suggestions when REVIEW_CHECKLIST.md exists', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'REVIEW_CHECKLIST.md'),
          '# Review Checklist\n\n- [ ] Code review completed'
        );
        const suggestions: string[] = [];

        ReviewGuidelinesAnalyzerValidation.validateChecklist(
          tempDir,
          suggestions
        );

        expect(suggestions.length).toBe(0);
      });

      it('should not add suggestions when docs/REVIEW_CHECKLIST.md exists', () => {
        FileUtils.createDirectory(PathOperations.join(tempDir, 'docs'));
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'docs', 'REVIEW_CHECKLIST.md'),
          '# Review Checklist'
        );
        const suggestions: string[] = [];

        ReviewGuidelinesAnalyzerValidation.validateChecklist(
          tempDir,
          suggestions
        );

        expect(suggestions.length).toBe(0);
      });

      it('should not add suggestions when .github/REVIEW_CHECKLIST.md exists', () => {
        FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.github', 'REVIEW_CHECKLIST.md'),
          '# Review Checklist'
        );
        const suggestions: string[] = [];

        ReviewGuidelinesAnalyzerValidation.validateChecklist(
          tempDir,
          suggestions
        );

        expect(suggestions.length).toBe(0);
      });
    });

    describe('validateStyleGuide()', () => {
      it('should add suggestions when no style guide exists', () => {
        const suggestions: string[] = [];

        ReviewGuidelinesAnalyzerValidation.validateStyleGuide(
          tempDir,
          suggestions
        );

        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should not add suggestions when STYLE_GUIDE.md exists', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'STYLE_GUIDE.md'),
          '# Style Guide\n\nCoding standards here.'
        );
        const suggestions: string[] = [];

        ReviewGuidelinesAnalyzerValidation.validateStyleGuide(
          tempDir,
          suggestions
        );

        expect(suggestions.length).toBe(0);
      });

      it('should not add suggestions when docs/STYLE_GUIDE.md exists', () => {
        FileUtils.createDirectory(PathOperations.join(tempDir, 'docs'));
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'docs', 'STYLE_GUIDE.md'),
          '# Style Guide'
        );
        const suggestions: string[] = [];

        ReviewGuidelinesAnalyzerValidation.validateStyleGuide(
          tempDir,
          suggestions
        );

        expect(suggestions.length).toBe(0);
      });

      it('should not add suggestions when docs/coding-standards.md exists', () => {
        FileUtils.createDirectory(PathOperations.join(tempDir, 'docs'));
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'docs', 'coding-standards.md'),
          '# Coding Standards'
        );
        const suggestions: string[] = [];

        ReviewGuidelinesAnalyzerValidation.validateStyleGuide(
          tempDir,
          suggestions
        );

        expect(suggestions.length).toBe(0);
      });
    });

    describe('pathExists()', () => {
      it('should return false when no paths exist', () => {
        const paths = ['file1.md', 'file2.md'];

        const result = ReviewGuidelinesAnalyzerValidation.pathExists(
          tempDir,
          paths
        );

        expect(result).toBe(false);
      });

      it('should return true when at least one path exists', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'file1.md'),
          'content'
        );
        const paths = ['file1.md', 'file2.md'];

        const result = ReviewGuidelinesAnalyzerValidation.pathExists(
          tempDir,
          paths
        );

        expect(result).toBe(true);
      });

      it('should check all paths in order', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'file2.md'),
          'content'
        );
        const paths = ['file1.md', 'file2.md'];

        const result = ReviewGuidelinesAnalyzerValidation.pathExists(
          tempDir,
          paths
        );

        expect(result).toBe(true);
      });
    });

    describe('validateReviewGuidelines()', () => {
      it('should return violations and suggestions arrays', () => {
        const config = DEFAULT_CONFIG;

        const result =
          ReviewGuidelinesAnalyzerValidation.validateReviewGuidelines(
            tempDir,
            config
          );

        expect(result).toBeDefined();
        expect(Array.isArray(result.violations)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      it('should add violations for empty project', () => {
        const config = DEFAULT_CONFIG;

        const result =
          ReviewGuidelinesAnalyzerValidation.validateReviewGuidelines(
            tempDir,
            config
          );

        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.suggestions.length).toBeGreaterThan(0);
      });

      it('should not add violations when guidelines exist', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'CONTRIBUTING.md'),
          '# Contributing\n\nReview guidelines with review, checklist, approval, feedback, and standards.'
        );
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'REVIEW_CHECKLIST.md'),
          '# Checklist'
        );
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'STYLE_GUIDE.md'),
          '# Style Guide'
        );
        const config = DEFAULT_CONFIG;

        const result =
          ReviewGuidelinesAnalyzerValidation.validateReviewGuidelines(
            tempDir,
            config
          );

        expect(result.violations.length).toBe(0);
      });

      it('should work with real workspace', () => {
        const config = DEFAULT_CONFIG;

        const result =
          ReviewGuidelinesAnalyzerValidation.validateReviewGuidelines(
            WORKSPACE_ROOT,
            config
          );

        expect(result).toBeDefined();
        expect(Array.isArray(result.violations)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);
      });
    });
  });

  // ============================================
  // ReviewGuidelinesAnalyzer Tests
  // ============================================
  describe('ReviewGuidelinesAnalyzer', () => {
    describe('checkReviewGuidelines()', () => {
      it('should return violations and suggestions', () => {
        const config = DEFAULT_CONFIG;

        const result = ReviewGuidelinesAnalyzer.checkReviewGuidelines(
          tempDir,
          config
        );

        expect(result).toBeDefined();
        expect(Array.isArray(result.violations)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      it('should detect missing guidelines in empty project', () => {
        const config = DEFAULT_CONFIG;

        const result = ReviewGuidelinesAnalyzer.checkReviewGuidelines(
          tempDir,
          config
        );

        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should work with real workspace', () => {
        const config = DEFAULT_CONFIG;

        const result = ReviewGuidelinesAnalyzer.checkReviewGuidelines(
          WORKSPACE_ROOT,
          config
        );

        expect(result).toBeDefined();
      });

      it('should delegate to validation class', () => {
        const config = DEFAULT_CONFIG;

        const analyzerResult = ReviewGuidelinesAnalyzer.checkReviewGuidelines(
          tempDir,
          config
        );
        const validationResult =
          ReviewGuidelinesAnalyzerValidation.validateReviewGuidelines(
            tempDir,
            config
          );

        expect(analyzerResult.violations).toEqual(validationResult.violations);
        expect(analyzerResult.suggestions).toEqual(
          validationResult.suggestions
        );
      });

      it('should pass all checks with complete documentation', () => {
        // Create comprehensive documentation
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'CONTRIBUTING.md'),
          `# Contributing Guide

## Code Review Process
Our review process ensures quality.

## Review Checklist
- Check code quality
- Verify tests pass

## Approval Process
Require 2 approvals.

## Feedback Guidelines
Provide constructive feedback.

## Coding Standards
Follow our standards.`
        );
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'REVIEW_CHECKLIST.md'),
          '# Review Checklist\n\n- [ ] Tests pass'
        );
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'STYLE_GUIDE.md'),
          '# Style Guide\n\nNaming conventions and formatting.'
        );

        const config = DEFAULT_CONFIG;

        const result = ReviewGuidelinesAnalyzer.checkReviewGuidelines(
          tempDir,
          config
        );

        expect(result.violations.length).toBe(0);
      });
    });
  });
});

/**
 * Git Constants Tests
 * Tests for the git-constants utility module
 */
import {
  CONSTITUTIONAL_PATHS,
  GITHUB_PATHS,
  PERFORMANCE_CONSTANTS,
  REVIEW_TEMPLATE_SECTIONS,
} from '../../src/utils/git-constants';

describe('git-constants', () => {
  describe('GITHUB_PATHS', () => {
    describe('Pull Request Templates', () => {
      it('should have PR template paths', () => {
        expect(GITHUB_PATHS.PR_TEMPLATE).toBe(
          '.github/pull_request_template.md'
        );
        expect(GITHUB_PATHS.PR_TEMPLATE_UPPERCASE).toBe(
          '.github/PULL_REQUEST_TEMPLATE.md'
        );
      });

      it('should have default PR template paths', () => {
        expect(GITHUB_PATHS.PR_TEMPLATE_DEFAULT).toBe(
          '.github/pull_request_template/default.md'
        );
        expect(GITHUB_PATHS.PR_TEMPLATE_DEFAULT_UPPERCASE).toBe(
          '.github/PULL_REQUEST_TEMPLATE/default.md'
        );
      });

      it('should have docs PR template path', () => {
        expect(GITHUB_PATHS.PR_TEMPLATE_DOCS).toBe(
          'docs/pull_request_template.md'
        );
      });
    });

    describe('Issue Templates', () => {
      it('should have issue template paths', () => {
        expect(GITHUB_PATHS.ISSUE_TEMPLATE).toBe('.github/issue_template.md');
        expect(GITHUB_PATHS.ISSUE_TEMPLATE_UPPERCASE).toBe(
          '.github/ISSUE_TEMPLATE.md'
        );
      });

      it('should have issue template directory', () => {
        expect(GITHUB_PATHS.ISSUE_TEMPLATE_DIR).toBe('.github/ISSUE_TEMPLATE');
      });
    });

    describe('Code Ownership', () => {
      it('should have CODEOWNERS path', () => {
        expect(GITHUB_PATHS.CODEOWNERS).toBe('.github/CODEOWNERS');
      });
    });

    describe('Automated Reviewers', () => {
      it('should have reviewers configuration paths', () => {
        expect(GITHUB_PATHS.REVIEWERS).toBe('.github/reviewers.yml');
        expect(GITHUB_PATHS.REVIEW_ASSIGNMENT).toBe(
          '.github/review-assignment.yml'
        );
      });
    });

    describe('GitHub Directory', () => {
      it('should have GitHub directory path', () => {
        expect(GITHUB_PATHS.GITHUB_DIR).toBe('.github');
      });
    });

    it('should be a readonly object', () => {
      expect(Object.keys(GITHUB_PATHS).length).toBeGreaterThan(5);
    });
  });

  describe('REVIEW_TEMPLATE_SECTIONS', () => {
    it('should have description section', () => {
      expect(REVIEW_TEMPLATE_SECTIONS.DESCRIPTION).toBe('description');
    });

    it('should have changes section', () => {
      expect(REVIEW_TEMPLATE_SECTIONS.CHANGES).toBe('changes');
    });

    it('should have testing section', () => {
      expect(REVIEW_TEMPLATE_SECTIONS.TESTING).toBe('testing');
    });

    it('should have checklist section', () => {
      expect(REVIEW_TEMPLATE_SECTIONS.CHECKLIST).toBe('checklist');
    });

    it('should have all 4 sections', () => {
      expect(Object.keys(REVIEW_TEMPLATE_SECTIONS).length).toBe(4);
    });
  });

  describe('CONSTITUTIONAL_PATHS', () => {
    it('should have ruleofcode package path', () => {
      expect(CONSTITUTIONAL_PATHS.RULEOFCODE_PACKAGE).toBe(
        'packages/ruleofcode'
      );
    });

    it('should have constitutional compliance pattern', () => {
      expect(CONSTITUTIONAL_PATHS.CONSTITUTIONAL_COMPLIANCE_PATTERN).toContain(
        'constitutional-compliance'
      );
    });

    it('should have constitutional directory', () => {
      expect(CONSTITUTIONAL_PATHS.CONSTITUTIONAL_DIR).toBe(
        'constitutional-compliance'
      );
    });

    it('should have tools directory', () => {
      expect(CONSTITUTIONAL_PATHS.TOOLS_DIR).toBe('tools');
    });
  });

  describe('PERFORMANCE_CONSTANTS', () => {
    it('should have max selector length', () => {
      expect(PERFORMANCE_CONSTANTS.MAX_SELECTOR_LENGTH).toBe(200);
    });

    it('should have max selectors before composition', () => {
      expect(PERFORMANCE_CONSTANTS.MAX_SELECTORS_BEFORE_COMPOSITION).toBe(3);
    });

    it('should have max subscriptions before async', () => {
      expect(PERFORMANCE_CONSTANTS.MAX_SUBSCRIPTIONS_BEFORE_ASYNC).toBe(3);
    });

    it('should have max cognitive complexity', () => {
      expect(PERFORMANCE_CONSTANTS.MAX_COGNITIVE_COMPLEXITY).toBe(15);
    });

    it('should have reasonable threshold values', () => {
      expect(PERFORMANCE_CONSTANTS.MAX_SELECTOR_LENGTH).toBeGreaterThan(0);
      expect(
        PERFORMANCE_CONSTANTS.MAX_SELECTORS_BEFORE_COMPOSITION
      ).toBeGreaterThan(0);
      expect(
        PERFORMANCE_CONSTANTS.MAX_SUBSCRIPTIONS_BEFORE_ASYNC
      ).toBeGreaterThan(0);
      expect(PERFORMANCE_CONSTANTS.MAX_COGNITIVE_COMPLEXITY).toBeGreaterThan(0);
    });
  });
});

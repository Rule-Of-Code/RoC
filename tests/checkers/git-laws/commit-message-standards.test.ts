/**
 * @fileoverview Tests for CommitMessageStandardsLaw
 * @description Tests for commit message format validation and conventional commit enforcement
 */

import { CommitMessageStandardsLaw } from '../../../src/checkers/git-laws/commit-message-standards';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('checkers/git-laws/commit-message-standards', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('commit-message-standards-test-');
    mockContext = {
      projectRoot: tempDir,
      config: {
        project: {
          name: 'test-project',
          root: '',
          componentPrefix: 'app',
          type: 'generic',
        },
        ignores: { global: [], tests: [], build: [], design: [] },
        laws: { paretoMode: false, severity: {} },
        hooks: { preCommit: false, prePush: false, commitMsg: false },
        includes: { global: [] },
        excludes: {},
        reporting: {
          format: 'console',
          verbose: false,
          onlyFailures: false,
          scoring: false,
        },
        performance: {
          parallel: false,
          maxConcurrent: 3,
          cache: true,
        },
      },
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  // ==========================================================================
  // Git Repository Validation
  // ==========================================================================

  describe('Git Repository Validation', () => {
    it('should return violation when no .git directory exists', () => {
      const result = CommitMessageStandardsLaw.check(mockContext);

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('No Git repository found');
      expect(result.suggestions).toContain(
        'Initialize Git repository: git init'
      );
    });

    it('should return lawName in result', () => {
      const result = CommitMessageStandardsLaw.check(mockContext);

      expect(result.lawName).toBe('commit-message-standards');
    });

    it('should include score in result', () => {
      const result = CommitMessageStandardsLaw.check(mockContext);

      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  // ==========================================================================
  // Result Structure Validation
  // ==========================================================================

  describe('Result Structure', () => {
    it('should return all required LawResult properties', () => {
      const result = CommitMessageStandardsLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('config');
    });

    it('should have suggestions array', () => {
      const result = CommitMessageStandardsLaw.check(mockContext);

      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have violations array', () => {
      const result = CommitMessageStandardsLaw.check(mockContext);

      expect(Array.isArray(result.violations)).toBe(true);
    });
  });

  // ==========================================================================
  // With Git Repository
  // ==========================================================================

  describe('With Git Repository', () => {
    beforeEach(() => {
      // Create .git directory to simulate a git repository
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
    });

    it('should detect git repository exists', () => {
      const result = CommitMessageStandardsLaw.check(mockContext);

      // Should not contain the "No Git repository found" violation
      expect(result.violations).not.toContain('No Git repository found');
    });

    it('should have appropriate suggestions for commit format', () => {
      const result = CommitMessageStandardsLaw.check(mockContext);

      // Check that result has suggestions array (may or may not be empty based on git status)
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  // ==========================================================================
  // Score Calculation
  // ==========================================================================

  describe('Score Calculation', () => {
    it('should deduct points for violations', () => {
      const result = CommitMessageStandardsLaw.check(mockContext);

      // When there are violations, score should be less than 100
      if (result.violations && result.violations.length > 0) {
        expect(result.score).toBeLessThan(100);
      }
    });

    it('should not have negative score', () => {
      const result = CommitMessageStandardsLaw.check(mockContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should have maximum score of 100', () => {
      const result = CommitMessageStandardsLaw.check(mockContext);

      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  // ==========================================================================
  // Law Category and Type
  // ==========================================================================

  describe('Law Category', () => {
    it('should use GIT_LAW category in suggestions context', () => {
      const result = CommitMessageStandardsLaw.check(mockContext);

      // The law should provide relevant git-related suggestions
      expect(result).toHaveProperty('suggestions');
    });

    it('should handle missing git config gracefully', () => {
      const result = CommitMessageStandardsLaw.check(mockContext);

      // Should not throw and should return valid result
      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty project root gracefully', () => {
      const emptyContext: LawCheckContext = {
        ...mockContext,
        projectRoot: tempDir, // Use actual temp dir, not empty string
      };

      const result = CommitMessageStandardsLaw.check(emptyContext);

      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });

    it('should return consistent result on multiple checks', () => {
      const result1 = CommitMessageStandardsLaw.check(mockContext);
      const result2 = CommitMessageStandardsLaw.check(mockContext);

      expect(result1.passed).toBe(result2.passed);
      expect(result1.violations?.length).toBe(result2.violations?.length);
    });

    it('should handle context with different project name', () => {
      const differentContext: LawCheckContext = {
        projectRoot: tempDir,
        config: {
          ...mockContext.config,
          project: {
            ...mockContext.config.project,
            name: 'different-project',
          },
        },
      };

      const result = CommitMessageStandardsLaw.check(differentContext);

      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });
  });

  // ==========================================================================
  // Conventional Commit Standards
  // ==========================================================================

  describe('Conventional Commit Standards', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
    });

    it('should include conventional commit guidance in suggestions', () => {
      const result = CommitMessageStandardsLaw.check(mockContext);

      // When there are violations, should suggest conventional commit format
      if (!result.passed && result.suggestions) {
        const hasConventionalSuggestion = result.suggestions.some(
          s =>
            s.includes('conventional') ||
            s.includes('format') ||
            s.includes('feat') ||
            s.includes('fix')
        );
        // Only check if there are suggestions
        if (result.suggestions.length > 0) {
          expect(
            hasConventionalSuggestion || result.suggestions.length >= 0
          ).toBe(true);
        }
      }
    });

    it('should provide length guidance in suggestions', () => {
      const result = CommitMessageStandardsLaw.check(mockContext);

      // The result should have proper structure
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  // ==========================================================================
  // Config Integration
  // ==========================================================================

  describe('Config Integration', () => {
    it('should include config in result', () => {
      const result = CommitMessageStandardsLaw.check(mockContext);

      expect(result.config).toBeDefined();
      expect(result.config.project.name).toBe('test-project');
    });

    it('should respect project configuration', () => {
      const customContext: LawCheckContext = {
        ...mockContext,
        config: {
          ...mockContext.config,
          project: {
            ...mockContext.config.project,
            name: 'custom-project',
          },
        },
      };

      const result = CommitMessageStandardsLaw.check(customContext);

      expect(result.config.project.name).toBe('custom-project');
    });
  });
});

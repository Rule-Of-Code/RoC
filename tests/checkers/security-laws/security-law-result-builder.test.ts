/**
 * Security Law Result Builder - Tests
 * Tests for SecurityLawResultBuilder class
 */
import { SecurityLawResultBuilder } from '../../../src/checkers/security-laws/security-law-result-builder';
import type { LawCheckContext } from '../../../src/types/law.types';

describe('SecurityLawResultBuilder', () => {
  const mockContext: LawCheckContext = {
    projectRoot: '/test/project',
    config: {
      project: {
        name: 'test',
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

  // ============================================
  // createResult
  // ============================================
  describe('createResult()', () => {
    it('should return passed=true when no violations', () => {
      const result = SecurityLawResultBuilder.createResult(
        [],
        'SecurityLaw',
        [],
        mockContext
      );
      expect(result.passed).toBe(true);
    });

    it('should return passed=false when violations exist', () => {
      const result = SecurityLawResultBuilder.createResult(
        ['Violation 1'],
        'SecurityLaw',
        ['Fix it'],
        mockContext
      );
      expect(result.passed).toBe(false);
    });

    it('should set lawName from parameter', () => {
      const result = SecurityLawResultBuilder.createResult(
        [],
        'CustomSecurityLaw',
        [],
        mockContext
      );
      expect(result.lawName).toBe('CustomSecurityLaw');
    });

    it('should set score to 100 when no violations', () => {
      const result = SecurityLawResultBuilder.createResult(
        [],
        'SecurityLaw',
        [],
        mockContext
      );
      expect(result.score).toBe(100);
    });

    it('should deduct 10 points per violation', () => {
      const result = SecurityLawResultBuilder.createResult(
        ['Violation 1', 'Violation 2'],
        'SecurityLaw',
        [],
        mockContext
      );
      expect(result.score).toBe(80);
    });

    it('should not allow negative scores', () => {
      const violations = Array(15).fill('Violation');
      const result = SecurityLawResultBuilder.createResult(
        violations,
        'SecurityLaw',
        [],
        mockContext
      );
      expect(result.score).toBe(0);
    });

    it('should include violations in result', () => {
      const violations = ['Violation A', 'Violation B'];
      const result = SecurityLawResultBuilder.createResult(
        violations,
        'SecurityLaw',
        [],
        mockContext
      );
      expect(result.violations).toEqual(violations);
    });

    it('should include suggestions in result', () => {
      const suggestions = ['Fix A', 'Fix B'];
      const result = SecurityLawResultBuilder.createResult(
        ['Violation 1'],
        'SecurityLaw',
        suggestions,
        mockContext
      );
      expect(result.suggestions).toEqual(suggestions);
    });

    it('should set success message when no violations', () => {
      const result = SecurityLawResultBuilder.createResult(
        [],
        'AuthSecurity',
        [],
        mockContext
      );
      expect(result.message).toBe('AuthSecurity compliance verified');
    });

    it('should set violation count message when violations exist', () => {
      const result = SecurityLawResultBuilder.createResult(
        ['V1', 'V2', 'V3'],
        'XSS Prevention',
        [],
        mockContext
      );
      expect(result.message).toBe('3 XSS Prevention violations found');
    });

    it('should include config from context', () => {
      const result = SecurityLawResultBuilder.createResult(
        [],
        'SecurityLaw',
        [],
        mockContext
      );
      expect(result.config).toBe(mockContext.config);
    });

    it('should handle single violation correctly', () => {
      const result = SecurityLawResultBuilder.createResult(
        ['Single violation'],
        'SecurityLaw',
        ['Single fix'],
        mockContext
      );
      expect(result.passed).toBe(false);
      expect(result.score).toBe(90);
      expect(result.violations).toHaveLength(1);
    });

    it('should handle empty suggestions with violations', () => {
      const result = SecurityLawResultBuilder.createResult(
        ['Violation'],
        'SecurityLaw',
        [],
        mockContext
      );
      expect(result.suggestions).toEqual([]);
    });

    it('should handle multiple suggestions with no violations', () => {
      const result = SecurityLawResultBuilder.createResult(
        [],
        'SecurityLaw',
        ['Suggestion 1', 'Suggestion 2'],
        mockContext
      );
      expect(result.passed).toBe(true);
      expect(result.suggestions).toHaveLength(2);
    });
  });
});

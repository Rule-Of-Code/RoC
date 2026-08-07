/**
 * Tests for SecurityLawBase
 *
 * Tests the base class that provides common functionality for security-related laws
 */
import { SecurityLawBase } from '../../../src/checkers/security-laws/security-law-base';
import type { RuleOfCodeConfig } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';

describe('SecurityLawBase', () => {
  let mockConfig: RuleOfCodeConfig;

  beforeEach(() => {
    mockConfig = FileUtils.getMinimalDefaultConfig();
  });

  // ============================================
  // createResult - Basic Behavior
  // ============================================
  describe('createResult()', () => {
    describe('when no violations exist', () => {
      it('should return passed=true', () => {
        const result = SecurityLawBase.createResult(
          [],
          'Test Security Law',
          'SECURITY',
          []
        );

        expect(result.passed).toBe(true);
      });

      it('should return score of 100', () => {
        const result = SecurityLawBase.createResult(
          [],
          'Test Security Law',
          'SECURITY',
          []
        );

        expect(result.score).toBe(100);
      });

      it('should return fixable=false', () => {
        const result = SecurityLawBase.createResult(
          [],
          'Test Security Law',
          'SECURITY',
          []
        );

        expect(result.fixable).toBe(false);
      });

      it('should return success message with checkmark emoji', () => {
        const result = SecurityLawBase.createResult(
          [],
          'Authentication Check',
          'SECURITY',
          []
        );

        expect(result.message).toContain('✅');
        expect(result.message).toContain('Security compliance verified');
        expect(result.message).toContain('Authentication Check');
      });

      it('should include empty violations array', () => {
        const result = SecurityLawBase.createResult(
          [],
          'Test Law',
          'SECURITY',
          []
        );

        expect(result.violations).toEqual([]);
      });

      it('should include empty suggestions array', () => {
        const result = SecurityLawBase.createResult(
          [],
          'Test Law',
          'SECURITY',
          []
        );

        expect(result.suggestions).toEqual([]);
      });
    });

    describe('when violations exist', () => {
      it('should return passed=false', () => {
        const result = SecurityLawBase.createResult(
          ['Violation 1'],
          'Test Security Law',
          'SECURITY',
          []
        );

        expect(result.passed).toBe(false);
      });

      it('should return fixable=true', () => {
        const result = SecurityLawBase.createResult(
          ['Violation 1'],
          'Test Security Law',
          'SECURITY',
          []
        );

        expect(result.fixable).toBe(true);
      });

      it('should return error message with warning emoji', () => {
        const result = SecurityLawBase.createResult(
          ['Missing authentication'],
          'Auth Policy',
          'SECURITY',
          []
        );

        expect(result.message).toContain('🚨');
        expect(result.message).toContain('Security violation');
        expect(result.message).toContain('Auth Policy');
      });

      it('should include violations in message', () => {
        const result = SecurityLawBase.createResult(
          ['Missing auth header', 'No session check'],
          'Auth Policy',
          'SECURITY',
          []
        );

        expect(result.message).toContain('Missing auth header');
        expect(result.message).toContain('No session check');
      });

      it('should deduct 15 points per violation', () => {
        const result = SecurityLawBase.createResult(
          ['Violation 1', 'Violation 2'],
          'Test Law',
          'SECURITY',
          []
        );

        expect(result.score).toBe(70); // 100 - 30
      });

      it('should not allow negative scores', () => {
        const violations = Array(10).fill('Violation');
        const result = SecurityLawBase.createResult(
          violations,
          'Test Law',
          'SECURITY',
          []
        );

        expect(result.score).toBe(0); // 100 - 150 = 0 (clamped)
      });

      it('should include violations array in result', () => {
        const violations = ['Missing HTTPS', 'Weak password'];
        const result = SecurityLawBase.createResult(
          violations,
          'Test Law',
          'SECURITY',
          []
        );

        expect(result.violations).toEqual(violations);
      });
    });

    describe('suggestions handling', () => {
      it('should include suggestions in result', () => {
        const suggestions = ['Use HTTPS', 'Add MFA'];
        const result = SecurityLawBase.createResult(
          [],
          'Test Law',
          'SECURITY',
          suggestions
        );

        expect(result.suggestions).toEqual(suggestions);
      });

      it('should include suggestions with violations', () => {
        const violations = ['Missing HTTPS'];
        const suggestions = ['Add SSL certificate'];
        const result = SecurityLawBase.createResult(
          violations,
          'Test Law',
          'SECURITY',
          suggestions
        );

        expect(result.violations).toEqual(violations);
        expect(result.suggestions).toEqual(suggestions);
      });

      it('should include both violations and suggestions in details', () => {
        const violations = ['Violation 1'];
        const suggestions = ['Suggestion 1'];
        const result = SecurityLawBase.createResult(
          violations,
          'Test Law',
          'SECURITY',
          suggestions
        );

        expect(result.details).toContain('Violation 1');
        expect(result.details).toContain('Suggestion 1');
      });
    });

    describe('context handling', () => {
      it('should use config from context when provided', () => {
        const context = { config: mockConfig };
        const result = SecurityLawBase.createResult(
          [],
          'Test Law',
          'SECURITY',
          [],
          context
        );

        expect(result.config).toBe(mockConfig);
      });

      it('should use default config when context is undefined', () => {
        const result = SecurityLawBase.createResult(
          [],
          'Test Law',
          'SECURITY',
          []
        );

        expect(result.config).toBeDefined();
        expect(result.config.project).toBeDefined();
      });

      it('should use default config when context.config is undefined', () => {
        const result = SecurityLawBase.createResult(
          [],
          'Test Law',
          'SECURITY',
          [],
          undefined
        );

        expect(result.config).toBeDefined();
      });
    });

    describe('category parameter', () => {
      it('should accept SECURITY category', () => {
        const result = SecurityLawBase.createResult(
          [],
          'Test Law',
          'SECURITY',
          []
        );

        expect(result).toBeDefined();
      });

      it('should accept custom category string', () => {
        const result = SecurityLawBase.createResult(
          [],
          'Test Law',
          'AUTHENTICATION',
          []
        );

        expect(result).toBeDefined();
      });

      it('should use default category when not provided', () => {
        // The category defaults to 'SECURITY' internally
        const result = SecurityLawBase.createResult([], 'Test Law');

        expect(result).toBeDefined();
      });
    });

    describe('edge cases', () => {
      it('should handle single violation correctly', () => {
        const result = SecurityLawBase.createResult(
          ['Single violation'],
          'Test Law',
          'SECURITY',
          []
        );

        expect(result.passed).toBe(false);
        expect(result.score).toBe(85); // 100 - 15
        expect(result.violations).toHaveLength(1);
      });

      it('should handle empty title', () => {
        const result = SecurityLawBase.createResult([], '', 'SECURITY', []);

        expect(result.passed).toBe(true);
        expect(result.message).toContain('Security compliance verified');
      });

      it('should handle special characters in violations', () => {
        const violations = [
          'SQL injection: SELECT * FROM users',
          'XSS: <script>alert(1)</script>',
        ];
        const result = SecurityLawBase.createResult(
          violations,
          'Test Law',
          'SECURITY',
          []
        );

        expect(result.violations).toEqual(violations);
      });

      it('should handle long violation messages', () => {
        const longViolation = 'A'.repeat(500);
        const result = SecurityLawBase.createResult(
          [longViolation],
          'Test Law',
          'SECURITY',
          []
        );

        expect((result.violations ?? [])[0]).toBe(longViolation);
      });

      it('should handle many violations at score boundary', () => {
        // 6 violations = 90 points deducted, score = 10
        const violations = Array(6).fill('Violation');
        const result = SecurityLawBase.createResult(
          violations,
          'Test Law',
          'SECURITY',
          []
        );

        expect(result.score).toBe(10);
      });

      it('should handle exactly 7 violations to hit zero', () => {
        // 7 violations = 105 points deducted, score should be 0
        const violations = Array(7).fill('Violation');
        const result = SecurityLawBase.createResult(
          violations,
          'Test Law',
          'SECURITY',
          []
        );

        expect(result.score).toBe(0);
      });
    });
  });
});

/**
 * Tests for AuthenticationPatternValidators
 *
 * Tests security analysis workflow and initialization patterns.
 */
import { AuthenticationPatternValidators } from '../../../src/checkers/security-laws/authentication/shared-authentication-patterns';

describe('AuthenticationPatternValidators', () => {
  describe('createSecurityAnalysisFlow', () => {
    it('should return a function', () => {
      const flow = AuthenticationPatternValidators.createSecurityAnalysisFlow(
        'test-check',
        {
          validator: () => true,
          violationMessage: 'Violation',
          suggestionMessage: 'Suggestion',
        }
      );
      expect(typeof flow).toBe('function');
    });

    it('should return empty arrays when primary check passes', () => {
      const flow = AuthenticationPatternValidators.createSecurityAnalysisFlow(
        'test-check',
        {
          validator: () => true,
          violationMessage: 'Violation',
          suggestionMessage: 'Suggestion',
        }
      );
      const result = flow(['file1.ts', 'file2.ts']);
      expect((result.violations ?? []).length).toBe(0);
      expect((result.suggestions ?? []).length).toBe(0);
    });

    it('should return violation when primary check fails', () => {
      const flow = AuthenticationPatternValidators.createSecurityAnalysisFlow(
        'test-check',
        {
          validator: () => false,
          violationMessage: 'Primary violation',
          suggestionMessage: 'Primary suggestion',
        }
      );
      const result = flow(['file1.ts']);
      expect(result.violations).toContain('Primary violation');
      expect(result.suggestions).toContain('Primary suggestion');
    });

    it('should handle secondary checks when provided', () => {
      const flow = AuthenticationPatternValidators.createSecurityAnalysisFlow(
        'test-check',
        {
          validator: () => true,
          violationMessage: 'Primary violation',
          suggestionMessage: 'Primary suggestion',
        },
        [
          {
            validator: () => false,
            violationMessage: 'Secondary violation',
            suggestionMessage: 'Secondary suggestion',
          },
        ]
      );
      const result = flow(['file1.ts']);
      expect(result.violations).toContain('Secondary violation');
      expect(result.suggestions).toContain('Secondary suggestion');
    });

    it('should accumulate violations from multiple failing checks', () => {
      const flow = AuthenticationPatternValidators.createSecurityAnalysisFlow(
        'test-check',
        {
          validator: () => false,
          violationMessage: 'Primary violation',
          suggestionMessage: 'Primary suggestion',
        },
        [
          {
            validator: () => false,
            violationMessage: 'Secondary1',
            suggestionMessage: 'Suggestion1',
          },
          {
            validator: () => false,
            violationMessage: 'Secondary2',
            suggestionMessage: 'Suggestion2',
          },
        ]
      );
      const result = flow(['file1.ts']);
      expect((result.violations ?? []).length).toBe(3);
      expect((result.suggestions ?? []).length).toBe(3);
    });

    it('should pass codeFiles to validator functions', () => {
      let receivedFiles: string[] = [];
      const flow = AuthenticationPatternValidators.createSecurityAnalysisFlow(
        'test-check',
        {
          validator: files => {
            receivedFiles = files;
            return true;
          },
          violationMessage: 'Violation',
          suggestionMessage: 'Suggestion',
        }
      );
      flow(['auth.ts', 'login.ts']);
      expect(receivedFiles).toEqual(['auth.ts', 'login.ts']);
    });

    it('should work with empty codeFiles array', () => {
      const flow = AuthenticationPatternValidators.createSecurityAnalysisFlow(
        'test-check',
        {
          validator: files => files.length > 0,
          violationMessage: 'No files',
          suggestionMessage: 'Add files',
        }
      );
      const result = flow([]);
      expect(result.violations).toContain('No files');
    });

    it('should handle undefined secondary checks', () => {
      const flow = AuthenticationPatternValidators.createSecurityAnalysisFlow(
        'test-check',
        {
          validator: () => true,
          violationMessage: 'Violation',
          suggestionMessage: 'Suggestion',
        },
        undefined
      );
      const result = flow(['file.ts']);
      expect((result.violations ?? []).length).toBe(0);
    });

    it('should handle empty secondary checks array', () => {
      const flow = AuthenticationPatternValidators.createSecurityAnalysisFlow(
        'test-check',
        {
          validator: () => true,
          violationMessage: 'Violation',
          suggestionMessage: 'Suggestion',
        },
        []
      );
      const result = flow(['file.ts']);
      expect((result.violations ?? []).length).toBe(0);
    });
  });

  describe('initializeSecurityCheck', () => {
    it('should return object with violations and suggestions', () => {
      const result = AuthenticationPatternValidators.initializeSecurityCheck(
        [],
        []
      );
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
    });

    it('should preserve passed violations array', () => {
      const violations = ['violation1', 'violation2'];
      const result = AuthenticationPatternValidators.initializeSecurityCheck(
        violations,
        []
      );
      expect(result.violations).toEqual(violations);
    });

    it('should preserve passed suggestions array', () => {
      const suggestions = ['suggestion1', 'suggestion2'];
      const result = AuthenticationPatternValidators.initializeSecurityCheck(
        [],
        suggestions
      );
      expect(result.suggestions).toEqual(suggestions);
    });

    it('should handle empty arrays', () => {
      const result = AuthenticationPatternValidators.initializeSecurityCheck(
        [],
        []
      );
      expect((result.violations ?? []).length).toBe(0);
      expect((result.suggestions ?? []).length).toBe(0);
    });

    it('should handle populated arrays', () => {
      const result = AuthenticationPatternValidators.initializeSecurityCheck(
        ['v1', 'v2', 'v3'],
        ['s1', 's2']
      );
      expect((result.violations ?? []).length).toBe(3);
      expect((result.suggestions ?? []).length).toBe(2);
    });
  });
});

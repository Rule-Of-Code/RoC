/**
 * CheckerResultBuilder Tests
 * Tests for the CheckerResultBuilder utility class
 */
import {
  CheckerResult,
  CheckerResultBuilder,
} from '../../src/utils/checker-result-builder';

describe('CheckerResultBuilder', () => {
  describe('createEmpty', () => {
    it('should create an empty result with empty arrays', () => {
      const result = CheckerResultBuilder.createEmpty();
      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
      expect(result.scoreDeduction).toBeUndefined();
    });

    it('should include scoreDeduction when provided and > 0', () => {
      const result = CheckerResultBuilder.createEmpty(5);
      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
      expect(result.scoreDeduction).toBe(5);
    });

    it('should not include scoreDeduction when 0', () => {
      const result = CheckerResultBuilder.createEmpty(0);
      expect(result.scoreDeduction).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create result with violations and suggestions', () => {
      const violations = ['violation1', 'violation2'];
      const suggestions = ['suggestion1'];
      const result = CheckerResultBuilder.create(violations, suggestions);

      expect(result.violations).toEqual(violations);
      expect(result.suggestions).toEqual(suggestions);
    });

    it('should create result with score deduction', () => {
      const result = CheckerResultBuilder.create(['v1'], ['s1'], 10);
      expect(result.scoreDeduction).toBe(10);
    });

    it('should handle empty arrays', () => {
      const result = CheckerResultBuilder.create();
      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('should not include scoreDeduction when falsy', () => {
      const result = CheckerResultBuilder.create([], [], 0);
      expect(result.scoreDeduction).toBeUndefined();
    });
  });

  describe('combine', () => {
    it('should combine multiple results', () => {
      const result1: CheckerResult = {
        violations: ['v1'],
        suggestions: ['s1'],
      };
      const result2: CheckerResult = {
        violations: ['v2', 'v3'],
        suggestions: ['s2'],
      };

      const combined = CheckerResultBuilder.combine(result1, result2);
      expect(combined.violations).toEqual(['v1', 'v2', 'v3']);
      expect(combined.suggestions).toEqual(['s1', 's2']);
    });

    it('should sum score deductions', () => {
      const result1: CheckerResult = {
        violations: [],
        suggestions: [],
        scoreDeduction: 5,
      };
      const result2: CheckerResult = {
        violations: [],
        suggestions: [],
        scoreDeduction: 3,
      };

      const combined = CheckerResultBuilder.combine(result1, result2);
      expect(combined.scoreDeduction).toBe(8);
    });

    it('should handle results without score deduction', () => {
      const result1: CheckerResult = {
        violations: ['v1'],
        suggestions: [],
      };
      const result2: CheckerResult = {
        violations: [],
        suggestions: ['s1'],
      };

      const combined = CheckerResultBuilder.combine(result1, result2);
      expect(combined.scoreDeduction).toBeUndefined();
    });

    it('should handle empty input', () => {
      const combined = CheckerResultBuilder.combine();
      expect(combined.violations).toEqual([]);
      expect(combined.suggestions).toEqual([]);
    });
  });

  describe('merge', () => {
    it('should merge sources into target', () => {
      const target: CheckerResult = {
        violations: ['v0'],
        suggestions: ['s0'],
      };
      const source1: CheckerResult = {
        violations: ['v1'],
        suggestions: ['s1'],
      };

      const merged = CheckerResultBuilder.merge(target, source1);
      expect(merged.violations).toEqual(['v0', 'v1']);
      expect(merged.suggestions).toEqual(['s0', 's1']);
      expect(merged).toBe(target); // Should mutate target
    });

    it('should handle scoreDeduction merge when both have it', () => {
      const target: CheckerResult = {
        violations: [],
        suggestions: [],
        scoreDeduction: 5,
      };
      const source: CheckerResult = {
        violations: [],
        suggestions: [],
        scoreDeduction: 3,
      };

      const merged = CheckerResultBuilder.merge(target, source);
      expect(merged.scoreDeduction).toBe(8);
    });

    it('should add scoreDeduction when only source has it', () => {
      const target: CheckerResult = {
        violations: [],
        suggestions: [],
      };
      const source: CheckerResult = {
        violations: [],
        suggestions: [],
        scoreDeduction: 5,
      };

      const merged = CheckerResultBuilder.merge(target, source);
      expect(merged.scoreDeduction).toBe(5);
    });
  });

  describe('addViolations', () => {
    it('should add violations to result', () => {
      const result: CheckerResult = {
        violations: ['existing'],
        suggestions: [],
      };

      CheckerResultBuilder.addViolations(result, 'new1', 'new2');
      expect(result.violations).toEqual(['existing', 'new1', 'new2']);
    });

    it('should return the same result object', () => {
      const result: CheckerResult = {
        violations: [],
        suggestions: [],
      };

      const returned = CheckerResultBuilder.addViolations(result, 'v1');
      expect(returned).toBe(result);
    });
  });

  describe('addSuggestions', () => {
    it('should add suggestions to result', () => {
      const result: CheckerResult = {
        violations: [],
        suggestions: ['existing'],
      };

      CheckerResultBuilder.addSuggestions(result, 'new1', 'new2');
      expect(result.suggestions).toEqual(['existing', 'new1', 'new2']);
    });

    it('should return the same result object', () => {
      const result: CheckerResult = {
        violations: [],
        suggestions: [],
      };

      const returned = CheckerResultBuilder.addSuggestions(result, 's1');
      expect(returned).toBe(result);
    });
  });

  describe('add', () => {
    it('should add both violations and suggestions', () => {
      const result: CheckerResult = {
        violations: ['v0'],
        suggestions: ['s0'],
      };

      CheckerResultBuilder.add(result, ['v1', 'v2'], ['s1']);
      expect(result.violations).toEqual(['v0', 'v1', 'v2']);
      expect(result.suggestions).toEqual(['s0', 's1']);
    });
  });

  describe('hasViolations', () => {
    it('should return true when violations exist', () => {
      const result: CheckerResult = {
        violations: ['v1'],
        suggestions: [],
      };

      expect(CheckerResultBuilder.hasViolations(result)).toBe(true);
    });

    it('should return false when no violations', () => {
      const result: CheckerResult = {
        violations: [],
        suggestions: ['s1'],
      };

      expect(CheckerResultBuilder.hasViolations(result)).toBe(false);
    });
  });

  describe('getViolationCount', () => {
    it('should return correct count', () => {
      const result: CheckerResult = {
        violations: ['v1', 'v2', 'v3'],
        suggestions: [],
      };

      expect(CheckerResultBuilder.getViolationCount(result)).toBe(3);
    });

    it('should return 0 for empty violations', () => {
      const result: CheckerResult = {
        violations: [],
        suggestions: [],
      };

      expect(CheckerResultBuilder.getViolationCount(result)).toBe(0);
    });
  });

  describe('getSuggestionCount', () => {
    it('should return correct count', () => {
      const result: CheckerResult = {
        violations: [],
        suggestions: ['s1', 's2'],
      };

      expect(CheckerResultBuilder.getSuggestionCount(result)).toBe(2);
    });

    it('should return 0 for empty suggestions', () => {
      const result: CheckerResult = {
        violations: [],
        suggestions: [],
      };

      expect(CheckerResultBuilder.getSuggestionCount(result)).toBe(0);
    });
  });

  describe('dedup', () => {
    it('should remove duplicate violations', () => {
      const result: CheckerResult = {
        violations: ['v1', 'v2', 'v1', 'v3', 'v2'],
        suggestions: [],
      };

      const deduped = CheckerResultBuilder.dedup(result);
      expect(deduped.violations).toEqual(['v1', 'v2', 'v3']);
    });

    it('should remove duplicate suggestions', () => {
      const result: CheckerResult = {
        violations: [],
        suggestions: ['s1', 's1', 's2'],
      };

      const deduped = CheckerResultBuilder.dedup(result);
      expect(deduped.suggestions).toEqual(['s1', 's2']);
    });

    it('should preserve scoreDeduction', () => {
      const result: CheckerResult = {
        violations: ['v1', 'v1'],
        suggestions: [],
        scoreDeduction: 5,
      };

      const deduped = CheckerResultBuilder.dedup(result);
      expect(deduped.scoreDeduction).toBe(5);
    });

    it('should not mutate original', () => {
      const result: CheckerResult = {
        violations: ['v1', 'v1'],
        suggestions: ['s1', 's1'],
      };

      const deduped = CheckerResultBuilder.dedup(result);
      expect(deduped).not.toBe(result);
      expect(result.violations).toEqual(['v1', 'v1']);
    });
  });

  describe('CheckerResult interface', () => {
    it('should accept valid CheckerResult objects', () => {
      const result: CheckerResult = {
        violations: [],
        suggestions: [],
      };
      expect(result).toBeDefined();
    });

    it('should allow optional scoreDeduction', () => {
      const withScore: CheckerResult = {
        violations: [],
        suggestions: [],
        scoreDeduction: 10,
      };
      const withoutScore: CheckerResult = {
        violations: [],
        suggestions: [],
      };

      expect(withScore.scoreDeduction).toBe(10);
      expect(withoutScore.scoreDeduction).toBeUndefined();
    });
  });
});

/**
 * Tests for mergeSecurityResults helper
 *
 * Tests the generic result merging for security validations.
 */
import { mergeSecurityResults } from '../../src/utils/security/result-merging-helper';

describe('mergeSecurityResults', () => {
  interface TestResult {
    violations: string[];
    suggestions: string[];
    score?: number;
  }

  const createEmptyTestResult = (): TestResult => ({
    violations: [],
    suggestions: [],
    score: 100,
  });

  describe('basic functionality', () => {
    it('should return empty result when no results provided', () => {
      const result = mergeSecurityResults(createEmptyTestResult);
      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('should return copy of single result', () => {
      const singleResult: TestResult = {
        violations: ['violation1'],
        suggestions: ['suggestion1'],
      };
      const result = mergeSecurityResults(createEmptyTestResult, singleResult);
      expect(result.violations).toEqual(['violation1']);
      expect(result.suggestions).toEqual(['suggestion1']);
    });

    it('should merge two results', () => {
      const result1: TestResult = {
        violations: ['v1'],
        suggestions: ['s1'],
      };
      const result2: TestResult = {
        violations: ['v2'],
        suggestions: ['s2'],
      };
      const merged = mergeSecurityResults(
        createEmptyTestResult,
        result1,
        result2
      );
      expect(merged.violations).toEqual(['v1', 'v2']);
      expect(merged.suggestions).toEqual(['s1', 's2']);
    });

    it('should merge multiple results', () => {
      const results: TestResult[] = [
        { violations: ['v1'], suggestions: ['s1'] },
        { violations: ['v2'], suggestions: ['s2'] },
        { violations: ['v3'], suggestions: ['s3'] },
      ];
      const merged = mergeSecurityResults(createEmptyTestResult, ...results);
      expect(merged.violations.length).toBe(3);
      expect(merged.suggestions.length).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle empty arrays in results', () => {
      const result1: TestResult = {
        violations: [],
        suggestions: [],
      };
      const result2: TestResult = {
        violations: ['v1'],
        suggestions: [],
      };
      const merged = mergeSecurityResults(
        createEmptyTestResult,
        result1,
        result2
      );
      expect(merged.violations).toEqual(['v1']);
      expect(merged.suggestions).toEqual([]);
    });

    it('should preserve order of violations', () => {
      const result1: TestResult = { violations: ['a', 'b'], suggestions: [] };
      const result2: TestResult = { violations: ['c', 'd'], suggestions: [] };
      const merged = mergeSecurityResults(
        createEmptyTestResult,
        result1,
        result2
      );
      expect(merged.violations).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should preserve order of suggestions', () => {
      const result1: TestResult = { violations: [], suggestions: ['1', '2'] };
      const result2: TestResult = { violations: [], suggestions: ['3', '4'] };
      const merged = mergeSecurityResults(
        createEmptyTestResult,
        result1,
        result2
      );
      expect(merged.suggestions).toEqual(['1', '2', '3', '4']);
    });

    it('should handle duplicate values in arrays', () => {
      const result1: TestResult = { violations: ['dup'], suggestions: ['dup'] };
      const result2: TestResult = { violations: ['dup'], suggestions: ['dup'] };
      const merged = mergeSecurityResults(
        createEmptyTestResult,
        result1,
        result2
      );
      expect(merged.violations).toEqual(['dup', 'dup']);
      expect(merged.suggestions).toEqual(['dup', 'dup']);
    });
  });

  describe('with custom result types', () => {
    interface ExtendedResult {
      violations: string[];
      suggestions: string[];
      severity: string;
    }

    const createExtendedResult = (): ExtendedResult => ({
      violations: [],
      suggestions: [],
      severity: 'low',
    });

    it('should work with extended result types', () => {
      const result1: ExtendedResult = {
        violations: ['v1'],
        suggestions: ['s1'],
        severity: 'high',
      };
      const merged = mergeSecurityResults(createExtendedResult, result1);
      expect(merged.violations).toEqual(['v1']);
    });
  });
});

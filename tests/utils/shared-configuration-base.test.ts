/**
 * Tests for shared-configuration-base
 *
 * Tests the generic configuration check result helpers.
 */
import {
  ConfigCheckResult,
  createEmptyConfigResult,
  mergeConfigResults,
} from '../../src/utils/security/shared-configuration-base';

describe('shared-configuration-base', () => {
  describe('ConfigCheckResult interface', () => {
    it('should accept violations as string array', () => {
      const result: ConfigCheckResult<string> = {
        violations: ['error1', 'error2'],
        suggestions: ['fix1'],
      };
      expect(result.violations).toHaveLength(2);
      expect(result.suggestions).toHaveLength(1);
    });

    it('should accept violations as number array', () => {
      const result: ConfigCheckResult<number> = {
        violations: [1, 2, 3],
        suggestions: [],
      };
      expect(result.violations).toEqual([1, 2, 3]);
    });

    it('should accept violations as object array', () => {
      interface Violation {
        code: string;
        message: string;
      }
      const result: ConfigCheckResult<Violation> = {
        violations: [{ code: 'E001', message: 'Error' }],
        suggestions: ['Fix the issue'],
      };
      expect(result.violations[0]!.code).toBe('E001');
    });

    it('should allow empty arrays', () => {
      const result: ConfigCheckResult<string> = {
        violations: [],
        suggestions: [],
      };
      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });
  });

  describe('createEmptyConfigResult', () => {
    it('should create result with empty violations array', () => {
      const result = createEmptyConfigResult<string>();
      expect(result.violations).toEqual([]);
    });

    it('should create result with empty suggestions array', () => {
      const result = createEmptyConfigResult<string>();
      expect(result.suggestions).toEqual([]);
    });

    it('should create new object each time', () => {
      const result1 = createEmptyConfigResult<string>();
      const result2 = createEmptyConfigResult<string>();
      expect(result1).not.toBe(result2);
    });

    it('should create independent arrays', () => {
      const result1 = createEmptyConfigResult<string>();
      const result2 = createEmptyConfigResult<string>();
      result1.violations.push('test');
      expect(result2.violations).toEqual([]);
    });

    it('should work with number type', () => {
      const result = createEmptyConfigResult<number>();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should work with complex object type', () => {
      interface Issue {
        id: number;
        description: string;
      }
      const result = createEmptyConfigResult<Issue>();
      expect(result.violations).toEqual([]);
    });
  });

  describe('mergeConfigResults', () => {
    it('should return empty result when no arguments', () => {
      const result = mergeConfigResults<string>();
      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('should merge single result', () => {
      const input: ConfigCheckResult<string> = {
        violations: ['v1'],
        suggestions: ['s1'],
      };
      const result = mergeConfigResults(input);
      expect(result.violations).toEqual(['v1']);
      expect(result.suggestions).toEqual(['s1']);
    });

    it('should merge two results', () => {
      const input1: ConfigCheckResult<string> = {
        violations: ['v1'],
        suggestions: ['s1'],
      };
      const input2: ConfigCheckResult<string> = {
        violations: ['v2'],
        suggestions: ['s2'],
      };
      const result = mergeConfigResults(input1, input2);
      expect(result.violations).toEqual(['v1', 'v2']);
      expect(result.suggestions).toEqual(['s1', 's2']);
    });

    it('should merge multiple results', () => {
      const inputs: ConfigCheckResult<string>[] = [
        { violations: ['a'], suggestions: ['1'] },
        { violations: ['b'], suggestions: ['2'] },
        { violations: ['c'], suggestions: ['3'] },
      ];
      const result = mergeConfigResults(...inputs);
      expect(result.violations).toEqual(['a', 'b', 'c']);
      expect(result.suggestions).toEqual(['1', '2', '3']);
    });

    it('should handle empty inputs', () => {
      const input1: ConfigCheckResult<string> = {
        violations: [],
        suggestions: [],
      };
      const input2: ConfigCheckResult<string> = {
        violations: ['v1'],
        suggestions: [],
      };
      const result = mergeConfigResults(input1, input2);
      expect(result.violations).toEqual(['v1']);
      expect(result.suggestions).toEqual([]);
    });

    it('should preserve order', () => {
      const input1: ConfigCheckResult<number> = {
        violations: [1, 2],
        suggestions: ['a', 'b'],
      };
      const input2: ConfigCheckResult<number> = {
        violations: [3, 4],
        suggestions: ['c', 'd'],
      };
      const result = mergeConfigResults(input1, input2);
      expect(result.violations).toEqual([1, 2, 3, 4]);
      expect(result.suggestions).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should not deduplicate values', () => {
      const input1: ConfigCheckResult<string> = {
        violations: ['dup'],
        suggestions: ['dup'],
      };
      const input2: ConfigCheckResult<string> = {
        violations: ['dup'],
        suggestions: ['dup'],
      };
      const result = mergeConfigResults(input1, input2);
      expect(result.violations).toEqual(['dup', 'dup']);
      expect(result.suggestions).toEqual(['dup', 'dup']);
    });

    it('should work with object violations', () => {
      interface Issue {
        code: string;
      }
      const input1: ConfigCheckResult<Issue> = {
        violations: [{ code: 'E1' }],
        suggestions: [],
      };
      const input2: ConfigCheckResult<Issue> = {
        violations: [{ code: 'E2' }],
        suggestions: [],
      };
      const result = mergeConfigResults(input1, input2);
      expect(result.violations.length).toBe(2);
    });

    it('should return new result object', () => {
      const input: ConfigCheckResult<string> = {
        violations: ['v1'],
        suggestions: ['s1'],
      };
      const result = mergeConfigResults(input);
      expect(result).not.toBe(input);
    });

    it('should not modify original inputs', () => {
      const input1: ConfigCheckResult<string> = {
        violations: ['v1'],
        suggestions: ['s1'],
      };
      const input2: ConfigCheckResult<string> = {
        violations: ['v2'],
        suggestions: ['s2'],
      };
      mergeConfigResults(input1, input2);
      expect(input1.violations).toEqual(['v1']);
      expect(input2.violations).toEqual(['v2']);
    });
  });
});

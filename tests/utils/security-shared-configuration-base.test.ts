/**
 * @fileoverview Tests for shared-configuration-base.ts
 * @description Tests for Shared Configuration Base - generic result types and utilities
 */

import { FileUtils } from '../../src/utils/file-utils';
import {
  createEmptyConfigResult,
  mergeConfigResults,
  type ConfigCheckResult,
} from '../../src/utils/security/shared-configuration-base';

describe('utils/security/shared-configuration-base', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('shared-config-base-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  // ==========================================================================
  // ConfigCheckResult Type
  // ==========================================================================

  describe('ConfigCheckResult type', () => {
    it('should allow string violations', () => {
      const result: ConfigCheckResult<string> = {
        violations: ['violation1', 'violation2'],
        suggestions: ['suggestion1'],
      };

      expect(result.violations).toHaveLength(2);
      expect(result.suggestions).toHaveLength(1);
    });

    it('should allow object violations', () => {
      interface ViolationObject {
        id: string;
        severity: 'high' | 'medium' | 'low';
        message: string;
      }

      const result: ConfigCheckResult<ViolationObject> = {
        violations: [
          { id: 'v1', severity: 'high', message: 'Critical issue' },
          { id: 'v2', severity: 'low', message: 'Minor issue' },
        ],
        suggestions: ['Fix the issues'],
      };

      expect(result.violations).toHaveLength(2);
      expect(result.violations[0]!.severity).toBe('high');
    });

    it('should allow number violations', () => {
      const result: ConfigCheckResult<number> = {
        violations: [1, 2, 3, 4, 5],
        suggestions: ['Check line numbers'],
      };

      expect(result.violations).toHaveLength(5);
      expect(result.violations.reduce((a, b) => a + b, 0)).toBe(15);
    });

    it('should allow complex object violations', () => {
      interface ComplexViolation {
        file: string;
        line: number;
        column: number;
        rule: string;
        fix?: {
          replacement: string;
          range: [number, number];
        };
      }

      const result: ConfigCheckResult<ComplexViolation> = {
        violations: [
          {
            file: 'test.ts',
            line: 10,
            column: 5,
            rule: 'no-unused-vars',
            fix: {
              replacement: '',
              range: [100, 110],
            },
          },
        ],
        suggestions: ['Run auto-fix'],
      };

      expect(result.violations[0]!.fix?.replacement).toBe('');
    });

    it('should allow empty violations and suggestions', () => {
      const result: ConfigCheckResult<string> = {
        violations: [],
        suggestions: [],
      };

      expect(result.violations).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });
  });

  // ==========================================================================
  // createEmptyConfigResult
  // ==========================================================================

  describe('createEmptyConfigResult', () => {
    it('should create empty result with string type', () => {
      const result = createEmptyConfigResult<string>();

      expect(result).toEqual({
        violations: [],
        suggestions: [],
      });
    });

    it('should create empty result with number type', () => {
      const result = createEmptyConfigResult<number>();

      expect(result).toEqual({
        violations: [],
        suggestions: [],
      });
    });

    it('should create empty result with object type', () => {
      interface TestObject {
        id: string;
      }

      const result = createEmptyConfigResult<TestObject>();

      expect(result).toEqual({
        violations: [],
        suggestions: [],
      });
    });

    it('should return new object on each call', () => {
      const result1 = createEmptyConfigResult<string>();
      const result2 = createEmptyConfigResult<string>();

      expect(result1).not.toBe(result2);
      expect(result1.violations).not.toBe(result2.violations);
      expect(result1.suggestions).not.toBe(result2.suggestions);
    });

    it('should return mutable arrays', () => {
      const result = createEmptyConfigResult<string>();

      result.violations.push('test violation');
      result.suggestions.push('test suggestion');

      expect(result.violations).toContain('test violation');
      expect(result.suggestions).toContain('test suggestion');
    });

    it('should work with array type', () => {
      const result = createEmptyConfigResult<string[]>();

      result.violations.push(['error1', 'error2']);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toHaveLength(2);
    });

    it('should work with union type', () => {
      type UnionType = string | number;

      const result = createEmptyConfigResult<UnionType>();

      result.violations.push('string violation');
      result.violations.push(42);

      expect(result.violations).toHaveLength(2);
    });
  });

  // ==========================================================================
  // mergeConfigResults
  // ==========================================================================

  describe('mergeConfigResults', () => {
    it('should merge empty results', () => {
      const result1: ConfigCheckResult<string> = {
        violations: [],
        suggestions: [],
      };
      const result2: ConfigCheckResult<string> = {
        violations: [],
        suggestions: [],
      };

      const merged = mergeConfigResults(result1, result2);

      expect(merged).toEqual({
        violations: [],
        suggestions: [],
      });
    });

    it('should merge violations from multiple results', () => {
      const result1: ConfigCheckResult<string> = {
        violations: ['v1', 'v2'],
        suggestions: [],
      };
      const result2: ConfigCheckResult<string> = {
        violations: ['v3'],
        suggestions: [],
      };

      const merged = mergeConfigResults(result1, result2);

      expect(merged.violations).toEqual(['v1', 'v2', 'v3']);
    });

    it('should merge suggestions from multiple results', () => {
      const result1: ConfigCheckResult<string> = {
        violations: [],
        suggestions: ['s1'],
      };
      const result2: ConfigCheckResult<string> = {
        violations: [],
        suggestions: ['s2', 's3'],
      };

      const merged = mergeConfigResults(result1, result2);

      expect(merged.suggestions).toEqual(['s1', 's2', 's3']);
    });

    it('should merge both violations and suggestions', () => {
      const result1: ConfigCheckResult<string> = {
        violations: ['v1'],
        suggestions: ['s1'],
      };
      const result2: ConfigCheckResult<string> = {
        violations: ['v2'],
        suggestions: ['s2'],
      };

      const merged = mergeConfigResults(result1, result2);

      expect(merged.violations).toEqual(['v1', 'v2']);
      expect(merged.suggestions).toEqual(['s1', 's2']);
    });

    it('should handle single result', () => {
      const result: ConfigCheckResult<string> = {
        violations: ['v1'],
        suggestions: ['s1'],
      };

      const merged = mergeConfigResults(result);

      expect(merged.violations).toEqual(['v1']);
      expect(merged.suggestions).toEqual(['s1']);
    });

    it('should handle three or more results', () => {
      const result1: ConfigCheckResult<string> = {
        violations: ['v1'],
        suggestions: [],
      };
      const result2: ConfigCheckResult<string> = {
        violations: ['v2'],
        suggestions: ['s1'],
      };
      const result3: ConfigCheckResult<string> = {
        violations: ['v3'],
        suggestions: ['s2'],
      };

      const merged = mergeConfigResults(result1, result2, result3);

      expect(merged.violations).toEqual(['v1', 'v2', 'v3']);
      expect(merged.suggestions).toEqual(['s1', 's2']);
    });

    it('should preserve order of violations', () => {
      const result1: ConfigCheckResult<string> = {
        violations: ['a', 'b'],
        suggestions: [],
      };
      const result2: ConfigCheckResult<string> = {
        violations: ['c', 'd'],
        suggestions: [],
      };

      const merged = mergeConfigResults(result1, result2);

      expect(merged.violations).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should preserve order of suggestions', () => {
      const result1: ConfigCheckResult<string> = {
        violations: [],
        suggestions: ['first', 'second'],
      };
      const result2: ConfigCheckResult<string> = {
        violations: [],
        suggestions: ['third'],
      };

      const merged = mergeConfigResults(result1, result2);

      expect(merged.suggestions).toEqual(['first', 'second', 'third']);
    });

    it('should work with object violations', () => {
      interface Violation {
        id: number;
        message: string;
      }

      const result1: ConfigCheckResult<Violation> = {
        violations: [{ id: 1, message: 'Error 1' }],
        suggestions: [],
      };
      const result2: ConfigCheckResult<Violation> = {
        violations: [{ id: 2, message: 'Error 2' }],
        suggestions: [],
      };

      const merged = mergeConfigResults(result1, result2);

      expect(merged.violations).toHaveLength(2);
      expect(merged.violations[0]!.id).toBe(1);
      expect(merged.violations[1]!.id).toBe(2);
    });

    it('should work with number violations', () => {
      const result1: ConfigCheckResult<number> = {
        violations: [1, 2, 3],
        suggestions: [],
      };
      const result2: ConfigCheckResult<number> = {
        violations: [4, 5],
        suggestions: [],
      };

      const merged = mergeConfigResults(result1, result2);

      expect(merged.violations).toEqual([1, 2, 3, 4, 5]);
    });

    it('should not mutate original results', () => {
      const result1: ConfigCheckResult<string> = {
        violations: ['v1'],
        suggestions: ['s1'],
      };
      const result2: ConfigCheckResult<string> = {
        violations: ['v2'],
        suggestions: ['s2'],
      };

      const originalViolations1 = [...result1.violations];
      const originalSuggestions1 = [...result1.suggestions];

      mergeConfigResults(result1, result2);

      expect(result1.violations).toEqual(originalViolations1);
      expect(result1.suggestions).toEqual(originalSuggestions1);
    });

    it('should handle large number of results', () => {
      const results: Array<ConfigCheckResult<string>> = [];
      for (let i = 0; i < 100; i++) {
        results.push({
          violations: [`v${i}`],
          suggestions: [`s${i}`],
        });
      }

      const merged = mergeConfigResults(...results);

      expect(merged.violations).toHaveLength(100);
      expect(merged.suggestions).toHaveLength(100);
    });

    it('should handle duplicate violations', () => {
      const result1: ConfigCheckResult<string> = {
        violations: ['same', 'unique1'],
        suggestions: [],
      };
      const result2: ConfigCheckResult<string> = {
        violations: ['same', 'unique2'],
        suggestions: [],
      };

      const merged = mergeConfigResults(result1, result2);

      // Duplicates are preserved (not deduplicated)
      expect(merged.violations).toEqual(['same', 'unique1', 'same', 'unique2']);
    });

    it('should handle duplicate suggestions', () => {
      const result1: ConfigCheckResult<string> = {
        violations: [],
        suggestions: ['same', 'unique1'],
      };
      const result2: ConfigCheckResult<string> = {
        violations: [],
        suggestions: ['same', 'unique2'],
      };

      const merged = mergeConfigResults(result1, result2);

      // Duplicates are preserved (not deduplicated)
      expect(merged.suggestions).toEqual([
        'same',
        'unique1',
        'same',
        'unique2',
      ]);
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration tests', () => {
    it('should work with createEmptyConfigResult and mergeConfigResults together', () => {
      const empty1 = createEmptyConfigResult<string>();
      const empty2 = createEmptyConfigResult<string>();

      empty1.violations.push('v1');
      empty2.suggestions.push('s1');

      const merged = mergeConfigResults(empty1, empty2);

      expect(merged.violations).toEqual(['v1']);
      expect(merged.suggestions).toEqual(['s1']);
    });

    it('should support typical security check workflow', () => {
      // Simulate multiple security checks
      const checkEncryption = (): ConfigCheckResult<string> => {
        const result = createEmptyConfigResult<string>();
        result.violations.push('Weak encryption detected');
        result.suggestions.push('Use AES-256 encryption');
        return result;
      };

      const checkAuthentication = (): ConfigCheckResult<string> => {
        const result = createEmptyConfigResult<string>();
        result.suggestions.push('Enable MFA');
        return result;
      };

      const checkAuthorization = (): ConfigCheckResult<string> => {
        const result = createEmptyConfigResult<string>();
        result.violations.push('Missing RBAC');
        result.violations.push('No permission checks');
        return result;
      };

      const encryptionResult = checkEncryption();
      const authResult = checkAuthentication();
      const authzResult = checkAuthorization();

      const finalResult = mergeConfigResults(
        encryptionResult,
        authResult,
        authzResult
      );

      expect(finalResult.violations).toHaveLength(3);
      expect(finalResult.suggestions).toHaveLength(2);
    });

    it('should handle complex violation objects in workflow', () => {
      interface SecurityViolation {
        rule: string;
        severity: 'critical' | 'high' | 'medium' | 'low';
        file: string;
        line: number;
      }

      const checkFile1 = (): ConfigCheckResult<SecurityViolation> => {
        const result = createEmptyConfigResult<SecurityViolation>();
        result.violations.push({
          rule: 'no-hardcoded-secrets',
          severity: 'critical',
          file: 'config.ts',
          line: 15,
        });
        return result;
      };

      const checkFile2 = (): ConfigCheckResult<SecurityViolation> => {
        const result = createEmptyConfigResult<SecurityViolation>();
        result.violations.push({
          rule: 'no-sql-injection',
          severity: 'high',
          file: 'database.ts',
          line: 42,
        });
        result.suggestions.push('Use parameterized queries');
        return result;
      };

      const merged = mergeConfigResults(checkFile1(), checkFile2());

      expect(merged.violations).toHaveLength(2);
      expect(merged.violations[0]!.severity).toBe('critical');
      expect(merged.violations[1]!.severity).toBe('high');
      expect(merged.suggestions).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge cases', () => {
    it('should handle results with undefined-like values in arrays', () => {
      const result1: ConfigCheckResult<string | null> = {
        violations: ['v1', null as unknown as string],
        suggestions: [],
      };
      const result2: ConfigCheckResult<string | null> = {
        violations: ['v2'],
        suggestions: [],
      };

      const merged = mergeConfigResults(result1, result2);

      expect(merged.violations).toHaveLength(3);
    });

    it('should handle very long violation strings', () => {
      const longString = 'a'.repeat(10000);
      const result: ConfigCheckResult<string> = {
        violations: [longString],
        suggestions: [],
      };

      const merged = mergeConfigResults(result);

      expect(merged.violations[0]!.length).toBe(10000);
    });

    it('should handle unicode in violations and suggestions', () => {
      const result: ConfigCheckResult<string> = {
        violations: ['错误: 安全问题', 'Ошибка: Проблема безопасности'],
        suggestions: ['建议: 修复问题', '🔒 Enable encryption'],
      };

      const merged = mergeConfigResults(result);

      expect(merged.violations).toContain('错误: 安全问题');
      expect(merged.suggestions).toContain('🔒 Enable encryption');
    });

    it('should handle empty strings in arrays', () => {
      const result1: ConfigCheckResult<string> = {
        violations: ['', 'valid'],
        suggestions: ['', 'suggestion'],
      };
      const result2: ConfigCheckResult<string> = {
        violations: [''],
        suggestions: [],
      };

      const merged = mergeConfigResults(result1, result2);

      expect(merged.violations).toContain('');
      expect(merged.violations).toContain('valid');
    });
  });
});

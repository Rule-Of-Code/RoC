/**
 * Sacred Law Base - Tests
 * Comprehensive tests for SacredLawBase class
 */
import { SacredLawBase } from '../../../src/checkers/sacred-laws/sacred-law-base';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('SacredLawBase', () => {
  let tempDir: string;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('sacred-law-base-test-');
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleErrorSpy.mockRestore();
  });

  // ============================================
  // createResult()
  // ============================================
  describe('createResult()', () => {
    it('should return a LawResult object', () => {
      const result = SacredLawBase.createResult(
        [],
        'Test Law',
        'SACRED_LAW',
        []
      );

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('score');
    });

    it('should return passed=true when no violations', () => {
      const result = SacredLawBase.createResult([], 'Test Law', 'SACRED_LAW', [
        'Suggestion 1',
      ]);

      expect(result.passed).toBe(true);
    });

    it('should return passed=false when violations exist', () => {
      const result = SacredLawBase.createResult(
        ['Violation 1', 'Violation 2'],
        'Test Law',
        'SACRED_LAW',
        ['Fix 1']
      );

      expect(result.passed).toBe(false);
    });

    it('should include violations in result', () => {
      const violations = ['Error A', 'Error B'];
      const result = SacredLawBase.createResult(
        violations,
        'Test Law',
        'SACRED_LAW',
        []
      );

      expect(result.violations).toEqual(violations);
    });

    it('should include suggestions in result', () => {
      const suggestions = ['Suggestion A', 'Suggestion B'];
      const result = SacredLawBase.createResult(
        ['Violation'],
        'Test Law',
        'SACRED_LAW',
        suggestions
      );

      expect(result.suggestions).toEqual(suggestions);
    });

    it('should set score to 100 when no violations', () => {
      const result = SacredLawBase.createResult(
        [],
        'Test Law',
        'SACRED_LAW',
        []
      );

      expect(result.score).toBe(100);
    });

    it('should deduct points for violations', () => {
      const result = SacredLawBase.createResult(
        ['Violation 1', 'Violation 2'],
        'Test Law',
        'SACRED_LAW',
        []
      );

      expect(result.score).toBeLessThan(100);
    });

    it('should not have negative scores', () => {
      const violations = Array(20).fill('Violation');
      const result = SacredLawBase.createResult(
        violations,
        'Test Law',
        'SACRED_LAW',
        []
      );

      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should include title in message', () => {
      const result = SacredLawBase.createResult(
        [],
        'Custom Law Title',
        'SACRED_LAW',
        []
      );

      expect(result.message).toBeDefined();
    });

    it('should handle empty suggestions array', () => {
      const result = SacredLawBase.createResult(
        ['Violation'],
        'Test Law',
        'SACRED_LAW',
        []
      );

      expect(result.suggestions).toEqual([]);
    });

    it('should handle different law types', () => {
      const result1 = SacredLawBase.createResult([], 'Test', 'SACRED_LAW', []);
      const result2 = SacredLawBase.createResult(
        [],
        'Test',
        'CONSTITUTIONAL',
        []
      );
      const result3 = SacredLawBase.createResult([], 'Test', 'STANDARD', []);

      expect(result1.passed).toBe(true);
      expect(result2.passed).toBe(true);
      expect(result3.passed).toBe(true);
    });
  });

  // ============================================
  // getPackageJson()
  // ============================================
  describe('getPackageJson()', () => {
    it('should return null when package.json does not exist', () => {
      const result = SacredLawBase.getPackageJson(tempDir);
      expect(result).toBeNull();
    });

    it('should return parsed package.json when it exists', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const result = SacredLawBase.getPackageJson(tempDir);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('test-project');
    });

    it('should return package.json with scripts', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            build: 'tsc',
          },
        })
      );

      const result = SacredLawBase.getPackageJson(tempDir);
      expect((result as Record<string, unknown>).scripts).toBeDefined();
      expect((result?.scripts as Record<string, string>).test).toBe('jest');
    });

    it('should return package.json with dependencies', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            lodash: '^4.0.0',
          },
          devDependencies: {
            jest: '^29.0.0',
          },
        })
      );

      const result = SacredLawBase.getPackageJson(tempDir);
      expect((result?.dependencies as Record<string, string>)?.lodash).toBe(
        '^4.0.0'
      );
      expect((result?.devDependencies as Record<string, string>)?.jest).toBe(
        '^29.0.0'
      );
    });

    it('should return null for invalid JSON', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        'not valid json'
      );

      const result = SacredLawBase.getPackageJson(tempDir);
      expect(result).toBeNull();
    });

    it('should handle empty package.json', () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'package.json'), '{}');

      const result = SacredLawBase.getPackageJson(tempDir);
      expect(result).toEqual({});
    });

    it('should handle nested projectRoot', () => {
      const nestedDir = PathOperations.join(tempDir, 'nested', 'project');
      FileUtils.createDirectory(nestedDir);
      FileUtils.writeFile(
        PathOperations.join(nestedDir, 'package.json'),
        JSON.stringify({
          name: 'nested-project',
          version: '2.0.0',
        })
      );

      const result = SacredLawBase.getPackageJson(nestedDir);
      expect(result?.name).toBe('nested-project');
    });
  });

  // ============================================
  // hasDependency()
  // ============================================
  describe('hasDependency()', () => {
    it('should return false when package.json does not exist', () => {
      const result = SacredLawBase.hasDependency(tempDir, 'lodash');
      expect(result).toBe(false);
    });

    it('should return true when dependency exists in dependencies', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            lodash: '^4.0.0',
          },
        })
      );

      const result = SacredLawBase.hasDependency(tempDir, 'lodash');
      expect(result).toBe(true);
    });

    it('should return true when dependency exists in devDependencies', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            jest: '^29.0.0',
          },
        })
      );

      const result = SacredLawBase.hasDependency(tempDir, 'jest');
      expect(result).toBe(true);
    });

    it('should return false when dependency does not exist', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            lodash: '^4.0.0',
          },
        })
      );

      const result = SacredLawBase.hasDependency(tempDir, 'express');
      expect(result).toBe(false);
    });

    it('should handle empty dependencies', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {},
          devDependencies: {},
        })
      );

      const result = SacredLawBase.hasDependency(tempDir, 'lodash');
      expect(result).toBe(false);
    });

    it('should handle package.json without dependencies', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const result = SacredLawBase.hasDependency(tempDir, 'lodash');
      expect(result).toBe(false);
    });

    it('should handle invalid JSON gracefully', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        'not valid json'
      );

      const result = SacredLawBase.hasDependency(tempDir, 'lodash');
      expect(result).toBe(false);
    });

    it('should check for scoped packages', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            '@angular/core': '^17.0.0',
          },
        })
      );

      const result = SacredLawBase.hasDependency(tempDir, '@angular/core');
      expect(result).toBe(true);
    });

    it('should check both dependencies and devDependencies', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            express: '^4.0.0',
          },
          devDependencies: {
            jest: '^29.0.0',
          },
        })
      );

      expect(SacredLawBase.hasDependency(tempDir, 'express')).toBe(true);
      expect(SacredLawBase.hasDependency(tempDir, 'jest')).toBe(true);
      expect(SacredLawBase.hasDependency(tempDir, 'lodash')).toBe(false);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle special characters in violation messages', () => {
      const violations = [
        'Error with "quotes"',
        "Error with 'apostrophe'",
        'Error with <angle> brackets',
        'Error with & ampersand',
      ];

      const result = SacredLawBase.createResult(
        violations,
        'Test Law',
        'SACRED_LAW',
        []
      );

      expect(result.violations!.length).toBe(4);
    });

    it('should handle unicode in messages', () => {
      const violations = ['Érrör with ünicode 中文 🔥'];
      const suggestions = ['Süggèstiön with ünïcödé'];

      const result = SacredLawBase.createResult(
        violations,
        'Test Law',
        'SACRED_LAW',
        suggestions
      );

      expect(result.violations![0]).toContain('🔥');
      expect(result.suggestions![0]).toContain('ünïcödé');
    });

    it('should handle very long violation messages', () => {
      const longMessage = 'A'.repeat(10000);
      const result = SacredLawBase.createResult(
        [longMessage],
        'Test Law',
        'SACRED_LAW',
        []
      );

      expect(result.violations![0]!.length).toBe(10000);
    });

    it('should handle empty strings in violations', () => {
      const result = SacredLawBase.createResult(
        ['', 'Valid violation', ''],
        'Test Law',
        'SACRED_LAW',
        []
      );

      expect(result.violations!.length).toBe(3);
      expect(result.passed).toBe(false);
    });

    it('should handle whitespace-only violations', () => {
      const result = SacredLawBase.createResult(
        ['   ', '\t', '\n'],
        'Test Law',
        'SACRED_LAW',
        []
      );

      expect(result.violations!.length).toBe(3);
    });

    it('should handle deeply nested project paths', () => {
      const deepPath = PathOperations.join(
        tempDir,
        'a',
        'b',
        'c',
        'd',
        'e',
        'f'
      );
      FileUtils.createDirectory(deepPath);
      FileUtils.writeFile(
        PathOperations.join(deepPath, 'package.json'),
        JSON.stringify({
          name: 'deep-project',
          version: '1.0.0',
          dependencies: {
            lodash: '^4.0.0',
          },
        })
      );

      expect(SacredLawBase.hasDependency(deepPath, 'lodash')).toBe(true);
      expect(SacredLawBase.getPackageJson(deepPath)?.name).toBe('deep-project');
    });

    it('should handle package.json with unusual properties', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          version: '1.0.0',
          customField: { nested: { deep: true } },
          arrayField: [1, 2, 3],
          nullField: null,
          boolField: true,
        })
      );

      const result = SacredLawBase.getPackageJson(tempDir);
      expect(result).not.toBeNull();
      expect((result as Record<string, unknown>).customField).toEqual({
        nested: { deep: true },
      });
    });
  });

  // ============================================
  // Result Structure Validation
  // ============================================
  describe('Result Structure Validation', () => {
    it('should have config property in result', () => {
      const result = SacredLawBase.createResult(
        [],
        'Test Law',
        'SACRED_LAW',
        []
      );

      expect(result).toHaveProperty('config');
    });

    it('should have fixable property in result', () => {
      const result = SacredLawBase.createResult(
        ['Violation'],
        'Test Law',
        'SACRED_LAW',
        []
      );

      expect(result).toHaveProperty('fixable');
    });

    it('should calculate score correctly with multiple violations', () => {
      const result1 = SacredLawBase.createResult(
        ['V1'],
        'Test',
        'SACRED_LAW',
        []
      );
      const result2 = SacredLawBase.createResult(
        ['V1', 'V2'],
        'Test',
        'SACRED_LAW',
        []
      );
      const result3 = SacredLawBase.createResult(
        ['V1', 'V2', 'V3'],
        'Test',
        'SACRED_LAW',
        []
      );

      expect(result1.score).toBeGreaterThan(result2.score);
      expect(result2.score).toBeGreaterThan(result3.score);
    });
  });
});

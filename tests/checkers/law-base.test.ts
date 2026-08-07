/**
 * Law Base - Tests
 * Tests for LawBase class - common functionality for law implementations
 */
import { LawBase } from '../../src/checkers/law-base';
import type { LawCheckContext } from '../../src/types/law.types';

describe('LawBase', () => {
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
    it('should create passed result when no violations', () => {
      const result = LawBase.createResult(
        [],
        'TestLaw',
        'testing',
        ['Recommendation 1'],
        mockContext
      );
      expect(result.passed).toBe(true);
    });

    it('should create failing result when violations exist', () => {
      const result = LawBase.createResult(
        ['Violation 1'],
        'TestLaw',
        'testing',
        ['Recommendation 1'],
        mockContext
      );
      expect(result.passed).toBe(false);
    });

    it('should convert law name to lowercase kebab-case', () => {
      const result = LawBase.createResult(
        [],
        'Test Law Name',
        'testing',
        [],
        mockContext
      );
      expect(result.lawName).toBe('test-law-name');
    });

    it('should handle multiple spaces in law name', () => {
      const result = LawBase.createResult(
        [],
        'Test   Multiple   Spaces',
        'testing',
        [],
        mockContext
      );
      expect(result.lawName).toBe('test-multiple-spaces');
    });

    it('should set score to 100 when no violations', () => {
      const result = LawBase.createResult(
        [],
        'TestLaw',
        'testing',
        [],
        mockContext
      );
      expect(result.score).toBe(100);
    });

    it('should deduct 10 points per violation', () => {
      const result = LawBase.createResult(
        ['Violation 1', 'Violation 2'],
        'TestLaw',
        'testing',
        [],
        mockContext
      );
      expect(result.score).toBe(80);
    });

    it('should not allow negative scores', () => {
      const violations = Array(15).fill('Violation');
      const result = LawBase.createResult(
        violations,
        'TestLaw',
        'testing',
        [],
        mockContext
      );
      expect(result.score).toBe(0);
    });

    it('should include violations in result', () => {
      const violations = ['Violation A', 'Violation B'];
      const result = LawBase.createResult(
        violations,
        'TestLaw',
        'testing',
        [],
        mockContext
      );
      expect(result.violations).toEqual(violations);
    });

    it('should include suggestions when violations exist', () => {
      const recommendations = ['Fix A', 'Fix B'];
      const result = LawBase.createResult(
        ['Violation 1'],
        'TestLaw',
        'testing',
        recommendations,
        mockContext
      );
      expect(result.suggestions).toEqual(recommendations);
    });

    it('should have empty suggestions when no violations', () => {
      const result = LawBase.createResult(
        [],
        'TestLaw',
        'testing',
        ['Recommendation 1'],
        mockContext
      );
      expect(result.suggestions).toEqual([]);
    });

    it('should set success message when no violations', () => {
      const result = LawBase.createResult(
        [],
        'TestLaw',
        'testing',
        [],
        mockContext
      );
      expect(result.message).toBe('TestLaw compliance verified');
    });

    it('should set violation count message when violations exist', () => {
      const result = LawBase.createResult(
        ['Violation 1', 'Violation 2', 'Violation 3'],
        'TestLaw',
        'testing',
        [],
        mockContext
      );
      expect(result.message).toBe('3 TestLaw violations found');
    });

    it('should include config from context', () => {
      const result = LawBase.createResult(
        [],
        'TestLaw',
        'testing',
        [],
        mockContext
      );
      expect(result.config).toBe(mockContext.config);
    });
  });

  // ============================================
  // createErrorResult
  // ============================================
  describe('createErrorResult()', () => {
    it('should return passed=false', () => {
      const result = LawBase.createErrorResult(
        'TestChecker',
        new Error('Test error'),
        mockContext
      );
      expect(result.passed).toBe(false);
    });

    it('should return score of 0', () => {
      const result = LawBase.createErrorResult(
        'TestChecker',
        new Error('Test error'),
        mockContext
      );
      expect(result.score).toBe(0);
    });

    it('should include checker name in message', () => {
      const result = LawBase.createErrorResult(
        'SecurityChecker',
        new Error('Test error'),
        mockContext
      );
      expect(result.message).toContain('SecurityChecker');
    });

    it('should include ❌ emoji in message', () => {
      const result = LawBase.createErrorResult(
        'TestChecker',
        new Error('Test error'),
        mockContext
      );
      expect(result.message).toContain('❌');
    });

    it('should include error message from Error object', () => {
      const result = LawBase.createErrorResult(
        'TestChecker',
        new Error('Specific error message'),
        mockContext
      );
      expect(result.message).toContain('Specific error message');
    });

    it('should handle string errors', () => {
      const result = LawBase.createErrorResult(
        'TestChecker',
        'String error message',
        mockContext
      );
      expect(result.message).toContain('String error message');
    });

    it('should handle number errors', () => {
      const result = LawBase.createErrorResult('TestChecker', 404, mockContext);
      expect(result.message).toContain('404');
    });

    it('should have empty details array', () => {
      const result = LawBase.createErrorResult(
        'TestChecker',
        new Error('Test error'),
        mockContext
      );
      expect(result.details).toEqual([]);
    });

    it('should have empty violations array', () => {
      const result = LawBase.createErrorResult(
        'TestChecker',
        new Error('Test error'),
        mockContext
      );
      expect(result.violations).toEqual([]);
    });

    it('should include default suggestion', () => {
      const result = LawBase.createErrorResult(
        'TestChecker',
        new Error('Test error'),
        mockContext
      );
      expect(result.suggestions).toEqual([
        'Check project structure and dependencies',
      ]);
    });

    it('should include config from context', () => {
      const result = LawBase.createErrorResult(
        'TestChecker',
        new Error('Test error'),
        mockContext
      );
      expect(result.config).toBe(mockContext.config);
    });
  });

  // ============================================
  // buildDetailedResult
  // ============================================
  describe('buildDetailedResult()', () => {
    it('should set passed status from options', () => {
      const result = LawBase.buildDetailedResult({
        passed: true,
        message: 'Success',
        violations: [],
        suggestions: [],
        score: 100,
        context: mockContext,
      });
      expect(result.passed).toBe(true);
    });

    it('should set message from options', () => {
      const result = LawBase.buildDetailedResult({
        passed: true,
        message: 'Custom message',
        violations: [],
        suggestions: [],
        score: 100,
        context: mockContext,
      });
      expect(result.message).toBe('Custom message');
    });

    it('should set violations from options', () => {
      const violations = ['Violation 1', 'Violation 2'];
      const result = LawBase.buildDetailedResult({
        passed: false,
        message: 'Issues found',
        violations,
        suggestions: [],
        score: 50,
        context: mockContext,
      });
      expect(result.violations).toEqual(violations);
    });

    it('should set suggestions from options', () => {
      const suggestions = ['Fix 1', 'Fix 2'];
      const result = LawBase.buildDetailedResult({
        passed: false,
        message: 'Issues found',
        violations: ['Violation 1'],
        suggestions,
        score: 50,
        context: mockContext,
      });
      expect(result.suggestions).toEqual(suggestions);
    });

    it('should combine violations and suggestions in details', () => {
      const result = LawBase.buildDetailedResult({
        passed: false,
        message: 'Issues found',
        violations: ['Violation 1'],
        suggestions: ['Suggestion 1'],
        score: 50,
        context: mockContext,
      });
      expect(result.details).toEqual(['Violation 1', 'Suggestion 1']);
    });

    it('should set score from options', () => {
      const result = LawBase.buildDetailedResult({
        passed: true,
        message: 'Success',
        violations: [],
        suggestions: [],
        score: 85,
        context: mockContext,
      });
      expect(result.score).toBe(85);
    });

    it('should not allow negative scores', () => {
      const result = LawBase.buildDetailedResult({
        passed: false,
        message: 'Failed',
        violations: [],
        suggestions: [],
        score: -10,
        context: mockContext,
      });
      expect(result.score).toBe(0);
    });

    it('should include config from context', () => {
      const result = LawBase.buildDetailedResult({
        passed: true,
        message: 'Success',
        violations: [],
        suggestions: [],
        score: 100,
        context: mockContext,
      });
      expect(result.config).toBe(mockContext.config);
    });

    it('should handle empty violations and suggestions', () => {
      const result = LawBase.buildDetailedResult({
        passed: true,
        message: 'Success',
        violations: [],
        suggestions: [],
        score: 100,
        context: mockContext,
      });
      expect(result.details).toEqual([]);
    });

    it('should preserve order - violations before suggestions', () => {
      const result = LawBase.buildDetailedResult({
        passed: false,
        message: 'Issues',
        violations: ['V1', 'V2'],
        suggestions: ['S1', 'S2'],
        score: 50,
        context: mockContext,
      });
      expect(result.details).toEqual(['V1', 'V2', 'S1', 'S2']);
    });
  });
});

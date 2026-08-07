/**
 * Law Result Builder - Tests
 * Tests for LawResultBuilder class
 */
import { LawResultBuilder } from '../../../src/laws/dependency-scanning/law-result-builder';
import type { LawCheckContext } from '../../../src/types/law.types';

describe('LawResultBuilder', () => {
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
  // buildSuccess
  // ============================================
  describe('buildSuccess()', () => {
    it('should build successful result with passed=true', () => {
      const result = LawResultBuilder.buildSuccess(
        true,
        100,
        'All checks passed',
        [],
        mockContext
      );
      expect(result.passed).toBe(true);
    });

    it('should build failing result with passed=false', () => {
      const result = LawResultBuilder.buildSuccess(
        false,
        50,
        'Issues found',
        ['Issue 1'],
        mockContext
      );
      expect(result.passed).toBe(false);
    });

    it('should include score', () => {
      const result = LawResultBuilder.buildSuccess(
        true,
        85,
        'Message',
        [],
        mockContext
      );
      expect(result.score).toBe(85);
    });

    it('should not allow negative scores', () => {
      const result = LawResultBuilder.buildSuccess(
        false,
        -10,
        'Message',
        [],
        mockContext
      );
      expect(result.score).toBe(0);
    });

    it('should include message', () => {
      const result = LawResultBuilder.buildSuccess(
        true,
        100,
        'Custom message',
        [],
        mockContext
      );
      expect(result.message).toBe('Custom message');
    });

    it('should include details', () => {
      const details = ['Detail 1', 'Detail 2'];
      const result = LawResultBuilder.buildSuccess(
        false,
        50,
        'Message',
        details,
        mockContext
      );
      expect(result.details).toEqual(details);
    });

    it('should set violations from details', () => {
      const details = ['Violation 1', 'Violation 2'];
      const result = LawResultBuilder.buildSuccess(
        false,
        50,
        'Message',
        details,
        mockContext
      );
      expect(result.violations).toEqual(details);
    });

    it('should generate suggestions from details', () => {
      const details = ['Issue 1', 'Issue 2'];
      const result = LawResultBuilder.buildSuccess(
        false,
        50,
        'Message',
        details,
        mockContext
      );
      expect(result.suggestions).toEqual(['Fix: Issue 1', 'Fix: Issue 2']);
    });

    it('should include config from context', () => {
      const result = LawResultBuilder.buildSuccess(
        true,
        100,
        'Message',
        [],
        mockContext
      );
      expect(result.config).toBe(mockContext.config);
    });

    it('should handle empty details', () => {
      const result = LawResultBuilder.buildSuccess(
        true,
        100,
        'Message',
        [],
        mockContext
      );
      expect(result.details).toEqual([]);
      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });
  });

  // ============================================
  // buildError
  // ============================================
  describe('buildError()', () => {
    it('should build error result with passed=false', () => {
      const error = new Error('Test error');
      const result = LawResultBuilder.buildError(
        error,
        'Dependency scan',
        mockContext,
        'Check dependencies'
      );
      expect(result.passed).toBe(false);
    });

    it('should have score of 0', () => {
      const error = new Error('Test error');
      const result = LawResultBuilder.buildError(
        error,
        'Prefix',
        mockContext,
        'Suggestion'
      );
      expect(result.score).toBe(0);
    });

    it('should include error message from Error object', () => {
      const error = new Error('Specific error message');
      const result = LawResultBuilder.buildError(
        error,
        'Scan',
        mockContext,
        'Suggestion'
      );
      expect(result.message).toContain('Specific error message');
    });

    it('should include error prefix in message', () => {
      const error = new Error('Error');
      const result = LawResultBuilder.buildError(
        error,
        'NPM audit',
        mockContext,
        'Suggestion'
      );
      expect(result.message).toContain('NPM audit');
    });

    it('should include ❌ emoji in message', () => {
      const error = new Error('Error');
      const result = LawResultBuilder.buildError(
        error,
        'Prefix',
        mockContext,
        'Suggestion'
      );
      expect(result.message).toContain('❌');
    });

    it('should handle string errors', () => {
      const result = LawResultBuilder.buildError(
        'String error message',
        'Prefix',
        mockContext,
        'Suggestion'
      );
      expect(result.message).toContain('String error message');
    });

    it('should handle number errors', () => {
      const result = LawResultBuilder.buildError(
        404,
        'Prefix',
        mockContext,
        'Suggestion'
      );
      expect(result.message).toContain('404');
    });

    it('should have empty details', () => {
      const error = new Error('Error');
      const result = LawResultBuilder.buildError(
        error,
        'Prefix',
        mockContext,
        'Suggestion'
      );
      expect(result.details).toEqual([]);
    });

    it('should have empty violations', () => {
      const error = new Error('Error');
      const result = LawResultBuilder.buildError(
        error,
        'Prefix',
        mockContext,
        'Suggestion'
      );
      expect(result.violations).toEqual([]);
    });

    it('should include suggestion', () => {
      const error = new Error('Error');
      const result = LawResultBuilder.buildError(
        error,
        'Prefix',
        mockContext,
        'Run npm audit fix'
      );
      expect(result.suggestions).toEqual(['Run npm audit fix']);
    });

    it('should include config from context', () => {
      const error = new Error('Error');
      const result = LawResultBuilder.buildError(
        error,
        'Prefix',
        mockContext,
        'Suggestion'
      );
      expect(result.config).toBe(mockContext.config);
    });
  });
});

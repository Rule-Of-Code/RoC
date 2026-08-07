/**
 * @fileoverview Tests for law-result-utils.ts
 * @description Tests for LawResultUtils class
 */

import type { LawCheckContext } from '../../src/types/law.types';
import { ConfigFileUtils } from '../../src/utils/config-file-utils';
import { LawResultUtils } from '../../src/utils/law-result-utils';

const createConfig = () => ConfigFileUtils.getMinimalDefaultConfig();

describe('utils/law-result-utils', () => {
  const mockConfig = createConfig();
  const mockContext: LawCheckContext = {
    config: mockConfig,
    projectRoot: '/test/project',
  };

  describe('LawResultUtils.createResult', () => {
    describe('passing results (no violations)', () => {
      it('should create passing result when no violations', () => {
        const result = LawResultUtils.createResult({
          violations: [],
          context: mockContext,
        });

        expect(result.passed).toBe(true);
        expect(result.score).toBe(100);
        expect(result.violations).toEqual([]);
      });

      it('should have default message for passing result', () => {
        const result = LawResultUtils.createResult({
          violations: [],
          context: mockContext,
        });

        expect(result.message).toBe('Law compliance verified');
      });

      it('should include lawName in passing message', () => {
        const result = LawResultUtils.createResult({
          violations: [],
          context: mockContext,
          lawName: 'TypeScript',
        });

        expect(result.message).toBe('TypeScript compliance verified');
      });

      it('should use custom message when provided', () => {
        const result = LawResultUtils.createResult({
          violations: [],
          context: mockContext,
          customMessage: 'All checks passed successfully',
        });

        expect(result.message).toBe('All checks passed successfully');
      });

      it('should not be fixable when no violations', () => {
        const result = LawResultUtils.createResult({
          violations: [],
          context: mockContext,
        });

        expect(result.fixable).toBe(false);
      });
    });

    describe('failing results (with violations)', () => {
      it('should create failing result with violations', () => {
        const result = LawResultUtils.createResult({
          violations: ['Error 1', 'Error 2'],
          context: mockContext,
        });

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(2);
      });

      it('should calculate score based on violations', () => {
        const result = LawResultUtils.createResult({
          violations: ['Error 1', 'Error 2', 'Error 3'],
          context: mockContext,
        });

        expect(result.score).toBe(70); // 100 - 3 * 10
      });

      it('should not go below 0 score', () => {
        const violations = Array(15).fill('Error');
        const result = LawResultUtils.createResult({
          violations,
          context: mockContext,
        });

        expect(result.score).toBe(0);
      });

      it('should have correct message with violation count', () => {
        const result = LawResultUtils.createResult({
          violations: ['Error 1', 'Error 2'],
          context: mockContext,
        });

        expect(result.message).toBe('2 violations found');
      });

      it('should include lawName in failing message', () => {
        const result = LawResultUtils.createResult({
          violations: ['Error'],
          context: mockContext,
          lawName: 'ESLint',
        });

        expect(result.message).toBe('1 ESLint violations found');
      });

      it('should be fixable when violations exist', () => {
        const result = LawResultUtils.createResult({
          violations: ['Error'],
          context: mockContext,
        });

        expect(result.fixable).toBe(true);
      });

      it('should use custom fixable value', () => {
        const result = LawResultUtils.createResult({
          violations: ['Error'],
          context: mockContext,
          fixable: false,
        });

        expect(result.fixable).toBe(false);
      });
    });

    describe('score multiplier', () => {
      it('should use default score multiplier of 10', () => {
        const result = LawResultUtils.createResult({
          violations: ['Error'],
          context: mockContext,
        });

        expect(result.score).toBe(90);
      });

      it('should use custom score multiplier', () => {
        const result = LawResultUtils.createResult({
          violations: ['Error'],
          context: mockContext,
          scoreMultiplier: 25,
        });

        expect(result.score).toBe(75);
      });

      it('should handle score multiplier of 0', () => {
        const result = LawResultUtils.createResult({
          violations: ['Error'],
          context: mockContext,
          scoreMultiplier: 0,
        });

        expect(result.score).toBe(100);
      });

      it('should handle high score multiplier', () => {
        const result = LawResultUtils.createResult({
          violations: ['Error'],
          context: mockContext,
          scoreMultiplier: 100,
        });

        expect(result.score).toBe(0);
      });
    });

    describe('suggestions', () => {
      it('should include suggestions in result', () => {
        const result = LawResultUtils.createResult({
          violations: ['Error'],
          suggestions: ['Fix it', 'Update config'],
          context: mockContext,
        });

        expect(result.suggestions).toEqual(['Fix it', 'Update config']);
      });

      it('should deduplicate suggestions', () => {
        const result = LawResultUtils.createResult({
          violations: ['Error'],
          suggestions: ['Fix it', 'Fix it', 'Update'],
          context: mockContext,
        });

        expect(result.suggestions).toEqual(['Fix it', 'Update']);
      });

      it('should default to empty suggestions', () => {
        const result = LawResultUtils.createResult({
          violations: [],
          context: mockContext,
        });

        expect(result.suggestions).toEqual([]);
      });
    });

    describe('metrics', () => {
      it('should include metrics when provided', () => {
        const result = LawResultUtils.createResult({
          violations: ['Error'],
          context: mockContext,
          metrics: { fileCount: 10 },
        });

        expect(result.metrics).toEqual({
          totalViolations: 1,
          fileCount: 10,
        });
      });

      it('should not include metrics when empty', () => {
        const result = LawResultUtils.createResult({
          violations: [],
          context: mockContext,
        });

        expect(result.metrics).toBeUndefined();
      });

      it('should include totalViolations in metrics', () => {
        const result = LawResultUtils.createResult({
          violations: ['Error 1', 'Error 2'],
          context: mockContext,
          metrics: { custom: 'value' },
        });

        expect(result.metrics?.totalViolations).toBe(2);
      });
    });

    describe('lawName', () => {
      it('should include lawName in result when provided', () => {
        const result = LawResultUtils.createResult({
          violations: [],
          context: mockContext,
          lawName: 'test-law',
        });

        expect(result.lawName).toBe('test-law');
      });

      it('should not include lawName when not provided', () => {
        const result = LawResultUtils.createResult({
          violations: [],
          context: mockContext,
        });

        expect(result.lawName).toBeUndefined();
      });
    });

    describe('config', () => {
      it('should include config from context', () => {
        const result = LawResultUtils.createResult({
          violations: [],
          context: mockContext,
        });

        expect(result.config).toBe(mockContext.config);
      });
    });

    describe('edge cases', () => {
      it('should handle empty violation strings', () => {
        const result = LawResultUtils.createResult({
          violations: ['', ''],
          context: mockContext,
        });

        expect(result.violations).toHaveLength(2);
        expect(result.passed).toBe(false);
      });

      it('should handle unicode in violations', () => {
        const result = LawResultUtils.createResult({
          violations: ['Грешка: невалиден компонент 🚫'],
          context: mockContext,
        });

        expect(result.violations).toContain('Грешка: невалиден компонент 🚫');
      });

      it('should handle very long lawName', () => {
        const longName = 'a'.repeat(1000);
        const result = LawResultUtils.createResult({
          violations: [],
          context: mockContext,
          lawName: longName,
        });

        expect(result.lawName).toBe(longName);
      });

      it('should handle complex metrics object', () => {
        const result = LawResultUtils.createResult({
          violations: ['Error'],
          context: mockContext,
          metrics: {
            nested: { deep: { value: 42 } },
            array: [1, 2, 3],
          },
        });

        expect(result.metrics?.nested).toEqual({ deep: { value: 42 } });
        expect(result.metrics?.array).toEqual([1, 2, 3]);
      });
    });
  });
});

/**
 * @fileoverview Tests for law-error-handling-utils.ts
 * @description Tests for LawErrorHandlingUtils class
 */

import { ConfigFileUtils } from '../../src/utils/config-file-utils';
import { LawErrorHandlingUtils } from '../../src/utils/law-error-handling-utils';

const createConfig = () => ConfigFileUtils.getMinimalDefaultConfig();

describe('utils/law-error-handling-utils', () => {
  const mockConfig = createConfig();

  describe('LawErrorHandlingUtils.createErrorResult', () => {
    it('should create error result from Error object', () => {
      const error = new Error('Test error message');
      const result = LawErrorHandlingUtils.createErrorResult(
        error,
        'test-law',
        mockConfig
      );

      expect(result.passed).toBe(false);
      expect(result.message).toBe('Failed to check test-law');
      expect(result.details).toContain('Test error message');
      expect(result.violations).toContain('Test error message');
      expect(result.score).toBe(0);
    });

    it('should create error result from string error', () => {
      const result = LawErrorHandlingUtils.createErrorResult(
        'string error',
        'my-law',
        mockConfig
      );

      expect(result.passed).toBe(false);
      expect(result.message).toBe('Failed to check my-law');
      expect(result.details).toContain('Unknown error');
      expect(result.violations).toContain('Unknown error');
    });

    it('should create error result from unknown type', () => {
      const result = LawErrorHandlingUtils.createErrorResult(
        42,
        'number-law',
        mockConfig
      );

      expect(result.passed).toBe(false);
      expect(result.details).toContain('Unknown error');
    });

    it('should create error result from null', () => {
      const result = LawErrorHandlingUtils.createErrorResult(
        null,
        'null-law',
        mockConfig
      );

      expect(result.passed).toBe(false);
      expect(result.details).toContain('Unknown error');
    });

    it('should create error result from undefined', () => {
      const result = LawErrorHandlingUtils.createErrorResult(
        undefined,
        'undefined-law',
        mockConfig
      );

      expect(result.passed).toBe(false);
      expect(result.details).toContain('Unknown error');
    });

    it('should include lawName in message', () => {
      const error = new Error('test');
      const result = LawErrorHandlingUtils.createErrorResult(
        error,
        'angular-component-law',
        mockConfig
      );

      expect(result.message).toContain('angular-component-law');
    });

    it('should have empty suggestions', () => {
      const error = new Error('test');
      const result = LawErrorHandlingUtils.createErrorResult(
        error,
        'law',
        mockConfig
      );

      expect(result.suggestions).toEqual([]);
    });

    it('should not be fixable', () => {
      const error = new Error('test');
      const result = LawErrorHandlingUtils.createErrorResult(
        error,
        'law',
        mockConfig
      );

      expect(result.fixable).toBe(false);
    });

    it('should include config in result', () => {
      const error = new Error('test');
      const result = LawErrorHandlingUtils.createErrorResult(
        error,
        'law',
        mockConfig
      );

      expect(result.config).toBe(mockConfig);
    });

    it('should handle Error with empty message', () => {
      const error = new Error('');
      const result = LawErrorHandlingUtils.createErrorResult(
        error,
        'law',
        mockConfig
      );

      expect(result.details).toContain('');
      expect(result.passed).toBe(false);
    });

    it('should handle complex Error object', () => {
      const error = new TypeError('Type mismatch at line 42');
      const result = LawErrorHandlingUtils.createErrorResult(
        error,
        'type-law',
        mockConfig
      );

      expect(result.details).toContain('Type mismatch at line 42');
    });
  });

  describe('LawErrorHandlingUtils.createCustomErrorResult', () => {
    it('should create error result with custom message', () => {
      const error = new Error('Internal error');
      const result = LawErrorHandlingUtils.createCustomErrorResult(
        error,
        'Custom failure message',
        mockConfig
      );

      expect(result.passed).toBe(false);
      expect(result.message).toBe('Custom failure message');
      expect(result.details).toContain('Internal error');
    });

    it('should use custom message instead of lawName', () => {
      const error = new Error('test');
      const customMessage = 'Configuration validation failed';
      const result = LawErrorHandlingUtils.createCustomErrorResult(
        error,
        customMessage,
        mockConfig
      );

      expect(result.message).toBe('Configuration validation failed');
    });

    it('should handle unknown error type', () => {
      const result = LawErrorHandlingUtils.createCustomErrorResult(
        { custom: 'error' },
        'Custom message',
        mockConfig
      );

      expect(result.passed).toBe(false);
      expect(result.details).toContain('Unknown error');
    });

    it('should have empty suggestions', () => {
      const error = new Error('test');
      const result = LawErrorHandlingUtils.createCustomErrorResult(
        error,
        'message',
        mockConfig
      );

      expect(result.suggestions).toEqual([]);
    });

    it('should not be fixable', () => {
      const error = new Error('test');
      const result = LawErrorHandlingUtils.createCustomErrorResult(
        error,
        'message',
        mockConfig
      );

      expect(result.fixable).toBe(false);
    });

    it('should have score of 0', () => {
      const error = new Error('test');
      const result = LawErrorHandlingUtils.createCustomErrorResult(
        error,
        'message',
        mockConfig
      );

      expect(result.score).toBe(0);
    });

    it('should include config in result', () => {
      const error = new Error('test');
      const result = LawErrorHandlingUtils.createCustomErrorResult(
        error,
        'message',
        mockConfig
      );

      expect(result.config).toBe(mockConfig);
    });

    it('should include error in violations array', () => {
      const error = new Error('Critical violation');
      const result = LawErrorHandlingUtils.createCustomErrorResult(
        error,
        'Custom',
        mockConfig
      );

      expect(result.violations).toContain('Critical violation');
    });

    it('should handle empty custom message', () => {
      const error = new Error('test');
      const result = LawErrorHandlingUtils.createCustomErrorResult(
        error,
        '',
        mockConfig
      );

      expect(result.message).toBe('');
      expect(result.passed).toBe(false);
    });

    it('should handle unicode in custom message', () => {
      const error = new Error('test');
      const result = LawErrorHandlingUtils.createCustomErrorResult(
        error,
        'Грешка при валидация ⚠️',
        mockConfig
      );

      expect(result.message).toBe('Грешка при валидация ⚠️');
    });
  });

  describe('edge cases', () => {
    it('should handle Error subclass', () => {
      const error = new RangeError('Value out of range');
      const result = LawErrorHandlingUtils.createErrorResult(
        error,
        'range-law',
        mockConfig
      );

      expect(result.details).toContain('Value out of range');
    });

    it('should handle object with message property', () => {
      const errorLike = { message: 'Error-like object' };
      const result = LawErrorHandlingUtils.createErrorResult(
        errorLike,
        'law',
        mockConfig
      );

      expect(result.details).toContain('Unknown error');
    });

    it('should handle array as error', () => {
      const result = LawErrorHandlingUtils.createErrorResult(
        ['error1', 'error2'],
        'law',
        mockConfig
      );

      expect(result.details).toContain('Unknown error');
    });

    it('should handle function as error', () => {
      const result = LawErrorHandlingUtils.createErrorResult(
        () => 'error',
        'law',
        mockConfig
      );

      expect(result.details).toContain('Unknown error');
    });
  });
});

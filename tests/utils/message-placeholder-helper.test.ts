/**
 * @fileoverview Tests for message-placeholder-helper.ts
 * @description Tests for message placeholder helper utilities
 */

import { MessagePlaceholderHelper } from '../../src/utils/angular/message-placeholder-helper';

describe('utils/angular/message-placeholder-helper', () => {
  describe('applyFileNamePlaceholder', () => {
    it('should replace {fileName} with actual file name', () => {
      const result = MessagePlaceholderHelper.applyFileNamePlaceholder(
        'Error in {fileName}',
        'test.ts'
      );
      expect(result).toBe('Error in test.ts');
    });

    it('should handle message without placeholder', () => {
      const result = MessagePlaceholderHelper.applyFileNamePlaceholder(
        'Error occurred',
        'test.ts'
      );
      expect(result).toBe('Error occurred');
    });

    it('should handle empty file name', () => {
      const result = MessagePlaceholderHelper.applyFileNamePlaceholder(
        'Error in {fileName}',
        ''
      );
      expect(result).toBe('Error in ');
    });

    it('should handle multiple placeholders', () => {
      const result = MessagePlaceholderHelper.applyFileNamePlaceholder(
        '{fileName} has error in {fileName}',
        'test.ts'
      );
      // Should only replace first occurrence by default
      expect(result).toContain('test.ts');
    });

    it('should handle file path with special characters', () => {
      const result = MessagePlaceholderHelper.applyFileNamePlaceholder(
        'Error in {fileName}',
        'src/components/test-file.component.ts'
      );
      expect(result).toBe('Error in src/components/test-file.component.ts');
    });

    it('should handle empty message', () => {
      const result = MessagePlaceholderHelper.applyFileNamePlaceholder(
        '',
        'test.ts'
      );
      expect(result).toBe('');
    });
  });

  describe('buildMessage', () => {
    it('should build message with file name', () => {
      const result = MessagePlaceholderHelper.buildMessage(
        'File {fileName} is missing',
        'config.ts'
      );
      expect(result).toBe('File config.ts is missing');
    });

    it('should handle template without placeholder', () => {
      const result = MessagePlaceholderHelper.buildMessage(
        'Generic error message',
        'file.ts'
      );
      expect(result).toBe('Generic error message');
    });

    it('should work with complex paths', () => {
      const result = MessagePlaceholderHelper.buildMessage(
        'Issue found in {fileName}',
        'libs/shared/utils/index.ts'
      );
      expect(result).toBe('Issue found in libs/shared/utils/index.ts');
    });

    it('should preserve template structure', () => {
      const result = MessagePlaceholderHelper.buildMessage(
        'WARNING: {fileName} needs attention',
        'app.module.ts'
      );
      expect(result).toBe('WARNING: app.module.ts needs attention');
    });
  });

  describe('buildMessageObject', () => {
    const mockApplyPlaceholder = (message: string, fileName: string): string =>
      message.replace('{fileName}', fileName);

    it('should apply placeholder to all properties', () => {
      const template = {
        violation: 'Error in {fileName}',
        suggestion: 'Fix {fileName}',
      };

      const result = MessagePlaceholderHelper.buildMessageObject(
        template,
        'test.ts',
        mockApplyPlaceholder
      );

      expect(result.violation).toBe('Error in test.ts');
      expect(result.suggestion).toBe('Fix test.ts');
    });

    it('should return object with same keys', () => {
      const template = {
        key1: 'Value 1',
        key2: 'Value 2',
        key3: 'Value 3',
      };

      const result = MessagePlaceholderHelper.buildMessageObject(
        template,
        'file.ts',
        mockApplyPlaceholder
      );

      expect(Object.keys(result)).toHaveLength(3);
      expect(result.key1).toBeDefined();
      expect(result.key2).toBeDefined();
      expect(result.key3).toBeDefined();
    });

    it('should handle empty object', () => {
      const template: Record<string, string> = {};

      const result = MessagePlaceholderHelper.buildMessageObject(
        template,
        'test.ts',
        mockApplyPlaceholder
      );

      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should use custom apply function', () => {
      const customApply = (message: string, fileName: string): string =>
        `[${fileName}] ${message}`;

      const template = {
        message: 'Test message',
      };

      const result = MessagePlaceholderHelper.buildMessageObject(
        template,
        'file.ts',
        customApply
      );

      expect(result.message).toBe('[file.ts] Test message');
    });

    it('should handle properties without placeholders', () => {
      const template = {
        withPlaceholder: 'Error in {fileName}',
        withoutPlaceholder: 'Static message',
      };

      const result = MessagePlaceholderHelper.buildMessageObject(
        template,
        'test.ts',
        mockApplyPlaceholder
      );

      expect(result.withPlaceholder).toBe('Error in test.ts');
      expect(result.withoutPlaceholder).toBe('Static message');
    });

    it('should preserve types', () => {
      const template: Record<string, string> = {
        error: 'Error in {fileName}',
        warning: 'Warning in {fileName}',
      };

      const result = MessagePlaceholderHelper.buildMessageObject(
        template,
        'app.ts',
        mockApplyPlaceholder
      );

      expect(result['error']).toBe('Error in app.ts');
      expect(result['warning']).toBe('Warning in app.ts');
    });

    it('should handle single property object', () => {
      const template = {
        single: '{fileName} only',
      };

      const result = MessagePlaceholderHelper.buildMessageObject(
        template,
        'one.ts',
        mockApplyPlaceholder
      );

      expect(result.single).toBe('one.ts only');
    });

    it('should handle many properties', () => {
      const template: Record<string, string> = {};
      for (let i = 0; i < 10; i++) {
        template[`prop${i}`] = `Message ${i} for {fileName}`;
      }

      const result = MessagePlaceholderHelper.buildMessageObject(
        template,
        'multi.ts',
        mockApplyPlaceholder
      );

      expect(Object.keys(result)).toHaveLength(10);
      expect(result['prop0']).toBe('Message 0 for multi.ts');
      expect(result['prop9']).toBe('Message 9 for multi.ts');
    });
  });
});

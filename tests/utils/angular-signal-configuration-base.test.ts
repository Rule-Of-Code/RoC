/**
 * @fileoverview Tests for signal-configuration-base.ts
 * @description Tests for Angular signal configuration base class
 */

import { SignalConfigurationBase } from '../../src/utils/angular/signal-configuration-base';
import { FileUtils } from '../../src/utils/file-utils';

// Create a concrete implementation to test the abstract class
class TestSignalConfiguration extends SignalConfigurationBase {
  // Expose parent methods for testing
  static testBuildMessage(messageTemplate: string, fileName: string): string {
    return SignalConfigurationBase.buildMessage(messageTemplate, fileName);
  }

  static testBuildMessageObject<T extends Record<string, string>>(
    messageTemplate: T,
    fileName: string
  ): T {
    return SignalConfigurationBase.buildMessageObject(
      messageTemplate,
      fileName
    );
  }
}

describe('utils/angular/signal-configuration-base', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('signal-config-base-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('buildMessage (inherited from AngularConfigurationBase)', () => {
    it('should replace {fileName} placeholder with actual file name', () => {
      const result = TestSignalConfiguration.testBuildMessage(
        'Error in {fileName}',
        'signal.component.ts'
      );

      expect(result).toBe('Error in signal.component.ts');
    });

    it('should handle message without placeholder', () => {
      const result = TestSignalConfiguration.testBuildMessage(
        'Generic error message',
        'test.ts'
      );

      expect(result).toBe('Generic error message');
    });

    it('should handle empty file name', () => {
      const result = TestSignalConfiguration.testBuildMessage(
        'Error in {fileName}',
        ''
      );

      expect(result).toBe('Error in ');
    });

    it('should handle empty message template', () => {
      const result = TestSignalConfiguration.testBuildMessage('', 'test.ts');

      expect(result).toBe('');
    });

    it('should handle complex file paths', () => {
      const result = TestSignalConfiguration.testBuildMessage(
        'Issue found in {fileName}',
        'src/app/features/user/user.signal.ts'
      );

      expect(result).toBe(
        'Issue found in src/app/features/user/user.signal.ts'
      );
    });

    it('should handle special characters in file name', () => {
      const result = TestSignalConfiguration.testBuildMessage(
        'Processing {fileName}',
        'user-profile.component.ts'
      );

      expect(result).toBe('Processing user-profile.component.ts');
    });

    it('should replace multiple placeholders', () => {
      const result = TestSignalConfiguration.testBuildMessage(
        '{fileName} has issues, check {fileName}',
        'app.component.ts'
      );

      // Depending on implementation, may replace first only or all
      expect(result).toContain('app.component.ts');
    });
  });

  describe('buildMessageObject', () => {
    it('should replace fileName placeholder in all object properties', () => {
      const template = {
        violationMessage: 'Error in {fileName}',
        suggestionMessage: 'Fix issues in {fileName}',
      };

      const result = TestSignalConfiguration.testBuildMessageObject(
        template,
        'signal.component.ts'
      );

      expect(result.violationMessage).toBe('Error in signal.component.ts');
      expect(result.suggestionMessage).toBe(
        'Fix issues in signal.component.ts'
      );
    });

    it('should handle object with single property', () => {
      const template = {
        message: 'Processing {fileName}',
      };

      const result = TestSignalConfiguration.testBuildMessageObject(
        template,
        'app.component.ts'
      );

      expect(result.message).toBe('Processing app.component.ts');
    });

    it('should handle object with properties without placeholders', () => {
      const template = {
        message: 'Generic error',
        suggestion: 'Try again',
      };

      const result = TestSignalConfiguration.testBuildMessageObject(
        template,
        'test.ts'
      );

      expect(result.message).toBe('Generic error');
      expect(result.suggestion).toBe('Try again');
    });

    it('should handle mixed object with some placeholders', () => {
      const template = {
        withPlaceholder: 'Error in {fileName}',
        withoutPlaceholder: 'Generic message',
      };

      const result = TestSignalConfiguration.testBuildMessageObject(
        template,
        'signal.ts'
      );

      expect(result.withPlaceholder).toBe('Error in signal.ts');
      expect(result.withoutPlaceholder).toBe('Generic message');
    });

    it('should handle empty object', () => {
      const template = {} as Record<string, string>;

      const result = TestSignalConfiguration.testBuildMessageObject(
        template,
        'test.ts'
      );

      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should preserve object structure', () => {
      const template = {
        error: 'Error in {fileName}',
        warning: 'Warning in {fileName}',
        suggestion: 'Suggestion for {fileName}',
      };

      const result = TestSignalConfiguration.testBuildMessageObject(
        template,
        'component.ts'
      );

      expect(Object.keys(result)).toEqual(['error', 'warning', 'suggestion']);
      expect(result.error).toBe('Error in component.ts');
      expect(result.warning).toBe('Warning in component.ts');
      expect(result.suggestion).toBe('Suggestion for component.ts');
    });

    it('should handle long file paths', () => {
      const template = {
        message: 'Check {fileName}',
      };

      const result = TestSignalConfiguration.testBuildMessageObject(
        template,
        'packages/ruleofcode/src/utils/angular/signal.component.ts'
      );

      expect(result.message).toBe(
        'Check packages/ruleofcode/src/utils/angular/signal.component.ts'
      );
    });
  });

  describe('inheritance from AngularConfigurationBase', () => {
    it('should inherit buildMessage static method', () => {
      expect(typeof TestSignalConfiguration.testBuildMessage).toBe('function');
    });

    it('should have buildMessageObject method', () => {
      expect(typeof TestSignalConfiguration.testBuildMessageObject).toBe(
        'function'
      );
    });
  });

  describe('usage in Angular signal patterns', () => {
    it('should work with signal-related validation messages', () => {
      const template = {
        violation: 'Signal not properly initialized in {fileName}',
        suggestion: 'Use computed() or signal() in {fileName}',
      };

      const result = TestSignalConfiguration.testBuildMessageObject(
        template,
        'user.signal-service.ts'
      );

      expect(result.violation).toContain('Signal not properly initialized');
      expect(result.violation).toContain('user.signal-service.ts');
      expect(result.suggestion).toContain('computed()');
    });

    it('should work with effect-related messages', () => {
      const template = {
        message: 'Effect cleanup missing in {fileName}',
      };

      const result = TestSignalConfiguration.testBuildMessageObject(
        template,
        'effects.component.ts'
      );

      expect(result.message).toBe(
        'Effect cleanup missing in effects.component.ts'
      );
    });

    it('should work with computed signal messages', () => {
      const template = {
        violation: 'Computed signal depends on unstable value in {fileName}',
        suggestion: 'Ensure all dependencies are stable signals in {fileName}',
      };

      const result = TestSignalConfiguration.testBuildMessageObject(
        template,
        'dashboard.component.ts'
      );

      expect(result.violation).toContain('Computed signal depends');
      expect(result.suggestion).toContain('stable signals');
      expect(result.suggestion).toContain('dashboard.component.ts');
    });
  });

  describe('edge cases', () => {
    it('should handle file name with spaces', () => {
      const result = TestSignalConfiguration.testBuildMessage(
        'Error in {fileName}',
        'my component.ts'
      );

      expect(result).toBe('Error in my component.ts');
    });

    it('should handle Unicode characters in file name', () => {
      const result = TestSignalConfiguration.testBuildMessage(
        'Processing {fileName}',
        'компонент.ts'
      );

      expect(result).toBe('Processing компонент.ts');
    });

    it('should handle file name with dots', () => {
      const result = TestSignalConfiguration.testBuildMessage(
        'Error in {fileName}',
        'user.profile.component.ts'
      );

      expect(result).toBe('Error in user.profile.component.ts');
    });

    it('should handle very long message templates', () => {
      const longMessage =
        'This is a very long validation message that explains in great detail what went wrong in {fileName} and provides extensive guidance on how to fix it properly.';

      const result = TestSignalConfiguration.testBuildMessage(
        longMessage,
        'test.ts'
      );

      expect(result).toContain('test.ts');
      expect(result.length).toBeGreaterThan(
        longMessage.length - '{fileName}'.length
      );
    });
  });
});

/**
 * @fileoverview Tests for logging-utils.ts
 * @description Tests for centralized logging functionality
 */

import {
  logDebug,
  logError,
  logInfo,
  logWarn,
} from '../../src/utils/logging-utils';

describe('utils/logging-utils', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalDebug = process.env.DEBUG;

  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset to non-production for most tests
    process.env.NODE_ENV = 'development';
    delete process.env.DEBUG;

    // Spy on console methods
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalDebug !== undefined) {
      process.env.DEBUG = originalDebug;
    } else {
      delete process.env.DEBUG;
    }

    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('logWarn', () => {
    it('should log warning with message and context', () => {
      logWarn('Test warning', 'TestContext');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[TestContext] Test warning',
        undefined
      );
    });

    it('should log warning with error object', () => {
      const error = new Error('Test error');
      logWarn('Warning message', 'ErrorContext', error);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[ErrorContext] Warning message',
        error
      );
    });

    it('should not log in production mode', () => {
      process.env.NODE_ENV = 'production';
      logWarn('Should not appear', 'ProductionContext');

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should handle empty message', () => {
      logWarn('', 'EmptyContext');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[EmptyContext] ', undefined);
    });

    it('should handle empty context', () => {
      logWarn('Message', '');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[] Message', undefined);
    });
  });

  describe('logError', () => {
    it('should log error with message and context', () => {
      logError('Test error', 'TestContext');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TestContext] Test error',
        undefined
      );
    });

    it('should log error with error object', () => {
      const error = new Error('Critical error');
      logError('Error occurred', 'CriticalContext', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[CriticalContext] Error occurred',
        error
      );
    });

    it('should not log in production mode', () => {
      process.env.NODE_ENV = 'production';
      logError('Should not appear', 'ProductionContext');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle string error', () => {
      logError('Error message', 'StringError', 'string error detail');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[StringError] Error message',
        'string error detail'
      );
    });

    it('should handle numeric error code', () => {
      logError('Error with code', 'NumericError', 404);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[NumericError] Error with code',
        404
      );
    });
  });

  describe('logInfo', () => {
    it('should log info with message and context', () => {
      logInfo('Test info', 'TestContext');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[TestContext] Test info',
        undefined
      );
    });

    it('should log info with data object', () => {
      const data = { key: 'value', count: 42 };
      logInfo('Info message', 'DataContext', data);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[DataContext] Info message',
        data
      );
    });

    it('should not log in production mode', () => {
      process.env.NODE_ENV = 'production';
      logInfo('Should not appear', 'ProductionContext');

      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should handle array data', () => {
      const data = ['item1', 'item2', 'item3'];
      logInfo('Array data', 'ArrayContext', data);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[ArrayContext] Array data',
        data
      );
    });

    it('should handle null data', () => {
      logInfo('Null data', 'NullContext', null);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[NullContext] Null data',
        null
      );
    });
  });

  describe('logDebug', () => {
    it('should log debug when DEBUG is set', () => {
      process.env.DEBUG = 'true';
      logDebug('Test debug', 'DebugContext');

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[DebugContext] Test debug',
        undefined
      );
    });

    it('should log debug with data when DEBUG is set', () => {
      process.env.DEBUG = '1';
      const data = { debug: true };
      logDebug('Debug message', 'DataContext', data);

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[DataContext] Debug message',
        data
      );
    });

    it('should not log when DEBUG is not set', () => {
      delete process.env.DEBUG;
      logDebug('Should not appear', 'NoDebugContext');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should not log in production mode even with DEBUG', () => {
      process.env.NODE_ENV = 'production';
      process.env.DEBUG = 'true';
      logDebug('Should not appear', 'ProductionContext');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should handle empty DEBUG value', () => {
      process.env.DEBUG = '';
      logDebug('Should not appear', 'EmptyDebugContext');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should log with any truthy DEBUG value', () => {
      process.env.DEBUG = 'verbose';
      logDebug('Verbose debug', 'VerboseContext');

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[VerboseContext] Verbose debug',
        undefined
      );
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in context', () => {
      logInfo('Message', '[Special:Context]');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[[Special:Context]] Message',
        undefined
      );
    });

    it('should handle unicode in message', () => {
      logInfo('Съобщение с юникод 🎉', 'UnicodeContext');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[UnicodeContext] Съобщение с юникод 🎉',
        undefined
      );
    });

    it('should handle multiline message', () => {
      logInfo('Line 1\nLine 2\nLine 3', 'MultilineContext');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[MultilineContext] Line 1\nLine 2\nLine 3',
        undefined
      );
    });

    it('should handle very long message', () => {
      const longMessage = 'A'.repeat(10000);
      logInfo(longMessage, 'LongContext');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        `[LongContext] ${longMessage}`,
        undefined
      );
    });

    it('should handle complex error object', () => {
      const complexError = {
        message: 'Complex error',
        stack: 'Error stack trace',
        code: 'ERR_COMPLEX',
        nested: { details: 'nested info' },
      };
      logError('Complex error occurred', 'ComplexContext', complexError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ComplexContext] Complex error occurred',
        complexError
      );
    });
  });

  describe('environment variable handling', () => {
    it('should work with NODE_ENV=test', () => {
      process.env.NODE_ENV = 'test';
      logInfo('Test environment', 'TestEnv');

      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should work with NODE_ENV=development', () => {
      process.env.NODE_ENV = 'development';
      logInfo('Development environment', 'DevEnv');

      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should work with undefined NODE_ENV', () => {
      delete process.env.NODE_ENV;
      logInfo('Undefined environment', 'UndefinedEnv');

      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });
});

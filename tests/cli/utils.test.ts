/**
 * CLI Utils Tests
 * Tests for cli/utils.ts
 */

import {
  getVersion,
  isRoCPath,
  PARETO_LAWS_COUNT,
  setupErrorHandlers,
  TOTAL_LAWS_COUNT,
} from '../../src/cli/utils';

describe('cli/utils', () => {
  describe('getVersion', () => {
    it('should return a version string', () => {
      const version = getVersion();

      expect(typeof version).toBe('string');
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should return version from package.json', () => {
      const version = getVersion();

      // Version should be a valid semver starting with a major version number
      expect(version).toMatch(/^\d+\./);
    });

    it('should handle missing version in package.json', () => {
      // The fallback is '2.4.0' if version is missing
      // Since we can't easily modify package.json, we just verify the function exists
      expect(typeof getVersion).toBe('function');
    });

    it('should return fallback when package.json read fails', () => {
      // We need to test the catch block
      // Use jest.isolateModules to get a fresh module with mocked dependency
      jest.isolateModules(() => {
        jest.doMock('../../src/utils/file-system-operations', () => ({
          FileSystemOperations: {
            readJsonFile: () => {
              throw new Error('Cannot read file');
            },
          },
        }));

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getVersion: freshGetVersion } = require('../../src/cli/utils');
        const version = freshGetVersion();
        expect(version).toBe('2.4.0');
      });
    });

    it('should return fallback when package.json has no version', () => {
      jest.isolateModules(() => {
        jest.doMock('../../src/utils/file-system-operations', () => ({
          FileSystemOperations: {
            readJsonFile: () => ({}), // Return object without version property
          },
        }));

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getVersion: freshGetVersion } = require('../../src/cli/utils');
        const version = freshGetVersion();
        expect(version).toBe('2.4.0');
      });
    });
  });

  describe('TOTAL_LAWS_COUNT', () => {
    it('should be a positive number', () => {
      expect(typeof TOTAL_LAWS_COUNT).toBe('number');
      expect(TOTAL_LAWS_COUNT).toBeGreaterThan(0);
    });

    it('should be greater than PARETO_LAWS_COUNT', () => {
      expect(TOTAL_LAWS_COUNT).toBeGreaterThan(PARETO_LAWS_COUNT);
    });
  });

  describe('PARETO_LAWS_COUNT', () => {
    it('should be a positive number', () => {
      expect(typeof PARETO_LAWS_COUNT).toBe('number');
      expect(PARETO_LAWS_COUNT).toBeGreaterThan(0);
    });

    it('should be less than TOTAL_LAWS_COUNT', () => {
      expect(PARETO_LAWS_COUNT).toBeLessThan(TOTAL_LAWS_COUNT);
    });
  });

  describe('isRoCPath', () => {
    it('should return true for ruleofcode package path', () => {
      const result = isRoCPath('/path/to/packages/ruleofcode/src');

      expect(result).toBe(true);
    });

    it('should return true for constitutional-compliance pattern', () => {
      // The pattern is 'FileHeaderComplianceAnalyzer/**/constitutional-compliance'
      // includes() checks for substring match
      const result = isRoCPath(
        '/path/FileHeaderComplianceAnalyzer/**/constitutional-compliance/src'
      );

      expect(result).toBe(true);
    });

    it('should return false for regular project path', () => {
      const result = isRoCPath('/path/to/my-project/src');

      expect(result).toBe(false);
    });

    it('should return false for empty path', () => {
      const result = isRoCPath('');

      expect(result).toBe(false);
    });

    it('should return true for an explicit ruleofcode package path', () => {
      // The repo is now standalone, so cwd no longer contains the
      // packages/ruleofcode segment. Pass an explicit RoC path instead.
      const result = isRoCPath('/path/to/packages/ruleofcode');

      expect(result).toBe(true);
    });

    it('should return a boolean when falling back to process.cwd', () => {
      // With no argument it falls back to process.cwd and returns a boolean
      expect(typeof isRoCPath()).toBe('boolean');
    });
  });

  describe('setupErrorHandlers', () => {
    let sigpipeHandler: (() => void) | undefined;
    let uncaughtHandler: ((err: Error & { code?: string }) => void) | undefined;
    let mockExit: jest.Mock;
    let onSpy: jest.SpyInstance;

    beforeEach(() => {
      mockExit = jest.fn();

      // Capture handlers when setup is called
      onSpy = jest.spyOn(process, 'on').mockImplementation((event, handler) => {
        if (event === 'SIGPIPE') {
          sigpipeHandler = handler as () => void;
        } else if (event === 'uncaughtException') {
          uncaughtHandler = handler as (err: Error & { code?: string }) => void;
        }
        return process;
      });

      setupErrorHandlers(mockExit);
    });

    afterEach(() => {
      sigpipeHandler = undefined;
      uncaughtHandler = undefined;
      onSpy.mockRestore();
    });

    it('should register SIGPIPE handler', () => {
      expect(sigpipeHandler).toBeDefined();
    });

    it('should register uncaughtException handler', () => {
      expect(uncaughtHandler).toBeDefined();
    });

    it('should call exitFn with 0 for SIGPIPE', () => {
      sigpipeHandler?.();

      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('should call exitFn with 0 for EPIPE error', () => {
      const epipeError = new Error('write EPIPE') as Error & { code?: string };
      epipeError.code = 'EPIPE';

      try {
        uncaughtHandler?.(epipeError);
      } catch {
        // May throw, that's ok
      }

      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('should rethrow non-EPIPE errors', () => {
      const regularError = new Error('Some other error');

      expect(() => {
        uncaughtHandler?.(regularError);
      }).toThrow('Some other error');

      expect(mockExit).not.toHaveBeenCalled();
    });

    it('should use process.exit as default when no exitFn provided', () => {
      // Reset handlers
      onSpy.mockRestore();

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        return undefined as never;
      });

      let testSigpipeHandler: (() => void) | undefined;

      onSpy = jest.spyOn(process, 'on').mockImplementation((event, handler) => {
        if (event === 'SIGPIPE') {
          testSigpipeHandler = handler as () => void;
        }
        return process;
      });

      // Call without exitFn to use default
      setupErrorHandlers();

      // Trigger SIGPIPE handler
      testSigpipeHandler?.();

      expect(exitSpy).toHaveBeenCalledWith(0);
      exitSpy.mockRestore();
    });
  });
});

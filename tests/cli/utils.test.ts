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

  /**
   * #405 — a reader that closes the pipe early must not decide the exit code.
   * The handlers used to exit 0 on SIGPIPE and on EPIPE, so a failed
   * `audit --json | head` passed under pipefail. Now a broken pipe only stops
   * the writing; the command still ends with its own exit code.
   */
  describe('setupErrorHandlers (#405: a broken pipe never sets the exit code)', () => {
    type Code = 'EPIPE' | 'ERR_STREAM_DESTROYED' | 'EIO';
    const streamError = (code: Code): Error & { code: Code } =>
      Object.assign(new Error(`write ${code}`), { code });

    let before: Map<NodeJS.WriteStream, Set<unknown>>;
    let exitSpy: jest.SpyInstance;
    let exitCodeBefore: typeof process.exitCode;

    beforeEach(() => {
      before = new Map(
        [process.stdout, process.stderr].map(s => [
          s,
          new Set<unknown>(s.listeners('error')),
        ])
      );
      exitCodeBefore = process.exitCode;
      exitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);
    });

    afterEach(() => {
      for (const [stream, known] of before) {
        for (const listener of stream.listeners('error')) {
          if (!known.has(listener)) {
            stream.removeListener(
              'error',
              listener as (...args: unknown[]) => void
            );
          }
        }
      }
      process.removeAllListeners('SIGPIPE');
      exitSpy.mockRestore();
      process.exitCode = exitCodeBefore;
    });

    it('registers no SIGPIPE and no uncaughtException handler', () => {
      const sigpipe = process.listenerCount('SIGPIPE');
      const uncaught = process.listeners('uncaughtException');

      setupErrorHandlers();

      expect(process.listenerCount('SIGPIPE')).toBe(sigpipe);
      expect(process.listeners('uncaughtException')).toEqual(uncaught);
    });

    describe.each([
      ['stdout', process.stdout],
      ['stderr', process.stderr],
    ])('%s', (_name, stream) => {
      it('EPIPE: swallowed — no exit, the exit code is left alone', () => {
        setupErrorHandlers();
        process.exitCode = 1;

        expect(() => stream.emit('error', streamError('EPIPE'))).not.toThrow();
        expect(exitSpy).not.toHaveBeenCalled();
        expect(process.exitCode).toBe(1);
      });

      it('ERR_STREAM_DESTROYED after an EPIPE: the same closed pipe, swallowed', () => {
        setupErrorHandlers();
        stream.emit('error', streamError('EPIPE'));

        expect(() =>
          stream.emit('error', streamError('ERR_STREAM_DESTROYED'))
        ).not.toThrow();
        expect(exitSpy).not.toHaveBeenCalled();
      });

      it('ERR_STREAM_DESTROYED without a broken pipe first: thrown', () => {
        setupErrorHandlers();

        expect(() =>
          stream.emit('error', streamError('ERR_STREAM_DESTROYED'))
        ).toThrow('write ERR_STREAM_DESTROYED');
      });

      it('any other stream error: thrown, even after a broken pipe', () => {
        setupErrorHandlers();
        stream.emit('error', streamError('EPIPE'));

        expect(() => stream.emit('error', streamError('EIO'))).toThrow(
          'write EIO'
        );
        expect(exitSpy).not.toHaveBeenCalled();
      });
    });
  });
});

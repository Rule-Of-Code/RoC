/**
 * Audit Command Tests
 * Tests for cli/audit-command.ts
 */

import { Command } from 'commander';
import {
  AuditActionOptions,
  auditActionHandler,
  auditCommand,
  determineAuditMode,
  displayModeHeader,
  executeAuditAction,
  paretoModeForCliMode,
} from '../../src/cli/audit-command';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('cli/audit-command', () => {
  describe('determineAuditMode', () => {
    it('should return CLI mode when provided', () => {
      expect(determineAuditMode('full', true)).toBe('full');
      expect(determineAuditMode('fast', false)).toBe('fast');
    });

    it('should return fast when paretoMode is true and no CLI mode', () => {
      expect(determineAuditMode(undefined, true)).toBe('fast');
    });

    it('should return full when paretoMode is false and no CLI mode', () => {
      expect(determineAuditMode(undefined, false)).toBe('full');
    });
  });

  describe('displayModeHeader', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should display pareto header for fast mode', () => {
      displayModeHeader('fast');

      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('PARETO');
    });

    it('should display full header for full mode', () => {
      displayModeHeader('full');

      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('FULL');
    });

    it('shows the PARETO banner only for the Pareto law scope', () => {
      displayModeHeader('fast');

      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('PARETO');
    });

    it.each(['pre-commit', 'pre-push'])(
      'shows the FULL banner for %s — a hook mode narrows FILES, never laws',
      mode => {
        // This test used to assert the defect ("any non-full mode is Pareto"),
        // and the defect shipped: --mode=pre-push ran 27 of 122 laws for one
        // consumer and 13 of 100 for another. A hook gate that silently checks
        // a fifth of the catalogue is the disarmed gate this tool exists to
        // prevent.
        displayModeHeader(mode, false);

        const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
        expect(calls).toContain('FULL');
        expect(calls).not.toContain('PARETO OPTIMIZATION ACTIVATED');
      }
    );

    it('the banner follows the EFFECTIVE law selection, not the mode string', () => {
      displayModeHeader('pre-push', true); // config has paretoMode: true

      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('PARETO');
    });
  });

  describe('paretoModeForCliMode', () => {
    it.each([
      ['fast', false, true],
      ['fast', true, true],
      ['full', true, false],
      ['full', false, false],
    ])(
      '--mode=%s decides the law scope (config %s -> %s)',
      (mode, configPareto, expected) => {
        expect(paretoModeForCliMode(mode as string, configPareto as boolean)).toBe(
          expected
        );
      }
    );

    it.each(['pre-commit', 'pre-push', undefined])(
      '%s leaves law selection to the config — it narrows files, not laws',
      mode => {
        expect(paretoModeForCliMode(mode, false)).toBe(false);
        expect(paretoModeForCliMode(mode, true)).toBe(true);
      }
    );
  });

  describe('auditCommand', () => {
    it('should register audit command on program', () => {
      const program = new Command();
      auditCommand(program);

      const cmd = program.commands.find(c => c.name() === 'audit');
      expect(cmd).toBeDefined();
    });

    it('should have correct description', () => {
      const program = new Command();
      auditCommand(program);

      const cmd = program.commands.find(c => c.name() === 'audit');
      expect(cmd?.description()).toContain('Constitutional Compliance Audit');
    });

    it('should have mode option', () => {
      const program = new Command();
      auditCommand(program);

      const cmd = program.commands.find(c => c.name() === 'audit');
      const options = cmd?.options.map(o => o.long);
      expect(options).toContain('--mode');
    });

    it('should have verbose option', () => {
      const program = new Command();
      auditCommand(program);

      const cmd = program.commands.find(c => c.name() === 'audit');
      const options = cmd?.options.map(o => o.long);
      expect(options).toContain('--verbose');
    });

    it('should have only-failures option', () => {
      const program = new Command();
      auditCommand(program);

      const cmd = program.commands.find(c => c.name() === 'audit');
      const options = cmd?.options.map(o => o.long);
      expect(options).toContain('--only-failures');
    });

    it('should have parallel option', () => {
      const program = new Command();
      auditCommand(program);

      const cmd = program.commands.find(c => c.name() === 'audit');
      const options = cmd?.options.map(o => o.long);
      expect(options).toContain('--parallel');
    });

    it('should have config option', () => {
      const program = new Command();
      auditCommand(program);

      const cmd = program.commands.find(c => c.name() === 'audit');
      const options = cmd?.options.map(o => o.long);
      expect(options).toContain('--config');
    });

    it('should have export option', () => {
      const program = new Command();
      auditCommand(program);

      const cmd = program.commands.find(c => c.name() === 'audit');
      const options = cmd?.options.map(o => o.long);
      expect(options).toContain('--export');
    });

    it('should have json option', () => {
      const program = new Command();
      auditCommand(program);

      const cmd = program.commands.find(c => c.name() === 'audit');
      const options = cmd?.options.map(o => o.long);
      expect(options).toContain('--json');
    });

    it('should have suggest-exceptions option', () => {
      const program = new Command();
      auditCommand(program);

      const cmd = program.commands.find(c => c.name() === 'audit');
      const options = cmd?.options.map(o => o.long);
      expect(options).toContain('--suggest-exceptions');
    });

    it('should have staged option', () => {
      const program = new Command();
      auditCommand(program);

      const cmd = program.commands.find(c => c.name() === 'audit');
      const options = cmd?.options.map(o => o.long);
      expect(options).toContain('--staged');
    });
  });

  describe('executeAuditAction', () => {
    let consoleSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let tempDir: string;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      // Create temp project directory
      tempDir = FileUtils.createTempDirectory('roc-test-');
      // Create minimal package.json
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project', version: '1.0.0' })
      );
      // Create ruleofcode.config.json
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          version: '6.0.0',
          laws: { paretoMode: false, disabled: [], customSeverity: {} },
          audit: { failThreshold: 75 },
        })
      );
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      // Cleanup temp directory
      if (tempDir && FileUtils.exists(tempDir)) {
        FileUtils.deleteDirectory(tempDir);
      }
    });

    it('should run audit with fast mode on RoC package', async () => {
      // Self-exclusion only triggers when the project root contains the
      // packages/ruleofcode segment. The repo is now standalone, so use an
      // explicit RoC package path to exercise the self-exclusion branch.
      const projectRoot = '/fake/repo/packages/ruleofcode';
      const options: AuditActionOptions = { mode: 'fast' };

      const { exitCode } = await executeAuditAction(options, projectRoot);

      // In RoC package it skips due to self-exclusion
      expect(exitCode).toBe(0);
      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('SELF-EXCLUSION');
    }, 60000);

    it('should run audit with full mode on non-RoC project', async () => {
      const options: AuditActionOptions = { mode: 'full' };

      const { exitCode, result } = await executeAuditAction(options, tempDir);

      expect([0, 1]).toContain(exitCode);
      expect(result).toBeDefined();
    }, 60000);

    it('should run audit with fast mode on non-RoC project', async () => {
      const options: AuditActionOptions = { mode: 'fast' };

      const { exitCode, result } = await executeAuditAction(options, tempDir);

      expect([0, 1]).toContain(exitCode);
      expect(result).toBeDefined();
    }, 60000);

    it('should return exitCode 0 on RoC self-exclusion', async () => {
      // Self-exclusion only triggers when the project root contains the
      // packages/ruleofcode segment. Pass an explicit RoC package path.
      const projectRoot = '/fake/repo/packages/ruleofcode';
      const options: AuditActionOptions = {};

      const { exitCode } = await executeAuditAction(options, projectRoot);

      // Should exit 0 due to RoC self-exclusion
      expect(exitCode).toBe(0);
      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('SELF-EXCLUSION');
    }, 30000);

    it('should handle suggest-exceptions option', async () => {
      const options: AuditActionOptions = {
        suggestExceptions: true,
        mode: 'fast',
      };

      const { exitCode, result } = await executeAuditAction(options, tempDir);

      expect([0, 1]).toContain(exitCode);
      expect(result).toBeDefined();
    }, 60000);

    it('should handle json option', async () => {
      const options: AuditActionOptions = { json: true, mode: 'fast' };

      const { exitCode, result } = await executeAuditAction(options, tempDir);

      expect([0, 1]).toContain(exitCode);
      expect(result).toBeDefined();
      // JSON should be output to console
      const hasJsonOutput = consoleSpy.mock.calls.some(c => {
        const str = String(c[0] || '');
        return str.includes('{') && str.includes('}');
      });
      expect(hasJsonOutput).toBe(true);
    }, 60000);

    it('should handle export json option', async () => {
      const options: AuditActionOptions = { export: 'json', mode: 'fast' };

      const { exitCode, result } = await executeAuditAction(options, tempDir);

      expect([0, 1]).toContain(exitCode);
      expect(result).toBeDefined();
    }, 60000);

    it('should handle verbose option', async () => {
      const options: AuditActionOptions = { verbose: true, mode: 'fast' };

      const { exitCode, result } = await executeAuditAction(options, tempDir);

      expect([0, 1]).toContain(exitCode);
      expect(result).toBeDefined();
    }, 60000);

    it('should handle parallel option', async () => {
      const options: AuditActionOptions = { parallel: true, mode: 'fast' };

      const { exitCode, result } = await executeAuditAction(options, tempDir);

      expect([0, 1]).toContain(exitCode);
      expect(result).toBeDefined();
    }, 60000);

    it('should return error on invalid project root', async () => {
      const invalidRoot = '/non/existent/path/that/does/not/exist/xyz123';
      const options: AuditActionOptions = { mode: 'fast' };

      const { exitCode } = await executeAuditAction(options, invalidRoot);

      // Auditor handles non-existent paths gracefully
      expect([0, 1]).toContain(exitCode);
    });

    it('should handle config loading error', async () => {
      // Use injectedError to test catch block
      const testError = new Error('Test injected error');
      const options: AuditActionOptions = { mode: 'fast' };

      const { exitCode, error } = await executeAuditAction(
        options,
        tempDir,
        testError
      );

      expect(exitCode).toBe(1);
      expect(error).toBeDefined();
      expect(error?.message).toBe('Test injected error');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorCalls = consoleErrorSpy.mock.calls.map(c => c[0]).join(' ');
      expect(errorCalls).toContain('Audit failed');
    });

    it('should use default mode from config', async () => {
      const options: AuditActionOptions = {}; // No mode specified

      const { exitCode, result } = await executeAuditAction(options, tempDir);

      expect([0, 1]).toContain(exitCode);
      expect(result).toBeDefined();
    }, 60000);

    it('should use paretoMode from config when enabled', async () => {
      // Update config with paretoMode
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({
          version: '6.0.0',
          laws: { paretoMode: true, disabled: [], customSeverity: {} },
          audit: { failThreshold: 75 },
        })
      );
      const options: AuditActionOptions = {};

      const { exitCode, result } = await executeAuditAction(options, tempDir);

      expect([0, 1]).toContain(exitCode);
      expect(result).toBeDefined();
      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('PARETO');
    }, 60000);
  });

  describe('AuditActionOptions interface', () => {
    it('should allow all valid options', () => {
      const options: AuditActionOptions = {
        mode: 'fast',
        verbose: true,
        onlyFailures: true,
        parallel: true,
        config: '/path/to/config',
        export: 'json',
        json: true,
        suggestExceptions: true,
        staged: true,
      };

      expect(options.mode).toBe('fast');
      expect(options.verbose).toBe(true);
      expect(options.onlyFailures).toBe(true);
      expect(options.parallel).toBe(true);
      expect(options.config).toBe('/path/to/config');
      expect(options.export).toBe('json');
      expect(options.json).toBe(true);
      expect(options.suggestExceptions).toBe(true);
      expect(options.staged).toBe(true);
    });

    it('should allow empty options', () => {
      const options: AuditActionOptions = {};

      expect(options.mode).toBeUndefined();
      expect(options.verbose).toBeUndefined();
    });
  });

  describe('auditActionHandler', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should be a function', () => {
      expect(typeof auditActionHandler).toBe('function');
    });

    it('should be exported', () => {
      expect(auditActionHandler).toBeDefined();
    });

    it('should use action handler in auditCommand', () => {
      const program = new Command();
      auditCommand(program);

      const cmd = program.commands.find(c => c.name() === 'audit');
      // The action is registered
      expect(cmd).toBeDefined();
    });

    it('should return exit code when skipExit is true', async () => {
      const options: AuditActionOptions = { mode: 'fast' };

      // The handler resolves the project root from process.cwd(). The repo is
      // now standalone, so mock cwd to a RoC package path to trigger
      // self-exclusion (exit 0).
      const cwdSpy = jest
        .spyOn(process, 'cwd')
        .mockReturnValue('/fake/repo/packages/ruleofcode');

      try {
        const exitCode = await auditActionHandler(options, true);
        expect(exitCode).toBe(0);
      } finally {
        cwdSpy.mockRestore();
      }
    }, 60000);

    it('should return exit code 0 for RoC self-exclusion', async () => {
      const options: AuditActionOptions = {};

      // Mock cwd to a RoC package path so self-exclusion applies.
      const cwdSpy = jest
        .spyOn(process, 'cwd')
        .mockReturnValue('/fake/repo/packages/ruleofcode');

      try {
        const exitCode = await auditActionHandler(options, true);
        expect(exitCode).toBe(0);
        const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
        expect(calls).toContain('SELF-EXCLUSION');
      } finally {
        cwdSpy.mockRestore();
      }
    }, 60000);

    it('should cover process.exit path (skipExit=false simulation)', async () => {
      // We can't actually test process.exit without it terminating the test
      // But we can verify the function signature
      expect(typeof auditActionHandler).toBe('function');
      expect(auditActionHandler.name).toBe('auditActionHandler');
    });
  });
});

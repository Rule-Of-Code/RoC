/**
 * Init Command Tests
 * Tests for cli/init-command.ts
 */

import { Command } from 'commander';
import {
  executeInitAction,
  initCommand,
  InitOptions,
} from '../../src/cli/init-command';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('cli/init-command', () => {
  describe('initCommand', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
    });

    it('should register init command on program', () => {
      initCommand(program);

      const cmd = program.commands.find(c => c.name() === 'init');
      expect(cmd).toBeDefined();
    });

    it('should have correct description', () => {
      initCommand(program);

      const cmd = program.commands.find(c => c.name() === 'init');
      expect(cmd?.description()).toContain('Initialize RuleOfCode');
      expect(cmd?.description()).toContain('Constitutional Laws');
    });

    it('should have force option', () => {
      initCommand(program);

      const cmd = program.commands.find(c => c.name() === 'init');
      const options = cmd?.options.map(o => o.long);
      expect(options).toContain('--force');
    });

    it('should have type option', () => {
      initCommand(program);

      const cmd = program.commands.find(c => c.name() === 'init');
      const options = cmd?.options.map(o => o.long);
      expect(options).toContain('--type');
    });

    it('should have hooks option', () => {
      initCommand(program);

      const cmd = program.commands.find(c => c.name() === 'init');
      const options = cmd?.options.map(o => o.long);
      expect(options).toContain('--no-hooks');
    });

    it('should have quick option', () => {
      initCommand(program);

      const cmd = program.commands.find(c => c.name() === 'init');
      const options = cmd?.options.map(o => o.long);
      expect(options).toContain('--quick');
    });

    it('should have short option -f for force', () => {
      initCommand(program);

      const cmd = program.commands.find(c => c.name() === 'init');
      const forceOption = cmd?.options.find(o => o.long === '--force');
      expect(forceOption?.short).toBe('-f');
    });

    it('should have short option -t for type', () => {
      initCommand(program);

      const cmd = program.commands.find(c => c.name() === 'init');
      const typeOption = cmd?.options.find(o => o.long === '--type');
      expect(typeOption?.short).toBe('-t');
    });

    it('should have action handler registered', () => {
      initCommand(program);

      const cmd = program.commands.find(c => c.name() === 'init');
      // Commander stores action handlers internally
      expect(cmd).toBeDefined();
    });

    it('should include version in description', () => {
      initCommand(program);

      const cmd = program.commands.find(c => c.name() === 'init');
      // Description should contain version pattern
      expect(cmd?.description()).toMatch(/v\d+\.\d+\.\d+/);
    });

    it('should include laws count in description', () => {
      initCommand(program);

      const cmd = program.commands.find(c => c.name() === 'init');
      // Description should contain laws count
      expect(cmd?.description()).toMatch(/\d+.*Constitutional Laws/);
    });
  });

  describe('executeInitAction', () => {
    let consoleSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let tempDir: string;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      // Create temp project directory
      tempDir = FileUtils.createTempDirectory('roc-init-test-');
      // Create minimal package.json
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project', version: '1.0.0' })
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

    it('should log setup header', async () => {
      const options: InitOptions = { quick: true, force: true };

      await executeInitAction(options, tempDir);

      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('RuleOfCode');
      expect(calls).toContain('Professional Setup');
    });

    it('should handle quick mode', async () => {
      const options: InitOptions = { quick: true, force: true };

      const result = await executeInitAction(options, tempDir);

      expect(result.success).toBe(true);
      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('Quick Setup Mode');
    });

    it('should handle force option', async () => {
      // Create existing config
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({ version: '6.0.0' })
      );

      const options: InitOptions = { quick: true, force: true };

      const result = await executeInitAction(options, tempDir);

      expect(result.success).toBe(true);
    });

    it('should handle non-force option with no existing config', async () => {
      // No existing config, force: false
      const options: InitOptions = { quick: true, force: false };

      const result = await executeInitAction(options, tempDir);

      expect(result.success).toBe(true);
    });

    it('should handle error in action', async () => {
      const options: InitOptions = {};
      const testError = new Error('Test init error');

      const result = await executeInitAction(options, tempDir, testError);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Test init error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should show cancellation message when overwrite is declined', async () => {
      // Create existing config
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({ version: '6.0.0' })
      );

      // Fake prompt function that returns false for overwrite
      const fakePrompt = async () => ({ overwrite: false });

      const options: InitOptions = { force: false };

      const result = await executeInitAction(
        options,
        tempDir,
        undefined,
        fakePrompt as never
      );

      expect(result.success).toBe(true);
      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('Initialization cancelled');
    });

    it('should proceed when overwrite is confirmed', async () => {
      // Create existing config
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({ version: '6.0.0' })
      );

      // Fake prompt function that returns true for overwrite
      const fakePrompt = async () => ({ overwrite: true });

      const options: InitOptions = { force: false, quick: true };

      const result = await executeInitAction(
        options,
        tempDir,
        undefined,
        fakePrompt as never
      );

      expect(result.success).toBe(true);
      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('Quick Setup Mode');
    });

    // ======================================================================
    // No terminal to prompt into — CI, a container, a pipe. `init` used to
    // ask anyway and die with ERR_USE_AFTER_CLOSE: a setup tool crashing
    // instead of setting anything up. (Jest itself has no TTY, so these run
    // against the real default prompt path.)
    // ======================================================================

    it('falls back to the quick defaults instead of prompting into the void', async () => {
      const options: InitOptions = { force: true };

      const result = await executeInitAction(options, tempDir);

      expect(result.success).toBe(true);
      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('No interactive terminal detected');
      // It really ran the setup, rather than reporting success and doing nothing.
      expect(
        FileUtils.exists(PathOperations.join(tempDir, 'ruleofcode.config.js')) ||
          FileUtils.exists(
            PathOperations.join(tempDir, 'ruleofcode.config.json')
          )
      ).toBe(true);
    });

    it('refuses to overwrite an existing config it cannot ask about', async () => {
      const configPath = PathOperations.join(tempDir, 'ruleofcode.config.json');
      FileUtils.writeFileSync(configPath, JSON.stringify({ version: '6.0.0' }));

      const options: InitOptions = { force: false };

      const result = await executeInitAction(options, tempDir);

      expect(result.success).toBe(true);
      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('--force');
      // Untouched: overwriting because nobody was there to object is the
      // destructive answer to the question.
      expect(JSON.parse(FileUtils.readFile(configPath) as string)).toEqual({
        version: '6.0.0',
      });
    });

    it('still overwrites without a terminal when --force says so', async () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'ruleofcode.config.json'),
        JSON.stringify({ version: '6.0.0' })
      );

      const options: InitOptions = { force: true };

      const result = await executeInitAction(options, tempDir);

      expect(result.success).toBe(true);
      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('No interactive terminal detected');
    });

    it('should run interactive setup when not quick mode', async () => {
      // Fake prompt function for interactive setup
      const fakePrompt = async () => ({
        type: 'angular',
        componentPrefix: 'app',
        domain: 'test.com',
        lawsMode: 'pareto',
      });

      const options: InitOptions = { force: true, quick: false };

      const result = await executeInitAction(
        options,
        tempDir,
        undefined,
        fakePrompt as never
      );

      // Interactive setup should complete
      expect(result.success).toBe(true);
    });
  });

  describe('InitOptions interface', () => {
    it('should allow all valid options', () => {
      const options: InitOptions = {
        force: true,
        type: 'angular',
        hooks: true,
        quick: true,
      };

      expect(options.force).toBe(true);
      expect(options.type).toBe('angular');
      expect(options.hooks).toBe(true);
      expect(options.quick).toBe(true);
    });

    it('should allow empty options', () => {
      const options: InitOptions = {};

      expect(options.force).toBeUndefined();
      expect(options.type).toBeUndefined();
    });
  });
});

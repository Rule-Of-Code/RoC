/**
 * CLI Commands Tests
 * Tests for cli/commands.ts
 */

import { Command } from 'commander';
import { configureCommands } from '../../src/cli/commands';

describe('cli/commands', () => {
  describe('configureCommands', () => {
    it('should configure program with version', () => {
      const program = new Command();
      const result = configureCommands(program);

      expect(result).toBe(program);
      expect(result.version()).toBeDefined();
    });

    it('should configure program description', () => {
      const program = new Command();
      const result = configureCommands(program);

      expect(result.description()).toContain('RuleOfCode');
    });

    it('should register audit command', () => {
      const program = new Command();
      configureCommands(program);

      const auditCmd = program.commands.find(cmd => cmd.name() === 'audit');
      expect(auditCmd).toBeDefined();
    });

    it('should register init command', () => {
      const program = new Command();
      configureCommands(program);

      const initCmd = program.commands.find(cmd => cmd.name() === 'init');
      expect(initCmd).toBeDefined();
    });

    it('should register laws command', () => {
      const program = new Command();
      configureCommands(program);

      const lawsCmd = program.commands.find(cmd => cmd.name() === 'laws');
      expect(lawsCmd).toBeDefined();
    });
  });
});

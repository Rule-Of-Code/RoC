import type { Command } from 'commander';
import { auditCommand } from './audit-command';
import { initCommand } from './init-command';
import { lawsCommand } from './laws-command';
import { recommendCommand } from './recommend-command';
import { reinstallHooksCommand } from './reinstall-hooks-command';
import { getVersion } from './utils';

/**
 * Configure all CLI commands
 */
export function configureCommands(program: Command): Command {
  // Version and info
  program
    .version(getVersion())
    .description(
      '🏛️ RuleOfCode — constitutional-compliance CLI: audit a codebase against a catalog of laws and get one honest pass-or-fail verdict.'
    );

  // Configure individual commands
  auditCommand(program);
  initCommand(program);
  lawsCommand(program);
  recommendCommand(program);
  reinstallHooksCommand(program);

  return program;
}

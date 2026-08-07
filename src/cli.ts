#!/usr/bin/env node

/**
 * RuleOfCode CLI - Professional Constitutional Compliance Tool
 * Command-line interface for the RuleOfCode system
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { configureCommands } from './cli/commands';
import { setupErrorHandlers } from './cli/utils';

// Force chalk colors in all environments
chalk.level = 1;

// Setup error handlers
setupErrorHandlers();

// Create and configure the CLI program
const program = new Command();
configureCommands(program);

// Parse CLI arguments
try {
  program.parse();
} catch (err: unknown) {
  const error = err as { code?: string; message?: string };
  if (error.code === 'commander.help') {
    process.exit(0);
  }
  process.stderr.write(`❌ ${error.message ?? 'Unknown error'}\n`);
  process.exit(1);
}

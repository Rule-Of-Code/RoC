/**
 * `ruleofcode recommend` — write the stack-appropriate RECOMMENDED config into
 * the project root. The same generator runs automatically on install (see
 * scripts/postinstall-recommend.js), so every RoC upgrade refreshes it; this
 * command is the manual escape hatch (e.g. when install scripts are disabled).
 */

import chalk from 'chalk';
import type { Command } from 'commander';

interface RecommendResult {
  written: boolean;
  fileName?: string;
  stack?: string;
  applicableLaws?: number;
}

export function runRecommend(projectRoot: string): number {
  // Plain-JS generator, shared with the postinstall hook (no dist dependency).
  const { generateRecommendedConfig } = require('../../scripts/recommend-config') as {
    generateRecommendedConfig: (root: string) => RecommendResult;
  };

  const result = generateRecommendedConfig(projectRoot);

  if (!result.fileName) {
    console.log(
      chalk.yellow(
        '⚠️  No recommended config for this project type (expected a Python project or an Angular/React/Vue frontend).'
      )
    );
    return 1;
  }

  if (!result.written) {
    console.log(
      chalk.green(`✅ ${result.fileName} is already up to date (${result.stack} stack).`)
    );
    return 0;
  }

  console.log(
    chalk.cyanBright(
      `🏛️  Wrote ${result.fileName} — ${result.stack} stack, ${result.applicableLaws} applicable laws.`
    )
  );
  console.log(
    chalk.gray(
      `   It is a REFERENCE, not your active config. Run it with:\n   npx ruleofcode audit --config ${result.fileName}`
    )
  );
  return 0;
}

export function recommendCommand(program: Command): void {
  program
    .command('recommend')
    .description(
      '🏛️ Write the maintainer-recommended config for this stack (ROC-RECOMMENDED.ruleofcode.config.json)'
    )
    .action(() => {
      process.exit(runRecommend(process.cwd()));
    });
}

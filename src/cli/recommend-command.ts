/**
 * `ruleofcode recommend` — write the stack-appropriate RECOMMENDED config into
 * the project root, on request.
 *
 * This used to run automatically from a postinstall hook, which meant a package
 * wrote an unrequested file into someone's repository on every `npm install`,
 * CI included. A tool about honest gates should not have an install-time side
 * effect a consumer never asked for, so the hook is gone and the capability is
 * exactly here — same generator, run when someone wants it.
 */

import chalk from 'chalk';
import type { Command } from 'commander';

interface RecommendResult {
  written: boolean;
  fileName?: string;
  stack?: string;
  applicableLaws?: number;
}

/**
 * Writes the recommended config for the detected stack through
 * scripts/recommend-config and prints what happened. Returns the exit code:
 * 1 when there is no recommended config for the project type, 0 when the file
 * was written or was already up to date.
 */
export function runRecommend(projectRoot: string): number {
  // Plain-JS generator: it must run without a build step, so it is not in dist.
  const { generateRecommendedConfig } =
    require('../../scripts/recommend-config') as {
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
      chalk.green(
        `✅ ${result.fileName} is already up to date (${result.stack} stack).`
      )
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

/**
 * Registers `ruleofcode recommend`, which runs runRecommend in the current
 * directory and exits with its code.
 */
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

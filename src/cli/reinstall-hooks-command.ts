/**
 * Reinstall Hooks Command
 * Force reinstall/update git hooks to latest version
 */

import chalk from 'chalk';
import type { Command } from 'commander';
import { ConfigLoader } from '../config/loader';
import { GitHooksInstaller } from '../hooks/installer';
import { getVersion } from './utils';

export interface ReinstallHooksOptions {
  force?: boolean;
}

/**
 * Execute the reinstall-hooks command logic
 */
export async function executeReinstallHooksAction(
  options: ReinstallHooksOptions,
  projectRoot: string = process.cwd()
): Promise<void> {
  try {
    console.log(
      chalk.cyanBright(
        `\n🔄 RuleOfCode v${getVersion()} - Git Hooks Reinstallation`
      )
    );
    console.log(chalk.gray('═'.repeat(60)));

    // Load configuration
    const config = ConfigLoader.load(projectRoot);

    // Validate current hooks
    const validation = GitHooksInstaller.validateHooks({
      projectRoot,
      config,
    });

    if (validation.valid && !options.force) {
      console.log(
        chalk.green(`\n✅ All git hooks are up to date (v${getVersion()})`)
      );
      console.log(chalk.gray('   Use --force to reinstall anyway\n'));
      return;
    }

    // Show what will be updated
    if (validation.outdated.length > 0) {
      console.log(
        chalk.yellow(`\n📋 Outdated hooks: ${validation.outdated.join(', ')}`)
      );
    }
    if (validation.missing.length > 0) {
      console.log(
        chalk.yellow(`📋 Missing hooks: ${validation.missing.join(', ')}`)
      );
    }

    console.log(chalk.cyanBright('\n🔧 Reinstalling hooks...\n'));

    // Reinstall hooks
    GitHooksInstaller.reinstall({
      projectRoot,
      config,
      force: true,
    });

    console.log(
      chalk.green(
        `\n✅ Git hooks reinstalled successfully to v${getVersion()}!`
      )
    );
    console.log(chalk.gray('   All hooks are now up to date.\n'));
  } catch (error) {
    const err = error as Error;
    console.error(
      chalk.red(`\n❌ Hooks reinstallation failed: ${err.message}\n`)
    );
    process.exit(1);
  }
}

/**
 * Configure reinstall-hooks command
 */
export function reinstallHooksCommand(program: Command): void {
  program
    .command('reinstall-hooks')
    .description(
      `🔄 Reinstall/update git hooks to latest version (v${getVersion()})`
    )
    .option('-f, --force', 'Force reinstall even if hooks are up to date')
    .action(async (options: ReinstallHooksOptions) => {
      await executeReinstallHooksAction(options);
    });
}

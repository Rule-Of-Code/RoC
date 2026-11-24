/**
 * Reinstall Hooks Command
 * Force reinstall/update git hooks to latest version
 */

import chalk from 'chalk';
import type { Command } from 'commander';
import { ConfigLoader } from '../config/loader';
import { GitHooksInstaller } from '../hooks/installer';
import { getVersion } from './utils';

/** Width of the rule under the command's title. */
const RULE_WIDTH = 60;

export interface ReinstallHooksOptions {
  force?: boolean;
  /**
   * commander's `--no-stash`: false writes `npx lint-staged --no-stash`
   * (#480). Left out, the existing hook decides.
   */
  stash?: boolean;
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
    console.log(chalk.gray('═'.repeat(RULE_WIDTH)));

    // Load configuration
    const config = ConfigLoader.load(projectRoot);

    // Validate current hooks
    const validation = GitHooksInstaller.validateHooks({
      projectRoot,
      config,
    });

    // --no-stash changes what is written, so it reinstalls an up-to-date hook.
    if (validation.valid && !options.force && options.stash !== false) {
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

    // Reinstall hooks. Without --force a hook with lines of its own is kept
    // and named; with it, it is saved as <hook>.bak first (#556).
    const written = GitHooksInstaller.reinstall({
      projectRoot,
      config,
      force: options.force === true,
      ...(options.stash === false ? { lintStagedNoStash: true } : {}),
    });
    if (written.refused.length > 0) {
      console.error(
        chalk.red(
          `\n❌ Not reinstalled: ${written.refused.join(', ')} — lines this version does not generate are kept. Run 'reinstall-hooks --force' to replace them; each is saved as <hook>.bak first.\n`
        )
      );
      process.exitCode = 1;
      return;
    }

    // The scripts are rewritten; whether git runs them is a separate fact,
    // asked of the target repository itself (#372).
    const active = GitHooksInstaller.verifyInstalled(projectRoot, config);
    if (!active.installed) {
      console.error(
        chalk.red(
          `\n❌ Hook scripts rewritten to v${getVersion()}, but git does NOT run them here: ${active.problems.join('; ')}`
        )
      );
      console.error(
        chalk.gray('   Run `npx husky` at the root of the repository.\n')
      );
      process.exitCode = 1;
      return;
    }

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
    .option(
      '--no-stash',
      'run lint-staged without its backup stash (several worktrees committing at once; only when no lint-staged task rewrites files) — kept on later reinstalls'
    )
    .action(async (options: ReinstallHooksOptions) => {
      await executeReinstallHooksAction(options);
    });
}

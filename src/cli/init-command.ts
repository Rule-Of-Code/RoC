import chalk from 'chalk';
import type { Command } from 'commander';
import * as inquirer from 'inquirer';
import { FileUtils } from '../utils/file-utils';
import { PathOperations } from '../utils/path-operations';
import { isInteractiveTerminal, setupQuickMode } from './init-helpers';
import { interactiveSetup } from './init-interactive';
import { TOTAL_LAWS_COUNT, getVersion } from './utils';

export interface InitOptions {
  force?: boolean;
  type?: string;
  hooks?: boolean;
  quick?: boolean;
}

interface InitActionResult {
  success: boolean;
  error?: Error;
}

// Default prompt function using inquirer
const defaultPrompt = inquirer.prompt.bind(inquirer);

// Prompt function type for dependency injection
type PromptFn = typeof inquirer.prompt;

/**
 * Execute the init command logic (for testing with custom projectRoot)
 */
export async function executeInitAction(
  options: InitOptions,
  projectRoot?: string,
  testError?: Error,
  promptFn: PromptFn = defaultPrompt
): Promise<InitActionResult> {
  try {
    if (testError) {
      throw testError;
    }

    const root = projectRoot ?? process.cwd();

    console.log(
      chalk.cyan(`🏛️ RuleOfCode v${getVersion()} Professional Setup`)
    );
    console.log(
      chalk.cyan(
        `⚖️  Complete ${TOTAL_LAWS_COUNT}-Law Constitutional Compliance System\n`
      )
    );

    const configPath = PathOperations.join(root, 'ruleofcode.config.js');
    const jsonConfigPath = PathOperations.join(root, 'ruleofcode.config.json');

    // Without a terminal nobody can answer a prompt (CI, a container, a pipe).
    // Asking anyway kills the process with an ERR_USE_AFTER_CLOSE stack trace.
    // The terminal requirement belongs to inquirer specifically: a caller that
    // injected its own prompt function has already supplied a way to answer.
    const canPrompt = promptFn !== defaultPrompt || isInteractiveTerminal();

    // Check if already initialized
    if (
      !options.force &&
      (FileUtils.exists(configPath) || FileUtils.exists(jsonConfigPath))
    ) {
      if (!canPrompt) {
        // Refuse rather than guess: overwriting someone's tuned config because
        // there was no one to ask is the destructive answer to the question.
        console.log(
          chalk.yellow(
            'RuleOfCode config already exists and this is not an interactive terminal.'
          )
        );
        console.log(
          chalk.yellow('Re-run with --force to overwrite it. Nothing changed.')
        );
        return { success: true };
      }

      const { overwrite } = await promptFn([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'RuleOfCode config already exists. Overwrite?',
          default: false,
        },
      ]);

      if (!overwrite) {
        console.log(chalk.yellow('Initialization cancelled'));
        return { success: true };
      }
    }

    // Quick setup option for experienced users
    if (options.quick) {
      console.log(
        chalk.green('🚀 Quick Setup Mode - Using production-ready defaults\n')
      );
      await setupQuickMode(root, options);
      return { success: true };
    }

    if (!canPrompt) {
      // Same defaults --quick documents, and we say so instead of pretending
      // the user chose them.
      console.log(
        chalk.yellow(
          'No interactive terminal detected — running the --quick setup defaults.'
        )
      );
      console.log(
        chalk.yellow(
          'Run `ruleofcode init` from a terminal to choose the settings yourself.\n'
        )
      );
      await setupQuickMode(root, options);
      return { success: true };
    }

    // Interactive setup flow
    await interactiveSetup(root, options, promptFn);
    return { success: true };
  } catch (_error) {
    const err = _error as Error;
    console.error(chalk.red(`❌ Initialization failed: ${err.message}`));
    return { success: false, error: err };
  }
}

/**
 * Configure init command
 */
export function initCommand(program: Command): void {
  program
    .command('init')
    .description(
      `🏛️ Initialize RuleOfCode v${getVersion()} with ${TOTAL_LAWS_COUNT} Constitutional Laws`
    )
    .option('-f, --force', 'overwrite existing configuration')
    .option(
      '-t, --type <type>',
      'project type: angular, react, vue, node, library, generic'
    )
    .option('--no-hooks', 'skip git hooks installation')
    .option('--quick', 'quick setup with sensible defaults (recommended)')
    .action(async (options: InitOptions) => {
      const result = await executeInitAction(options);
      if (!result.success && result.error) {
        throw result.error;
      }
    });
}

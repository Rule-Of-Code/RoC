import chalk from 'chalk';
import * as inquirer from 'inquirer';
import { FileUtils } from '../utils/file-utils';
import { PathOperations } from '../utils/path-operations';
import {
  detectProjectType,
  generateConfigFile,
  generateProConfig,
} from './init-helpers';
import { PARETO_LAWS_COUNT, TOTAL_LAWS_COUNT, getVersion } from './utils';

interface InitOptions {
  force?: boolean;
  type?: string;
  hooks?: boolean;
  quick?: boolean;
}

export interface ConfigData {
  projectName: string;
  projectType:
    | 'angular'
    | 'generic'
    | 'library'
    | 'node'
    | 'python'
    | 'react'
    | 'vue';
  componentPrefix: string;
  domain: string;
  lawsMode: string;
  paretoMode: boolean;
}

// Prompt function type for dependency injection
type PromptFn = typeof inquirer.prompt;

/**
 * Get project type interactively
 */
async function getProjectType(
  projectRoot: string,
  initialType?: string,
  promptFn: PromptFn = inquirer.prompt.bind(inquirer)
): Promise<
  'angular' | 'generic' | 'library' | 'node' | 'python' | 'react' | 'vue'
> {
  const validTypes = [
    'angular',
    'generic',
    'library',
    'node',
    'python',
    'react',
    'vue',
  ] as const;

  if (initialType && (validTypes as readonly string[]).includes(initialType)) {
    return initialType as
      | 'angular'
      | 'generic'
      | 'library'
      | 'node'
      | 'python'
      | 'react'
      | 'vue';
  }

  const detected = detectProjectType(projectRoot);
  console.log(chalk.cyan('📋 Step 1: Project Type'));

  const { type } = await promptFn([
    {
      type: 'list',
      name: 'type',
      message: 'What type of project is this?',
      choices: [
        {
          name: '⚛️  Angular Application (with Ionic support)',
          value: 'angular',
        },
        { name: '⚛️  React Application', value: 'react' },
        { name: '💚 Vue.js Application', value: 'vue' },
        { name: '🟢 Node.js/Express Server', value: 'node' },
        { name: '🐍 Python (FastAPI + Clean Architecture/CQRS)', value: 'python' },
        { name: '📚 TypeScript Library', value: 'library' },
        { name: '🔧 Generic TypeScript Project', value: 'generic' },
      ],
      default: detected,
    },
  ]);

  return type;
}

/**
 * Get component configuration interactively
 */
async function getComponentConfig(
  promptFn: PromptFn = inquirer.prompt.bind(inquirer)
): Promise<{
  componentPrefix: string;
  domain: string;
}> {
  console.log(chalk.cyan('\n📋 Step 2: Component Configuration'));
  return promptFn([
    {
      type: 'input',
      name: 'componentPrefix',
      message: 'Component prefix (e.g., "app" for app-header):',
      default: 'app',
      validate: (input: string) =>
        /^[a-z]{2,4}$/.test(input) || 'Must be 2-4 lowercase letters',
    },
    {
      type: 'input',
      name: 'domain',
      message: 'Your domain (for component naming):',
      default: 'mycompany.com',
      validate: (input: string) =>
        input.length > 3 || 'Domain must be at least 3 characters',
    },
  ]);
}

/**
 * Get laws mode configuration
 */
async function getLawsMode(
  promptFn: PromptFn = inquirer.prompt.bind(inquirer)
): Promise<string> {
  console.log(chalk.cyan('\n📋 Step 3: Constitutional Laws Configuration'));
  const { lawsMode } = await promptFn([
    {
      type: 'list',
      name: 'lawsMode',
      message: 'Which constitutional enforcement level do you prefer?',
      choices: [
        {
          name: `🎯 PARETO MODE - ${PARETO_LAWS_COUNT} High-Impact Laws (Recommended)`,
          value: 'pareto',
          short: 'Pareto',
        },
        {
          name: `🏦 FULL COMPLIANCE - All ${TOTAL_LAWS_COUNT} Constitutional Laws`,
          value: 'full',
          short: 'Full',
        },
        {
          name: "🔧 CUSTOM - I'll configure my own rules",
          value: 'custom',
          short: 'Custom',
        },
      ],
      default: 'pareto',
    },
  ]);

  return lawsMode;
}

/**
 * Save configuration and display success message
 */
export function saveConfigAndShowSuccess(
  projectRoot: string,
  configData: ConfigData
): void {
  const config = generateProConfig(configData);
  const configContent = generateConfigFile(config);
  const configPath = PathOperations.join(projectRoot, 'ruleofcode.config.js');

  FileUtils.writeFile(configPath, configContent);

  console.log(
    chalk.green(
      `✅ Configuration saved to ${PathOperations.getBasename(configPath)}`
    )
  );

  // Final success message
  console.log(
    chalk.greenBright(`\n🎉 RuleOfCode v${getVersion()} Setup Complete!`)
  );
  console.log(
    chalk.magentaBright('✨ MEGA PRO CONSTITUTIONAL SYSTEM ACTIVATED! ✨')
  );

  const lawCount = config.laws.paretoMode
    ? `${PARETO_LAWS_COUNT} high-impact`
    : `${TOTAL_LAWS_COUNT}`;

  console.log(
    chalk.cyanBright(
      `🏛️ ${lawCount} Constitutional Laws Ready for Enforcement!\n`
    )
  );
  console.log(
    chalk.yellowBright('🚀 Ready to enforce professional-grade code quality!')
  );
}

/**
 * Interactive setup flow - broken into smaller functions
 */
export async function interactiveSetup(
  projectRoot: string,
  options: InitOptions,
  promptFn: PromptFn = inquirer.prompt.bind(inquirer)
): Promise<void> {
  console.log(chalk.yellow('🎯 Professional Interactive Setup'));
  console.log(
    chalk.gray(
      "We'll ask a few questions to create your perfect configuration\n"
    )
  );

  const projectName = PathOperations.getBasename(projectRoot);
  const projectType = await getProjectType(projectRoot, options.type, promptFn);
  // Component prefix/domain are Angular-template concepts — skip the prompt for
  // Python (meaningless there); other types keep their existing behaviour.
  const { componentPrefix, domain } =
    projectType === 'python'
      ? { componentPrefix: '', domain: '' }
      : await getComponentConfig(promptFn);
  const lawsMode = await getLawsMode(promptFn);

  saveConfigAndShowSuccess(projectRoot, {
    projectName,
    projectType,
    componentPrefix,
    domain,
    lawsMode,
    paretoMode: lawsMode === 'pareto',
  });
}

import type { RuleOfCodeConfig } from '../config/types';
import { DEFAULT_CONFIG } from '../config/types';
import { CheckerUtils } from '../utils/checker-utils';
import { ProjectTypeDetector } from '../utils/config/project-type-detector';
import { FileUtils } from '../utils/file-utils';
import { PathOperations } from '../utils/path-operations';

interface InitOptions {
  force?: boolean;
  type?: string;
  hooks?: boolean;
  quick?: boolean;
}

/**
 * True when a prompt can actually be answered — both ends are a real terminal.
 *
 * `init` asks questions, and a question needs someone able to answer it. In CI,
 * in a container, or behind a pipe there is no terminal: inquirer force-closes
 * its readline and the process dies with an ERR_USE_AFTER_CLOSE stack trace —
 * a setup tool crashing instead of setting anything up. Callers use this to
 * fall back to the documented defaults rather than ask into the void.
 */
export function isInteractiveTerminal(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/**
 * Detect project type based on files present
 */
export function detectProjectType(
  projectRoot: string
): 'angular' | 'generic' | 'library' | 'node' | 'python' | 'react' | 'vue' {
  try {
    const detectedType = ProjectTypeDetector.detectProjectType(projectRoot);

    if (detectedType) {
      return detectedType as
        | 'angular'
        | 'generic'
        | 'library'
        | 'node'
        | 'python'
        | 'react'
        | 'vue';
    }

    return 'generic';
  } catch {
    return 'generic';
  }
}

interface ProConfigOptions {
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

/**
 * Generate professional configuration based on user choices
 */
export function generateProConfig(options: ProConfigOptions): RuleOfCodeConfig {
  const baseConfig = { ...DEFAULT_CONFIG };

  return {
    ...baseConfig,
    project: {
      ...baseConfig.project,
      name: options.projectName,
      type: options.projectType,
      componentPrefix: options.componentPrefix,
    },
    laws: {
      ...baseConfig.laws,
      paretoMode: options.paretoMode,
    },
  };
}

/**
 * Generate config file content
 */
export function generateConfigFile(config: RuleOfCodeConfig): string {
  return `module.exports = ${JSON.stringify(config, null, 2)};`;
}

/**
 * Quick setup mode - uses production-ready defaults
 */
export async function setupQuickMode(
  projectRoot: string,
  options: InitOptions
): Promise<void> {
  const { GitHooksInstaller } = await import('../hooks/installer');
  const projectName = PathOperations.getBasename(projectRoot);
  const detected = detectProjectType(projectRoot);

  console.log(`Project: ${projectName}`);
  console.log(`Type: ${detected} (auto-detected)`);
  console.log('Laws: Pareto mode (high-impact laws)');
  console.log('Hooks: Pre-commit + Pre-push enabled');

  const baseConfig = { ...DEFAULT_CONFIG };
  const config = {
    ...baseConfig,
    project: {
      ...baseConfig.project,
      name: projectName,
      type: detected,
      componentPrefix:
        CheckerUtils.findAngularFiles(projectRoot, baseConfig).length > 0
          ? 'app'
          : 'ui',
    },
    laws: {
      ...baseConfig.laws,
      paretoMode: true,
    },
    hooks: {
      ...baseConfig.hooks,
      preCommit: true,
      prePush: true,
      commitMsg: true,
    },
  };

  const configContent = generateConfigFile(config);
  const configPath = PathOperations.join(projectRoot, 'ruleofcode.config.js');
  FileUtils.writeFile(configPath, configContent);

  if (options.hooks !== false) {
    console.log('Installing git hooks...');
    GitHooksInstaller.ensureHusky(projectRoot);
    GitHooksInstaller.install({ projectRoot, config });
  }

  console.log('\n🎉 Quick setup complete!');
  console.log('Run "npx ruleofcode audit" to start\n');
}

import * as fs from 'fs';
import type { RuleOfCodeConfig } from '../config/types';
import { DEFAULT_CONFIG } from '../config/types';
import { CheckerUtils } from '../utils/checker-utils';
import { ProjectTypeDetector } from '../utils/config/project-type-detector';
import { FileUtils } from '../utils/file-utils';
import { resolveGitHooksDir } from '../utils/git/git-layout';
import { PathOperations } from '../utils/path-operations';

/** The project types a config may declare — the one list, from the config schema. */
export type ProjectType = RuleOfCodeConfig['project']['type'];

/** The types `init --type` and the type prompt accept — every type detection can answer. */
export const INIT_PROJECT_TYPES = [
  'angular',
  'generic',
  'ionic',
  'library',
  'node',
  'python',
  'react',
  'typescript',
  'vue',
] as const;

export function isInitProjectType(type: string | undefined): type is ProjectType {
  return type !== undefined && (INIT_PROJECT_TYPES as readonly string[]).includes(type);
}

/** The file `init` writes — the one the README, the guides and the templates name (#332). */
export const INIT_CONFIG_FILE = 'ruleofcode.config.json';
const LEGACY_INIT_CONFIG_FILE = 'ruleofcode.config.js';

/**
 * Write the config as `ruleofcode.config.json` and return its path.
 *
 * `init` used to write `ruleofcode.config.js` while every document said
 * `.json`, so the README's `--config ruleofcode.config.json` pointed at a file
 * that did not exist (#332). The loader reads `.js` BEFORE `.json`, so an old
 * `.js` left next to the new file would silently win: an overwrite (`--force`
 * or a confirmed prompt) moves it aside to `ruleofcode.config.js.bak`, and
 * says so.
 */
export function writeInitConfig(projectRoot: string, config: RuleOfCodeConfig): string {
  const configPath = PathOperations.join(projectRoot, INIT_CONFIG_FILE);
  FileUtils.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  const legacy = PathOperations.join(projectRoot, LEGACY_INIT_CONFIG_FILE);
  if (FileUtils.exists(legacy)) {
    fs.renameSync(legacy, `${legacy}.bak`);
    console.log(
      `Moved the previous ${LEGACY_INIT_CONFIG_FILE} to ${LEGACY_INIT_CONFIG_FILE}.bak — it would have taken precedence over ${INIT_CONFIG_FILE}.`
    );
  }
  return configPath;
}

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
): ProjectType {
  try {
    const detectedType = ProjectTypeDetector.detectProjectType(projectRoot);

    if (detectedType) {
      return detectedType as ProjectType;
    }

    return 'generic';
  } catch {
    return 'generic';
  }
}

interface ProConfigOptions {
  projectName: string;
  projectType: ProjectType;
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
 * Install the hooks, then CHECK that git runs them in the target repository.
 *
 * Fails closed: "installed successfully" is printed only when the target's
 * own `core.hooksPath` (or its default hooks directory) resolves to an
 * existing directory holding every enabled hook. Husky's exit code cannot
 * say so: it exits 0 when `.git` is not in the directory or HUSKY=0 is set,
 * and with an inherited GIT_DIR it used to write another repository's
 * config while this one got nothing (#372).
 */
function installHooksOrFail(
  installer: typeof import('../hooks/installer').GitHooksInstaller,
  projectRoot: string,
  config: RuleOfCodeConfig
): void {
  if (resolveGitHooksDir(projectRoot) === null) {
    throw new Error(
      'git hooks need a git repository and this directory is not inside one. ' +
        'The configuration was written; run `git init` and re-run init, or ' +
        'pass --no-hooks.'
    );
  }
  console.log('Installing git hooks...');
  installer.ensureHusky(projectRoot);
  installer.install({ projectRoot, config });

  const { installed, problems } = installer.verifyInstalled(projectRoot, config);
  if (!installed) {
    throw new Error(
      `git hooks are NOT active in this repository: ${problems.join('; ')}. ` +
        'The configuration and the .husky/ scripts were written; run ' +
        '`npx husky` at the root of the repository to activate them.'
    );
  }
  console.log('✅ Git hooks installed successfully');
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
  // --type was accepted and ignored: quick mode always used the detected type.
  const requested = isInitProjectType(options.type) ? options.type : undefined;
  const detected = requested ?? detectProjectType(projectRoot);

  console.log(`Project: ${projectName}`);
  console.log(`Type: ${detected} (${requested ? 'from --type' : 'auto-detected'})`);
  console.log('Laws: the full law set (Pareto is an opt-in: laws.paretoMode)');
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
    // The full law set (B3). The hooks inherit this scope, so `paretoMode: true`
    // here made every quick install — and every non-interactive one — gate
    // commits on the Pareto subset with no liveness floor, while the docs and
    // the template say Pareto is an explicit opt-in.
    laws: {
      ...baseConfig.laws,
      paretoMode: false,
    },
    hooks: {
      ...baseConfig.hooks,
      preCommit: true,
      prePush: true,
      commitMsg: true,
    },
  };

  const configPath = writeInitConfig(projectRoot, config);
  console.log(`Configuration saved to ${PathOperations.getBasename(configPath)}`);

  if (options.hooks !== false) {
    installHooksOrFail(GitHooksInstaller, projectRoot, config);
  }

  console.log('\n🎉 Quick setup complete!');
  console.log('Run "npx ruleofcode audit" to start\n');
}

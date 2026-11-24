/**
 * Git Hooks Integration for RuleOfCode
 * Professional Husky integration with FileHeaderComplianceAnalyzer
 */

import chalk from 'chalk';
import type { RuleOfCodeConfig } from '../config/types';
import { execFileSync, execSync } from '../utils/child-process';
import { ProjectTypeDetectorValidation } from '../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../utils/file-utils';
import { hookInstallation } from '../utils/git-hook-status';
import { PathOperations } from '../utils/path-operations';
import { PythonSatisfaction } from '../utils/python-satisfaction';
import {
  commitMsgScript,
  customHookScript,
  lintStagedCall,
  prePushScript,
  preCommitScript,
} from './hook-scripts';

export interface HooksInstallOptions {
  projectRoot: string;
  config: RuleOfCodeConfig;
  /** Write over hooks that exist. */
  force?: boolean;
  /**
   * When writing over a hook that has lines this version does not generate,
   * keep it and name it instead of replacing it (#556). Without it, such a
   * hook is saved as `<hook>.bak` first.
   */
  keepEdited?: boolean;
  /**
   * Run lint-staged without its backup stash (#480). `undefined` keeps what
   * the existing pre-commit hook does, so an opt-in survives the next
   * reinstall.
   */
  lintStagedNoStash?: boolean;
}

/** What an install did to existing hooks it was asked to write over. */
export interface HooksWriteReport {
  /** Hooks kept as they are: they have lines of their own (keepEdited). */
  refused: string[];
  /** `<hook>.bak` files written before a hook with lines of its own was replaced. */
  backups: string[];
}

interface WriteMode {
  force: boolean;
  lintStagedNoStash: boolean;
  keepEdited: boolean;
  report: HooksWriteReport;
}

/** A version stamp in a generated hook (`RuleOfCode v8.0.1`). */
const VERSION_STAMP = /\bv\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\b/g;

export class GitHooksInstaller {
  /**
   * Stamped into every generated hook.
   *
   * Read from our own package.json rather than written here: this was a literal
   * that a human had to remember to bump, and it had already drifted — the hooks
   * committed in this repository announced a version the package had moved past.
   * A tool whose whole subject is claims matching reality cannot stamp a version
   * number it maintains by hand.
   */
  private static get VERSION(): string {
    try {
      const pkg = require('../../package.json') as { version?: string };
      return pkg.version ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }
  private static readonly PACKAGE_JSON_FILE = 'package.json';
  private static readonly HUSKY_DIR = '.husky';
  private static readonly PRE_COMMIT_HOOK = 'pre-commit';
  private static readonly PRE_PUSH_HOOK = 'pre-push';
  private static readonly COMMIT_MSG_HOOK = 'commit-msg';
  /**
   * Install all git hooks based on configuration
   */
  static install(options: HooksInstallOptions): HooksWriteReport {
    const { projectRoot, config, force = false, keepEdited = false } = options;
    const report: HooksWriteReport = { refused: [], backups: [] };
    const lintStagedNoStash =
      options.lintStagedNoStash ?? this.hookRunsLintStagedNoStash(projectRoot);
    const mode: WriteMode = { force, keepEdited, lintStagedNoStash, report };

    console.log(chalk.cyanBright('🔧 Installing RuleOfCode git hooks...'));

    // Ensure .husky directory exists
    const huskyDir = PathOperations.join(projectRoot, this.HUSKY_DIR);
    FileUtils.createDirectory(huskyDir);

    // Install hooks based on configuration
    if (config.hooks.preCommit) {
      this.installPreCommitHook(projectRoot, config, mode);
    }

    if (config.hooks.prePush) {
      this.installPrePushHook(projectRoot, config, mode);
    }

    if (config.hooks.commitMsg) {
      this.installCommitMsgHook(projectRoot, config, mode);
    }

    // Install custom hooks
    if (config.hooks.custom) {
      for (const [hookName, commands] of Object.entries(config.hooks.custom)) {
        this.installCustomHook(projectRoot, hookName, commands, mode);
      }
    }

    console.log(chalk.greenBright('✅ Hook scripts written to .husky/'));
    return report;
  }

  /**
   * Write one hook. A hook that exists and differs from `content` by more
   * than its version stamp has lines this version does not generate — the
   * project's own steps, or an older template — and writing over it in
   * silence deleted them (#556). It is kept and named (`keepEdited`), or
   * saved as `<hook>.bak` before it is replaced. Returns whether it wrote.
   */
  private static writeHook(
    hookPath: string,
    hookName: string,
    content: string,
    mode: WriteMode
  ): boolean {
    if (FileUtils.exists(hookPath)) {
      const current = FileUtils.readFile(hookPath);
      if (!this.sameButVersion(current, content)) {
        const where = `${this.HUSKY_DIR}/${hookName}`;
        if (mode.keepEdited) {
          console.log(
            chalk.yellowBright(
              `⚠️ ${where} has lines this version does not generate (the project's own, or an older template) — kept as it is. Compare it with the template, or run 'reinstall-hooks --force' to replace it (the file is saved as ${where}.bak first).`
            )
          );
          mode.report.refused.push(hookName);
          return false;
        }
        const backup = `${hookPath}.bak`;
        FileUtils.writeFile(backup, current);
        mode.report.backups.push(backup);
        console.log(
          chalk.yellowBright(
            `⚠️ ${where} had lines this version does not generate — the old file is saved as ${backup}`
          )
        );
      }
    }
    FileUtils.writeFile(hookPath, content);
    return true;
  }

  /** The existing pre-commit hook runs `npx lint-staged --no-stash` (the #480 opt-in). */
  private static hookRunsLintStagedNoStash(projectRoot: string): boolean {
    const hookPath = PathOperations.join(
      projectRoot,
      this.HUSKY_DIR,
      this.PRE_COMMIT_HOOK
    );
    if (!FileUtils.exists(hookPath)) return false;
    return /^\s*npx lint-staged --no-stash\s*$/m.test(
      FileUtils.readFile(hookPath)
    );
  }

  /**
   * The two hooks are the same apart from version stamps, line endings and
   * the generated lint-staged call — with or without the #480 opt-in, which
   * is this tool's own text, not a line of the project's.
   */
  private static sameButVersion(a: string, b: string): boolean {
    const optIn = lintStagedCall(true);
    const plain = (text: string): string =>
      text
        .replace(/\r\n/g, '\n')
        .replace(VERSION_STAMP, 'v*')
        .split(optIn)
        .join(lintStagedCall(false));
    return plain(a) === plain(b);
  }

  /**
   * Install pre-commit hook
   */
  private static installPreCommitHook(
    projectRoot: string,
    config: RuleOfCodeConfig,
    mode: WriteMode
  ): void {
    const hookPath = PathOperations.join(
      projectRoot,
      this.HUSKY_DIR,
      this.PRE_COMMIT_HOOK
    );

    if (!mode.force && FileUtils.exists(hookPath)) {
      console.log(
        chalk.yellowBright(
          '⚠️ pre-commit hook already exists, skipping (use --force to overwrite)'
        )
      );
      return;
    }

    const hookContent = preCommitScript(
      this.VERSION,
      config,
      mode.lintStagedNoStash
    );

    if (!this.writeHook(hookPath, this.PRE_COMMIT_HOOK, hookContent, mode))
      return;
    console.log(chalk.greenBright('✅ pre-commit hook installed'));
  }

  /**
   * Install pre-push hook
   */
  private static installPrePushHook(
    projectRoot: string,
    config: RuleOfCodeConfig,
    mode: WriteMode
  ): void {
    const hookPath = PathOperations.join(
      projectRoot,
      this.HUSKY_DIR,
      this.PRE_PUSH_HOOK
    );

    if (!mode.force && FileUtils.exists(hookPath)) {
      console.log(
        chalk.yellowBright(
          '⚠️ pre-push hook already exists, skipping (use --force to overwrite)'
        )
      );
      return;
    }

    const hookContent = prePushScript(this.VERSION, config);

    if (!this.writeHook(hookPath, this.PRE_PUSH_HOOK, hookContent, mode))
      return;
    console.log(chalk.greenBright('✅ pre-push hook installed'));
  }

  /**
   * Install commit-msg hook
   */
  private static installCommitMsgHook(
    projectRoot: string,
    config: RuleOfCodeConfig,
    mode: WriteMode
  ): void {
    const hookPath = PathOperations.join(
      projectRoot,
      this.HUSKY_DIR,
      this.COMMIT_MSG_HOOK
    );

    if (!mode.force && FileUtils.exists(hookPath)) {
      console.log(
        '⚠️ commit-msg hook already exists, skipping (use --force to overwrite)'
      );
      return;
    }

    const hookContent = commitMsgScript(this.VERSION, config);

    if (!this.writeHook(hookPath, this.COMMIT_MSG_HOOK, hookContent, mode))
      return;
    console.log('✅ commit-msg hook installed');
  }

  /**
   * Install custom hook
   */
  private static installCustomHook(
    projectRoot: string,
    hookName: string,
    commands: string[],
    mode: WriteMode
  ): void {
    const hookPath = PathOperations.join(projectRoot, this.HUSKY_DIR, hookName);

    if (!mode.force && FileUtils.exists(hookPath)) {
      console.log(
        `⚠️ ${hookName} hook already exists, skipping (use --force to overwrite)`
      );
      return;
    }

    const hookContent = customHookScript(hookName, commands);

    if (!this.writeHook(hookPath, hookName, hookContent, mode)) return;
    console.log(`✅ ${hookName} hook installed`);
  }

  /**
   * Uninstall all RuleOfCode hooks
   */
  static uninstall(projectRoot: string): void {
    const huskyDir = PathOperations.join(projectRoot, this.HUSKY_DIR);

    if (!FileUtils.exists(huskyDir)) {
      console.log('No .husky directory found, nothing to uninstall');
      return;
    }

    const hooks = [
      this.PRE_COMMIT_HOOK,
      this.PRE_PUSH_HOOK,
      this.COMMIT_MSG_HOOK,
    ];

    for (const hook of hooks) {
      const hookPath = PathOperations.join(huskyDir, hook);
      if (FileUtils.exists(hookPath)) {
        const content = FileUtils.readFile(hookPath);
        if (content.includes('RuleOfCode')) {
          FileUtils.deleteFile(hookPath);
          console.log(`✅ Removed ${hook} hook`);
        }
      }
    }

    console.log('🗑️ RuleOfCode hooks uninstalled');
  }

  /**
   * Check if husky is installed in project
   */
  static isHuskyInstalled(projectRoot: string): boolean {
    const packageJsonPath = PathOperations.join(
      projectRoot,
      this.PACKAGE_JSON_FILE
    );

    if (!FileUtils.exists(packageJsonPath)) {
      return false;
    }

    try {
      const deps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
      return 'husky' in deps;
    } catch {
      return false;
    }
  }

  /**
   * Install husky if it is not a dependency yet, then let it activate the
   * hooks in this checkout (`core.hooksPath`).
   *
   * The activation step runs even when husky is already a dependency: being
   * listed in package.json says nothing about whether git runs the hooks in
   * this checkout (a fresh clone, or a project that never ran `husky`). Whether
   * it worked is not taken from husky's output (husky exits 0 when it cannot
   * find `.git` or is disabled with HUSKY=0) but checked afterwards by
   * {@link verifyInstalled}.
   */
  static ensureHusky(projectRoot: string): void {
    if (this.isHuskyInstalled(projectRoot)) {
      console.log('✅ Husky already a dependency');
    } else {
      console.log('📦 Installing Husky...');
      this.runSetupStep('Failed to install Husky', () =>
        execSync('npm install --save-dev husky', {
          cwd: projectRoot,
          stdio: 'inherit',
        })
      );
    }

    // `husky install` is deprecated in husky v9 (removed in v10); the v9 setup
    // command is just `husky`. The locally installed one is run directly, so
    // the version the project pinned is the one that writes core.hooksPath.
    const localBin = this.localHuskyBin(projectRoot);
    this.runSetupStep('Failed to activate Husky', () =>
      localBin
        ? execFileSync(process.execPath, [localBin], {
            cwd: projectRoot,
            stdio: 'inherit',
          })
        : execSync('npx husky', { cwd: projectRoot, stdio: 'inherit' })
    );

    this.addPrepareScript(projectRoot);
  }

  /** Run one setup step, rethrowing its failure under `message`. */
  private static runSetupStep(message: string, step: () => unknown): void {
    try {
      step();
    } catch (_error) {
      const err = _error as Error;
      throw new Error(`${message}: ${err.message}`);
    }
  }

  /** `node_modules/husky`'s bin script under `projectRoot`, or null. */
  private static localHuskyBin(projectRoot: string): string | null {
    const dir = PathOperations.join(projectRoot, 'node_modules', 'husky');
    const manifestPath = PathOperations.join(dir, this.PACKAGE_JSON_FILE);
    if (!FileUtils.exists(manifestPath)) return null;
    try {
      const manifest = FileUtils.readJsonFile<{
        bin?: string | Record<string, string>;
      }>(manifestPath);
      const bin =
        typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.husky;
      const binPath = bin ? PathOperations.join(dir, bin) : null;
      return binPath && FileUtils.exists(binPath) ? binPath : null;
    } catch {
      return null;
    }
  }

  /** Add `prepare: husky` so a fresh clone activates the hooks on install. */
  private static addPrepareScript(projectRoot: string): void {
    const packageJsonPath = PathOperations.join(
      projectRoot,
      this.PACKAGE_JSON_FILE
    );
    if (!FileUtils.exists(packageJsonPath)) return;
    const packageJson =
      FileUtils.readJsonFile<Record<string, unknown>>(packageJsonPath);

    const scripts = (packageJson.scripts ?? {}) as Record<string, string>;
    packageJson.scripts = scripts;

    if (!scripts.prepare) {
      scripts.prepare = 'husky';
      FileUtils.writeFile(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2)
      );
      console.log('✅ Added prepare script to package.json');
    }
  }

  /** The hook names `config` enables. */
  static enabledHooks(config: RuleOfCodeConfig): string[] {
    const hooks: string[] = [];
    if (config.hooks.preCommit) hooks.push(this.PRE_COMMIT_HOOK);
    if (config.hooks.prePush) hooks.push(this.PRE_PUSH_HOOK);
    if (config.hooks.commitMsg) hooks.push(this.COMMIT_MSG_HOOK);
    hooks.push(...Object.keys(config.hooks.custom ?? {}));
    return hooks;
  }

  /**
   * Does git, in the repository of `projectRoot` itself, run every hook
   * `config` enables? Asked of git through the shared child environment, so
   * an inherited GIT_DIR cannot answer for another repository (#372).
   */
  static verifyInstalled(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { installed: boolean; problems: string[] } {
    const problems = this.enabledHooks(config)
      .map(hook => hookInstallation(projectRoot, hook))
      .filter(state => !state.installed)
      .map(state => state.reason);
    const unique = [...new Set(problems)];
    return { installed: unique.length === 0, problems: unique };
  }

  /**
   * Generate template for lint-staged integration
   */
  static generateLintStagedConfig(
    config: RuleOfCodeConfig,
    projectRoot?: string
  ): object {
    const lintStagedConfig: Record<string, string[]> = {
      // NOT --mode=fast. RoC used to install a commit gate that ran the Pareto
      // SUBSET, so the tool itself handed every project a quietly disarmed gate.
      // pre-commit narrows the FILES (--staged), never the laws.
      '*.{ts,js}': ['npx ruleofcode audit --mode=pre-commit --staged'],
    };

    // Add framework-specific linting
    // An Ionic project on Angular lints with the Angular CLI as well.
    const onAngular =
      config.project.type === 'angular' ||
      (config.project.type === 'ionic' &&
        projectRoot !== undefined &&
        ProjectTypeDetectorValidation.isAngularProject(projectRoot));
    if (onAngular) {
      lintStagedConfig['*.{ts,js}']?.push('ng lint --fix');
    }

    // Add formatting
    lintStagedConfig['*.{ts,js,json,md}'] = ['prettier --write', 'git add'];

    return lintStagedConfig;
  }

  /**
   * Validate hooks installation according to config
   */
  static validateHooks(options: {
    projectRoot: string;
    config: RuleOfCodeConfig;
  }): { valid: boolean; missing: string[]; outdated: string[] } {
    const { projectRoot, config } = options;
    const missing: string[] = [];
    const outdated: string[] = [];

    // A configured hook framework (`.pre-commit-config.yaml` — the Python-native
    // husky) OWNS the hooks: `pre-commit install` writes them into `.git/hooks`.
    // Warning such a project that `.husky` is "missing" demands husky's substrate
    // on top of an already-satisfied concern, so hook validation is a no-op for
    // it. The gate requires a Python project — husky validation for JS/TS
    // projects is unchanged.
    if (this.hasPythonHookFramework(projectRoot)) {
      return { valid: true, missing: [], outdated: [] };
    }

    const huskyDir = PathOperations.join(projectRoot, this.HUSKY_DIR);

    // Check if .husky directory exists
    if (!FileUtils.exists(huskyDir)) {
      return {
        valid: false,
        missing: ['All hooks - .husky directory not found'],
        outdated: [],
      };
    }

    // Check each configured hook
    if (config.hooks.preCommit) {
      this.checkHookStatus(
        huskyDir,
        this.PRE_COMMIT_HOOK,
        `v${this.VERSION}`,
        missing,
        outdated
      );
    }

    if (config.hooks.prePush) {
      this.checkHookStatus(
        huskyDir,
        this.PRE_PUSH_HOOK,
        `v${this.VERSION}`,
        missing,
        outdated
      );
    }

    if (config.hooks.commitMsg) {
      // The VERSION, as its two siblings above already require.
      //
      // This asked for the literal string 'RuleOfCode', which every generated
      // commit-msg hook has ever contained — so a hook written by any earlier
      // version reported as up to date, and `reinstall-hooks` left it in place.
      // A consumer upgrading kept the old hook silently, which is how a fix to
      // the hook fails to reach the person it was written for.
      this.checkHookStatus(
        huskyDir,
        this.COMMIT_MSG_HOOK,
        `v${this.VERSION}`,
        missing,
        outdated
      );
    }

    return {
      valid: missing.length === 0 && outdated.length === 0,
      missing,
      outdated,
    };
  }

  /**
   * Are the hooks owned by a Python-native hook framework?
   * (`.pre-commit-config.yaml` / a `pre-commit` entry in the gate config)
   */
  private static hasPythonHookFramework(projectRoot: string): boolean {
    return (
      PythonSatisfaction.isPython(projectRoot) &&
      PythonSatisfaction.hasHookFramework(projectRoot)
    );
  }

  /**
   * Check a single hook file and record it as missing or outdated
   */
  private static checkHookStatus(
    huskyDir: string,
    hookName: string,
    requiredMarker: string,
    missing: string[],
    outdated: string[]
  ): void {
    const hookPath = PathOperations.join(huskyDir, hookName);
    if (!FileUtils.exists(hookPath)) {
      missing.push(hookName);
    } else {
      const content = FileUtils.readFile(hookPath);
      if (!content.includes(requiredMarker)) {
        outdated.push(hookName);
      }
    }
  }

  /**
   * Reinstall hooks: write over the generated ones. A hook with lines of its
   * own is kept and named, unless `force` is given — then it is saved as
   * `<hook>.bak` and replaced (#556).
   */
  static reinstall(options: HooksInstallOptions): HooksWriteReport {
    console.log(chalk.cyanBright('🔄 Reinstalling RuleOfCode git hooks...'));
    return this.install({
      ...options,
      force: true,
      keepEdited: !options.force,
    });
  }

  /**
   * Install lint-staged configuration
   */
  static installLintStaged(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): void {
    const packageJsonPath = PathOperations.join(
      projectRoot,
      this.PACKAGE_JSON_FILE
    );

    if (!FileUtils.exists(packageJsonPath)) {
      throw new Error('package.json not found');
    }

    const packageJson =
      FileUtils.readJsonFile<Record<string, unknown>>(packageJsonPath);

    // Add lint-staged configuration
    packageJson['lint-staged'] = this.generateLintStagedConfig(
      config,
      projectRoot
    );

    // Update pre-commit hook to use lint-staged
    if (config.hooks.preCommit) {
      const hookPath = PathOperations.join(
        projectRoot,
        this.HUSKY_DIR,
        this.PRE_COMMIT_HOOK
      );
      const hookContent = `# RuleOfCode with lint-staged (husky v9+ native)
echo "🏛️ RuleOfCode Constitutional Checkpoint with lint-staged"
npx lint-staged

# Run constitutional audit on staged files
npx ruleofcode audit --mode=pre-commit --staged
`;

      FileUtils.writeFile(hookPath, hookContent);
    }

    FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ lint-staged configuration added');
  }
}

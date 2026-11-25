/**
 * Husky and lint-staged in the project's package.json: whether husky is a
 * dependency, its installation and activation, and the lint-staged config.
 */
import type { RuleOfCodeConfig } from '../config/types';
import { execFileSync, execSync } from '../utils/child-process';
import { ProjectTypeDetectorValidation } from '../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../utils/file-utils';
import { PathOperations } from '../utils/path-operations';

const PACKAGE_JSON_FILE = 'package.json';
const HUSKY_DIR = '.husky';
const PRE_COMMIT_HOOK = 'pre-commit';

/**
 * Check if husky is installed in project
 */
export function isHuskyInstalled(projectRoot: string): boolean {
  const packageJsonPath = PathOperations.join(projectRoot, PACKAGE_JSON_FILE);

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
 * `GitHooksInstaller.verifyInstalled`.
 */
export function ensureHusky(projectRoot: string): void {
  if (isHuskyInstalled(projectRoot)) {
    console.log('✅ Husky already a dependency');
  } else {
    console.log('📦 Installing Husky...');
    runSetupStep('Failed to install Husky', () =>
      execSync('npm install --save-dev husky', {
        cwd: projectRoot,
        stdio: 'inherit',
      })
    );
  }

  // `husky install` is deprecated in husky v9 (removed in v10); the v9 setup
  // command is just `husky`. The locally installed one is run directly, so
  // the version the project pinned is the one that writes core.hooksPath.
  const localBin = localHuskyBin(projectRoot);
  runSetupStep('Failed to activate Husky', () =>
    localBin
      ? execFileSync(process.execPath, [localBin], {
          cwd: projectRoot,
          stdio: 'inherit',
        })
      : execSync('npx husky', { cwd: projectRoot, stdio: 'inherit' })
  );

  addPrepareScript(projectRoot);
}

/** Run one setup step, rethrowing its failure under `message`. */
function runSetupStep(message: string, step: () => unknown): void {
  try {
    step();
  } catch (_error) {
    const err = _error as Error;
    throw new Error(`${message}: ${err.message}`);
  }
}

/** `node_modules/husky`'s bin script under `projectRoot`, or null. */
function localHuskyBin(projectRoot: string): string | null {
  const dir = PathOperations.join(projectRoot, 'node_modules', 'husky');
  const manifestPath = PathOperations.join(dir, PACKAGE_JSON_FILE);
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
function addPrepareScript(projectRoot: string): void {
  const packageJsonPath = PathOperations.join(projectRoot, PACKAGE_JSON_FILE);
  if (!FileUtils.exists(packageJsonPath)) return;
  const packageJson =
    FileUtils.readJsonFile<Record<string, unknown>>(packageJsonPath);

  const scripts = (packageJson.scripts ?? {}) as Record<string, string>;
  packageJson.scripts = scripts;

  if (!scripts.prepare) {
    scripts.prepare = 'husky';
    FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Added prepare script to package.json');
  }
}

/**
 * Generate template for lint-staged integration
 */
export function generateLintStagedConfig(
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
 * Install lint-staged configuration
 */
export function installLintStaged(
  projectRoot: string,
  config: RuleOfCodeConfig
): void {
  const packageJsonPath = PathOperations.join(projectRoot, PACKAGE_JSON_FILE);

  if (!FileUtils.exists(packageJsonPath)) {
    throw new Error('package.json not found');
  }

  const packageJson =
    FileUtils.readJsonFile<Record<string, unknown>>(packageJsonPath);

  // Add lint-staged configuration
  packageJson['lint-staged'] = generateLintStagedConfig(config, projectRoot);

  // Update pre-commit hook to use lint-staged
  if (config.hooks.preCommit) {
    const hookPath = PathOperations.join(
      projectRoot,
      HUSKY_DIR,
      PRE_COMMIT_HOOK
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

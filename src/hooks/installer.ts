/**
 * Git Hooks Integration for RuleOfCode
 * Professional Husky integration with FileHeaderComplianceAnalyzer
 */

import chalk from 'chalk';
import type { RuleOfCodeConfig } from '../config/types';
import { ProjectTypeDetectorValidation } from '../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../utils/file-utils';
import { PathOperations } from '../utils/path-operations';
import { PythonSatisfaction } from '../utils/python-satisfaction';

export interface HooksInstallOptions {
  projectRoot: string;
  config: RuleOfCodeConfig;
  force?: boolean;
}

export class GitHooksInstaller {
  private static readonly VERSION = '7.17.3';
  private static readonly PACKAGE_JSON_FILE = 'package.json';
  private static readonly HUSKY_DIR = '.husky';
  private static readonly PRE_COMMIT_HOOK = 'pre-commit';
  private static readonly PRE_PUSH_HOOK = 'pre-push';
  private static readonly COMMIT_MSG_HOOK = 'commit-msg';
  /**
   * Install all git hooks based on configuration
   */
  static install(options: HooksInstallOptions): void {
    const { projectRoot, config, force = false } = options;

    console.log(chalk.cyanBright('🔧 Installing RuleOfCode git hooks...'));

    // Ensure .husky directory exists
    const huskyDir = PathOperations.join(projectRoot, this.HUSKY_DIR);
    FileUtils.createDirectory(huskyDir);

    // Install hooks based on configuration
    if (config.hooks.preCommit) {
      this.installPreCommitHook(projectRoot, config, force);
    }

    if (config.hooks.prePush) {
      this.installPrePushHook(projectRoot, config, force);
    }

    if (config.hooks.commitMsg) {
      this.installCommitMsgHook(projectRoot, config, force);
    }

    // Install custom hooks
    if (config.hooks.custom) {
      for (const [hookName, commands] of Object.entries(config.hooks.custom)) {
        this.installCustomHook(projectRoot, hookName, commands, force);
      }
    }

    console.log(chalk.greenBright('✅ Git hooks installed successfully'));
  }

  /**
   * Install pre-commit hook
   */
  private static installPreCommitHook(
    projectRoot: string,
    config: RuleOfCodeConfig,
    force: boolean
  ): void {
    const hookPath = PathOperations.join(
      projectRoot,
      this.HUSKY_DIR,
      this.PRE_COMMIT_HOOK
    );

    if (!force && FileUtils.exists(hookPath)) {
      console.log(
        chalk.yellowBright(
          '⚠️ pre-commit hook already exists, skipping (use --force to overwrite)'
        )
      );
      return;
    }

    const hookContent = `# RuleOfCode v${this.VERSION} Constitutional Checkpoint (husky v9+ native hook)
echo "🏛️ RuleOfCode v${this.VERSION} Constitutional Checkpoint with lint-staged"
npx lint-staged

# Run constitutional audit on staged files
npx ruleofcode audit --mode=pre-commit --staged

# Check exit code
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Constitutional violations detected - commit blocked"
    echo "   Run 'npx ruleofcode audit --verbose' for details"
    echo "   Or use 'git commit --no-verify' to bypass (not recommended)"
    exit 1
fi
${this.pythonHookBlock(config, this.PRE_COMMIT_HOOK)}
echo "✅ Constitutional compliance verified - proceeding with commit"
`;

    FileUtils.writeFile(hookPath, hookContent);
    console.log(chalk.greenBright('✅ pre-commit hook installed'));
  }

  /**
   * Install pre-push hook
   */
  private static installPrePushHook(
    projectRoot: string,
    config: RuleOfCodeConfig,
    force: boolean
  ): void {
    const hookPath = PathOperations.join(
      projectRoot,
      this.HUSKY_DIR,
      this.PRE_PUSH_HOOK
    );

    if (!force && FileUtils.exists(hookPath)) {
      console.log(
        chalk.yellowBright(
          '⚠️ pre-push hook already exists, skipping (use --force to overwrite)'
        )
      );
      return;
    }

    const hookContent = `# RuleOfCode v${this.VERSION} Constitutional Compliance Pre-Push Hook (husky v9+ native)
echo "🏛️ RuleOfCode v${this.VERSION} Constitutional Checkpoint - Pre-Push Mode"
echo "═════════════════════════════════════════════════════"

# Run full RuleOfCode audit before push
npx ruleofcode audit --mode=pre-push

# Exit with audit result
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Constitutional violations detected - push blocked"
    echo "   Run 'npx ruleofcode audit --verbose' for details"
    echo "   Fix violations before pushing to maintain code quality"
    exit 1
fi
${this.pythonHookBlock(config, 'pre-push')}
echo "✅ Full constitutional compliance verified - proceeding with push"
`;

    FileUtils.writeFile(hookPath, hookContent);
    console.log(chalk.greenBright('✅ pre-push hook installed'));
  }

  /**
   * Portable POSIX-sh helper that runs a Python tool via `uv run` when available,
   * else directly, else skips with a warning (so a missing tool never hard-fails
   * the hook with a confusing error).
   */
  private static readonly PY_RUNNER = `roc_py() {
  tool="$1"; shift
  if command -v uv >/dev/null 2>&1 && uv run "$tool" --version >/dev/null 2>&1; then
    uv run "$tool" "$@"
  elif command -v "$tool" >/dev/null 2>&1; then
    "$tool" "$@"
  else
    echo "⚠️  $tool not found — skipping"; return 0
  fi
}`;

  /**
   * Python tool steps injected into a hook for `project.type === 'python'`
   * ('pre-commit' → ruff + mypy; 'pre-push' → pytest + bandit). Empty string for
   * any other project type, so non-Python projects are unaffected.
   */
  private static pythonHookBlock(
    config: RuleOfCodeConfig,
    phase: 'pre-commit' | 'pre-push'
  ): string {
    if (config.project?.type !== 'python') return '';

    const steps =
      phase === this.PRE_COMMIT_HOOK
        ? `echo "🐍 ruff"
roc_py ruff check . || { echo "❌ ruff check failed"; exit 1; }
roc_py ruff format --check . || { echo "❌ ruff format check failed"; exit 1; }
echo "🐍 mypy"
roc_py mypy . || { echo "❌ mypy failed"; exit 1; }`
        : `echo "🐍 pytest"
roc_py pytest -q || { echo "❌ tests failed"; exit 1; }
echo "🐍 bandit (security)"
roc_py bandit -q -ll -r . -x ./tests,./.venv,./venv,./build || { echo "❌ bandit found security issues"; exit 1; }`;

    return `
# RuleOfCode Python (${phase}) — FastAPI + Clean Architecture/CQRS toolchain
${this.PY_RUNNER}
${steps}
`;
  }

  /**
   * Install commit-msg hook
   */
  private static installCommitMsgHook(
    projectRoot: string,
    config: RuleOfCodeConfig,
    force: boolean
  ): void {
    const hookPath = PathOperations.join(
      projectRoot,
      this.HUSKY_DIR,
      this.COMMIT_MSG_HOOK
    );

    if (!force && FileUtils.exists(hookPath)) {
      console.log(
        '⚠️ commit-msg hook already exists, skipping (use --force to overwrite)'
      );
      return;
    }

    // Build validation patterns from config
    const commitConfig = (config.commitMsg || {
      conventionalCommits: true,
      allowEmoji: false,
      emojiTypes: [],
      conventionalTypes: [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'test',
        'chore',
        'perf',
        'ci',
        'build',
        'revert',
      ],
      patterns: [],
    }) as {
      conventionalCommits?: boolean;
      allowEmoji?: boolean;
      emojiTypes?: string[];
      conventionalTypes?: string[];
      patterns?: string[];
    };

    // Generate regex patterns from config
    const patterns: string[] = [];

    if (commitConfig.conventionalCommits) {
      const types =
        commitConfig.conventionalTypes?.join('|') ||
        'feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert';
      patterns.push(`^(${types})(\\([^)]+\\))?:\\s+.+$`);
    }

    if (
      commitConfig.allowEmoji &&
      commitConfig.emojiTypes &&
      commitConfig.emojiTypes.length > 0
    ) {
      const emojis = commitConfig.emojiTypes
        .map((e: string) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&'))
        .join('|');
      patterns.push(`^(${emojis})\\s+.+$`);
    }

    // Add custom patterns from config
    if (commitConfig.patterns && commitConfig.patterns.length > 0) {
      patterns.push(...commitConfig.patterns);
    }

    // If no patterns defined, use default conventional commits
    if (patterns.length === 0) {
      patterns.push(
        '^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\\([^)]+\\))?:\\s+.+$'
      );
    }

    const typesDisplay =
      commitConfig.conventionalTypes?.join(', ') ||
      'feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert';
    const emojiDisplay =
      commitConfig.allowEmoji && commitConfig.emojiTypes
        ? `\\nEmojis: ${commitConfig.emojiTypes.slice(0, 10).join(' ')}...`
        : '';

    const hookContent = `# RuleOfCode v${this.VERSION} Commit Message Validation
# Config-driven validation with ${patterns.length} pattern(s)
# husky v9+ native hook (no deprecated v8 boilerplate)

COMMIT_MSG=$(cat "$1")
VALID=false
EXEMPT=false

# Grandfather auto-generated commits — merge/squash/revert subjects (composed by
# Git / Bitbucket / GitHub, not authored) and the initial commit. These never go
# through a developer's editor, so enforcing conventional format on them is a
# guaranteed false positive that tempts --no-verify. Keep them consistent with the
# history-scan (Commit Message Standards law) which exempts the same set.
# NOTE: space-bearing case patterns MUST be quoted ("Merge "*), otherwise POSIX
# sh / Git-Bash throws "syntax error near unexpected token" on the bare space.
FIRST_LINE=$(printf '%s' "$COMMIT_MSG" | head -n 1)
case "$FIRST_LINE" in
  "Merge "*|"Merged "*|"Revert "*|*[Ii]"nitial commit"*) VALID=true; EXEMPT=true ;;
esac

# Check against all configured patterns
${patterns
  .map(
    (pattern, idx) => `
# Pattern ${idx + 1}: ${pattern.substring(0, 50)}...
if echo "$COMMIT_MSG" | grep -qE '${pattern.replace(/'/g, "'\\\\''")}'; then
    VALID=true
fi`
  )
  .join('')}

if [ "$VALID" = false ]; then
    echo "❌ Invalid commit message format!"
    echo ""
    echo "🏛️ RuleOfCode v${this.VERSION} Constitutional Commit Message Format:"
    echo "   Your message must match one of the configured patterns"
    echo ""
    echo "Types: ${typesDisplay}"${
      emojiDisplay
        ? `
    echo "${emojiDisplay}"`
        : ''
    }
    echo ""
    echo "Examples:"
    echo "   feat(auth): add user authentication"
    echo "   fix(ui): resolve button alignment issue"
    echo "   docs: update README with installation steps"
    echo ""
    echo "Your commit message:"
    echo "$COMMIT_MSG"
    echo ""
    exit 1
fi

# --- Commit body (description) validation — Commit Description Standards ---
# Skipped for exempt (auto-generated) subjects, consistent with the subject check.
if [ "$EXEMPT" = false ]; then
    SECOND_LINE=$(printf '%s\\n' "$COMMIT_MSG" | sed -n '2p')
    if [ -n "$SECOND_LINE" ]; then
        echo "❌ Commit body must be separated from the subject by a blank line."
        echo "   Add an empty line between the subject and the description."
        echo ""
        echo "Your commit message:"
        echo "$COMMIT_MSG"
        exit 1
    fi
    # Wrap body lines at 72 chars; exempt URLs, git trailers ("Word: …") and
    # unwrappable no-whitespace lines.
    LONG_LINES=$(printf '%s\\n' "$COMMIT_MSG" | awk 'NR>=3 { if (length($0) > 72 && $0 ~ /[[:space:]]/ && index($0, "://") == 0 && $0 !~ /^[A-Za-z][A-Za-z0-9_-]*:[[:space:]]/) print "  line " NR " (" length($0) " chars)" }')
    if [ -n "$LONG_LINES" ]; then
        echo "❌ Commit body lines should wrap at 72 characters:"
        echo "$LONG_LINES"
        echo ""
        echo "Wrap the description text. URLs and footers are exempt."
        exit 1
    fi
fi

echo "✅ Commit message format validated (RuleOfCode v${this.VERSION})"
`;

    FileUtils.writeFile(hookPath, hookContent);
    console.log('✅ commit-msg hook installed');
  }

  /**
   * Install custom hook
   */
  private static installCustomHook(
    projectRoot: string,
    hookName: string,
    commands: string[],
    force: boolean
  ): void {
    const hookPath = PathOperations.join(projectRoot, this.HUSKY_DIR, hookName);

    if (!force && FileUtils.exists(hookPath)) {
      console.log(
        `⚠️ ${hookName} hook already exists, skipping (use --force to overwrite)`
      );
      return;
    }

    const hookContent = `# RuleOfCode Custom Hook: ${hookName} (husky v9+ native)
echo "🔧 Running custom hook: ${hookName}"

${commands.join('\n')}

echo "✅ Custom hook ${hookName} completed"
`;

    FileUtils.writeFile(hookPath, hookContent);
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
   * Install husky if not present
   */
  static ensureHusky(projectRoot: string): void {
    if (this.isHuskyInstalled(projectRoot)) {
      console.log('✅ Husky already installed');
      return;
    }

    console.log('📦 Installing Husky...');

    const { execSync } = require('child_process');

    try {
      // Install husky as dev dependency
      execSync('npm install --save-dev husky', {
        cwd: projectRoot,
        stdio: 'inherit',
      });

      // Initialize husky. `husky install` is deprecated in husky v9 (removed in
      // v10); the v9 setup command is just `husky`.
      execSync('npx husky', {
        cwd: projectRoot,
        stdio: 'inherit',
      });

      // Add prepare script to package.json
      const packageJsonPath = PathOperations.join(
        projectRoot,
        this.PACKAGE_JSON_FILE
      );
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

      console.log('✅ Husky installed and configured');
    } catch (_error) {
      const err = _error as Error;
      throw new Error(`Failed to install Husky: ${err.message}`);
    }
  }

  /**
   * Generate template for lint-staged integration
   */
  static generateLintStagedConfig(config: RuleOfCodeConfig): object {
    const lintStagedConfig: Record<string, string[]> = {
      // NOT --mode=fast. RoC used to install a commit gate that ran the Pareto
      // SUBSET — the tool itself handed every consumer a quietly disarmed gate
      // (a backend consumer found this in their own package.json, installed by us).
      // pre-commit narrows the FILES (--staged), never the laws.
      '*.{ts,js}': ['npx ruleofcode audit --mode=pre-commit --staged'],
    };

    // Add framework-specific linting
    if (config.project.type === 'angular') {
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
      this.checkHookStatus(
        huskyDir,
        this.COMMIT_MSG_HOOK,
        'RuleOfCode',
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
   * Reinstall hooks (force update)
   */
  static reinstall(options: HooksInstallOptions): void {
    console.log(chalk.cyanBright('🔄 Reinstalling RuleOfCode git hooks...'));
    this.install({ ...options, force: true });
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
    packageJson['lint-staged'] = this.generateLintStagedConfig(config);

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

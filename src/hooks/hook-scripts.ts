/**
 * The text of the git hooks RuleOfCode writes: pre-commit, pre-push and
 * custom hooks, with the lint-staged call and the Python tool steps they
 * carry. Version stamps are passed in by the installer.
 */
import type { RuleOfCodeConfig } from '../config/types';

/**
 * The lint-staged call of the pre-commit hook. lint-staged saves a backup
 * with `git stash` and restores it when a task fails; the stash list
 * belongs to the repository, not the worktree, so with several worktrees
 * committing at once one hook can restore another's backup. `--no-stash`
 * avoids that, and loses the backup a task that rewrites files relies on:
 * opt-in only (`reinstall-hooks --no-stash`).
 */
export function lintStagedCall(noStash: boolean): string {
  if (!noStash) return '  npx lint-staged';
  return [
    '  # Opt-in (reinstall-hooks --no-stash): no backup stash. The stash list',
    '  # belongs to the repository, not the worktree, so with several worktrees',
    "  # committing at once one hook could restore another worktree's backup.",
    '  # Only safe when no lint-staged task rewrites files.',
    '  npx lint-staged --no-stash',
  ].join('\n');
}

/**
 * Portable POSIX-sh helper that runs a Python tool via `uv run` when available,
 * else directly, else skips with a warning (so a missing tool never hard-fails
 * the hook with a confusing error).
 */
const PY_RUNNER = `roc_py() {
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
export function pythonHookBlock(
  config: RuleOfCodeConfig,
  phase: 'pre-commit' | 'pre-push'
): string {
  if (config.project?.type !== 'python') return '';

  const steps =
    phase === 'pre-commit'
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
${PY_RUNNER}
${steps}
`;
}

/** The pre-commit hook: lint-staged where configured, then the staged audit. */
export function preCommitScript(
  version: string,
  config: RuleOfCodeConfig,
  lintStagedNoStash: boolean
): string {
  return `# RuleOfCode v${version} Constitutional Checkpoint (husky v9+ native hook)
echo "🏛️ RuleOfCode v${version} Constitutional Checkpoint"

# lint-staged only where the project configured it: init installs neither the
# package nor a config, and husky runs this with sh -e, so an unconditional
# call failed the very first commit of a fresh project (B2).
roc_lint_staged=0
for roc_f in .lintstagedrc .lintstagedrc.* lint-staged.config.*; do
  if [ -e "$roc_f" ]; then roc_lint_staged=1; fi
done
if [ "$roc_lint_staged" = 0 ] && node -e "process.exit(require('./package.json')['lint-staged'] ? 0 : 1)" 2>/dev/null; then
  roc_lint_staged=1
fi
if [ "$roc_lint_staged" = 1 ]; then
${lintStagedCall(lintStagedNoStash)}
fi

# Run constitutional audit on staged files
npx ruleofcode audit --mode=pre-commit --staged

# Check exit code
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Constitutional violations detected - commit blocked"
    echo "   Run 'npx ruleofcode audit --verbose' for details, fix the cause, and commit again"
    echo "   (a law that does not apply: laws.notApplicable with a reason — never --no-verify)"
    exit 1
fi
${pythonHookBlock(config, 'pre-commit')}
echo "✅ Constitutional compliance verified - proceeding with commit"
`;
}

/** The pre-push hook: the full pre-push audit. */
export function prePushScript(
  version: string,
  config: RuleOfCodeConfig
): string {
  return `# RuleOfCode v${version} Constitutional Compliance Pre-Push Hook (husky v9+ native)
echo "🏛️ RuleOfCode v${version} Constitutional Checkpoint - Pre-Push Mode"
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
${pythonHookBlock(config, 'pre-push')}
echo "✅ Full constitutional compliance verified - proceeding with push"
`;
}

/** A custom hook: its commands, announced. */
export function customHookScript(hookName: string, commands: string[]): string {
  return `# RuleOfCode Custom Hook: ${hookName} (husky v9+ native)
echo "🔧 Running custom hook: ${hookName}"

${commands.join('\n')}

echo "✅ Custom hook ${hookName} completed"
`;
}

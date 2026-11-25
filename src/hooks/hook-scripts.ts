/**
 * The text of the git hooks RuleOfCode writes: pre-commit, pre-push,
 * commit-msg and custom hooks, with the lint-staged call and the Python tool steps they
 * carry. Version stamps are passed in by the installer.
 */
import type { RuleOfCodeConfig } from '../config/types';
import { GitHookPatterns } from '../utils/git-hook-patterns';
import { shellComment, shellPrint, shellQuote } from './shell-quote';

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

/**
 * A custom hook: its commands, announced. The commands are shell code and are
 * written as they are; the hook's name is a value and is quoted (#624).
 */
export function customHookScript(hookName: string, commands: string[]): string {
  return `# RuleOfCode Custom Hook: ${shellComment(hookName)} (husky v9+ native)
${shellPrint(`🔧 Running custom hook: ${hookName}`)}

${commands.join('\n')}

${shellPrint(`✅ Custom hook ${hookName} completed`)}
`;
}

/** The subject limit when the config sets none. */
const DEFAULT_SUBJECT_LENGTH = 72;

/** The commit message settings a commit-msg hook is generated from. */
interface CommitMsgSettings {
  conventionalCommits?: boolean;
  allowEmoji?: boolean;
  emojiTypes?: string[];
  conventionalTypes?: string[];
  patterns?: string[];
}

/** The commit message settings, with the conventional-commit defaults. */
function commitSettingsOf(config: RuleOfCodeConfig): CommitMsgSettings {
  return (config.commitMsg || {
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
  }) as CommitMsgSettings;
}

/** The patterns a commit subject may match, from the commit message settings. */
function commitMsgPatterns(commitConfig: CommitMsgSettings): string[] {
  // Generate regex patterns from config
  const patterns: string[] = [];

  if (commitConfig.conventionalCommits) {
    const types =
      commitConfig.conventionalTypes?.join('|') ||
      'feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert';
    patterns.push(`^(${types})(\\([^)]+\\))?!?:\\s+.+$`);
  }

  if (
    commitConfig.allowEmoji &&
    commitConfig.emojiTypes &&
    commitConfig.emojiTypes.length > 0
  ) {
    const emojis = commitConfig.emojiTypes
      .map((e: string) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
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
      // `!?` is the Conventional Commits v1.0.0 breaking-change marker
      // (`feat(events)!: …`, summary clause 11). Refusing it pushed authors
      // to the footer form or to dropping the marker — and a breaking change
      // that is not marked is the failure the convention exists to prevent.
      // It also erases the marker from `git log --oneline`, which is exactly
      // where a reviewer scans for it.
      '^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\\([^)]+\\))?!?:\\s+.+$'
    );
  }
  return patterns;
}

/** The subject limit the config sets; a value that is not a number is the default. */
function subjectLimitOf(config: RuleOfCodeConfig): number {
  const configured =
    config.thresholds?.git?.maxCommitMessageLength ?? DEFAULT_SUBJECT_LENGTH;
  const written = String(configured).trim();
  const limit = written === '' ? NaN : Number(written);
  return Number.isFinite(limit) ? Math.trunc(limit) : DEFAULT_SUBJECT_LENGTH;
}

/** The check of one pattern. `-e` only where grep would read it as an option. */
function patternCheck(pattern: string, index: number): string {
  const option = pattern.startsWith('-') ? '-e ' : '';
  const shown = pattern.substring(0, GitHookPatterns.PATTERN_COMMENT_LENGTH);
  return `
# Pattern ${index + 1}: ${shellComment(shown)}...
if echo "$COMMIT_MSG" | grep -qE ${option}${shellQuote(pattern)}; then
    VALID=true
fi`;
}

/** The lines that name the commit types and emojis of the config. */
function allowedValuesLines(commitConfig: CommitMsgSettings): string {
  const types =
    commitConfig.conventionalTypes?.join(', ') ||
    'feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert';
  const typesLine = shellPrint(`Types: ${types}`);
  if (!commitConfig.allowEmoji || !commitConfig.emojiTypes) return typesLine;
  const emojis = `Emojis: ${commitConfig.emojiTypes.slice(0, 10).join(' ')}...`;
  const printed = shellPrint(emojis);
  // The plain form keeps the line break it has always been written with.
  const emojiLine = printed.startsWith('echo ')
    ? `echo "\\n${emojis}"`
    : printed;
  return `${typesLine}\n    ${emojiLine}`;
}

/** The commit-msg hook: subject patterns, subject length and body wrapping. */
export function commitMsgScript(
  version: string,
  config: RuleOfCodeConfig
): string {
  // Build validation patterns from config
  const commitConfig = commitSettingsOf(config);
  const patterns = commitMsgPatterns(commitConfig);

  // The SAME limit Commit Message Standards audits history against, read from
  // the same config key — so the hook and the law agree by construction
  // rather than by both happening to be configured correctly.
  const maxSubjectLength = subjectLimitOf(config);

  return `# RuleOfCode v${version} Commit Message Validation
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
${patterns.map(patternCheck).join('')}

if [ "$VALID" = false ]; then
    echo "❌ Invalid commit message format!"
    echo ""
    echo "🏛️ RuleOfCode v${version} Constitutional Commit Message Format:"
    echo "   Your message must match one of the configured patterns"
    echo ""
    ${allowedValuesLines(commitConfig)}
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

# --- Subject length — the same limit Commit Message Standards audits ---
# The hook is what teaches the rule. Accepting a subject here and failing it in
# the audit afterwards is the pattern that produces --no-verify: the commit is
# already made, and fixing it means rewriting history. Anything the history scan
# can fail a developer for, the hook fails them for BEFORE it becomes history.
if [ "$EXEMPT" = false ]; then
    # CHARACTERS, which is what the message claims and what the limit means.
    #
    # \`wc -c\` counts BYTES, so a subject with any non-ASCII text was rejected
    # for a length it did not have — 54 characters reported as 86, with the
    # word "characters" pointing away from the answer. \`wc -m\` would only move
    # the problem, since it counts bytes too under a C locale.
    #
    # Deleting UTF-8 continuation bytes (0x80-0xBF) leaves exactly one byte per
    # character, and \`LC_ALL=C\` makes that deterministic on every machine
    # rather than dependent on the ambient locale.
    SUBJECT_LEN=$(printf '%s' "$FIRST_LINE" | LC_ALL=C tr -d '\\200-\\277' | LC_ALL=C wc -c | tr -d ' ')
    if [ "$SUBJECT_LEN" -gt ${maxSubjectLength} ]; then
        echo "❌ Subject is $SUBJECT_LEN characters (max ${maxSubjectLength})."
        echo ""
        echo "$FIRST_LINE"
        echo ""
        echo "Shorten the subject; move the detail into the body."
        exit 1
    fi
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
    # Measured the same way as the subject, and pinned to LC_ALL=C so the
    # verdict cannot change with the machine's locale. \`awk\`'s length() counts
    # characters under a UTF-8 locale and bytes under C, so the identical file
    # passed or failed depending on an environment variable.
    LONG_LINES=$(printf '%s\\n' "$COMMIT_MSG" | LC_ALL=C awk 'NR>=3 { s=$0; gsub(/[\\200-\\277]/, "", s); n=length(s); if (n > 72 && $0 ~ /[[:space:]]/ && index($0, "://") == 0 && $0 !~ /^[A-Za-z][A-Za-z0-9_-]*:[[:space:]]/) print "  line " NR " (" n " chars)" }')
    if [ -n "$LONG_LINES" ]; then
        echo "❌ Commit body lines should wrap at 72 characters:"
        echo "$LONG_LINES"
        echo ""
        echo "Wrap the description text. URLs and footers are exempt."
        exit 1
    fi
fi

echo "✅ Commit message format validated (RuleOfCode v${version})"
`;
}

/**
 * Whether the hooks a config enables are in .husky, and written by the
 * version that asks.
 */
import type { RuleOfCodeConfig } from '../config/types';
import { FileUtils } from '../utils/file-utils';
import { PathOperations } from '../utils/path-operations';
import { PythonSatisfaction } from '../utils/python-satisfaction';

const HUSKY_DIR = '.husky';
const PRE_COMMIT_HOOK = 'pre-commit';
const PRE_PUSH_HOOK = 'pre-push';
const COMMIT_MSG_HOOK = 'commit-msg';

/**
 * Validate hooks installation according to config
 */
export function validateHooks(options: {
  projectRoot: string;
  config: RuleOfCodeConfig;
  /** The version whose stamp an up-to-date hook carries. */
  version: string;
}): { valid: boolean; missing: string[]; outdated: string[] } {
  const { projectRoot, config, version } = options;
  const missing: string[] = [];
  const outdated: string[] = [];

  // A configured hook framework (`.pre-commit-config.yaml` — the Python-native
  // husky) OWNS the hooks: `pre-commit install` writes them into `.git/hooks`.
  // Warning such a project that `.husky` is "missing" demands husky's substrate
  // on top of an already-satisfied concern, so hook validation is a no-op for
  // it. The gate requires a Python project — husky validation for JS/TS
  // projects is unchanged.
  if (hasPythonHookFramework(projectRoot)) {
    return { valid: true, missing: [], outdated: [] };
  }

  const huskyDir = PathOperations.join(projectRoot, HUSKY_DIR);

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
    checkHookStatus(
      huskyDir,
      PRE_COMMIT_HOOK,
      `v${version}`,
      missing,
      outdated
    );
  }

  if (config.hooks.prePush) {
    checkHookStatus(huskyDir, PRE_PUSH_HOOK, `v${version}`, missing, outdated);
  }

  if (config.hooks.commitMsg) {
    // The VERSION, as its two siblings above already require.
    //
    // This asked for the literal string 'RuleOfCode', which every generated
    // commit-msg hook has ever contained — so a hook written by any earlier
    // version reported as up to date, and `reinstall-hooks` left it in place.
    // A consumer upgrading kept the old hook silently, which is how a fix to
    // the hook fails to reach the person it was written for.
    checkHookStatus(
      huskyDir,
      COMMIT_MSG_HOOK,
      `v${version}`,
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
function hasPythonHookFramework(projectRoot: string): boolean {
  return (
    PythonSatisfaction.isPython(projectRoot) &&
    PythonSatisfaction.hasHookFramework(projectRoot)
  );
}

/**
 * Check a single hook file and record it as missing or outdated
 */
function checkHookStatus(
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

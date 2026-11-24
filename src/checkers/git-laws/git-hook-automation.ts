/**
 * Git Hook Compliance: whether the project automates its hooks — a hook
 * manager in devDependencies, setup scripts and hook config files. Read
 * from package.json and the project root.
 */

import { FileUtils } from '../../utils';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { PathOperations } from '../../utils/path-operations';

/** Hook managers that install and run the hooks. */
const HOOK_TOOLS = ['husky', 'pre-commit', 'ghooks', 'yorkie'];

/** Config files of a hook manager or of lint-staged. */
const HOOK_CONFIG_FILES = [
  '.huskyrc',
  '.huskyrc.json',
  '.huskyrc.js',
  'husky.config.js',
  '.lintstagedrc',
  '.lintstagedrc.json',
  'lint-staged.config.js',
];

/** The findings and advice about hook automation in this project. */
export function hookAutomationFindings(projectRoot: string): {
  violations: string[];
  suggestions: string[];
} {
  const violations: string[] = [];
  const suggestions: string[] = [];

  const packageJson = ProjectTypeDetector.getPackageJson(projectRoot);
  if (packageJson) {
    const devDeps = ((packageJson as Record<string, unknown>).devDependencies ??
      {}) as Record<string, unknown>;
    const scripts = (packageJson as Record<string, unknown>).scripts ?? {};

    const hasHookTools = HOOK_TOOLS.some(tool => devDeps[tool]);
    if (!hasHookTools) {
      violations.push('No git hook automation tool configured');
      suggestions.push('Install husky for automated git hook management');
    }

    // lint-staged is commonly used with hooks
    if (!devDeps['lint-staged']) {
      suggestions.push(
        'Consider lint-staged for running linters on staged files'
      );
    }

    const hookScripts = Object.keys(scripts).filter(
      script =>
        script.includes('hook') ||
        script.includes('husky') ||
        script.includes('prepare')
    );
    if (hookScripts.length === 0 && hasHookTools) {
      suggestions.push('Add hook setup scripts to package.json');
    }
  }

  const hasHookConfig = HOOK_CONFIG_FILES.some(file =>
    FileUtils.exists(PathOperations.join(projectRoot, file))
  );
  if (!hasHookConfig) {
    suggestions.push(
      'Create hook configuration files for better maintainability'
    );
  }

  return { violations, suggestions };
}

/**
 * Git Hook Patterns Utility
 * Consolidates duplicate patterns for checking git hooks across multiple checkers
 */

import { FileSystemOperations } from './file-system-operations';
import { FileUtils } from './file-utils';
import { PathOperations } from './path-operations';

export class GitHookPatterns {
  /**
   * Standard essential hooks that all checkers look for
   */
  static readonly ESSENTIAL_HOOKS = ['pre-commit', 'pre-push', 'commit-msg'];

  /**
   * Common hook management tools
   */
  static readonly HOOK_TOOLS = ['husky', 'pre-commit', 'ghooks', 'yorkie'];

  /**
   * Common hook configuration files
   */
  static readonly HOOK_CONFIG_FILES = [
    '.huskyrc',
    '.huskyrc.json',
    '.huskyrc.js',
    'husky.config.js',
    '.lintstagedrc',
    '.lintstagedrc.json',
    'lint-staged.config.js',
  ];

  /**
   * Gets git hooks directory for a project
   */
  static getHooksDirectory(projectRoot: string): string {
    return PathOperations.join(projectRoot, '.git', 'hooks');
  }

  /**
   * Checks if hooks directory exists
   */
  static hooksDirectoryExists(projectRoot: string): boolean {
    const hooksDir = this.getHooksDirectory(projectRoot);
    return FileUtils.exists(hooksDir);
  }

  /**
   * Checks if specific hook exists
   */
  static hookExists(projectRoot: string, hookName: string): boolean {
    const hookPath = PathOperations.join(
      this.getHooksDirectory(projectRoot),
      hookName
    );
    return FileUtils.exists(hookPath);
  }

  /**
   * Gets list of installed hooks
   */
  static getInstalledHooks(projectRoot: string): string[] {
    const hooksDir = this.getHooksDirectory(projectRoot);
    if (!FileUtils.exists(hooksDir)) {
      return [];
    }

    try {
      const files = FileSystemOperations.readDirectory(hooksDir);
      return files.filter(f => !f.name.endsWith('.sample')).map(f => f.name);
    } catch (_error) {
      return [];
    }
  }

  /**
   * Gets missing essential hooks
   */
  static getMissingEssentialHooks(projectRoot: string): string[] {
    const missing: string[] = [];

    for (const hook of this.ESSENTIAL_HOOKS) {
      if (!this.hookExists(projectRoot, hook)) {
        missing.push(hook);
      }
    }

    return missing;
  }

  /**
   * Checks if hook configuration exists
   */
  static hasHookConfiguration(projectRoot: string): boolean {
    return this.HOOK_CONFIG_FILES.some(file =>
      FileUtils.exists(PathOperations.join(projectRoot, file))
    );
  }

  /**
   * Gets installed hook management tools from devDependencies
   */
  static getInstalledHookTools(
    devDependencies: Record<string, string>
  ): string[] {
    const installed: string[] = [];

    for (const tool of this.HOOK_TOOLS) {
      if (devDependencies[tool]) {
        installed.push(tool);
      }
    }

    return installed;
  }

  /**
   * Checks if hook is just a sample
   */
  static isHookSample(projectRoot: string, hookName: string): boolean {
    const hookPath = PathOperations.join(
      this.getHooksDirectory(projectRoot),
      hookName
    );

    try {
      if (!FileUtils.exists(hookPath)) {
        return false;
      }

      const content = FileUtils.readFile(hookPath);
      // Samples are usually < 200 chars and contain 'sample'
      return content.includes('sample') && content.length < 200;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Checks if hook automation tool is configured
   */
  static hasHookAutomation(projectRoot: string): boolean {
    if (this.hasHookConfiguration(projectRoot)) {
      return true;
    }

    // Check if hooks directory is writable (indicates husky setup)
    const hooksDir = this.getHooksDirectory(projectRoot);
    if (FileUtils.exists(hooksDir)) {
      try {
        // If we can read it, assume it's properly set up
        FileSystemOperations.readDirectory(hooksDir);
        return true;
      } catch (_error) {
        return false;
      }
    }

    return false;
  }

  /**
   * Gets hook-related scripts from package.json scripts
   */
  static getHookRelatedScripts(scripts: Record<string, string>): string[] {
    return Object.keys(scripts).filter(
      script =>
        script.includes('hook') ||
        script.includes('husky') ||
        script.includes('prepare')
    );
  }

  /**
   * Creates standard violation for missing hooks
   */
  static createMissingHooksViolation(missingHooks: string[]): {
    violation: string;
    suggestion: string;
  } {
    return {
      violation: `Missing essential git hooks: ${missingHooks.join(', ')}`,
      suggestion: 'Create essential git hooks for quality control',
    };
  }

  /**
   * Creates standard violation for sample hooks not configured
   */
  static createSampleHooksViolation(sampleHooks: string[]): {
    violation: string;
    suggestion: string;
  } {
    return {
      violation: `Sample hooks not configured: ${sampleHooks.join(', ')}`,
      suggestion: 'Configure sample hooks or create custom implementations',
    };
  }

  /**
   * Creates standard violation for missing hook automation
   */
  static createMissingHookAutomationViolation(): {
    violation: string;
    suggestion: string;
  } {
    return {
      violation: 'No git hook automation tool configured',
      suggestion: 'Install husky for automated git hook management',
    };
  }
}

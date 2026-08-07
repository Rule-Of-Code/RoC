/**
 * Git Hook Patterns Utility - Tests
 * Tests for GitHookPatterns class
 */
import { GitHookPatterns } from '../../src/utils/git-hook-patterns';

describe('GitHookPatterns', () => {
  // ============================================
  // Static Properties
  // ============================================
  describe('ESSENTIAL_HOOKS', () => {
    it('should be an array', () => {
      expect(Array.isArray(GitHookPatterns.ESSENTIAL_HOOKS)).toBe(true);
    });

    it('should contain pre-commit', () => {
      expect(GitHookPatterns.ESSENTIAL_HOOKS).toContain('pre-commit');
    });

    it('should contain pre-push', () => {
      expect(GitHookPatterns.ESSENTIAL_HOOKS).toContain('pre-push');
    });

    it('should contain commit-msg', () => {
      expect(GitHookPatterns.ESSENTIAL_HOOKS).toContain('commit-msg');
    });

    it('should have exactly 3 essential hooks', () => {
      expect(GitHookPatterns.ESSENTIAL_HOOKS).toHaveLength(3);
    });
  });

  describe('HOOK_TOOLS', () => {
    it('should be an array', () => {
      expect(Array.isArray(GitHookPatterns.HOOK_TOOLS)).toBe(true);
    });

    it('should contain husky', () => {
      expect(GitHookPatterns.HOOK_TOOLS).toContain('husky');
    });

    it('should contain pre-commit', () => {
      expect(GitHookPatterns.HOOK_TOOLS).toContain('pre-commit');
    });

    it('should contain ghooks', () => {
      expect(GitHookPatterns.HOOK_TOOLS).toContain('ghooks');
    });

    it('should contain yorkie', () => {
      expect(GitHookPatterns.HOOK_TOOLS).toContain('yorkie');
    });
  });

  describe('HOOK_CONFIG_FILES', () => {
    it('should be an array', () => {
      expect(Array.isArray(GitHookPatterns.HOOK_CONFIG_FILES)).toBe(true);
    });

    it('should contain .huskyrc', () => {
      expect(GitHookPatterns.HOOK_CONFIG_FILES).toContain('.huskyrc');
    });

    it('should contain .huskyrc.json', () => {
      expect(GitHookPatterns.HOOK_CONFIG_FILES).toContain('.huskyrc.json');
    });

    it('should contain husky.config.js', () => {
      expect(GitHookPatterns.HOOK_CONFIG_FILES).toContain('husky.config.js');
    });

    it('should contain lint-staged config files', () => {
      expect(GitHookPatterns.HOOK_CONFIG_FILES).toContain('.lintstagedrc');
      expect(GitHookPatterns.HOOK_CONFIG_FILES).toContain('.lintstagedrc.json');
      expect(GitHookPatterns.HOOK_CONFIG_FILES).toContain(
        'lint-staged.config.js'
      );
    });
  });

  // ============================================
  // Static Methods
  // ============================================
  describe('getHooksDirectory()', () => {
    it('should return the correct hooks directory path', () => {
      const projectRoot = '/path/to/project';
      const hooksDir = GitHookPatterns.getHooksDirectory(projectRoot);
      expect(hooksDir).toContain('.git');
      expect(hooksDir).toContain('hooks');
    });

    it('should include the project root in the path', () => {
      const projectRoot = '/my/project';
      const hooksDir = GitHookPatterns.getHooksDirectory(projectRoot);
      expect(hooksDir).toContain('/my/project');
    });
  });

  describe('hooksDirectoryExists()', () => {
    it('should return a boolean', () => {
      const result = GitHookPatterns.hooksDirectoryExists('/nonexistent');
      expect(typeof result).toBe('boolean');
    });

    it('should return false for nonexistent directory', () => {
      const result = GitHookPatterns.hooksDirectoryExists(
        '/nonexistent/path/to/project'
      );
      expect(result).toBe(false);
    });
  });

  describe('hookExists()', () => {
    it('should return a boolean', () => {
      const result = GitHookPatterns.hookExists('/nonexistent', 'pre-commit');
      expect(typeof result).toBe('boolean');
    });

    it('should return false for nonexistent project', () => {
      const result = GitHookPatterns.hookExists(
        '/nonexistent/path',
        'pre-commit'
      );
      expect(result).toBe(false);
    });
  });

  describe('getInstalledHooks()', () => {
    it('should return an array', () => {
      const hooks = GitHookPatterns.getInstalledHooks('/nonexistent');
      expect(Array.isArray(hooks)).toBe(true);
    });

    it('should return empty array for nonexistent directory', () => {
      const hooks = GitHookPatterns.getInstalledHooks('/nonexistent/path');
      expect(hooks).toHaveLength(0);
    });
  });

  describe('getMissingEssentialHooks()', () => {
    it('should return an array', () => {
      const missing = GitHookPatterns.getMissingEssentialHooks('/nonexistent');
      expect(Array.isArray(missing)).toBe(true);
    });

    it('should return all essential hooks for nonexistent project', () => {
      const missing =
        GitHookPatterns.getMissingEssentialHooks('/nonexistent/path');
      expect(missing).toEqual(GitHookPatterns.ESSENTIAL_HOOKS);
    });
  });

  describe('hasHookConfiguration()', () => {
    it('should return a boolean', () => {
      const result = GitHookPatterns.hasHookConfiguration('/nonexistent');
      expect(typeof result).toBe('boolean');
    });

    it('should return false for nonexistent directory', () => {
      const result = GitHookPatterns.hasHookConfiguration('/nonexistent/path');
      expect(result).toBe(false);
    });
  });

  describe('getInstalledHookTools()', () => {
    it('should return an empty array when no tools are installed', () => {
      const devDependencies = {
        typescript: '^5.0.0',
        jest: '^29.0.0',
      };
      const tools = GitHookPatterns.getInstalledHookTools(devDependencies);
      expect(tools).toHaveLength(0);
    });

    it('should detect husky', () => {
      const devDependencies = {
        husky: '^8.0.0',
      };
      const tools = GitHookPatterns.getInstalledHookTools(devDependencies);
      expect(tools).toContain('husky');
    });

    it('should detect multiple hook tools', () => {
      const devDependencies = {
        husky: '^8.0.0',
        yorkie: '^2.0.0',
      };
      const tools = GitHookPatterns.getInstalledHookTools(devDependencies);
      expect(tools).toContain('husky');
      expect(tools).toContain('yorkie');
    });

    it('should return empty array for empty dependencies', () => {
      const tools = GitHookPatterns.getInstalledHookTools({});
      expect(tools).toHaveLength(0);
    });
  });

  describe('isHookSample()', () => {
    it('should return a boolean', () => {
      const result = GitHookPatterns.isHookSample('/nonexistent', 'pre-commit');
      expect(typeof result).toBe('boolean');
    });

    it('should return false for nonexistent hook', () => {
      const result = GitHookPatterns.isHookSample(
        '/nonexistent/path',
        'pre-commit'
      );
      expect(result).toBe(false);
    });
  });

  describe('hasHookAutomation()', () => {
    it('should return a boolean', () => {
      const result = GitHookPatterns.hasHookAutomation('/nonexistent');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getHookRelatedScripts()', () => {
    it('should detect hook-related scripts', () => {
      const scripts = {
        test: 'jest',
        'pre-hook': 'echo pre-hook',
        lint: 'eslint',
      };
      const hookScripts = GitHookPatterns.getHookRelatedScripts(scripts);
      expect(hookScripts).toContain('pre-hook');
    });

    it('should detect husky-related scripts', () => {
      const scripts = {
        test: 'jest',
        'husky:install': 'husky install',
      };
      const hookScripts = GitHookPatterns.getHookRelatedScripts(scripts);
      expect(hookScripts).toContain('husky:install');
    });

    it('should detect prepare script', () => {
      const scripts = {
        test: 'jest',
        prepare: 'husky install',
      };
      const hookScripts = GitHookPatterns.getHookRelatedScripts(scripts);
      expect(hookScripts).toContain('prepare');
    });

    it('should return empty array when no hook scripts exist', () => {
      const scripts = {
        test: 'jest',
        lint: 'eslint',
        build: 'tsc',
      };
      const hookScripts = GitHookPatterns.getHookRelatedScripts(scripts);
      expect(hookScripts).toHaveLength(0);
    });
  });

  describe('createMissingHooksViolation()', () => {
    it('should return violation and suggestion', () => {
      const result = GitHookPatterns.createMissingHooksViolation([
        'pre-commit',
        'pre-push',
      ]);
      expect(result).toHaveProperty('violation');
      expect(result).toHaveProperty('suggestion');
    });

    it('should include missing hooks in violation message', () => {
      const result = GitHookPatterns.createMissingHooksViolation([
        'pre-commit',
        'pre-push',
      ]);
      expect(result.violation).toContain('pre-commit');
      expect(result.violation).toContain('pre-push');
    });

    it('should provide helpful suggestion', () => {
      const result = GitHookPatterns.createMissingHooksViolation([
        'pre-commit',
      ]);
      expect(result.suggestion.length).toBeGreaterThan(0);
    });
  });

  describe('createSampleHooksViolation()', () => {
    it('should return violation and suggestion', () => {
      const result = GitHookPatterns.createSampleHooksViolation([
        'pre-commit.sample',
      ]);
      expect(result).toHaveProperty('violation');
      expect(result).toHaveProperty('suggestion');
    });

    it('should include sample hooks in violation message', () => {
      const result = GitHookPatterns.createSampleHooksViolation([
        'pre-commit.sample',
      ]);
      expect(result.violation).toContain('pre-commit.sample');
    });
  });

  describe('createMissingHookAutomationViolation()', () => {
    it('should return violation and suggestion', () => {
      const result = GitHookPatterns.createMissingHookAutomationViolation();
      expect(result).toHaveProperty('violation');
      expect(result).toHaveProperty('suggestion');
    });

    it('should mention husky in suggestion', () => {
      const result = GitHookPatterns.createMissingHookAutomationViolation();
      expect(result.suggestion.toLowerCase()).toContain('husky');
    });
  });
});

/**
 * Git Law Utilities Tests
 * Tests for GitLawUtilities class
 */

import { PathOperations } from '../../src/utils/path-operations';
import { GitLawUtilities } from '../../src/utils/git-law-utilities';

// Repo root which is a real git repository (tests/utils -> repo root)
const WORKSPACE_ROOT = PathOperations.resolve(__dirname, '..', '..');

describe('utils/git-law-utilities', () => {
  describe('getStandardImports', () => {
    it('should return standard imports object', () => {
      const imports = GitLawUtilities.getStandardImports();

      expect(imports).toBeDefined();
      expect(imports.FileSystemOperations).toBeDefined();
      expect(imports.FileUtils).toBeDefined();
      expect(imports.CheckerUtils).toBeDefined();
      expect(imports.PathOperations).toBeDefined();
    });

    it('should return consistent imports', () => {
      const imports1 = GitLawUtilities.getStandardImports();
      const imports2 = GitLawUtilities.getStandardImports();

      expect(imports1.FileUtils).toBe(imports2.FileUtils);
    });
  });

  describe('createGitLawCheckContext', () => {
    it('should create context with violations array', () => {
      const context = GitLawUtilities.createGitLawCheckContext({
        projectRoot: '/test',
        config: {} as never,
      });

      expect(context.violations).toEqual([]);
      expect(context.suggestions).toEqual([]);
    });

    it('should preserve original context properties', () => {
      const context = GitLawUtilities.createGitLawCheckContext({
        projectRoot: '/test',
        config: {} as never,
      });

      expect(context.projectRoot).toBe('/test');
    });
  });

  describe('initializeGitLawCheck', () => {
    it('should return valid for git repository', () => {
      const result = GitLawUtilities.initializeGitLawCheck(
        WORKSPACE_ROOT,
        'test-law'
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should return invalid for non-git directory', () => {
      const result = GitLawUtilities.initializeGitLawCheck('/tmp', 'test-law');

      expect(result.valid).toBe(false);
      expect(result.violations).toContain('No Git repository found');
      expect(result.suggestions).toContain(
        'Initialize Git repository: git init'
      );
    });
  });

  describe('isGitRepository', () => {
    it('should return true for git repository', () => {
      const result = GitLawUtilities.isGitRepository(WORKSPACE_ROOT);
      expect(result).toBe(true);
    });

    it('should return false for non-git directory', () => {
      const result = GitLawUtilities.isGitRepository('/tmp');
      expect(result).toBe(false);
    });

    it('should return false for non-existent directory', () => {
      const result = GitLawUtilities.isGitRepository('/non/existent/path');
      expect(result).toBe(false);
    });
  });

  describe('getGitIgnoreContent', () => {
    it('should return gitignore content for git repository', () => {
      const content = GitLawUtilities.getGitIgnoreContent(WORKSPACE_ROOT);

      // Workspace should have a .gitignore
      expect(content).not.toBeNull();
      expect(typeof content).toBe('string');
    });

    it('should return null for directory without gitignore', () => {
      const content = GitLawUtilities.getGitIgnoreContent('/tmp');
      expect(content).toBeNull();
    });

    it('should return null for non-existent directory', () => {
      const content = GitLawUtilities.getGitIgnoreContent('/non/existent');
      expect(content).toBeNull();
    });
  });

  describe('hasGitIgnore', () => {
    it('should return true for repository with gitignore', () => {
      const result = GitLawUtilities.hasGitIgnore(WORKSPACE_ROOT);
      expect(result).toBe(true);
    });

    it('should return false for directory without gitignore', () => {
      const result = GitLawUtilities.hasGitIgnore('/tmp');
      expect(result).toBe(false);
    });
  });

  describe('getGitHooks', () => {
    it('should return array of hook names', () => {
      const hooks = GitLawUtilities.getGitHooks(WORKSPACE_ROOT);

      expect(Array.isArray(hooks)).toBe(true);
    });

    it('should return empty array for non-git directory', () => {
      const hooks = GitLawUtilities.getGitHooks('/tmp');
      expect(hooks).toEqual([]);
    });

    it('should return empty array for non-existent directory', () => {
      const hooks = GitLawUtilities.getGitHooks('/non/existent');
      expect(hooks).toEqual([]);
    });
  });

  describe('hasGitHook', () => {
    it('should return false for non-existent hook', () => {
      const result = GitLawUtilities.hasGitHook(
        WORKSPACE_ROOT,
        'non-existent-hook'
      );
      expect(result).toBe(false);
    });

    it('should return false for non-git directory', () => {
      const result = GitLawUtilities.hasGitHook('/tmp', 'pre-commit');
      expect(result).toBe(false);
    });
  });

  describe('getGitConfig', () => {
    it('should return config value if found', () => {
      const result = GitLawUtilities.getGitConfig(WORKSPACE_ROOT, 'remote');

      // Git repos typically have remote config
      // Result can be string or null depending on config
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should return null for non-existent key', () => {
      const result = GitLawUtilities.getGitConfig(
        WORKSPACE_ROOT,
        'nonexistentkey12345'
      );
      expect(result).toBeNull();
    });

    it('should return null for non-git directory', () => {
      const result = GitLawUtilities.getGitConfig('/tmp', 'remote');
      expect(result).toBeNull();
    });
  });

  describe('hasBranchProtection', () => {
    it('should return boolean for git repository', () => {
      const result = GitLawUtilities.hasBranchProtection(WORKSPACE_ROOT);
      expect(typeof result).toBe('boolean');
    });

    it('should return false for non-git directory', () => {
      const result = GitLawUtilities.hasBranchProtection('/tmp');
      expect(result).toBe(false);
    });
  });

  describe('hasCommitMessageValidation', () => {
    it('should return a boolean for git repository', () => {
      // Repo has no commitlint config nor commit-msg hook, so this is false
      const result = GitLawUtilities.hasCommitMessageValidation(WORKSPACE_ROOT);
      expect(typeof result).toBe('boolean');
    });

    it('should return false for directory without validation', () => {
      const result = GitLawUtilities.hasCommitMessageValidation('/tmp');
      expect(result).toBe(false);
    });
  });

  describe('hasPreCommitHooks', () => {
    it('should return boolean for git repository', () => {
      const result = GitLawUtilities.hasPreCommitHooks(WORKSPACE_ROOT);
      expect(typeof result).toBe('boolean');
    });

    it('should return false for non-git directory', () => {
      const result = GitLawUtilities.hasPreCommitHooks('/tmp');
      expect(result).toBe(false);
    });
  });

  describe('createGitLawResult', () => {
    it('should create pass result when no violations', () => {
      const result = GitLawUtilities.createGitLawResult(
        [],
        'test-law',
        'git',
        [],
        { projectRoot: '/test', config: {} as never }
      );

      expect(result.status).toBe('pass');
      expect(result.lawName).toBe('test-law');
      expect(result.category).toBe('git');
    });

    it('should create fail result when violations exist', () => {
      const result = GitLawUtilities.createGitLawResult(
        ['Missing git hook'],
        'test-law',
        'git',
        ['Install pre-commit hook'],
        { projectRoot: '/test', config: {} as never }
      );

      expect(result.status).toBe('fail');
      expect(result.violations).toContain('Missing git hook');
      expect(result.suggestions).toContain('Install pre-commit hook');
    });

    it('should include context in result', () => {
      const context = { projectRoot: '/test', config: {} as never };
      const result = GitLawUtilities.createGitLawResult(
        [],
        'test-law',
        'git',
        [],
        context
      );

      expect(result.context).toBe(context);
    });
  });
});

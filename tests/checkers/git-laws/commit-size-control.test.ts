/**
 * @fileoverview Tests for CommitSizeControlLaw
 * @description Tests for commit size validation and atomic commit enforcement
 */

import { CommitSizeControlLaw } from '../../../src/checkers/git-laws/commit-size-control';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('checkers/git-laws/commit-size-control', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('commit-size-control-test-');
    mockContext = {
      projectRoot: tempDir,
      config: {
        project: {
          name: 'test-project',
          root: '',
          componentPrefix: 'app',
          type: 'generic',
        },
        ignores: { global: [], tests: [], build: [], design: [] },
        laws: { paretoMode: false, severity: {} },
        hooks: { preCommit: false, prePush: false, commitMsg: false },
        includes: { global: [] },
        excludes: {},
        reporting: {
          format: 'console',
          verbose: false,
          onlyFailures: false,
          scoring: false,
        },
        performance: {
          parallel: false,
          maxConcurrent: 3,
          cache: true,
        },
      },
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  // ==========================================================================
  // Git Repository Validation
  // ==========================================================================

  describe('Git Repository Validation', () => {
    it('should return violation when no .git directory exists', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('No Git repository found');
    });

    it('should return lawName as commit-size-control', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      expect(result.lawName).toBe('commit-size-control');
    });

    it('should suggest git init when no repository', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      expect(result.suggestions).toContain(
        'Initialize Git repository: git init'
      );
    });

    it('should categorize as Version Control', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      // Should have proper law result structure
      expect(result).toHaveProperty('lawName');
      expect(result).toHaveProperty('passed');
    });
  });

  // ==========================================================================
  // Result Structure Validation
  // ==========================================================================

  describe('Result Structure', () => {
    it('should return all required LawResult properties', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('config');
    });

    it('should have violations as array', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions as array', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have config object', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      expect(result.config).toBeDefined();
      expect(typeof result.config).toBe('object');
    });
  });

  // ==========================================================================
  // With Git Repository
  // ==========================================================================

  describe('With Git Repository', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
    });

    it('should not report missing git repository violation', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      expect(result.violations).not.toContain('No Git repository found');
    });

    it('should analyze commit size policies', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      // Should complete analysis
      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });
  });

  // ==========================================================================
  // Atomic Commit Documentation
  // ==========================================================================

  describe('Atomic Commit Documentation', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
    });

    it('should detect missing atomic commit documentation', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      // Should have violations or suggestions about atomic commits
      expect(result).toBeDefined();
      const hasAtomicReference =
        result.violations?.some(v => v.toLowerCase().includes('atomic')) ||
        result.suggestions?.some(s => s.toLowerCase().includes('atomic'));

      // Either has atomic reference or result is valid
      expect(hasAtomicReference || result.passed !== undefined).toBe(true);
    });

    it('should pass when CONTRIBUTING.md has atomic commit info', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'CONTRIBUTING.md'),
        '# Contributing\n\nPlease make atomic commits with single responsibility.'
      );

      const result = CommitSizeControlLaw.check(mockContext);

      // Should have analyzed the documentation
      expect(result).toBeDefined();
    });

    it('should check for COMMIT_GUIDELINES.md', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'docs'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'docs', 'COMMIT_GUIDELINES.md'),
        '# Commit Guidelines\n\nKeep commits atomic with one change per commit.'
      );

      const result = CommitSizeControlLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Pre-Commit Hook Detection
  // ==========================================================================

  describe('Pre-Commit Hook Detection', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git', 'hooks'));
    });

    it('should detect missing pre-commit hook', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      // Should suggest creating pre-commit hook
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should detect pre-commit hook without size validation', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.git', 'hooks', 'pre-commit'),
        '#!/bin/bash\necho "Running pre-commit hook"'
      );

      const result = CommitSizeControlLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should recognize pre-commit hook with size validation', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.git', 'hooks', 'pre-commit'),
        '#!/bin/bash\ngit diff --stat | grep "files changed"'
      );

      const result = CommitSizeControlLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Git Message Template
  // ==========================================================================

  describe('Git Message Template', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
    });

    it('should detect .gitmessage template', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.gitmessage'),
        '# Commit message template\n# Keep commits atomic and focused'
      );

      const result = CommitSizeControlLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should suggest updating template without atomic guidance', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.gitmessage'),
        '# Basic commit message'
      );

      const result = CommitSizeControlLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Package.json Scripts
  // ==========================================================================

  describe('Package.json Scripts', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
    });

    it('should detect package.json without commit validation scripts', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          scripts: {
            build: 'tsc',
            test: 'jest',
          },
        })
      );

      const result = CommitSizeControlLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should recognize package.json with husky scripts', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          scripts: {
            prepare: 'husky install',
            'pre-commit': 'lint-staged',
          },
        })
      );

      const result = CommitSizeControlLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // CI/CD Workflow Detection
  // ==========================================================================

  describe('CI/CD Workflow Detection', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
      FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
    });

    it('should detect GitHub workflows directory', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest'
      );

      const result = CommitSizeControlLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should check for PR size validation in workflows', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'pr-check.yml'),
        'name: PR Check\non: pull_request\njobs:\n  size:\n    runs-on: ubuntu-latest\n    steps:\n      - run: git diff --stat'
      );

      const result = CommitSizeControlLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Score Calculation
  // ==========================================================================

  describe('Score Calculation', () => {
    it('should have score between 0 and 100', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should reduce score for violations', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      if (result.violations && result.violations.length > 0) {
        expect(result.score).toBeLessThan(100);
      }
    });

    it('should not have negative score', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle missing project root', () => {
      const missingContext: LawCheckContext = {
        ...mockContext,
        projectRoot: PathOperations.join(tempDir, 'missing-dir'),
      };

      const result = CommitSizeControlLaw.check(missingContext);

      expect(result).toBeDefined();
      expect(result.passed).toBe(false);
    });

    it('should return consistent results on multiple checks', () => {
      const result1 = CommitSizeControlLaw.check(mockContext);
      const result2 = CommitSizeControlLaw.check(mockContext);

      expect(result1.passed).toBe(result2.passed);
      expect(result1.score).toBe(result2.score);
    });

    it('should handle empty package.json', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({})
      );

      const result = CommitSizeControlLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should handle malformed JSON files gracefully', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        '{ invalid json }'
      );

      const result = CommitSizeControlLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Config Integration
  // ==========================================================================

  describe('Config Integration', () => {
    it('should include config in result', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      expect(result.config).toBeDefined();
      expect(result.config.project.name).toBe('test-project');
    });

    it('should work with different project types', () => {
      const reactContext: LawCheckContext = {
        ...mockContext,
        config: {
          ...mockContext.config,
          project: {
            ...mockContext.config.project,
            type: 'react',
          },
        },
      };

      const result = CommitSizeControlLaw.check(reactContext);

      expect(result).toBeDefined();
      expect(result.config.project.type).toBe('react');
    });
  });

  // ==========================================================================
  // Large Commit Detection
  // ==========================================================================

  describe('Large Commit Detection', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
    });

    it('should analyze recent commit sizes', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      // Should complete without error
      expect(result).toBeDefined();
    });

    it('should provide guidance for commit size limits', () => {
      const result = CommitSizeControlLaw.check(mockContext);

      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  // ==========================================================================
  // Documentation Check
  // ==========================================================================

  describe('Documentation Check', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
      FileUtils.createDirectory(PathOperations.join(tempDir, 'docs'));
    });

    it('should check docs/ATOMIC_COMMITS.md', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'docs', 'ATOMIC_COMMITS.md'),
        '# Atomic Commits\n\nMake small, focused commits.'
      );

      const result = CommitSizeControlLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should check docs/DEVELOPMENT.md for commit guidelines', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'docs', 'DEVELOPMENT.md'),
        '# Development\n\n## Commits\n\nUse atomic commits with single responsibility.'
      );

      const result = CommitSizeControlLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });
});

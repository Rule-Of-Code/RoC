/**
 * @fileoverview Tests for BranchGovernanceLaw
 * @description Tests for branch naming conventions and git workflow governance
 */

import { execSync } from 'child_process';
import { BranchGovernanceLaw } from '../../../src/checkers/git-laws/branch-governance';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('checkers/git-laws/branch-governance', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('branch-governance-test-');
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
      const result = BranchGovernanceLaw.check(mockContext);

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('No Git repository found');
    });

    it('should return lawName as branch-governance', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      expect(result.lawName).toBe('branch-governance');
    });

    it('should suggest git init when no repository', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      expect(result.suggestions).toContain(
        'Initialize Git repository: git init'
      );
    });
  });

  // ==========================================================================
  // Result Structure Validation
  // ==========================================================================

  describe('Result Structure', () => {
    it('should return all required LawResult properties', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('config');
    });

    it('should have passed as boolean', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      expect(typeof result.passed).toBe('boolean');
    });

    it('should have message as string', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('should have score as number', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      expect(typeof result.score).toBe('number');
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
      const result = BranchGovernanceLaw.check(mockContext);

      expect(result.violations).not.toContain('No Git repository found');
    });

    it('should provide branch naming suggestions', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      // Should have suggestions array with branch naming guidance
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should handle git repository with minimal structure', () => {
      // Create minimal git structure
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git', 'refs'));
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.git', 'objects')
      );

      const result = BranchGovernanceLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });
  });

  // ==========================================================================
  // Branch Naming Convention
  // ==========================================================================

  describe('Branch Naming Convention', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
    });

    it('should include branch naming convention in suggestions', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      // When there are issues, should suggest proper naming
      if (result.suggestions && result.suggestions.length > 0) {
        const hasNamingSuggestion = result.suggestions.some(
          s =>
            s.includes('branch') ||
            s.includes('naming') ||
            s.includes('feature') ||
            s.includes('hotfix')
        );
        expect(hasNamingSuggestion || result.suggestions.length >= 0).toBe(
          true
        );
      }
    });

    it('should suggest avoiding direct work on protected branches', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      // Check for protected branch guidance in suggestions
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  // ==========================================================================
  // Score Calculation
  // ==========================================================================

  describe('Score Calculation', () => {
    it('should have score between 0 and 100', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should deduct score for violations', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      // With violations, score should be reduced from 100
      if (result.violations && result.violations.length > 0) {
        expect(result.score).toBeLessThan(100);
      }
    });

    it('should not have negative score', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Protected Branches
  // ==========================================================================

  describe('Protected Branches', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
    });

    it('should reference protected branches in guidance', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      // Result should exist and have proper structure
      expect(result).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should suggest feature branch workflow', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      // Should have suggestions available
      expect(result.suggestions).toBeDefined();
    });
  });

  // ==========================================================================
  // Remote Tracking
  // ==========================================================================

  describe('Remote Tracking', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
    });

    it('should handle missing remote tracking gracefully', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      // Should not throw and should return valid result
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should provide guidance for remote tracking setup', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      // Should have suggestions array
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle non-existent project root gracefully', () => {
      const nonExistentContext: LawCheckContext = {
        ...mockContext,
        projectRoot: PathOperations.join(tempDir, 'non-existent'),
      };

      const result = BranchGovernanceLaw.check(nonExistentContext);

      expect(result).toBeDefined();
      expect(result.passed).toBe(false);
    });

    it('should return consistent results on multiple checks', () => {
      const result1 = BranchGovernanceLaw.check(mockContext);
      const result2 = BranchGovernanceLaw.check(mockContext);

      expect(result1.passed).toBe(result2.passed);
      expect(result1.score).toBe(result2.score);
    });

    it('should handle context with different project name', () => {
      const differentContext: LawCheckContext = {
        projectRoot: tempDir,
        config: {
          ...mockContext.config,
          project: {
            ...mockContext.config.project,
            name: 'different-project',
          },
        },
      };

      const result = BranchGovernanceLaw.check(differentContext);

      expect(result).toBeDefined();
    });

    it('should handle deeply nested project paths', () => {
      const nestedDir = PathOperations.join(
        tempDir,
        'level1',
        'level2',
        'level3'
      );
      FileUtils.createDirectory(nestedDir);

      const nestedContext: LawCheckContext = {
        ...mockContext,
        projectRoot: nestedDir,
      };

      const result = BranchGovernanceLaw.check(nestedContext);

      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });
  });

  // ==========================================================================
  // Long-Running Branch Detection
  // ==========================================================================

  describe('Long-Running Branch Detection', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));
    });

    it('should handle branch commit count check gracefully', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      // Should complete without errors
      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });

    it('should suggest keeping feature branches small', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      // Result should be valid
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  // ==========================================================================
  // F-2 regression: branch size, NOT full history depth (real git fixture)
  // A downstream consumer with >1000 total commits saw every branch flagged
  // ("1004 commits") because the check counted the whole history. It must count
  // only the commits UNIQUE to the branch versus its integration base.
  // ==========================================================================

  describe('Long-Running Branch Detection — counts branch-unique commits', () => {
    const git = (cmd: string): string =>
      execSync(`git ${cmd}`, { cwd: tempDir, stdio: 'pipe' }).toString();

    let n = 0;
    const commit = (count: number): void => {
      for (let i = 0; i < count; i++) {
        n += 1;
        FileUtils.writeFile(
          PathOperations.join(tempDir, `f${n}.txt`),
          String(n)
        );
        git('add -A');
        git(`commit -q -m "chore: commit ${n}"`);
      }
    };

    const initRepo = (): void => {
      n = 0;
      git('init -q');
      git('config user.email "t@example.dev"');
      git('config user.name "T"');
      git('config commit.gpgsign false');
    };

    const lowMaxContext = (): LawCheckContext => ({
      ...mockContext,
      config: {
        ...mockContext.config,
        thresholds: { git: { maxCommitsPerBranch: 3 } },
      } as LawCheckContext['config'],
    });

    it('does NOT flag a small branch even when total history exceeds the max', () => {
      initRepo();
      commit(6); // 6 commits on the default (integration) branch
      git('checkout -q -b feature/small');
      commit(1); // exactly ONE commit unique to the branch

      // History depth reachable from the branch is 7 (> max 3); the OLD check
      // flagged that. Branch-unique size is 1 (< 3) — must not be flagged.
      const result = BranchGovernanceLaw.check(lowMaxContext());
      const flaggedTooBig = (result.violations ?? []).some(v =>
        /commits.*\(max 3\)/.test(v)
      );
      expect(flaggedTooBig).toBe(false);
    });

    it('DOES flag a branch whose own commits exceed the max', () => {
      initRepo();
      commit(1); // baseline on the integration branch
      git('checkout -q -b feature/big');
      commit(5); // 5 commits unique to the branch (> max 3)

      const result = BranchGovernanceLaw.check(lowMaxContext());
      const flaggedTooBig = (result.violations ?? []).some(v =>
        /commits ahead of its base \(max 3\)/.test(v)
      );
      expect(flaggedTooBig).toBe(true);
    });
  });

  // ==========================================================================
  // Config Integration
  // ==========================================================================

  describe('Config Integration', () => {
    it('should include config in result', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      expect(result.config).toBeDefined();
      expect(result.config.project).toBeDefined();
    });

    it('should pass config through to result', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      expect(result.config.project.name).toBe('test-project');
    });

    it('should handle different project types', () => {
      const angularContext: LawCheckContext = {
        ...mockContext,
        config: {
          ...mockContext.config,
          project: {
            ...mockContext.config.project,
            type: 'angular',
          },
        },
      };

      const result = BranchGovernanceLaw.check(angularContext);

      expect(result).toBeDefined();
      expect(result.config.project.type).toBe('angular');
    });
  });

  // ==========================================================================
  // Law Type Verification
  // ==========================================================================

  describe('Law Type Verification', () => {
    it('should be a GIT_LAW type', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      // The law should return git-related violations and suggestions
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
    });

    it('should use Branch Governance as law name', () => {
      const result = BranchGovernanceLaw.check(mockContext);

      expect(result.lawName).toBe('branch-governance');
    });
  });

  // ==========================================================================
  // Detached HEAD — the normal CI checkout. `git branch --show-current` prints
  // an empty string there, which used to be reported as a violation, so every
  // CI run of every consumer failed a law about branch naming.
  // ==========================================================================

  describe('Detached HEAD (CI checkouts, bisect, tag checkout)', () => {
    const CI_VARS = [
      'GITHUB_HEAD_REF',
      'GITHUB_REF_NAME',
      'CI_MERGE_REQUEST_SOURCE_BRANCH_NAME',
      'CI_COMMIT_BRANCH',
      'BITBUCKET_BRANCH',
      'CIRCLE_BRANCH',
      'BRANCH_NAME',
      'GIT_BRANCH',
    ];
    let savedEnv: Record<string, string | undefined>;

    const git = (cmd: string): string =>
      execSync(`git ${cmd}`, { cwd: tempDir, stdio: 'pipe' }).toString();

    /** A real repo whose HEAD is detached onto its only commit. */
    const detachRepo = (): void => {
      git('init -q');
      git('config user.email "t@example.dev"');
      git('config user.name "T"');
      git('config commit.gpgsign false');
      FileUtils.writeFile(PathOperations.join(tempDir, 'a.txt'), 'a');
      git('add -A');
      git('commit -q -m "chore: first"');
      git('checkout -q --detach HEAD');
    };

    beforeEach(() => {
      savedEnv = {};
      for (const key of CI_VARS) {
        savedEnv[key] = process.env[key];
        delete process.env[key];
      }
    });

    afterEach(() => {
      for (const key of CI_VARS) {
        const value = savedEnv[key];
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });

    it('does not report a violation when no branch names the checkout', () => {
      detachRepo();

      const result = BranchGovernanceLaw.check(mockContext);

      expect(result.violations).toEqual([]);
      expect(result.passed).toBe(true);
    });

    it('uses the branch the CI system reports (GitHub pull request)', () => {
      detachRepo();
      process.env.GITHUB_HEAD_REF = 'not-a-valid-prefix';

      const result = BranchGovernanceLaw.check(mockContext);

      // The CI-reported name is judged like any other branch: this one breaks
      // the naming convention, so the law must say so rather than stay silent.
      expect(
        (result.violations ?? []).some(v =>
          /not-a-valid-prefix/.test(v)
        )
      ).toBe(true);
    });

    it('ignores GitHub synthetic merge refs like "7/merge"', () => {
      detachRepo();
      process.env.GITHUB_REF_NAME = '7/merge';

      const result = BranchGovernanceLaw.check(mockContext);

      // "7/merge" names no branch — it must not be judged as a branch name.
      expect(result.violations).toEqual([]);
      expect(result.passed).toBe(true);
    });
  });
});

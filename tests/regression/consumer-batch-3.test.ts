import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { MergeConflictPreventionLaw } from '../../src/checkers/git-laws/merge-conflict-prevention';
import { AuditCache } from '../../src/core/auditing/audit-cache';
import type { AuditResult } from '../../src/core/auditing/audit-types';
import { FileUtils } from '../../src/utils';

describe('consumer batch 3', () => {
  let root: string;
  const git = (command: string): string =>
    execSync(command, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-batch3-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  /**
   * `.git/MERGE_HEAD` answers "is this commit a merge", not "is there an
   * unresolved conflict". Git writes it when a real merge commit is needed and
   * removes it only AFTER `git commit` creates that commit — so during a
   * pre-commit hook it is present on every merge, resolved or not. A repository
   * wiring this law into pre-commit could not complete a local merge at all.
   */
  describe('merge-conflict-prevention judges conflicts, not merge commits', () => {
    const conflictedMerge = (): void => {
      git('git init -q');
      git('git config user.email t@example.com');
      git('git config user.name Test');
      fs.writeFileSync(path.join(root, 'f.txt'), 'base\n');
      git('git add f.txt');
      git('git commit -qm base');
      git('git checkout -qb other');
      fs.writeFileSync(path.join(root, 'f.txt'), 'other\n');
      git('git commit -qam other');
      git('git checkout -q -');
      fs.writeFileSync(path.join(root, 'f.txt'), 'main\n');
      git('git commit -qam main');
      try {
        git('git merge other');
      } catch {
        // The merge conflicts on purpose.
      }
    };

    const violationsOf = (): string[] => {
      const result = MergeConflictPreventionLaw.check({
        projectRoot: root,
        config: FileUtils.getMinimalDefaultConfig(),
      });
      return result.violations ?? [];
    };

    it('says nothing about a merge that has been resolved and staged', () => {
      conflictedMerge();
      fs.writeFileSync(path.join(root, 'f.txt'), 'resolved\n');
      git('git add f.txt');

      // This is exactly the state a pre-commit hook sees: MERGE_HEAD present,
      // nothing unresolved.
      expect(fs.existsSync(path.join(root, '.git', 'MERGE_HEAD'))).toBe(true);
      expect(violationsOf()).not.toContain(
        'Repository is in the middle of a merge'
      );
    });

    it('still reports an unresolved conflict', () => {
      conflictedMerge();

      const violations = violationsOf();
      expect(
        violations.some(v => /Active merge conflicts|conflict markers/i.test(v))
      ).toBe(true);
    });
  });

  /**
   * The cache key was files + config + git state, and there is one cache file
   * per project — none of which change with the audit MODE. Modes deliberately
   * audit different law sets, so a narrower pre-commit verdict could be served
   * as a full audit's answer.
   */
  describe('the audit cache is keyed by mode', () => {
    const stored = (mode: string): void => {
      const result = {
        passed: true,
        score: 100,
        totalLaws: 78,
        passedLaws: 78,
        failedLaws: 0,
        warningLaws: 0,
        results: new Map(),
        duration: 1,
        paretoMode: false,
        executionTime: 1,
        timestamp: 'now',
        projectRoot: root,
        config: {},
      } as unknown as AuditResult;
      AuditCache.set(root, result, 'FILES', 'CONFIG', mode);
    };

    it('serves a verdict back to the same mode', () => {
      stored('full');

      expect(AuditCache.get(root, 'FILES', 'CONFIG', 'full')).not.toBeNull();
    });

    it('refuses to serve a full verdict to a pre-commit run', () => {
      stored('full');

      expect(AuditCache.get(root, 'FILES', 'CONFIG', 'pre-commit')).toBeNull();
    });

    it('refuses to serve a pre-commit verdict to a full run', () => {
      // The direction that matters: pre-commit skips the git-history laws, so
      // serving it as a full audit reports PASSED over laws nobody ran.
      stored('pre-commit');

      expect(AuditCache.get(root, 'FILES', 'CONFIG', 'full')).toBeNull();
    });

    it('invalidates an entry written before the mode key existed', () => {
      stored('full');
      const cachePath = path.join(root, '.ruleofcode-cache', 'audit-results.json');
      const entry = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      delete entry.mode;
      fs.writeFileSync(cachePath, JSON.stringify(entry));

      expect(AuditCache.get(root, 'FILES', 'CONFIG', 'full')).toBeNull();
    });
  });
});
/**
 * Regression tests for the v7.1.0 git-law false-positive backlog.
 *
 * Uses REAL temporary git repositories (no mocks, no stubs) so the checks exercise
 * the exact `git` interactions they rely on in production — matching the project's
 * real-data testing philosophy.
 */
import { execFileSync, execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AuditCache } from '../../../src/core/auditing/audit-cache';
import { BranchGovernanceLaw } from '../../../src/checkers/git-laws/branch-governance';
import { CommitMessageStandardsLaw } from '../../../src/checkers/git-laws/commit-message-standards';
import { MergeConflictPreventionLaw } from '../../../src/checkers/git-laws/merge-conflict-prevention';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';

const baseConfig = (root: string): RuleOfCodeConfig =>
  ({
    project: { name: 't', root, componentPrefix: 'app', type: 'generic' },
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
    performance: { parallel: false, maxConcurrent: 3, cache: false },
    thresholds: {},
  }) as RuleOfCodeConfig;

const ctx = (root: string): LawCheckContext => ({
  projectRoot: root,
  config: baseConfig(root),
});

const repos: string[] = [];
function newRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-reg-'));
  repos.push(dir);
  const git = (cmd: string): void => {
    execSync(`git ${cmd}`, { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
  };
  git('init -q');
  git('config user.email t@t.t');
  git('config user.name tester');
  git('config commit.gpgsign false');
  git('checkout -q -b master');
  return dir;
}
function commit(dir: string, file: string, content: string, msg: string): void {
  fs.writeFileSync(path.join(dir, file), content);
  execSync('git add -A', { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
  execFileSync('git', ['commit', '-q', '-m', msg], {
    cwd: dir,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

afterAll(() => {
  for (const dir of repos) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});

describe('Commit Message Standards — merge/squash grandfathering (#1)', () => {
  it('does NOT flag a >72 merge/squash subject for length', () => {
    const dir = newRepo();
    commit(dir, 'f.txt', 'a', 'feat(core): initial conventional subject');
    const longMerge =
      'Merged in feature/some-really-long-branch-name-bitbucket-composed (pull request #42)';
    expect(longMerge.length).toBeGreaterThan(72);
    commit(dir, 'f.txt', 'b', longMerge);

    const result = CommitMessageStandardsLaw.check(ctx(dir));
    const joined = (result.violations ?? []).join(' || ');
    expect(joined).not.toContain('pull request #42');
  });

  it('STILL flags a >72 authored conventional subject for length', () => {
    const dir = newRepo();
    commit(dir, 'f.txt', 'a', 'feat(core): seed');
    const longAuthored =
      'feat(core): this authored subject is intentionally far too long to pass the length gate';
    expect(longAuthored.length).toBeGreaterThan(72);
    commit(dir, 'f.txt', 'b', longAuthored);

    const result = CommitMessageStandardsLaw.check(ctx(dir));
    expect((result.violations ?? []).join(' || ').toLowerCase()).toContain('too long');
  });
});

describe('Merge Conflict Prevention — marker detection (#2)', () => {
  it('does NOT false-positive on bare ======= (markdown / coverage rules)', () => {
    const dir = newRepo();
    commit(
      dir,
      'README.md',
      'Title\n=======\n\nAll files |  100 |\n==========|========|\n',
      'docs: readme with ======= underlines'
    );
    commit(
      dir,
      'report.json',
      JSON.stringify({ note: 'string mentioning <<<<<<< inside a value' }),
      'chore: report json'
    );

    const result = MergeConflictPreventionLaw.check(ctx(dir));
    expect(
      (result.violations ?? []).some(v => v.toLowerCase().includes('conflict marker'))
    ).toBe(false);
  });

  it('DOES detect real <<<<<<< / >>>>>>> conflict markers', () => {
    const dir = newRepo();
    commit(
      dir,
      'src.ts',
      'const a = 1;\n<<<<<<< HEAD\nconst b = 2;\n=======\nconst b = 3;\n>>>>>>> other\n',
      'feat: file containing a real conflict'
    );

    const result = MergeConflictPreventionLaw.check(ctx(dir));
    expect(
      (result.violations ?? []).some(v => v.toLowerCase().includes('conflict marker'))
    ).toBe(true);
  });
});

describe('Branch Governance — untracked files on master (#3)', () => {
  it('does NOT flag "Direct work on master" for untracked-only tree', () => {
    const dir = newRepo();
    commit(dir, 'a.txt', 'x', 'feat: seed');
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.claude', 'scratch.json'), '{}');
    fs.writeFileSync(path.join(dir, 'untracked.log'), 'noise');

    const result = BranchGovernanceLaw.check(ctx(dir));
    expect(
      (result.violations ?? []).some(v => v.includes('Direct work on master'))
    ).toBe(false);
  });

  it('DOES flag "Direct work on master" for a tracked modification', () => {
    const dir = newRepo();
    commit(dir, 'a.txt', 'x', 'feat: seed');
    fs.writeFileSync(path.join(dir, 'a.txt'), 'CHANGED');

    const result = BranchGovernanceLaw.check(ctx(dir));
    expect(
      (result.violations ?? []).some(v => v.includes('Direct work on master'))
    ).toBe(true);
  });
});

describe('AuditCache — keyed by git state (#3b)', () => {
  const fakeResults = {
    results: new Map([['Law', { passed: true }]]),
  } as never;

  it('HITS on the same branch + commit', () => {
    const dir = newRepo();
    commit(dir, 'a.txt', 'x', 'feat: seed');
    AuditCache.set(dir, fakeResults, 'FH', 'CH');
    expect(AuditCache.get(dir, 'FH', 'CH')).not.toBeNull();
  });

  it('MISSES after a branch switch (same files)', () => {
    const dir = newRepo();
    commit(dir, 'a.txt', 'x', 'feat: seed');
    AuditCache.set(dir, fakeResults, 'FH', 'CH');
    execSync('git checkout -q -b feature/x', {
      cwd: dir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    expect(AuditCache.get(dir, 'FH', 'CH')).toBeNull();
  });

  it('MISSES after a new commit (HEAD moved)', () => {
    const dir = newRepo();
    commit(dir, 'a.txt', 'x', 'feat: seed');
    AuditCache.set(dir, fakeResults, 'FH', 'CH');
    commit(dir, 'b.txt', 'y', 'feat: another');
    expect(AuditCache.get(dir, 'FH', 'CH')).toBeNull();
  });
});

describe('Commit Message Standards — empty post-baseline range (v7.1.1, FE flag)', () => {
  it('PASSES (no "No commits found") when nothing new sits after the baseline', () => {
    const dir = newRepo();
    commit(dir, 'f.txt', 'a', 'feat(core): seed');
    const baseline = execSync('git rev-parse HEAD', {
      cwd: dir,
      encoding: 'utf8',
    }).trim();
    // No new authored commits after the baseline → empty range → compliant.
    const result = CommitMessageStandardsLaw.check({
      projectRoot: dir,
      config: {
        ...baseConfig(dir),
        thresholds: { git: { commitMessage: { baseline } } },
      },
    });
    expect(
      (result.violations ?? []).some(v => v.includes('No commits found'))
    ).toBe(false);
    expect(result.passed).toBe(true);
  });
});

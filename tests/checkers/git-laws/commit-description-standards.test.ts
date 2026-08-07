/**
 * Tests for CommitDescriptionStandardsLaw — real git repos, no mocks.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { CommitDescriptionStandardsLaw } from '../../../src/checkers/git-laws/commit-description-standards';
import type { LawCheckContext } from '../../../src/types/law.types';

const dirs: string[] = [];
function repo(commits: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-cd-'));
  dirs.push(dir);
  const git = (cmd: string, input?: string) =>
    execSync(cmd, { cwd: dir, input, stdio: ['pipe', 'pipe', 'pipe'] });
  git('git init -q');
  git('git config user.email a@b.c');
  git('git config user.name tester');
  commits.forEach((msg, i) => {
    fs.writeFileSync(path.join(dir, `f${i}.txt`), String(i));
    git('git add -A');
    git('git commit -q -F -', msg);
  });
  return dir;
}
afterAll(() => {
  for (const dir of dirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});
const ctx = (root: string): LawCheckContext =>
  ({
    projectRoot: root,
    config: {
      project: { name: 't', root: '', componentPrefix: 'app', type: 'generic' },
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
    },
  }) as LawCheckContext;

describe('checkers/git-laws/commit-description-standards', () => {
  it('returns a violation when no Git repository exists', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-cd-nogit-'));
    dirs.push(dir);
    const result = CommitDescriptionStandardsLaw.check(ctx(dir));
    expect(result.passed).toBe(false);
  });

  it('passes a well-formed body (blank line + wrapped)', () => {
    const dir = repo([
      'feat: add thing\n\nExplain what and why in a body that stays under the limit.\n',
    ]);
    expect(CommitDescriptionStandardsLaw.check(ctx(dir)).passed).toBe(true);
  });

  it('passes a single-line commit (no body to check)', () => {
    const dir = repo(['chore: bump version']);
    expect(CommitDescriptionStandardsLaw.check(ctx(dir)).passed).toBe(true);
  });

  it('flags a body not separated from the subject by a blank line', () => {
    const dir = repo([
      'fix: thing\nThis body line directly follows the subject with no blank line.\n',
    ]);
    const r = CommitDescriptionStandardsLaw.check(ctx(dir));
    expect(r.passed).toBe(false);
    expect(r.violations!.some(v => v.includes('blank line'))).toBe(true);
  });

  it('flags an over-long (wrappable) body line', () => {
    const dir = repo([
      'docs: notes\n\nThis particular body line is intentionally far longer than seventy two characters to trip the wrap rule.\n',
    ]);
    const r = CommitDescriptionStandardsLaw.check(ctx(dir));
    expect(r.passed).toBe(false);
    expect(r.violations!.some(v => v.includes('wrap'))).toBe(true);
  });

  it('does NOT flag long URLs or trailers in the body', () => {
    const dir = repo([
      'chore: refs\n\nSee https://example.com/some/really/long/url/that/keeps/going/way/past/seventy/two/chars\nCloses: #1234567890 with a trailer line that is also quite long but is a footer entry\n',
    ]);
    expect(CommitDescriptionStandardsLaw.check(ctx(dir)).passed).toBe(true);
  });

  describe('baseline (exempt old descriptions)', () => {
    const ctxBaseline = (root: string, baseline: string): LawCheckContext => {
      const c = ctx(root) as LawCheckContext & {
        config: { thresholds?: unknown };
      };
      c.config.thresholds = { git: { commitDescription: { baseline } } };
      return c;
    };

    it('exempts bodies authored before the configured baseline', () => {
      const dir = repo([
        'fix: old\nPre-adoption body with no blank line that should be exempt.\n',
      ]);
      execSync('git tag adoption', { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
      // Only the pre-baseline (bad) commit exists → nothing after baseline.
      expect(
        CommitDescriptionStandardsLaw.check(ctxBaseline(dir, 'adoption')).passed
      ).toBe(true);
    });

    it('still flags a bad body authored after the baseline', () => {
      const dir = repo([
        'fix: old\nPre-adoption body, exempt.\n',
      ]);
      execSync('git tag adoption', { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
      fs.writeFileSync(path.join(dir, 'new.txt'), 'x');
      execSync('git add -A', { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
      execSync('git commit -q -F -', {
        cwd: dir,
        input: 'feat: new\nNew post-baseline body with no blank line, must be flagged.\n',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      expect(
        CommitDescriptionStandardsLaw.check(ctxBaseline(dir, 'adoption')).passed
      ).toBe(false);
    });
  });
});

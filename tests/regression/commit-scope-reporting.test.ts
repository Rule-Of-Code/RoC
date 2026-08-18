import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CommitMessageStandardsLaw } from '../../src/checkers/git-laws/commit-message-standards';
import { CommitDescriptionStandardsLaw } from '../../src/checkers/git-laws/commit-description-standards';
import { CommitSizeControlLaw } from '../../src/checkers/git-laws/commit-size-control';
import { FileUtils } from '../../src/utils';
import type { RuleOfCodeConfig } from '../../src/types/law.types';

/**
 * A baseline resolves against the LOCAL ref, so a branch that has not been
 * pulled puts commits already merged upstream inside the scanned range. The
 * output named a position and nothing else, which made a correct result
 * indistinguishable from a broken one.
 *
 * A reporter read the finding the only way it could be read — a foreign commit
 * in shared history — rebased (which could not help, the commit being upstream
 * already), lost two of their own commits to it, recovered them from the
 * reflog, told their team lead the gate was broken, and began drafting an issue
 * against a tool that was working correctly. `git pull` was the fix.
 */
describe('commit-history laws report the scope they resolved', () => {
  let dir: string;
  let repo: string;

  const git = (command: string, cwd: string = repo): string =>
    execSync(command, { cwd, encoding: 'utf8', stdio: 'pipe' });

  const write = (rel: string, content: string): void =>
    fs.writeFileSync(path.join(repo, rel), content);

  const withBaseline = (baseline?: string): RuleOfCodeConfig => {
    const config = FileUtils.getMinimalDefaultConfig();
    config.thresholds = {
      ...config.thresholds,
      git: {
        ...config.thresholds?.git,
        commitMessage: baseline ? { baseline } : {},
        commitSize: baseline ? { baseline } : {},
      },
    };
    return config;
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-scope-'));
    repo = path.join(dir, 'local');
    execSync('git init -q --bare upstream', { cwd: dir });
    execSync('git init -q local', { cwd: dir });
    git('git config user.email t@example.com');
    git('git config user.name Test');
    write('package.json', '{"name":"p","version":"1.0.0"}');
    write('CONTRIBUTING.md', '# Contributing\n\nAtomic commits: one per change.\n');
    git('git add -A');
    git('git commit -qm "chore: init"');
    git('git checkout -qb develop');
    git('git remote add origin ../upstream');
    git('git push -q -u origin develop');
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  /**
   * The scenario from the report: a long subject merged upstream by someone
   * else, a local `develop` that has not been pulled, and a branch cut from
   * `origin/develop` — so the foreign commit lands inside `develop..HEAD`.
   */
  const staleBaselineScenario = (): void => {
    git('git checkout -qB upstreamwork origin/develop');
    write('theirs.txt', 'x');
    git('git add -A');
    git(
      'git commit -qm "docs(adr): ADR-0010 - email not phone, the third choice of the three that we considered"'
    );
    git('git push -q origin upstreamwork:develop');
    git('git fetch -q origin');
    git('git checkout -qB feature/mine origin/develop');
    write('mine.txt', 'y');
    git('git add -A');
    git('git commit -qm "docs: my own short subject"');
  };

  it('names the baseline, its drift, and the next command', () => {
    staleBaselineScenario();

    const result = CommitMessageStandardsLaw.check({
      projectRoot: repo,
      config: withBaseline('develop'),
    });

    expect((result.violations ?? []).length).toBeGreaterThan(0);
    const scope = (result.suggestions ?? [])[0] ?? '';
    expect(scope).toMatch(/develop\.\.HEAD/);
    expect(scope).toMatch(/behind origin\/develop/);
    expect(scope).toMatch(/git pull/);
  });

  it('puts the scope first, where the confusion is', () => {
    staleBaselineScenario();

    const result = CommitMessageStandardsLaw.check({
      projectRoot: repo,
      config: withBaseline('develop'),
    });

    expect((result.suggestions ?? [])[0]).toMatch(/^Scope:/);
  });

  /**
   * A passing law says nothing: suggestions are surfaced only when there are
   * violations, so the note cannot become noise on a clean run.
   */
  it('says nothing when the law has nothing to report', () => {
    git('git checkout -qb feature/quiet');
    write('mine.txt', 'y');
    git('git add -A');
    git('git commit -qm "docs: a short subject"');

    const result = CommitMessageStandardsLaw.check({
      projectRoot: repo,
      config: withBaseline('develop'),
    });

    expect(result.violations ?? []).toEqual([]);
    expect(result.suggestions ?? []).toEqual([]);
  });

  it('still names the scope when the baseline is current', () => {
    git('git checkout -qB feature/mine origin/develop');
    write('mine.txt', 'y');
    git('git add -A');
    git(
      'git commit -qm "docs: a subject that is quite deliberately far too long to fit inside the seventy-two character limit"'
    );

    const result = CommitMessageStandardsLaw.check({
      projectRoot: repo,
      config: withBaseline('develop'),
    });

    const scope = (result.suggestions ?? [])[0] ?? '';
    expect(scope).toMatch(/develop\.\.HEAD/);
    // No drift, so no pull advice — but still a statement of what was measured.
    expect(scope).not.toMatch(/git pull/);
    expect(scope).toMatch(/baseline needs updating/);
  });

  it('names the window when no baseline is configured', () => {
    git('git checkout -qb feature/mine');
    write('mine.txt', 'y');
    git('git add -A');
    git(
      'git commit -qm "docs: a subject that is quite deliberately far too long to fit inside the seventy-two character limit"'
    );

    const result = CommitMessageStandardsLaw.check({
      projectRoot: repo,
      config: withBaseline(),
    });

    const scope = (result.suggestions ?? [])[0] ?? '';
    expect(scope).toMatch(/the last 10 commits/);
    expect(scope).toMatch(/thresholds\.git\.\*\.baseline/);
  });

  /** All three laws that read history, not just the one that was reported. */
  it('reports the scope from the description law too', () => {
    git('git checkout -qB feature/mine origin/develop');
    write('mine.txt', 'y');
    git('git add -A');
    git(
      'git commit -qm "docs: short subject" -m "a body line that runs well past the seventy-two character limit set for bodies"'
    );

    const result = CommitDescriptionStandardsLaw.check({
      projectRoot: repo,
      config: withBaseline('develop'),
    });

    expect((result.violations ?? []).length).toBeGreaterThan(0);
    expect((result.suggestions ?? [])[0]).toMatch(/^Scope:/);
  });

  it('reports the scope from the size law too', () => {
    git('git checkout -qB feature/mine origin/develop');
    write(
      'big.ts',
      Array.from({ length: 600 }, (_, i) => `export const v${i} = ${i};`).join(
        '\n'
      )
    );
    git('git add -A');
    git('git commit -qm "feat: a change that wanted splitting"');

    const result = CommitSizeControlLaw.check({
      projectRoot: repo,
      config: withBaseline('develop'),
    });

    const scope = (result.suggestions ?? []).find(s => s.startsWith('Scope:'));
    expect(scope).toMatch(/develop\.\.HEAD/);
  });
});

/**
 * #637: Merge Conflict Prevention read every failure of `git grep` as "no
 * conflict markers". Exit 1 is git grep's "no match"; anything else (a
 * broken index, a `.git` that is not a repository, no git) is not an answer.
 * Real temporary repositories, no mocks.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from '../../src/utils/child-process';
import { MergeConflictPreventionLaw } from '../../src/checkers/git-laws/merge-conflict-prevention';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const CONFLICT = 'a\n<<<<<<< HEAD\n1\n=======\n2\n>>>>>>> other\n';

function repository(files: Record<string, string>): string {
  const dir = project({ 'package.json': '{"name":"x"}', ...files });
  const git = (...args: string[]): void => {
    execFileSync(
      'git',
      ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', ...args],
      { cwd: dir, stdio: 'pipe' }
    );
  };
  git('init', '-q');
  git('add', '-A');
  git('commit', '-qm', 'init');
  return dir;
}

const markerFinding = (violations: string[] | undefined): boolean =>
  (violations ?? []).some(v => v.includes('unresolved conflict markers'));

describe('#637 a git grep that does not answer is not "no conflict markers"', () => {
  it('control: a clean repository has no marker finding and nothing unread', () => {
    const result = MergeConflictPreventionLaw.check(
      ctx(repository({ 'src/a.txt': 'clean\n' }))
    );
    expect(markerFinding(result.violations)).toBe(false);
    expect(result.notRead).toBeUndefined();
  });

  it('control: tracked conflict markers are reported', () => {
    const result = MergeConflictPreventionLaw.check(
      ctx(repository({ 'src/a.txt': CONFLICT }))
    );
    expect(markerFinding(result.violations)).toBe(true);
    expect(result.notRead).toBeUndefined();
    // The file behind the count stays named (#43).
    expect(result.violationDetails).toEqual(
      expect.arrayContaining([expect.objectContaining({ file: 'src/a.txt' })])
    );
  });

  it('a broken index: the markers were not read, and the law does not pass', () => {
    const dir = repository({ 'src/a.txt': CONFLICT });
    fs.writeFileSync(path.join(dir, '.git', 'index'), 'garbage');
    const result = MergeConflictPreventionLaw.check(ctx(dir));
    expect(result.passed).toBe(false);
    expect(result.notRead).toEqual([
      expect.stringMatching(
        /^conflict markers were NOT read: git grep did not answer \(.+\)$/
      ),
    ]);
  });

  it('a .git directory that is not a repository: not read, not passed', () => {
    const dir = project({
      'package.json': '{"name":"x"}',
      'src/a.txt': CONFLICT,
    });
    fs.mkdirSync(path.join(dir, '.git'));
    const result = MergeConflictPreventionLaw.check(ctx(dir));
    expect(result.passed).toBe(false);
    expect(result.notRead).toEqual([
      expect.stringContaining('conflict markers were NOT read'),
    ]);
  });
});

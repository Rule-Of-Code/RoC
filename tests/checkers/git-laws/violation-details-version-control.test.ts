import { CommitSizeControlLaw } from '../../../src/checkers/git-laws/commit-size-control';
import { MergeConflictPreventionLaw } from '../../../src/checkers/git-laws/merge-conflict-prevention';
import { ReleaseTagStandardsLaw } from '../../../src/checkers/git-laws/release-tag-standards';
import type { LawResult } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils';
import { execSync } from '../../../src/utils/child-process';
import { project, writeFiles } from '../toolkit-fixture';

/**
 * #43 — a version-control law said how many ("1 of the last 3 authored commits
 * exceed the size limit", "conflict markers in 2 files", "Invalid tag formats
 * found: <the first three>") and never which. Each law already held the list
 * it counted; the details now carry it. The violation lines stay as they were.
 */
describe('#43 version-control laws name what they counted', () => {
  const config = FileUtils.getMinimalDefaultConfig();
  let root: string;
  const git = (command: string): string =>
    execSync(command, { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim();
  const commitAll = (message: string): void => {
    git('git add -A');
    git(`git commit -qm "${message}"`);
  };
  const lines = (count: number, salt: string): string =>
    Array.from(
      { length: count },
      (_, i) => `export const ${salt}${i} = ${i};`
    ).join('\n');
  const run = (law: { check: typeof CommitSizeControlLaw.check }): LawResult =>
    law.check({ projectRoot: root, config });

  beforeEach(() => {
    root = project({
      'CONTRIBUTING.md':
        '# Contributing\n\nAtomic commits. Resolve every merge conflict with a rebase.\n',
      'CHANGELOG.md': '# Changelog\n',
    });
    git('git init -q -b main .');
    git('git config user.email t@example.com');
    git('git config user.name Test');
    git('git config commit.gpgsign false');
    commitAll('chore: init');
  });

  describe('Commit Size Control', () => {
    it('names each oversized commit by hash, with the size it measured', () => {
      writeFiles(root, { 'src/big.ts': lines(600, 'a') });
      commitAll('feat: one large change');
      const bigCommit = git('git rev-parse HEAD');
      writeFiles(root, { 'src/small.ts': 'export const small = 1;\n' });
      commitAll('feat: small');

      const result = run(CommitSizeControlLaw);

      expect(result.violations).toContain(
        '1 of the last 3 authored commits exceed the size limit (>10 files or >500 lines changed)'
      );
      expect(result.violationDetails).toEqual([
        {
          message: `commit ${bigCommit.slice(0, 12)}: 1 files, 600 lines changed (generated files not counted)`,
        },
      ]);
    });

    it('carries no details when no commit is oversized', () => {
      writeFiles(root, { 'src/small.ts': 'export const small = 1;\n' });
      commitAll('feat: small');

      expect(run(CommitSizeControlLaw).violationDetails).toBeUndefined();
    });
  });

  describe('Merge Conflict Prevention', () => {
    it('names the files with conflict markers and the files git holds unmerged', () => {
      writeFiles(root, {
        'docs/notes.md': '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> side\n',
        'src/shared.ts': 'export const value = 0;\n',
      });
      commitAll('chore: base');
      git('git checkout -q -b side');
      writeFiles(root, { 'src/shared.ts': 'export const value = 2;\n' });
      commitAll('feat: side value');
      git('git checkout -q main');
      writeFiles(root, { 'src/shared.ts': 'export const value = 1;\n' });
      commitAll('feat: main value');
      expect(() => git('git merge -q side')).toThrow();

      const result = run(MergeConflictPreventionLaw);

      expect(result.violations).toEqual(
        expect.arrayContaining([
          'Found unresolved conflict markers in 2 files',
          'Active merge conflicts in 1 files',
        ])
      );
      expect(result.violationDetails).toEqual([
        {
          file: 'docs/notes.md',
          message:
            'unresolved conflict marker (a line starting with <<<<<<< or >>>>>>>)',
        },
        {
          file: 'src/shared.ts',
          message:
            'unresolved conflict marker (a line starting with <<<<<<< or >>>>>>>)',
        },
        {
          file: 'src/shared.ts',
          message: 'unmerged in the index (git status UU)',
        },
      ]);
    });

    it('carries no details when nothing is in conflict', () => {
      expect(run(MergeConflictPreventionLaw).violationDetails).toBeUndefined();
    });
  });

  describe('Release Tag Standards', () => {
    it('names every invalid tag, where the line quotes the first three', () => {
      for (const tag of ['v1.0.0', 'v1.1', 'v2', 'v3.0', 'v4.0']) {
        git(`git tag ${tag}`);
      }

      const result = run(ReleaseTagStandardsLaw);

      const line = (result.violations ?? []).find(v =>
        v.startsWith('Invalid tag formats found: ')
      );
      expect(line?.split(': ')[1]?.split(', ')).toHaveLength(3);
      expect(result.violationDetails).toEqual(
        expect.arrayContaining(
          ['v1.1', 'v2', 'v3.0', 'v4.0'].map(tag => ({
            message: `tag ${tag} is not a semantic version tag`,
          }))
        )
      );
      expect(result.violationDetails).toHaveLength(4);
    });

    it('names the tags out of step with the prefix style of the rest', () => {
      for (const tag of ['v1.0.0', 'v1.1.0', 'v1.2.0', '2.0.0']) {
        git(`git tag ${tag}`);
      }

      const result = run(ReleaseTagStandardsLaw);

      expect(result.violations).toContain(
        'Inconsistent tag prefixing (mix of v-prefixed and non-prefixed)'
      );
      expect(result.violationDetails).toEqual([
        { message: 'tag 2.0.0 has no "v" prefix; 3 tag(s) have one' },
      ]);
    });

    it('names both styles when neither is the rest', () => {
      for (const tag of ['v1.0.0', '2.0.0']) git(`git tag ${tag}`);

      expect(run(ReleaseTagStandardsLaw).violationDetails).toEqual([
        { message: 'tag v1.0.0 has a "v" prefix; 1 tag(s) have none' },
        { message: 'tag 2.0.0 has no "v" prefix; 1 tag(s) have one' },
      ]);
    });

    it('carries no details when every tag is valid and in one style', () => {
      for (const tag of ['v1.0.0', 'v1.1.0']) git(`git tag ${tag}`);

      expect(run(ReleaseTagStandardsLaw).violationDetails).toBeUndefined();
    });
  });
});

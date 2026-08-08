/**
 * The hook executable bit comes from the git index, not the filesystem.
 *
 * NTFS carries no POSIX execute bit: `fs.stat().mode` is 0o666 for every file
 * on Windows and `chmod` is a no-op there. The old filesystem check therefore
 * reported every hook of every Windows project as non-executable — a violation
 * `chmod +x` could not fix — and it judged husky's support files (`.gitignore`,
 * `husky.sh`, `h`) as if git ran them.
 *
 * The index answers the same question identically on every platform, and only
 * for files a consumer can actually commit a mode for. Reported by a Windows
 * consumer whose build it blocked; the same consumer confirmed the law was right
 * about the real defect underneath — committed hooks at 100644 are not
 * executable when the repo is cloned on Linux.
 */
import { execSync } from 'child_process';
import { GitHookComplianceLaw } from '../../src/checkers/git-laws/git-hook-compliance';
import type { LawCheckContext } from '../../src/types/law.types';
import { FileUtils } from '../../src/utils/file-utils';
import {
  isGitHookName,
  trackedModesByBasename,
} from '../../src/utils/git/git-layout';
import { PathOperations } from '../../src/utils/path-operations';

describe('regression: hook exec bit is read from the git index', () => {
  let repo: string;

  const git = (cmd: string): string =>
    execSync(`git ${cmd}`, { cwd: repo, stdio: 'pipe' }).toString();

  const context = (): LawCheckContext =>
    ({
      projectRoot: repo,
      config: {
        project: { name: 't', root: '', componentPrefix: 'app', type: 'node' },
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
        performance: { parallel: false, maxConcurrent: 3, cache: true },
      },
    }) as unknown as LawCheckContext;

  /** A repo with committed husky hooks, plus husky's untracked `_` directory. */
  const write = (rel: string, body: string): void => {
    const full = PathOperations.join(repo, rel);
    FileUtils.createDirectory(PathOperations.getParent(full));
    FileUtils.writeFile(full, body);
  };

  beforeEach(() => {
    repo = FileUtils.createTempDirectory('roc-hook-mode-');
    git('init -q');
    git('config user.email "t@example.dev"');
    git('config user.name "T"');
    git('config commit.gpgsign false');

    write('package.json', JSON.stringify({ name: 't', devDependencies: { husky: '^9' } }));
    for (const hook of ['pre-commit', 'pre-push', 'commit-msg']) {
      write(`.husky/${hook}`, '#!/bin/sh\nnpx ruleofcode audit\n');
    }
    // husky's generated directory: untracked by its own `*` .gitignore, and the
    // support files it keeps alongside the shims.
    write('.husky/_/.gitignore', '*\n');
    write('.husky/_/husky.sh', '# husky internals\n');
    write('.husky/_/h', '# husky internals\n');
    write('.husky/_/pre-commit', '#!/bin/sh\n. "$(dirname "$0")/h"\n');

    git('add -A');
    git('commit -q -m "chore: add hooks"');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(repo);
  });

  it('the fixture matches the real world: `_` is untracked, hooks are tracked', () => {
    expect(trackedModesByBasename(repo, PathOperations.join(repo, '.husky/_')).size).toBe(0);
    const tracked = trackedModesByBasename(repo, PathOperations.join(repo, '.husky'));
    expect([...tracked.keys()].sort()).toEqual(['commit-msg', 'pre-commit', 'pre-push']);
  });

  it('RED: committed hooks at 100644 are reported', () => {
    // git defaults to 100644 for a file written without an exec bit — which on
    // Windows is every file.
    const result = GitHookComplianceLaw.check(context());

    const flagged = (result.violations ?? []).find(v =>
      /executable bit/i.test(v)
    );
    expect(flagged).toBeDefined();
    expect(flagged).toContain('pre-commit');
  });

  it('GREEN: the same hooks at 100755 are not reported', () => {
    git('update-index --chmod=+x .husky/pre-commit .husky/pre-push .husky/commit-msg');

    const result = GitHookComplianceLaw.check(context());

    expect(
      (result.violations ?? []).some(v => /executable bit/i.test(v))
    ).toBe(false);
  });

  it('never reports husky support files as hooks', () => {
    const result = GitHookComplianceLaw.check(context());

    // Parse the reported names rather than substring-matching the sentence:
    // "h" is a letter that occurs in "Hooks", "the" and "without", so a
    // substring assertion here proves nothing.
    const reported = (result.violations ?? [])
      .filter(v => /executable bit/i.test(v))
      .flatMap(v => (v.split(':')[1] ?? '').split(',').map(s => s.trim()))
      .filter(Boolean);

    expect(reported.length).toBeGreaterThan(0); // the fixture is 100644
    for (const name of reported) {
      expect(isGitHookName(name)).toBe(true);
    }
    expect(isGitHookName('husky.sh')).toBe(false);
    expect(isGitHookName('.gitignore')).toBe(false);
    expect(isGitHookName('h')).toBe(false);
    expect(isGitHookName('pre-commit')).toBe(true);
  });

  it('says nothing about untracked hooks — no mode exists to judge', () => {
    // Everything under `_` is generated at install time and ignored wholesale.
    // A consumer cannot commit a mode for it, so a violation would be
    // unactionable — the exact failure this regression exists to prevent.
    git('update-index --chmod=+x .husky/pre-commit .husky/pre-push .husky/commit-msg');

    const result = GitHookComplianceLaw.check(context());

    expect(
      (result.violations ?? []).some(v => /executable bit/i.test(v))
    ).toBe(false);
  });
});
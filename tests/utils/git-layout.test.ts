/**
 * Git layout resolution — regression for linked worktrees.
 *
 * In a linked worktree (`git worktree add`) `<root>/.git` is a FILE holding
 * `gitdir: …`, and the shared config and hooks live in the MAIN repository's
 * git directory. Detectors that joined `.git/hooks` / `.git/config` onto the
 * project root reported "no hooks" and "unable to read Git configuration" for
 * a worktree whose hooks had just blocked a push.
 */
import { execSync } from 'child_process';
import { GitHooksStandardsLaw } from '../../src/checkers/version-control-laws/git-hooks-standards';
import { VersionControlLawBase } from '../../src/checkers/version-control-laws/version-control-law-base';
import type { LawCheckContext } from '../../src/types/law.types';
import { FileUtils } from '../../src/utils/file-utils';
import {
  resolveGitCommonDir,
  resolveGitConfigPath,
  resolveGitHooksDir,
} from '../../src/utils/git/git-layout';
import { PathOperations } from '../../src/utils/path-operations';

describe('utils/git/git-layout — linked worktrees', () => {
  let mainRepo: string;
  let worktree: string;

  const git = (cmd: string, cwd: string): string =>
    execSync(`git ${cmd}`, { cwd, stdio: 'pipe' }).toString();

  beforeEach(() => {
    mainRepo = FileUtils.createTempDirectory('roc-git-layout-main-');
    git('init -q', mainRepo);
    git('config user.email "t@example.dev"', mainRepo);
    git('config user.name "T"', mainRepo);
    git('config commit.gpgsign false', mainRepo);
    FileUtils.writeFile(PathOperations.join(mainRepo, 'a.txt'), 'a');
    git('add -A', mainRepo);
    git('commit -q -m "chore: first"', mainRepo);

    worktree = `${mainRepo}-wt`;
    git(`worktree add -q "${worktree}" -b feature/probe`, mainRepo);
  });

  afterEach(() => {
    try {
      git(`worktree remove "${worktree}" --force`, mainRepo);
    } catch {
      /* the temp dir removal below is enough */
    }
    FileUtils.deleteDirectory(worktree);
    FileUtils.deleteDirectory(mainRepo);
  });

  it('the fixture really is a linked worktree (.git is a pointer FILE)', () => {
    const dotGit = PathOperations.join(worktree, '.git');
    expect(FileUtils.exists(dotGit)).toBe(true);
    expect(FileUtils.readFile(dotGit)).toMatch(/^gitdir:/);
    // The naive path every detector used to build simply is not there.
    expect(
      FileUtils.exists(PathOperations.join(worktree, '.git', 'hooks'))
    ).toBe(false);
  });

  it('resolves the common git dir to the MAIN repository', () => {
    const fromWorktree = resolveGitCommonDir(worktree);
    const fromMain = resolveGitCommonDir(mainRepo);

    expect(fromWorktree).not.toBeNull();
    expect(FileUtils.exists(fromWorktree as string)).toBe(true);
    // Same repository seen from either side.
    expect(PathOperations.normalize(fromWorktree as string)).toBe(
      PathOperations.normalize(fromMain as string)
    );
  });

  it('resolves hooks and config to paths that exist from the worktree', () => {
    const hooks = resolveGitHooksDir(worktree);
    const config = resolveGitConfigPath(worktree);

    expect(hooks).not.toBeNull();
    expect(FileUtils.exists(hooks as string)).toBe(true);
    expect(config).not.toBeNull();
    expect(FileUtils.exists(config as string)).toBe(true);
  });

  it('honours core.hooksPath over the default hooks directory', () => {
    // git resolves a RELATIVE core.hooksPath against the top level of the
    // working tree — which for a linked worktree is the worktree itself, not
    // the main repository. Resolving it anywhere else would point at hooks git
    // never runs.
    const custom = PathOperations.join(worktree, '.husky');
    FileUtils.createDirectory(custom);
    git('config core.hooksPath .husky', worktree);

    expect(PathOperations.normalize(resolveGitHooksDir(worktree) as string)).toBe(
      PathOperations.normalize(custom)
    );
  });

  it('reads the git config from inside a worktree', () => {
    // Used to return null there, which the Branch Protection law reported as
    // "Unable to read Git configuration".
    expect(VersionControlLawBase.getGitConfig(worktree)).not.toBeNull();
  });

  it('Git Hooks Standards does not claim the hooks are missing', () => {
    const context = {
      projectRoot: worktree,
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
    } as unknown as LawCheckContext;

    const result = GitHooksStandardsLaw.check(context);

    expect(result.violations ?? []).not.toContain('Git hooks directory missing');
  });
});

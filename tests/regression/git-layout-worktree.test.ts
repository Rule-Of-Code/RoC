import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { GitHistoryIntegrityLaw } from '../../src/checkers/git-laws/git-history-integrity';
import { PrePrQualityGatesLaw } from '../../src/laws/deployment/pre-pr-quality-gates';
import {
  resolveGitCommonDir,
  resolveGitDir,
  resolveGitHooksDir,
  resolveRemoteUrls,
} from '../../src/utils/git/git-layout';
import { FileUtils } from '../../src/utils';

/**
 * `<root>/.git` is a directory only in a primary checkout. In a linked worktree
 * it is a FILE holding `gitdir: …`, and `core.hooksPath` moves the hooks
 * wherever the project says — husky points it at `.husky`.
 *
 * A law that joins `.git/config` or `.git/hooks` onto the project root
 * therefore answers for one layout and misreads every other. The failure is
 * worse than a wrong finding: the same commit in the same repository gets one
 * verdict from the primary checkout and another from a worktree, and neither
 * reads as an environment problem to the person looking at it.
 */
describe('git layout is resolved through git, not assumed from paths', () => {
  let base: string;
  let primary: string;
  let worktree: string;

  const git = (command: string, cwd: string): string =>
    execSync(command, { cwd, encoding: 'utf8', stdio: 'pipe' });

  beforeAll(() => {
    base = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-wt-'));
    primary = path.join(base, 'primary');
    worktree = path.join(base, 'linked');

    fs.mkdirSync(primary);
    git('git init -q .', primary);
    git('git config user.email t@example.com', primary);
    git('git config user.name Test', primary);
    git(
      'git remote add origin https://bitbucket.org/example/example.git',
      primary
    );
    fs.mkdirSync(path.join(primary, '.github', 'workflows'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(primary, '.github', 'workflows', 'ci.yml'),
      'name: ci\njobs:\n  build:\n    steps:\n      - run: npm test\n'
    );
    fs.writeFileSync(
      path.join(primary, 'package.json'),
      '{"name":"p","version":"1.0.0"}'
    );
    git('git add -A', primary);
    git('git commit -qm init', primary);
    git(`git worktree add -q "${worktree}" -b feature/x`, primary);
  });

  afterAll(() => {
    fs.rmSync(base, { recursive: true, force: true });
  });

  it('the fixture is a real worktree — .git is a file, not a directory', () => {
    expect(fs.statSync(path.join(primary, '.git')).isDirectory()).toBe(true);
    expect(fs.statSync(path.join(worktree, '.git')).isFile()).toBe(true);
  });

  it('resolves the same COMMON git directory from both', () => {
    expect(resolveGitCommonDir(worktree)).toBe(resolveGitCommonDir(primary));
  });

  /**
   * Config and hooks are shared between worktrees; an operation in progress is
   * not. Asking the common directory about a rebase would report the main
   * checkout's state while judging this one.
   */
  it('resolves a DIFFERENT per-worktree git directory', () => {
    expect(resolveGitDir(worktree)).not.toBe(resolveGitDir(primary));
  });

  it('finds the remote from a worktree, where reading .git/config cannot', () => {
    expect(resolveRemoteUrls(worktree)).toEqual(resolveRemoteUrls(primary));
    expect(resolveRemoteUrls(worktree).join(' ')).toContain('bitbucket.org');
  });

  /**
   * The point of the report: a gate must not change its verdict because of the
   * directory it was run from. Worktrees are how concurrent work avoids sharing
   * one tree, so penalising them penalises the safer setup.
   */
  it('pre-pr-quality-gates scores a worktree exactly as its primary checkout', async () => {
    const config = FileUtils.getMinimalDefaultConfig();

    const inPrimary = await PrePrQualityGatesLaw.check({
      projectRoot: primary,
      config,
    });
    const inWorktree = await PrePrQualityGatesLaw.check({
      projectRoot: worktree,
      config,
    });

    expect(inWorktree.score).toBe(inPrimary.score);
    expect(inWorktree.passed).toBe(inPrimary.passed);
  });
});

/**
 * The same assumption, one law over: the force-push guard was looked for in
 * `<root>/.git/hooks/pre-push`. husky moves hooks to `.husky` via
 * `core.hooksPath`, so that path is empty in most projects that HAVE a guard —
 * in a primary checkout, with no worktree involved. This drives a violation,
 * so the law accused a repository of having no force-push protection while its
 * hook sat there working.
 */
describe('a hook is looked for where git will run it', () => {
  let root: string;
  const git = (command: string): string =>
    execSync(command, { cwd: root, encoding: 'utf8', stdio: 'pipe' });

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-husky-'));
    fs.writeFileSync(
      path.join(root, 'package.json'),
      '{"name":"h","version":"1.0.0"}'
    );
    git('git init -q .');
    git('git config user.email t@example.com');
    git('git config user.name Test');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const withHuskyGuard = (): void => {
    git('git config core.hooksPath .husky');
    fs.mkdirSync(path.join(root, '.husky'), { recursive: true });
    fs.writeFileSync(
      path.join(root, '.husky', 'pre-push'),
      '#!/bin/sh\ncase "$*" in *--force*) exit 1;; esac\n'
    );
  };

  it('resolves the hooks directory core.hooksPath names', () => {
    withHuskyGuard();

    expect(resolveGitHooksDir(root)).toContain('.husky');
  });

  it('accepts a force-push guard that lives where husky puts it', async () => {
    withHuskyGuard();

    const result = await GitHistoryIntegrityLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
    });

    expect(
      (result.violations ?? []).filter(v => /force-push protection/.test(v))
    ).toEqual([]);
  });

  // The red control: a repository with neither a guard nor a declared policy
  // is still reported. Finding the hook must not become finding anything.
  it('still reports a repository with no guard and no policy', async () => {
    const result = await GitHistoryIntegrityLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
    });

    expect(
      (result.violations ?? []).some(v => /force-push protection/.test(v))
    ).toBe(true);
  });

  // A hook that exists but guards nothing is not a guard.
  it('still reports a pre-push hook that says nothing about force', async () => {
    git('git config core.hooksPath .husky');
    fs.mkdirSync(path.join(root, '.husky'), { recursive: true });
    fs.writeFileSync(
      path.join(root, '.husky', 'pre-push'),
      '#!/bin/sh\nnpm test\n'
    );

    const result = await GitHistoryIntegrityLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
    });

    expect(
      (result.violations ?? []).some(v => /force-push protection/.test(v))
    ).toBe(true);
  });
});

/**
 * #380: a hook is active when git runs it in this checkout, not when
 * `.husky/<hook>` is committed.
 *
 * With `core.hooksPath` unset and husky's `_` directory absent no hook can run,
 * yet both hook laws read the committed file and passed. Git runs hooks from
 * `core.hooksPath` when set, else `<common git dir>/hooks`; that is now asked
 * of git. A CI clone has no hooks installed by design: there the verdict rests
 * on the committed configuration and says so, instead of failing every build.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { GitHookComplianceLaw } from '../../src/checkers/git-laws/git-hook-compliance';
import { GitHooksStandardsLaw } from '../../src/checkers/version-control-laws/git-hooks-standards';
import type { LawResult } from '../../src/types/law.types';
import { FileUtils } from '../../src/utils';
import { execFileSync } from '../../src/utils/child-process';
import { resolveGitHooksDir } from '../../src/utils/git/git-layout';
import { resolveGitHookStatus } from '../../src/utils/git-hook-status';

const HUSKY_PACKAGE = path.resolve(
  __dirname,
  '..',
  '..',
  'node_modules',
  'husky'
);
const HOOKS = ['pre-commit', 'pre-push', 'commit-msg'];
const IDENTITY = ['-c', 'user.name=t', '-c', 'user.email=t@example.com'];

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', [...IDENTITY, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  }).trim();

const dirs: string[] = [];
/** A repository with the three hooks committed under .husky/ and husky present locally. */
function committedHooks(): string {
  const dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'roc-hook-installed-'))
  );
  dirs.push(dir);
  git(dir, 'init', '-q');
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'h',
      version: '1.0.0',
      devDependencies: { husky: '^9.1.7' },
      scripts: { prepare: 'husky' },
    })
  );
  fs.mkdirSync(path.join(dir, '.husky'));
  for (const hook of HOOKS)
    fs.writeFileSync(
      path.join(dir, '.husky', hook),
      '#!/bin/sh\nnpx ruleofcode audit\n'
    );
  fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'chore: hooks');
  fs.cpSync(HUSKY_PACKAGE, path.join(dir, 'node_modules', 'husky'), {
    recursive: true,
  });
  return dir;
}
const runHusky = (dir: string): void => {
  execFileSync(
    process.execPath,
    [path.join(dir, 'node_modules', 'husky', 'bin.js')],
    { cwd: dir, stdio: 'ignore' }
  );
};

const judge = (dir: string): LawResult[] => {
  const context = {
    projectRoot: dir,
    config: FileUtils.getMinimalDefaultConfig(),
  };
  return [
    GitHookComplianceLaw.check(context),
    GitHooksStandardsLaw.check(context),
  ];
};
const notInstalled = (result: LawResult): string | undefined =>
  (result.violations ?? []).find(v =>
    v.includes('not installed in this checkout')
  );

describe('#380 a committed hook is active only when git runs it', () => {
  const saved = { CI: process.env.CI, HUSKY: process.env.HUSKY };
  beforeEach(() => {
    delete process.env.CI; // GitHub Actions sets it; these cases are a developer checkout
    delete process.env.HUSKY;
  });
  afterAll(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('RED before #380: committed .husky/<hook> with core.hooksPath unset is not active', () => {
    const dir = committedHooks();
    const hooksDir = resolveGitHooksDir(dir) as string;

    for (const hook of HOOKS)
      expect(resolveGitHookStatus(dir, hooksDir, hook)).toBe('not-installed');
    for (const result of judge(dir)) {
      expect(result.passed).toBe(false);
      expect(notInstalled(result)).toMatch(
        /core\.hooksPath is unset.*npx husky/
      );
      expect(result.metrics?.checked).toBe('installed-in-this-checkout');
    }
  });

  it('GREEN: after `npx husky` (core.hooksPath = .husky/_) the same hooks are active', () => {
    const dir = committedHooks();
    runHusky(dir);
    expect(git(dir, 'config', '--get', 'core.hooksPath')).toBe('.husky/_');
    const hooksDir = resolveGitHooksDir(dir) as string;

    for (const hook of HOOKS)
      expect(resolveGitHookStatus(dir, hooksDir, hook)).toBe('active');
    for (const result of judge(dir)) {
      expect(notInstalled(result)).toBeUndefined();
      expect(result.metrics?.hooks).toEqual(
        expect.objectContaining({ 'pre-commit': 'active' })
      );
    }
  });

  it("husky 9's runner without the user script runs nothing: not active", () => {
    const dir = committedHooks();
    runHusky(dir);
    fs.rmSync(path.join(dir, '.husky', 'pre-push'));

    expect(
      resolveGitHookStatus(dir, resolveGitHooksDir(dir) as string, 'pre-push')
    ).toBe('missing');
    expect(
      resolveGitHookStatus(dir, resolveGitHooksDir(dir) as string, 'pre-commit')
    ).toBe('active');
  });

  it('reads core.hooksPath through git from a linked worktree', () => {
    const dir = committedHooks();
    runHusky(dir);
    const worktree = path.join(path.dirname(dir), `${path.basename(dir)}-wt`);
    dirs.push(worktree);
    git(dir, 'worktree', 'add', '-q', '-b', 'feature/wt', worktree);
    fs.cpSync(
      path.join(dir, '.husky', '_'),
      path.join(worktree, '.husky', '_'),
      { recursive: true }
    );

    const hooksDir = resolveGitHooksDir(worktree) as string;
    expect(fs.realpathSync(hooksDir)).toBe(
      fs.realpathSync(path.join(worktree, '.husky', '_'))
    );
    expect(resolveGitHookStatus(worktree, hooksDir, 'pre-commit')).toBe(
      'active'
    );
  });

  it.each([
    ['CI=true', { CI: 'true' }],
    ['HUSKY=0', { HUSKY: '0' }],
  ])(
    'a CI checkout (%s): committed but not installed is not a failure, and the verdict says what it checked',
    (_label, env) => {
      Object.assign(process.env, env);
      const dir = committedHooks();
      const hooksDir = resolveGitHooksDir(dir) as string;

      expect(resolveGitHookStatus(dir, hooksDir, 'pre-commit')).toBe(
        'ci-not-installed'
      );
      for (const result of judge(dir)) {
        expect(notInstalled(result)).toBeUndefined();
        expect(result.metrics?.checked).toBe('committed-configuration-only');
        expect(result.message).toMatch(
          /not installed in this CI checkout .*installation not checked/
        );
      }
    }
  );
});

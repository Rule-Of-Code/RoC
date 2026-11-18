/**
 * #372: a RoC process that inherits GIT_DIR (git exports it to every hook; in
 * a linked worktree it names `<main>/.git/worktrees/<name>`) must still ask
 * about, and write to, the repository it was pointed at.
 *
 * Probe, temporary repositories only:
 * - F: another repository, 4 large commits, tag v9.9.9, linked worktree F-wt
 *   on branch `wt-branch`.
 * - T: the target, one commit on `feature/probe-own`, package.json 1.0.0, no
 *   tags.
 * The inherited variable is GIT_DIR = F's worktree git dir. Before the shared
 * child environment, four laws judged F's branch, commits and tag instead of
 * T's, and `init` wrote `core.hooksPath` into F's shared config while T got
 * none.
 *
 * The variable is set in the REAL environment of a child node process that
 * runs the code under test (ts-node, transpile-only): Jest gives each test
 * file a copy of process.env, and a spawn without an explicit `env` inherits
 * the real one, so setting process.env in-process would never reach the code
 * that forgot to clean it. This file is the one test allowed to import
 * `child_process` directly: those children must inherit the variable.
 */
import * as nodeChildProcess from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { execFileSync } from '../../src/utils/child-process';

const IDENTITY = [
  '-c',
  'user.name=probe',
  '-c',
  'user.email=probe@example.com',
];
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const HUSKY_PACKAGE = path.join(REPO_ROOT, 'node_modules', 'husky');

/**
 * Run `script` (CommonJS, paths relative to the repository root) in a child
 * node process whose real environment carries `vars`; its last stdout line
 * is parsed as JSON.
 */
function runChild(script: string, vars: Record<string, string> = {}): string {
  return nodeChildProcess.execFileSync(
    process.execPath,
    ['-r', 'ts-node/register/transpile-only', '-e', script],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...vars },
    }
  );
}

/** {@link runChild}, with its last stdout line parsed as JSON. */
function inChild<T>(script: string, vars: Record<string, string> = {}): T {
  const lines = runChild(script, vars).trim().split(/\r?\n/);
  return JSON.parse(lines[lines.length - 1] ?? 'null') as T;
}

/** `init --quick` (setupQuickMode) on `dir` in a child; its stdout and outcome. */
function initInChild(
  dir: string,
  vars: Record<string, string>
): { stdout: string; error: string | null } {
  const stdout = runChild(
    `require('./src/cli/init-helpers').setupQuickMode(${JSON.stringify(dir)}, {}).then(
      () => console.log(JSON.stringify(null)),
      error => console.log(JSON.stringify(error.message)))`,
    vars
  );
  const lines = stdout.trim().split(/\r?\n/);
  return {
    stdout,
    error: JSON.parse(lines[lines.length - 1] ?? 'null') as string | null,
  };
}

/** The four laws that read F instead of T, judged in a child. */
function judgeTarget(
  vars: Record<string, string> = {}
): Record<string, { passed: boolean; violations: string[] }> {
  const script = `
    const { FileUtils } = require('./src/utils');
    const laws = {
      'Branch Governance': require('./src/checkers/git-laws/branch-governance').BranchGovernanceLaw,
      'Feature Branch Protection': require('./src/checkers/git-laws/feature-branch-protection').FeatureBranchProtectionLaw,
      'Commit Size Control': require('./src/checkers/git-laws/commit-size-control').CommitSizeControlLaw,
      'Semantic Versioning': require('./src/checkers/git-laws/semver-compliance').SemVerComplianceLaw,
    };
    (async () => {
      const context = { projectRoot: ${JSON.stringify(target)}, config: FileUtils.getMinimalDefaultConfig() };
      const out = {};
      for (const [name, law] of Object.entries(laws)) {
        const r = await law.check(context);
        out[name] = { passed: r.passed, violations: r.violations || [] };
      }
      console.log(JSON.stringify(out));
    })();`;
  return inChild(script, vars);
}

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', [...IDENTITY, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  }).trim();

let base: string;
let other: string; // F
let otherWorktreeGitDir: string; // F/.git/worktrees/F-wt
let target: string; // T

const bytes = (file: string): Buffer => fs.readFileSync(file);

/** A fresh repository with package.json and the husky package present locally. */
function huskyProject(name: string): string {
  const dir = path.join(base, name);
  fs.mkdirSync(dir);
  git(dir, 'init', '-q');
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(
      { name, version: '1.0.0', devDependencies: { husky: '^9.0.0' } },
      null,
      2
    )
  );
  fs.cpSync(HUSKY_PACKAGE, path.join(dir, 'node_modules', 'husky'), {
    recursive: true,
  });
  return dir;
}

beforeAll(() => {
  base = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'roc-inherited-git-'))
  );
  other = path.join(base, 'F');
  fs.mkdirSync(other);
  git(other, 'init', '-q');
  git(other, 'checkout', '-q', '-b', 'master');
  for (let i = 0; i < 4; i++) {
    const big = Array.from({ length: 1500 }, (_, n) => `line ${i}-${n}`).join(
      '\n'
    );
    fs.writeFileSync(path.join(other, `big-${i}.txt`), big);
    git(other, 'add', '-A');
    git(other, 'commit', '-qm', `chore: big change ${i}`);
  }
  git(other, 'tag', 'v9.9.9');
  git(
    other,
    'worktree',
    'add',
    '-q',
    '-b',
    'wt-branch',
    path.join(base, 'F-wt')
  );
  otherWorktreeGitDir = path.join(other, '.git', 'worktrees', 'F-wt');

  target = path.join(base, 'T');
  fs.mkdirSync(target);
  git(target, 'init', '-q');
  git(target, 'checkout', '-q', '-b', 'feature/probe-own');
  fs.writeFileSync(
    path.join(target, 'package.json'),
    JSON.stringify({ name: 't', version: '1.0.0' })
  );
  git(target, 'add', '-A');
  git(target, 'commit', '-qm', 'feat: probe');
});

afterAll(() => {
  fs.rmSync(base, { recursive: true, force: true });
});

describe('#372 an inherited GIT_DIR', () => {
  it('really redirects a child that inherits it (the probe is live)', () => {
    const branch = nodeChildProcess
      .execFileSync('git', ['branch', '--show-current'], {
        cwd: target,
        encoding: 'utf8',
        env: { ...process.env, GIT_DIR: otherWorktreeGitDir },
      })
      .trim();
    expect(branch).toBe('wt-branch');
  });

  it('does not change any of the four git-reading verdicts on the target', () => {
    const clean = judgeTarget();
    const withGitDir = judgeTarget({ GIT_DIR: otherWorktreeGitDir });

    expect(Object.keys(clean)).toHaveLength(4);
    expect(withGitDir).toEqual(clean);
    // The other repository's branch, commits and tag never reach a verdict.
    const text = Object.values(withGitDir)
      .flatMap(r => r.violations)
      .join('\n');
    expect(text).not.toMatch(/wt-branch|9\.9\.9|exceed the size limit/);
  });

  it("leaves the other repository's config and index untouched when fixtures run git", () => {
    const config = path.join(other, '.git', 'config');
    const index = path.join(otherWorktreeGitDir, 'index');
    const before = { config: bytes(config), index: bytes(index) };

    const roots = inChild<string[]>(
      `
      const { repo, gitIn } = require('./tests/utils/git-fixture');
      const { gitProject } = require('./tests/checkers/integrity-laws/integrity-fixture');
      const a = repo({ 'a.txt': 'a' }, ['a.txt']);
      gitIn(a, ...${JSON.stringify(IDENTITY)}, 'commit', '-qm', 'fixture');
      const b = gitProject({ 'b.txt': 'b' });
      console.log(JSON.stringify([a, b]));`,
      { GIT_DIR: otherWorktreeGitDir, GIT_INDEX_FILE: index }
    );

    expect(bytes(config).equals(before.config)).toBe(true);
    expect(bytes(index).equals(before.index)).toBe(true);
    for (const root of roots) {
      expect(fs.existsSync(path.join(root, '.git', 'index'))).toBe(true);
    }
  });
});

describe('#372 init with an inherited GIT_DIR', () => {
  it('husky writes core.hooksPath into whatever repository the inherited variable names', () => {
    // The write path itself, without RoC: this is what `init` started.
    const config = path.join(other, '.git', 'config');
    const before = bytes(config);
    const dir = huskyProject('raw-husky');
    try {
      nodeChildProcess.execFileSync(
        process.execPath,
        [path.join(dir, 'node_modules', 'husky', 'bin.js')],
        {
          cwd: dir,
          stdio: 'pipe',
          env: { ...process.env, GIT_DIR: otherWorktreeGitDir },
        }
      );
      expect(git(other, 'config', '--get', 'core.hooksPath')).toBe('.husky/_');
    } finally {
      fs.writeFileSync(config, before);
    }
  });

  it("sets the target's core.hooksPath and leaves the other repository byte-identical", () => {
    const config = path.join(other, '.git', 'config');
    const before = bytes(config);
    const dir = huskyProject('init-target');

    const run = initInChild(dir, { GIT_DIR: otherWorktreeGitDir });

    expect(run.error).toBeNull();
    expect(bytes(config).equals(before)).toBe(true);
    expect(git(dir, 'config', '--get', 'core.hooksPath')).toBe('.husky/_');
    expect(fs.existsSync(path.join(dir, '.husky', '_', 'pre-commit'))).toBe(
      true
    );
    expect(run.stdout).toContain('Git hooks installed successfully');
  });

  it('fails closed when git will not run the hooks in the target', () => {
    const dir = huskyProject('husky-disabled');
    // HUSKY=0: husky skips the install and still exits 0.
    const run = initInChild(dir, { HUSKY: '0' });

    expect(run.error).toMatch(
      /NOT active in this repository: .*core\.hooksPath is unset/
    );
    expect(run.stdout).not.toContain('installed successfully');
    expect(() => git(dir, 'config', '--get', 'core.hooksPath')).toThrow();
  });
});

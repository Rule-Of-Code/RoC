/**
 * #372: every child process the CLI starts goes through one door,
 * src/utils/child-process.ts, which runs it in the target directory without
 * the repository-local GIT_* variables. A spawn that bypasses the door
 * inherits GIT_DIR from a hook and answers about, or writes to, another
 * repository.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  REPOSITORY_LOCAL_GIT_VARIABLES,
  childEnvironment,
  execFileSync,
  isRepositoryLocalGitVariable,
  spawnSync,
} from '../../src/utils/child-process';

const ROOT = path.resolve(__dirname, '..', '..');
const DOOR = 'src/utils/child-process.ts';
/** Needs children that DO inherit GIT_DIR, to prove the hazard is live. */
const TESTS_ALLOWED_RAW = ['tests/regression/inherited-git-environment.test.ts'];

/** An import, require or dynamic import of the child_process module. */
const CHILD_PROCESS_MODULE =
  /\bfrom\s+['"](?:node:)?child_process['"]|\brequire\(\s*['"](?:node:)?child_process['"]\s*\)|\bimport\(\s*['"](?:node:)?child_process['"]\s*\)/;

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...tsFiles(rel));
    else if (/\.(ts|js)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

const importers = (dir: string): string[] =>
  tsFiles(dir).filter(rel => CHILD_PROCESS_MODULE.test(fs.readFileSync(path.join(ROOT, rel), 'utf8')));

describe('guard: one door for child processes', () => {
  it('reads the source tree (not a vacuous pass)', () => {
    expect(tsFiles('src').length).toBeGreaterThan(100);
    expect(importers('src')).toContain(DOOR);
  });

  it('no file under src/ starts a child process except through the door', () => {
    expect(importers('src').filter(rel => rel !== DOOR)).toEqual([]);
  });

  it('no test spawns git (or anything) with the inherited environment', () => {
    expect(importers('tests').filter(rel => !TESTS_ALLOWED_RAW.includes(rel))).toEqual([]);
  });
});

describe('childEnvironment', () => {
  it('lists at least what this git calls repository-local (`git rev-parse --local-env-vars`)', () => {
    const local = execFileSync('git', ['rev-parse', '--local-env-vars'], {
      cwd: os.tmpdir(),
      encoding: 'utf8',
    })
      .split(/\r?\n/)
      .filter(Boolean);
    expect(local.length).toBeGreaterThan(0);
    expect(REPOSITORY_LOCAL_GIT_VARIABLES).toEqual(expect.arrayContaining(local));
  });

  it('removes every repository-local variable, in any case, and keeps the rest', () => {
    const base: NodeJS.ProcessEnv = { PATH: '/bin', GIT_AUTHOR_NAME: 'a', GIT_SSH_COMMAND: 'ssh', GIT_CEILING_DIRECTORIES: '/x' };
    for (const name of REPOSITORY_LOCAL_GIT_VARIABLES) base[name] = 'x';
    base.git_dir = 'lower';
    base.GIT_CONFIG_KEY_0 = 'core.hooksPath';
    base.GIT_CONFIG_VALUE_0 = '/elsewhere';

    const env = childEnvironment(base);

    expect(env).toEqual({ PATH: '/bin', GIT_AUTHOR_NAME: 'a', GIT_SSH_COMMAND: 'ssh', GIT_CEILING_DIRECTORIES: '/x' });
    expect(base.GIT_DIR).toBe('x'); // the input is not modified
    expect(isRepositoryLocalGitVariable('Git_Work_Tree')).toBe(true);
    expect(isRepositoryLocalGitVariable('GIT_TERMINAL_PROMPT')).toBe(false);
  });

  it('is what a child started through the door actually receives, even from an explicit env', () => {
    const run = spawnSync(
      process.execPath,
      ['-e', 'console.log(JSON.stringify(Object.keys(process.env).filter(k => /^git_/i.test(k)).sort()))'],
      {
        cwd: os.tmpdir(),
        encoding: 'utf8',
        env: { ...process.env, GIT_DIR: '/elsewhere/.git', GIT_INDEX_FILE: '/elsewhere/index', GIT_AUTHOR_NAME: 'kept' },
      }
    );
    const names = JSON.parse(run.stdout) as string[];
    expect(names).toContain('GIT_AUTHOR_NAME');
    expect(names).not.toContain('GIT_DIR');
    expect(names).not.toContain('GIT_INDEX_FILE');
  });
});

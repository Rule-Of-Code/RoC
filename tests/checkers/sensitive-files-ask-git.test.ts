/**
 * "Is this sensitive file committed?" is a question for git, not the disk
 * (#142). A local `.env` that is ignored and untracked is the correct setup;
 * a committed one is still committed after the working copy is deleted.
 *
 * The acceptance table, for every law that asked the disk:
 *
 *   A  no .env                                   pass
 *   B  .env present, ignored, untracked          pass
 *   C  .env committed                            fail
 *   D  .env committed, deleted from the disk     fail
 *   E  .DS_Store / npm-debug.log ignored         pass
 *   U  .env present, untracked, NOT ignored      fail  (git add -A commits it)
 *
 * Outside a git repository nothing can be asked, and the old disk reading is
 * kept as the fallback.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { EnvironmentSecurityEnforcementLaw } from '../../src/checkers/security-laws/environment-security-enforcement';
import { EnvironmentVariablesLaw } from '../../src/checkers/security-laws/environment-variables';
import { GitIgnoreStandardsLaw } from '../../src/checkers/version-control-laws/gitignore-standards';
import { DeploymentEnvironmentAnalyzer } from '../../src/utils/deployment/environment-files-analyzer';
import { gitExposure } from '../../src/utils/git/git-layout';
import { ctx, manifest, project, removeProjects } from './toolkit-fixture';

afterAll(removeProjects);

const IGNORE = ['.env', '.env.*', '!.env.example', '*.log', '.DS_Store', 'node_modules', 'dist'].join('\n');
// Quoted on purpose: Environment Variables Policy matches only quoted secrets.
const SECRET_ENV = ['API_KEY="dev-local-3f9a1c0042"', 'DATABASE_URL=postgres://u:p@localhost:5432/app'].join('\n');

const git = (root: string, ...args: string[]) =>
  execFileSync('git', args, { cwd: root, stdio: 'ignore', windowsHide: true });

function repo(gitignore = IGNORE): string {
  const root = project({
    'package.json': manifest({}),
    '.gitignore': gitignore,
    '.env.example': 'API_KEY=\nDATABASE_URL=\n',
  });
  git(root, 'init', '-q');
  git(root, 'config', 'user.email', 'fixture@example.com');
  git(root, 'config', 'user.name', 'fixture');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'chore: initial');
  return root;
}

const write = (root: string, file: string, content: string) =>
  fs.writeFileSync(path.join(root, file), content);

interface Findings {
  gitignore: string[];
  envSecurity: string[];
  envVariables: string[];
  envParity: string[];
}

/** Every finding the four judges make about the sensitive files. */
function findings(root: string): Findings {
  const about = (vs: string[] | undefined, re: RegExp) => (vs ?? []).filter(v => re.test(v));
  return {
    gitignore: about(GitIgnoreStandardsLaw.check(ctx(root)).violations, /sensitive file/i),
    envSecurity: about(EnvironmentSecurityEnforcementLaw.check(ctx(root)).violations, /^\.env/),
    envVariables: about(EnvironmentVariablesLaw.check(ctx(root)).violations, /secret found/i),
    envParity: about(DeploymentEnvironmentAnalyzer.analyzeEnvFiles(root).violations, /in git/i),
  };
}

const NONE = { gitignore: [], envSecurity: [], envVariables: [], envParity: [] };

describe('sensitive files: the git index decides, not the disk (#142)', () => {
  it('A: no .env — nothing to report', () => {
    expect(findings(repo())).toEqual(NONE);
  });

  it('B: a present, ignored, untracked .env is the correct setup — nothing to report', () => {
    const root = repo();
    write(root, '.env', SECRET_ENV);
    expect(findings(root)).toEqual(NONE);
  });

  it('C: a committed .env fails all four, read from the index', () => {
    const root = repo();
    write(root, '.env', SECRET_ENV);
    git(root, 'add', '-f', '.env');
    git(root, 'commit', '-q', '-m', 'chore: commit env');

    const f = findings(root);
    expect(f.gitignore).toEqual(['Tracked sensitive file: .env']);
    expect(f.envSecurity.length).toBeGreaterThan(0);
    expect(f.envVariables.length).toBeGreaterThan(0);
    expect(f.envParity).toEqual(['.env file is tracked in git']);
  });

  it('D: a committed .env deleted from the working copy is still committed', () => {
    const root = repo();
    write(root, '.env', SECRET_ENV);
    git(root, 'add', '-f', '.env');
    git(root, 'commit', '-q', '-m', 'chore: commit env');
    fs.rmSync(path.join(root, '.env'));

    const f = findings(root);
    expect(f.gitignore).toEqual(['Tracked sensitive file: .env']);
    expect(f.envSecurity.length).toBeGreaterThan(0);
    expect(f.envVariables.length).toBeGreaterThan(0);
    expect(f.envParity).toEqual(['.env file is tracked in git']);
  });

  it('the index is read, not the disk: an unstaged edit does not hide the committed secret', () => {
    const root = repo();
    write(root, '.env', SECRET_ENV);
    git(root, 'add', '-f', '.env');
    git(root, 'commit', '-q', '-m', 'chore: commit env');
    write(root, '.env', 'API_KEY=\n');

    expect(findings(root).envVariables.length).toBeGreaterThan(0);
  });

  it('E: ignored .DS_Store and npm-debug.log are not reported', () => {
    const root = repo();
    write(root, '.DS_Store', '');
    write(root, 'npm-debug.log', 'npm ERR! x\n');
    expect(findings(root).gitignore).toEqual([]);
  });

  it('U: a present .env that is NOT ignored is one git add -A from committed', () => {
    const root = repo('node_modules\ndist\n');
    write(root, '.env', SECRET_ENV);

    const f = findings(root);
    expect(f.gitignore).toEqual([
      'Sensitive file not ignored: .env — the next git add -A commits it',
    ]);
    expect(f.envSecurity.length).toBeGreaterThan(0);
    expect(f.envVariables.length).toBeGreaterThan(0);
    expect(f.envParity).toEqual(['.env file may be tracked in git']);
  });

  it('outside a git repository the disk is all there is — a present .env is still reported', () => {
    const root = project({ 'package.json': manifest({}), '.gitignore': IGNORE, '.env': SECRET_ENV });
    expect(gitExposure(root, ['.env'])).toBeNull();

    const f = findings(root);
    expect(f.gitignore).toEqual(['Potentially tracked sensitive file: .env']);
    expect(f.envSecurity.length).toBeGreaterThan(0);
    expect(f.envVariables.length).toBeGreaterThan(0);
  });
});

describe('gitExposure', () => {
  it('classifies all four states in one call', () => {
    const root = repo();
    write(root, '.env', 'A=1\n'); // ignored
    write(root, 'notes.txt', 'x'); // unignored
    write(root, 'kept.txt', 'x');
    git(root, 'add', 'kept.txt'); // tracked

    expect(Object.fromEntries(gitExposure(root, ['.env', 'notes.txt', 'kept.txt', 'gone.txt']) ?? [])).toEqual({
      '.env': 'ignored',
      'notes.txt': 'unignored',
      'kept.txt': 'tracked',
      'gone.txt': 'absent',
    });
  });

  it('answers relative to a package inside a larger repository', () => {
    const root = repo();
    const pkg = path.join(root, 'packages', 'app');
    fs.mkdirSync(pkg, { recursive: true });
    write(pkg, '.env', 'A=1\n');
    write(pkg, 'package.json', manifest({}));
    git(pkg, 'add', '-f', '.env');

    expect(gitExposure(pkg, ['.env'])?.get('.env')).toBe('tracked');
  });
});

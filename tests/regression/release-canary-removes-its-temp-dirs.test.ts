/**
 * #582: the release canary left its consumer (an installed tarball, ~50 MB)
 * and its provenance tree in the OS temp dir on every run. It removes what it
 * made when it finishes, green or red, unless --keep is given; then it prints
 * the paths.
 *
 * The process cases run the canary against a tarball that does not exist, so
 * it fails at the consumer install, right after making the consumer — the red
 * path, in about a second, with the OS temp dir pointed at a directory of the
 * test's own.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { makeTempDir, registerTempDir } from '../helpers/temp-dirs';

const REPO = path.resolve(__dirname, '..', '..');
const CANARY = path.join(REPO, 'scripts', 'release-canary.js');

interface CanaryModule {
  makeTempDir: (prefix: string) => string;
  removeTempDirs: (keep?: boolean) => string[];
  removeProvenanceTree: (tree: string, keep?: boolean) => void;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const canary = require(CANARY) as CanaryModule;

function runCanary(
  tmp: string,
  extra: string[]
): { status: number | null; out: string } {
  const result = spawnSync(
    process.execPath,
    [CANARY, '--tarball', path.join(tmp, 'missing.tgz'), ...extra],
    {
      cwd: REPO,
      encoding: 'utf8',
      env: { ...process.env, TEMP: tmp, TMP: tmp, TMPDIR: tmp },
      timeout: 120000,
    }
  );
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
}

const leftByCanary = (tmp: string): string[] =>
  fs.readdirSync(tmp).filter(name => name.startsWith('roc-'));

describe('the release canary removes what it made in the OS temp dir (#582)', () => {
  it('a red run leaves no consumer behind', () => {
    const tmp = makeTempDir('roc-canary-test-');

    const run = runCanary(tmp, []);

    expect(run.status).toBe(1);
    expect(run.out).toContain('CANARY RED');
    expect(leftByCanary(tmp)).toEqual([]);
  }, 120000);

  it('with --keep the consumer stays and its path is printed', () => {
    const tmp = makeTempDir('roc-canary-test-');

    const run = runCanary(tmp, ['--keep']);

    expect(run.status).toBe(1);
    const left = leftByCanary(tmp);
    expect(left).toHaveLength(1);
    expect(left[0]).toMatch(/^roc-canary-consumer-/);
    expect(run.out).toContain(`kept: ${path.join(tmp, left[0] as string)}`);
  }, 120000);

  it('removes the directories it registered, or keeps and returns them', () => {
    const gone = registerTempDir(canary.makeTempDir('roc-canary-unit-'));
    expect(canary.removeTempDirs(false)).toEqual([]);
    expect(fs.existsSync(gone)).toBe(false);

    const kept = registerTempDir(canary.makeTempDir('roc-canary-unit-'));
    expect(canary.removeTempDirs(true)).toEqual([kept]);
    expect(fs.existsSync(kept)).toBe(true);
  });

  it('removes the provenance tree without removing through its node_modules junction', () => {
    const repoModules = makeTempDir('roc-canary-modules-');
    fs.writeFileSync(
      path.join(repoModules, 'keep.txt'),
      'the repository’s own'
    );
    const tree = makeTempDir('roc-canary-tree-');
    fs.writeFileSync(path.join(tree, 'package.json'), '{}');
    fs.symlinkSync(repoModules, path.join(tree, 'node_modules'), 'junction');

    canary.removeProvenanceTree(tree, false);

    expect(fs.existsSync(tree)).toBe(false);
    expect(fs.readFileSync(path.join(repoModules, 'keep.txt'), 'utf8')).toBe(
      'the repository’s own'
    );
  });

  it('with --keep the provenance tree stays, without the junction', () => {
    const repoModules = makeTempDir('roc-canary-modules-');
    const tree = makeTempDir('roc-canary-tree-');
    fs.symlinkSync(repoModules, path.join(tree, 'node_modules'), 'junction');

    canary.removeProvenanceTree(tree, true);

    expect(fs.existsSync(tree)).toBe(true);
    expect(fs.existsSync(path.join(tree, 'node_modules'))).toBe(false);
    expect(fs.existsSync(repoModules)).toBe(true);
  });
});

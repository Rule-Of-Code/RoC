/**
 * #582: test runs left `roc-*` directories in the OS temp dir — thousands on
 * one machine. A full run on develop 79eff103 with the temp dir pointed at an
 * empty directory left five: three from `angular-bundle-config.test.ts` and
 * two from `todo-management-string-literal.test.ts`, which never removed what
 * they made. `installer-hook-generation.regression.test.ts` removed the PARENT
 * of its directory — the OS temp dir itself — so in a real temp dir it deleted
 * other programs' files until it hit a locked one, and left its own.
 *
 * This runs those suites, and the other suites that make `roc-*` directories
 * through the shared helper, in a child jest whose OS temp dir is a directory
 * of this test's own, with one file in it that is not theirs. Afterwards that
 * file is still there and no `roc-*` directory is.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from '../../src/utils/child-process';
import { makeTempDir } from '../helpers/temp-dirs';

const REPO = path.resolve(__dirname, '..', '..');
const SUITES = [
  'tests/hooks/installer-hook-generation.regression.test.ts',
  'tests/utils/angular-bundle-config.test.ts',
  'tests/laws/documentation/todo-management-string-literal.test.ts',
  'tests/regression/todo-law-comments-in-tracked-files.test.ts',
  'tests/regression/todo-markers-are-comment-words.test.ts',
  'tests/checkers/accessibility-laws/ionic-accessibility.test.ts',
];
const NOT_THEIRS = 'another-program.txt';

describe('test suites leave nothing in the OS temp dir (#582)', () => {
  it('no roc-* directory is left, and nothing else is removed', () => {
    // The child's compile cache stays where this run's is: os.tmpdir()/jest is
    // jest's default, and a cold cache would only make the run slower.
    const cache = path.join(os.tmpdir(), 'jest');
    const tmp = makeTempDir('roc-temp-check-');
    fs.writeFileSync(path.join(tmp, NOT_THEIRS), 'not the tests’ to remove');

    const run = spawnSync(
      process.execPath,
      [
        require.resolve('jest/bin/jest'),
        '--ci',
        '--maxWorkers=2',
        `--cacheDirectory=${cache}`,
        '--runTestsByPath',
        ...SUITES,
      ],
      {
        cwd: REPO,
        encoding: 'utf8',
        env: { ...process.env, TEMP: tmp, TMP: tmp, TMPDIR: tmp },
        timeout: 600000,
      }
    );

    const summary = `${run.stderr}`
      .split('\n')
      .filter(line => /^(Tests|Test Suites):/.test(line))
      .join('\n');
    expect(fs.existsSync(path.join(tmp, NOT_THEIRS))).toBe(true);
    expect(fs.readdirSync(tmp).filter(name => name.startsWith('roc-'))).toEqual(
      []
    );
    expect({ status: run.status, summary }).toEqual({
      status: 0,
      summary: expect.stringContaining(`${SUITES.length} passed`),
    });
  }, 600000);
});

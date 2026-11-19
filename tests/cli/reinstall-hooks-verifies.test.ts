/**
 * `reinstall-hooks` says "reinstalled successfully" only when git, in the
 * target repository, runs the rewritten hooks (#372). Rewriting `.husky/*`
 * in a checkout whose `core.hooksPath` is unset changes nothing git does.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { executeReinstallHooksAction } from '../../src/cli/reinstall-hooks-command';
import { execFileSync } from '../../src/utils/child-process';

const HUSKY_PACKAGE = path.resolve(
  __dirname,
  '..',
  '..',
  'node_modules',
  'husky'
);

describe('reinstall-hooks checks that git runs the hooks', () => {
  let dir: string;
  let log: jest.SpyInstance;
  let error: jest.SpyInstance;
  const printed = (): string =>
    [...log.mock.calls, ...error.mock.calls].map(c => String(c[0])).join('\n');

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-reinstall-'));
    execFileSync('git', ['init', '-q'], { cwd: dir, stdio: 'ignore' });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'r', version: '1.0.0' })
    );
    log = jest.spyOn(console, 'log').mockImplementation();
    error = jest.spyOn(console, 'error').mockImplementation();
    process.exitCode = undefined;
  });

  afterEach(() => {
    log.mockRestore();
    error.mockRestore();
    process.exitCode = undefined;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('fails when core.hooksPath is unset', async () => {
    await executeReinstallHooksAction({ force: true }, dir);

    expect(printed()).not.toContain('reinstalled successfully');
    expect(printed()).toMatch(
      /git does NOT run them here: .*core\.hooksPath is unset/
    );
    expect(process.exitCode).toBe(1);
  });

  it('succeeds once husky has pointed core.hooksPath at its directory', async () => {
    fs.cpSync(HUSKY_PACKAGE, path.join(dir, 'node_modules', 'husky'), {
      recursive: true,
    });
    execFileSync(
      process.execPath,
      [path.join(dir, 'node_modules', 'husky', 'bin.js')],
      {
        cwd: dir,
        stdio: 'ignore',
      }
    );

    await executeReinstallHooksAction({ force: true }, dir);

    expect(printed()).toContain('reinstalled successfully');
    expect(process.exitCode).toBeUndefined();
  });
});

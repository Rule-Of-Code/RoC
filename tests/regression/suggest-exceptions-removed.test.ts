/**
 * #527 — `audit --suggest-exceptions` was accepted and did nothing.
 *
 * The flag was registered, passed to the engine and stored there, and nothing
 * read it, while `--help` promised "suggest exception patterns for failures".
 * A public flag that silently does nothing says a suggestion was considered
 * and there was none to give.
 *
 * Decision: the flag is removed, not implemented. A generator of exceptions
 * argues against the tool's own rule that a finding is fixed, or declared
 * inapplicable with a reason — never waived to make a run pass. So the CLI
 * no longer knows the option: a script that still passes it gets commander's
 * "unknown option" and a non-zero exit, instead of a run that pretends.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { spawnSync } from '../../src/utils/child-process';

const CLI = path.resolve(__dirname, '..', '..', 'dist', 'cli.js');

describe('#527 --suggest-exceptions is not an option of audit', () => {
  jest.setTimeout(120000);
  let dir: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-527-'));
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'suggest', version: '1.0.0' })
    );
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'src', 'a.ts'), 'export const a = 1;\n');
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  const cli = (
    args: string[]
  ): { status: number | null; stdout: string; stderr: string } => {
    if (!fs.existsSync(CLI))
      throw new Error('dist/cli.js missing — run `npm run build` before jest');
    const run = spawnSync(process.execPath, [CLI, ...args], {
      cwd: dir,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    return { status: run.status, stdout: run.stdout, stderr: run.stderr };
  };

  it('passing it is an unknown option, exit non-zero, and no audit runs', () => {
    const run = cli(['audit', '--suggest-exceptions']);
    expect(run.stderr).toContain("unknown option '--suggest-exceptions'");
    expect(run.status).not.toBe(0);
    expect(run.stdout).not.toContain('Starting constitutional audit');
  });

  it('--help does not list it', () => {
    expect(cli(['audit', '--help']).stdout).not.toContain(
      '--suggest-exceptions'
    );
  });
});

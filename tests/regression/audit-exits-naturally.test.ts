/**
 * #385 — a finished audit stalled at 0 CPU inside `process.exit()`.
 *
 * QA's interleaved A/B on 7.28.1, same fixture, no instrumentation:
 * `process.exit(exitCode)` after the last write stalled 9 times in 60,
 * `process.exitCode = exitCode` with a natural exit 0 in 60. The audit now
 * sets the code and lets the process end on its own. A natural exit waits
 * for every handle, so a handle left open would hang it forever: an unref'd
 * backup timer exits with the same code after EXIT_BACKUP_MS, and waits
 * while stdout/stderr still hold data.
 *
 * The CLI rows spawn the built dist/cli.js, the way a consumer runs it (run
 * `npm run build` first). A preload marks every process.exit() call on fd 2.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { EXIT_BACKUP_MS, exitWhenDone } from '../../src/cli/audit-command';
import { childEnvironment, spawnSync } from '../../src/utils/child-process';

const CLI = path.resolve(__dirname, '..', '..', 'dist', 'cli.js');
const MARK = 'ROC_TEST_PROCESS_EXIT_CALLED';

describe('#385 exitWhenDone', () => {
  let exitSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers();
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never);
  });
  afterEach(() => {
    jest.useRealTimers();
    process.exitCode = undefined;
  });

  it('sets process.exitCode and does not call process.exit', () => {
    exitWhenDone(1);
    expect(process.exitCode).toBe(1);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('the backup exits with the same code once EXIT_BACKUP_MS has passed', () => {
    exitWhenDone(1);
    jest.advanceTimersByTime(EXIT_BACKUP_MS - 1);
    expect(exitSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('the backup waits while stdout still holds data, then exits', () => {
    let pending = 42;
    exitWhenDone(0, EXIT_BACKUP_MS, () => pending);
    jest.advanceTimersByTime(EXIT_BACKUP_MS * 3);
    expect(exitSpy).not.toHaveBeenCalled();
    pending = 0;
    jest.advanceTimersByTime(EXIT_BACKUP_MS);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

describe('#385 the audit CLI exits on its own', () => {
  jest.setTimeout(180000);
  let dir: string;
  let markExit: string;
  let keepAlive: string;

  beforeAll(() => {
    if (!fs.existsSync(CLI))
      throw new Error('dist/cli.js missing — run `npm run build` before jest');
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-385-'));
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'neutral-fixture', version: '1.0.0' })
    );
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(
      path.join(dir, 'src', 'index.ts'),
      'export const add = (a: number, b: number): number => a + b;\n'
    );
    markExit = path.join(dir, 'mark-exit.js');
    fs.writeFileSync(
      markExit,
      `const fs = require('fs');\nconst real = process.exit;\nprocess.exit = function (code) {\n  fs.writeSync(2, '\\n${MARK} ' + code + '\\n');\n  return real.call(process, code);\n};\n`
    );
    keepAlive = path.join(dir, 'keep-alive.js');
    fs.writeFileSync(keepAlive, 'setInterval(() => {}, 1000);\n');
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  const audit = (preloads: string[]) =>
    spawnSync(
      process.execPath,
      [...preloads.flatMap(p => ['-r', p]), CLI, 'audit', '--json'],
      { cwd: dir, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
    );

  it('--json: the whole document, the exit code it implies, and no process.exit call', () => {
    const run = audit([markExit]);
    const json = JSON.parse(run.stdout) as { passed: boolean };
    expect(run.status).toBe(json.passed ? 0 : 1);
    expect(run.stderr).not.toContain(MARK);
  });

  it('a handle left open: the backup ends it with the same exit code', () => {
    const run = audit([markExit, keepAlive]);
    const json = JSON.parse(run.stdout) as { passed: boolean };
    expect(run.signal).toBeNull();
    expect(run.status).toBe(json.passed ? 0 : 1);
    expect(run.stderr).toContain(`${MARK} ${json.passed ? 0 : 1}`);
  });

  it('stdout closed by the reader (EPIPE): the process still ends', async () => {
    const child = spawn(process.execPath, [CLI, 'audit', '--json'], {
      cwd: dir,
      env: childEnvironment(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.destroy();
    child.stderr.resume();
    const ended = await new Promise<boolean>(resolve => {
      const limit = setTimeout(() => resolve(false), 120000);
      child.on('exit', () => {
        clearTimeout(limit);
        resolve(true);
      });
    });
    if (!ended) child.kill();
    expect(ended).toBe(true);
  });
});

/**
 * #405 — a broken pipe exited 0, so a failed audit read by `head` passed.
 *
 * `ruleofcode audit --json | head -c 200` under `set -o pipefail` gave
 * PIPESTATUS "0 0" on a failing project (QA: 200 of 200 runs, 7.28.1 and the
 * 7.29.0 candidate): the EPIPE handler exited with a hard-coded 0. Now a
 * closed pipe only stops the writing; the audit ends with its own verdict.
 *
 * Contract: the exit code of a run whose reader closed early equals the exit
 * code of the same run read to the end — 1 for a failing audit, still 0 for
 * a passing one. The CLI rows spawn the built dist/cli.js, the way a consumer
 * runs it (run `npm run build` first).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { spawn, spawnSync } from '../../src/utils/child-process';
import { builtCli } from '../helpers/built-cli';

const CLI = path.resolve(__dirname, '..', '..', 'dist', 'cli.js');

/** One Module Size warning: non-blocking by default, blocking with failOnWarnings. */
const VERDICTS = {
  failing: { enabled: { 'Module Size': true }, failOnWarnings: true },
  passing: { enabled: { 'Module Size': true } },
} as const;
type Verdict = keyof typeof VERDICTS;

type Close =
  | 'stdout before the first byte'
  | 'stdout after the first chunk'
  | 'stderr before the first byte';

interface ClosedRun {
  code: number | null;
  signal: NodeJS.Signals | null;
  /** What the run printed on the stream nobody closed. */
  kept: string;
}

describe('#405 a broken pipe never decides the exit code', () => {
  jest.setTimeout(180000);
  const dirs = {} as Record<Verdict, string>;

  beforeAll(() => {
    builtCli();
    for (const verdict of Object.keys(VERDICTS) as Verdict[]) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), `roc-405-${verdict}-`));
      fs.mkdirSync(path.join(dir, 'src'));
      fs.writeFileSync(
        path.join(dir, 'pyproject.toml'),
        "[project]\nname='x'\n"
      );
      fs.writeFileSync(
        path.join(dir, 'src', 'big.py'),
        Array.from({ length: 40 }, (_, i) => `v${i} = ${i}`).join('\n') + '\n'
      );
      fs.writeFileSync(
        path.join(dir, 'ruleofcode.config.json'),
        JSON.stringify({
          project: { name: 'broken-pipe', type: 'python' },
          laws: { paretoMode: false, ...VERDICTS[verdict] },
          thresholds: { python: { maxFileLines: 10 } },
        })
      );
      dirs[verdict] = dir;
    }
  });
  afterAll(() => {
    for (const dir of Object.values(dirs))
      fs.rmSync(dir, { recursive: true, force: true });
  });

  const args = (json: boolean): string[] => [
    CLI,
    'audit',
    '--config',
    'ruleofcode.config.json',
    ...(json ? ['--json'] : []),
  ];

  /** The same audit read to the end: the exit code every closed run must match. */
  const readToTheEnd = (verdict: Verdict, json: boolean): number | null =>
    spawnSync(process.execPath, args(json), {
      cwd: dirs[verdict],
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
    }).status;

  const runClosed = (
    verdict: Verdict,
    json: boolean,
    close: Close
  ): Promise<ClosedRun> => {
    const child = spawn(process.execPath, args(json), {
      cwd: dirs[verdict],
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const closesStderr = close.startsWith('stderr');
    const shut = closesStderr ? child.stderr : child.stdout;
    const kept = closesStderr ? child.stdout : child.stderr;
    let keptText = '';
    kept?.on('data', (chunk: Buffer) => {
      keptText += chunk.toString();
    });
    if (close.endsWith('first chunk')) shut?.once('data', () => shut.destroy());
    else shut?.destroy();
    return new Promise((resolve, reject) => {
      const limit = setTimeout(() => {
        child.kill();
        reject(new Error(`${verdict} audit (${close}) did not end in 120 s`));
      }, 120000);
      child.on('close', (code, signal) => {
        clearTimeout(limit);
        resolve({ code, signal, kept: keptText });
      });
    });
  };

  it.each([['failing', 1] as const, ['passing', 0] as const])(
    'precondition: the %s fixture read to the end exits %i (--json and text)',
    (verdict, code) => {
      expect(readToTheEnd(verdict, true)).toBe(code);
      expect(readToTheEnd(verdict, false)).toBe(code);
    }
  );

  it.each([
    ['failing', '--json', 'stdout before the first byte', 1],
    ['passing', '--json', 'stdout before the first byte', 0],
    ['failing', '--json', 'stderr before the first byte', 1],
    ['passing', '--json', 'stderr before the first byte', 0],
    ['failing', 'text', 'stdout after the first chunk', 1],
    ['passing', 'text', 'stdout after the first chunk', 0],
  ] as Array<[Verdict, '--json' | 'text', Close, number]>)(
    '%s audit, %s, %s: exits %i, no signal',
    async (verdict, output, close, code) => {
      const run = await runClosed(verdict, output === '--json', close);
      expect(run.signal).toBeNull();
      expect(run.code).toBe(code);
    }
  );

  it('text mode keeps writing after the pipe broke: no stack trace, no crash', async () => {
    const run = await runClosed(
      'failing',
      false,
      'stdout after the first chunk'
    );
    expect(run.code).toBe(1);
    expect(run.kept).not.toMatch(/EPIPE|ERR_STREAM_DESTROYED/);
    expect(run.kept).not.toMatch(/\n\s+at \S.*:\d+:\d+\)?\n/);
  });
});

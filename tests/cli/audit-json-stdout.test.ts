/**
 * #306: `audit --json` puts exactly one JSON document on stdout.
 *
 * The banner, the mode header, progress, the liveness lines and the result
 * tables were written to stdout ahead of the document — on a real app the
 * JSON started at line 353 — so every `--json | jq` and `JSON.parse(stdout)`
 * failed. Human text now goes to stderr. Spawns the built dist/cli.js, the
 * way a consumer runs it (run `npm run build` first).
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CLI = path.resolve(__dirname, '..', '..', 'dist', 'cli.js');

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

function audit(dir: string, args: string[]): Run {
  const run = spawnSync(process.execPath, [CLI, 'audit', ...args], {
    cwd: dir,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  return { code: run.status ?? 1, stdout: run.stdout, stderr: run.stderr };
}

describe('audit --json stdout is one JSON document (#306)', () => {
  let dir: string;

  beforeAll(() => {
    if (!fs.existsSync(CLI)) {
      throw new Error('dist/cli.js missing — run `npm run build` before jest');
    }
  });

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-json-'));
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'src', 'a.ts'), 'export const a = 1;\n');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  jest.setTimeout(180000);

  const config = (value: Record<string, unknown>): void => {
    fs.writeFileSync(
      path.join(dir, 'ruleofcode.config.json'),
      JSON.stringify(value)
    );
  };

  it('a full audit: stdout parses, starts with "{", and the banner is on stderr', () => {
    config({ laws: { enabled: { 'Magic Number Prevention': true } } });
    const run = audit(dir, ['--mode', 'full', '--json']);

    expect(run.stdout.startsWith('{')).toBe(true);
    const document = JSON.parse(run.stdout);
    expect(typeof document.passed).toBe('boolean');
    expect(document.refused).toBeUndefined();
    expect(document.results.length).toBeGreaterThan(0);
    expect(document.stats.executedLaws).toBe(document.results.length);
    expect(run.code).toBe(document.passed ? 0 : 1);
    // The human output still exists — on stderr.
    expect(run.stderr).toContain('constitutional audit');
    expect(run.stdout).not.toContain('constitutional audit');
  });

  it('a liveness refusal: stdout is the refusal document, the message on stderr', () => {
    config({ laws: { minLawsChecked: 9999 } });
    const run = audit(dir, ['--mode', 'full', '--json']);

    const document = JSON.parse(run.stdout);
    expect(document.refused.reason).toBe('liveness-floor');
    expect(document.stats.failedLaws).toBe(0);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('refusing to report compliance');
  });

  it('--export json alongside --json: stdout stays clean, the file is the same document', () => {
    config({ laws: { enabled: { 'Magic Number Prevention': true } } });
    const run = audit(dir, ['--mode', 'full', '--json', '--export', 'json']);

    const document = JSON.parse(run.stdout);
    const exported = JSON.parse(
      fs.readFileSync(path.join(dir, 'ruleofcode-report.json'), 'utf8')
    );
    expect(exported.passed).toBe(document.passed);
    expect(run.stderr).toContain('Report exported');
  });

  it('a run that errors still prints a JSON document, never compliance', () => {
    const run = audit(dir, ['--json', '--config', 'no-such-config.json']);

    const document = JSON.parse(run.stdout);
    expect(document.passed).toBe(false);
    expect(document.error).toContain('Config file not found');
    expect(document.stats.executedLaws).toBe(0);
    expect(run.code).toBe(1);
  });
});

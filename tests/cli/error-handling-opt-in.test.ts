/**
 * #390 — Error Handling Standards is opt-in in 7.28.0.
 *
 * Once #369 let it see source files, its five paths were measured on real
 * code: 0 of 42 sampled findings were true. The detector is unchanged; only
 * its default is: it is not selected and not counted unless `laws.severity`
 * names it. Spawns the built dist/cli.js, the way a consumer runs it (run
 * `npm run build` first).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from '../../src/utils/child-process';

const CLI = path.resolve(__dirname, '..', '..', 'dist', 'cli.js');
const LAW = 'Error Handling Standards';

interface Report {
  stats: { totalLaws: number };
  scope: { applicableLaws: number; selectedLaws: number };
  results: Array<{ lawTitle?: string; violations?: string[] }>;
}

function audit(dir: string, laws: Record<string, unknown>): Report {
  fs.writeFileSync(
    path.join(dir, 'ruleofcode.config.json'),
    JSON.stringify({ project: { type: 'typescript' }, laws })
  );
  const run = spawnSync(process.execPath, [CLI, 'audit', '--json'], {
    cwd: dir,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  return JSON.parse(run.stdout) as Report;
}

describe('#390 Error Handling Standards is opt-in', () => {
  let dir: string;

  beforeAll(() => {
    if (!fs.existsSync(CLI))
      throw new Error('dist/cli.js missing — run `npm run build` before jest');
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-390-'));
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name: 'neutral-fixture',
        version: '1.0.0',
        devDependencies: { typescript: '5.6.3' },
      })
    );
    fs.writeFileSync(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { strict: true } })
    );
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'src', 'store.ts'),
      'export const load = (raw: string): unknown => JSON.parse(raw);\n'
    );
  });

  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  jest.setTimeout(180000);

  it('by default it is not selected and not counted', () => {
    const report = audit(dir, {});
    expect(report.results.map(r => r.lawTitle)).not.toContain(LAW);
    const on = audit(dir, { severity: { [LAW]: 'warning' } });
    // One law less in what applies, what is selected and what ran.
    expect(report.scope.applicableLaws).toBe(on.scope.applicableLaws - 1);
    expect(report.scope.selectedLaws).toBe(on.scope.selectedLaws - 1);
    expect(report.stats.totalLaws).toBe(on.stats.totalLaws - 1);
  });

  // 7.29.0: its five checks were measured and removed (#390). Turned on, it
  // runs and reports that it judged nothing: a failure, never a pass.
  it('laws.severity turns it on, and it reports that it judged nothing', () => {
    const report = audit(dir, { severity: { [LAW]: 'warning' } });
    const result = report.results.find(r => r.lawTitle === LAW) as
      { violations?: string[]; passed?: boolean; score?: number } | undefined;
    expect(result).toBeDefined();
    expect(result?.passed).toBe(false);
    expect(result?.score).toBe(0);
    expect(result?.violations).toEqual([
      'Error Handling Standards has no verified detection path in this version — this law judged nothing. Its five checks were measured on real projects at 0–33% precision and removed (#390); waive it or leave it off until a check is verified.',
    ]);
  });
});

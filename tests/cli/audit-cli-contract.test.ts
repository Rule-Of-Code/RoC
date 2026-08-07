/**
 * CLI-level contract tests (maintainer doctrine: every documented config key
 * is proven through the CLI, not the engine API). Spawns the built dist/cli.js
 * on real temp fixtures — run `npm run build` first; the suite fails loudly
 * if dist is missing.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CLI = path.resolve(__dirname, '..', '..', 'dist', 'cli.js');

interface RunResult {
  code: number;
  out: string;
}

function runAudit(dir: string, extraArgs: string[] = []): RunResult {
  try {
    const out = execFileSync(
      process.execPath,
      [CLI, 'audit', '--config', 'ruleofcode.config.json', ...extraArgs],
      { cwd: dir, encoding: 'utf8', stdio: 'pipe' }
    );
    return { code: 0, out };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

function lawsProcessed(out: string): number {
  const m = out.replace(/\[[0-9;]*m/g, '').match(/Processing (\d+) laws/);
  return m ? Number(m[1]) : -1;
}

describe('audit CLI contract', () => {
  let dir: string;

  beforeAll(() => {
    if (!fs.existsSync(CLI)) {
      throw new Error('dist/cli.js missing — run `npm run build` before jest');
    }
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-cli-'));
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'pyproject.toml'), "[project]\nname='x'\n");
    fs.writeFileSync(
      path.join(dir, 'src/big.py'),
      Array.from({ length: 40 }, (_, i) => `v${i} = ${i}`).join('\n') + '\n'
    );
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const writeConfig = (laws: Record<string, unknown>): void => {
    fs.writeFileSync(
      path.join(dir, 'ruleofcode.config.json'),
      JSON.stringify({
        project: { name: 'cli-contract', type: 'python' },
        laws,
        thresholds: { python: { maxFileLines: 10 } },
      })
    );
  };

  jest.setTimeout(120000);

  it('paretoMode: false runs the full applicable set (never collapses)', () => {
    writeConfig({ paretoMode: false });
    const r = runAudit(dir);
    expect(lawsProcessed(r.out)).toBeGreaterThanOrEqual(60);
  });

  it('absent paretoMode behaves exactly like false', () => {
    writeConfig({});
    const r = runAudit(dir);
    expect(lawsProcessed(r.out)).toBeGreaterThanOrEqual(60);
  });

  it('an unmatchable laws.enabled allowlist refuses compliance with exit 1', () => {
    writeConfig({ enabled: {} });
    const r = runAudit(dir);
    expect(r.code).toBe(1);
    expect(r.out).toContain('refusing to report compliance');
  });

  it.each([
    ['printed slug', 'module-size'],
    ['canonical name', 'Module Size'],
    ['legacyId', '225'],
  ])('laws.severity keyed by %s escalates a warning law to exit 1', (_l, key) => {
    writeConfig({
      paretoMode: false,
      enabled: { [key]: true },
      severity: { [key]: 'error' },
    });
    const r = runAudit(dir);
    expect(r.code).toBe(1);
  });

  it('the same violation stays non-blocking at its default warning severity', () => {
    writeConfig({ paretoMode: false, enabled: { 'Module Size': true } });
    const r = runAudit(dir);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Warnings:');
  });

  it('laws.failOnWarnings escalates that same warning to exit 1', () => {
    writeConfig({
      paretoMode: false,
      enabled: { 'Module Size': true },
      failOnWarnings: true,
    });
    const r = runAudit(dir);
    expect(r.code).toBe(1);
  });

  it.each([
    ['false', false],
    ['0', 0],
    ['null', null],
  ])(
    'failOnWarnings=%s does NOT escalate (falsy stays non-blocking)',
    (_label, value) => {
      writeConfig({
        paretoMode: false,
        enabled: { 'Module Size': true },
        failOnWarnings: value,
      });
      const r = runAudit(dir);
      expect(r.code).toBe(0);
      expect(r.out).toContain('Warnings:');
    }
  );

  it('laws.minLawsChecked above the planned count fails the audit (Audit Liveness)', () => {
    writeConfig({ paretoMode: false, minLawsChecked: 999 });
    const r = runAudit(dir);
    expect(r.code).toBe(1);
    expect(r.out).toContain('liveness floor');
  });

  it('a collapsed selection below the floor is REFUSED by the engine, not just the law (QA-4)', () => {
    // The config mistake that shrinks the law set could also drop law 226 —
    // so the floor is enforced in the engine, like the zero-laws refusal.
    writeConfig({ enabled: { 'Module Size': true }, minLawsChecked: 90 });
    const r = runAudit(dir);
    expect(r.code).toBe(1);
    expect(r.out).toContain('refusing to report compliance');
  });

  it('paretoMode still runs both meta-gates (they are not selectable)', () => {
    writeConfig({ paretoMode: true });
    const r = runAudit(dir);
    expect(r.out).toContain('Audit Liveness Assertion');
    expect(r.out).toContain('Config Integrity Guard');
  });

  it('--mode=fast on a paretoMode:false config runs the Pareto set, not the full one (QA-7)', () => {
    writeConfig({ paretoMode: false });
    const full = lawsProcessed(runAudit(dir).out);
    const fast = lawsProcessed(runAudit(dir, ['--mode=fast']).out);

    expect(full).toBeGreaterThanOrEqual(60);
    expect(fast).toBeLessThan(full); // the banner and the executed set agree
    expect(fast).toBeGreaterThan(0);
  });

  it('an unknown severity key is a FINDING at error severity (Config Integrity)', () => {
    writeConfig({
      paretoMode: false,
      severity: { 'total-garbage-law': 'error' },
    });
    const r = runAudit(dir);
    expect(r.code).toBe(1);
    expect(r.out).toContain("unknown law 'total-garbage-law'");
  });

  it('laws.severity keyed by the hashed law id escalates to exit 1', () => {
    // Resolve the id from the registry at runtime — the hash is derived from
    // the law's title/description and must gate like every other spelling.
    const {
      ModularLawsRegistry,
    } = jest.requireActual('../../src/registry/modular-laws-registry');
    const law = ModularLawsRegistry.getAll().find(
      (l: { name: string }) => l.name === 'Module Size'
    );
    expect(law).toBeDefined();
    writeConfig({
      paretoMode: false,
      enabled: { [law.id]: true },
      severity: { [law.id]: 'error' },
    });
    const r = runAudit(dir);
    expect(r.code).toBe(1);
  });
});

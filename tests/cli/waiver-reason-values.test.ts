/**
 * #350 — which `laws.notApplicable` values waive a law, proven through the
 * CLI (`dist/cli.js audit --json`), one row per value.
 *
 * A waiver needs a reason: a string with something in it besides whitespace.
 * Before #350 the selector waived on ANY truthy value, so `" "` and `true`
 * removed the law from the audit while the laws that defer to waivers saw no
 * waiver, and the audit had no reason to name. Now neither waives: the law
 * runs and the audit warns. `""`, `null` and `0` were falsy before too — they
 * never waived, and still do not (no change; only the warning's wording did,
 * and `null` gets none: the config merger drops it as "unset").
 *
 * The fixture's other failing laws are waived with real reasons, so the exit
 * code tells whether the law under test ran (it fails here: no .gitignore).
 *
 * Built CLI only — run `npm run build` first. `ROC_CLI=<path to cli.js>` runs
 * the same rows against another build (used to show them red on the base).
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CLI = process.env.ROC_CLI ?? path.resolve(__dirname, '..', '..', 'dist', 'cli.js');
const LAW = 'Git Ignore Standards';
const META_GATES = ['Audit Liveness Assertion', 'Config Integrity Guard'];
const NO_REASON_WARNING = `⚠️  laws.notApplicable['${LAW}'] has no reason — it waives nothing and the law still runs. Give the reason: laws.notApplicable = { "${LAW}": "why it does not apply" }`;

interface Row {
  value: string;
  entry: { present: false } | { present: true; value: unknown };
  waived: boolean;
  warns: boolean;
}

const ROWS: Row[] = [
  { value: '""', entry: { present: true, value: '' }, waived: false, warns: true },
  { value: '" "', entry: { present: true, value: ' ' }, waived: false, warns: true }, // waived before #350
  { value: 'true', entry: { present: true, value: true }, waived: false, warns: true }, // waived before #350
  // falsy before too: no change. No warning either: the config merger drops a
  // null entry (null means "unset" when configs are merged), so the audit
  // never sees the key — the same as an absent key, before and after #350.
  { value: 'null', entry: { present: true, value: null }, waived: false, warns: false },
  { value: '0', entry: { present: true, value: 0 }, waived: false, warns: true }, // falsy before too: no change
  { value: 'key absent', entry: { present: false }, waived: false, warns: false },
  { value: 'a real reason (control)', entry: { present: true, value: 'the repository has no ignore file by design' }, waived: true, warns: false },
];

interface Run {
  code: number;
  json: { scope?: { waivedLaws?: Array<{ law: string; reason: string }> }; results: Array<{ lawTitle?: string; passed?: boolean }> };
  stderr: string;
}

function fixture(laws: Record<string, unknown>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-350-cli-'));
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ name: 'neutral-fixture', version: '1.0.0', devDependencies: { typescript: '5.6.3' } }),
    'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true } }),
    'src/index.ts': 'export const add = (a: number, b: number): number => a + b;\n',
    'ruleofcode.config.json': JSON.stringify({ project: { type: 'typescript' }, laws }),
  };
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
  return root;
}

function audit(laws: Record<string, unknown>): Run {
  const cwd = fixture(laws);
  try {
    // spawnSync, not execFileSync: stderr (the warnings) is kept on exit 0 too.
    const run = spawnSync(process.execPath, [CLI, 'audit', '--mode=full', '--json'], { cwd, encoding: 'utf8' });
    return { code: run.status ?? 1, json: JSON.parse(run.stdout || '{}'), stderr: run.stderr ?? '' };
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true }); // each run owns its fixture
  }
}

const plain = (text: string): string[] =>
  // eslint-disable-next-line no-control-regex
  text.replace(/\u001b\[[0-9;]*m/g, '').split(/\r?\n/);

/**
 * Every law the fixture fails or warns on, except the one under test, waived.
 * Computed by each row for itself, so no state is shared between rows.
 */
function backgroundWaivers(): Record<string, string> {
  if (!fs.existsSync(CLI)) throw new Error(`${CLI} missing — run \`npm run build\` before jest`);
  const failing = audit({})
    .json.results.filter(r => !r.passed && r.lawTitle && !META_GATES.includes(r.lawTitle))
    .map(r => r.lawTitle as string);
  expect(failing).toContain(LAW); // the law under test fails when it runs
  return Object.fromEntries(failing.filter(t => t !== LAW).map(t => [t, 'not a concern of this fixture']));
}

describe.each(ROWS)('laws.notApplicable[law] = $value', row => {
  let run: Run;
  beforeAll(() => {
    const notApplicable = { ...backgroundWaivers(), ...(row.entry.present ? { [LAW]: row.entry.value } : {}) };
    run = audit({ notApplicable });
  }, 240000);

  it(`(a) the law ${row.waived ? 'does not run' : 'runs'}`, () => {
    expect(run.json.results.some(r => r.lawTitle === LAW)).toBe(!row.waived);
  });

  it(`(b) it is ${row.waived ? '' : 'not '}in scope.waivedLaws`, () => {
    const entry = (run.json.scope?.waivedLaws ?? []).find(w => w.law === LAW);
    expect(entry !== undefined).toBe(row.waived);
    if (row.waived && row.entry.present) expect(entry?.reason).toBe(row.entry.value);
  });

  it(`(c) ${row.warns ? 'the no-reason warning, exactly' : 'no warning about the entry'}`, () => {
    const lines = plain(run.stderr).filter(line => line.includes(`laws.notApplicable['${LAW}']`));
    expect(lines).toEqual(row.warns ? [NO_REASON_WARNING] : []);
  });

  it(`(d) exit ${row.waived ? 0 : 1}`, () => {
    expect(run.code).toBe(row.waived ? 0 : 1);
  });
});

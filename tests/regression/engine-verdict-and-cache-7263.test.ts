/**
 * Three engine defects that made the numbers a consumer gates on say
 * something false.
 *
 * #301 — a liveness-floor refusal reported every SELECTED law as failed
 *        (`failedLaws: 86`, `results: []`) though no law ran.
 * #302 — a law that judged nothing failed with score 100 (others 90, others
 *        0), so the overall score counted "judged nothing" as perfect.
 * #305 — the audit cache never hit: the engine wrote `__plannedLawCount`
 *        into the config between reading and writing the cache, so the key
 *        written never equalled the key read. Making it hit made the rest of
 *        the key matter: it hashed no scanned file at all (the default
 *        `includes.global` is an empty — truthy — list), and keyed the
 *        Capacitor shells on default paths, not the ones the laws open.
 *
 * Real temp projects, the real ConfigLoader, registry and engine.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { DefensiveArrayCoercionLaw } from '../../src/checkers/fe-architecture-laws/defensive-array-coercion';
import { NoPassthroughCastLaw } from '../../src/checkers/fe-architecture-laws/no-passthrough-cast';
import { RequiresSpecLaw } from '../../src/checkers/fe-architecture-laws/requires-spec';
import { StoresInDataAccessLaw } from '../../src/checkers/fe-architecture-laws/stores-in-data-access';
import { ContentSecurityPolicyLaw } from '../../src/checkers/security-laws/content-security-policy';
import { ConfigLoader } from '../../src/config/loader';
import { AuditCache } from '../../src/core/auditing/audit-cache';
import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import type { AuditResult } from '../../src/core/auditing/audit-types';
import { AuditResultProcessor } from '../../src/core/auditing/result-processor';
import { ProfessionalComponentTestingPolicyLaw } from '../../src/laws/testing/professional-component-testing-policy';
import { CapacitorProjects } from '../../src/utils/capacitor/capacitor-project';
import {
  ctx,
  fakeCapacitorCli,
  printedConfig,
  project,
  removeProjects,
} from '../checkers/toolkit-fixture';

jest.setTimeout(120000);

const made: string[] = [];
afterAll(() => {
  removeProjects();
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

/** A temp project with the given files and ruleofcode.config.json. */
function fixture(
  files: Record<string, string>,
  config: Record<string, unknown>
): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-7263-'));
  made.push(root);
  const all = {
    ...files,
    'ruleofcode.config.json': JSON.stringify(config),
  };
  for (const [name, content] of Object.entries(all)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

/** Run the engine the way the CLI does, capturing what it prints. */
async function audit(root: string): Promise<{ result: AuditResult; out: string }> {
  const chunks: string[] = [];
  const capture = (chunk: unknown): boolean => {
    chunks.push(String(chunk));
    return true;
  };
  const log = jest.spyOn(console, 'log').mockImplementation((...args) => {
    chunks.push(args.map(String).join(' '));
  });
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const out = jest.spyOn(process.stdout, 'write').mockImplementation(capture);
  const err = jest.spyOn(process.stderr, 'write').mockImplementation(capture);
  try {
    const config = ConfigLoader.load(root);
    const auditor = await RuleOfCodeAuditor.create({
      projectRoot: root,
      config,
      mode: 'full',
    });
    const result = await auditor.audit();
    return { result, out: chunks.join('\n') };
  } finally {
    log.mockRestore();
    warn.mockRestore();
    out.mockRestore();
    err.mockRestore();
  }
}

describe('#301 a liveness refusal is "no law ran", not "N laws failed"', () => {
  it('below the floor: zero counts, and the refusal is its own field', async () => {
    const root = fixture({ 'src/a.ts': 'export const a = 1;\n' }, {
      laws: { minLawsChecked: 9999 },
    });
    const { result } = await audit(root);

    expect(result.passed).toBe(false);
    expect(result.failedLaws).toBe(0);
    expect(result.totalLaws).toBe(0);
    expect(result.passedLaws).toBe(0);
    expect(result.refused).toEqual({
      reason: 'liveness-floor',
      selectedLaws: expect.any(Number),
      floor: 9999,
    });
    expect(result.refused?.selectedLaws).toBeGreaterThan(0);
    expect(result.refused?.selectedLaws).toBe(result.substantiveLaws);

    const json = JSON.parse(AuditResultProcessor.exportResults(result, 'json'));
    expect(json.passed).toBe(false);
    expect(json.refused.reason).toBe('liveness-floor');
    expect(json.stats).toMatchObject({
      executedLaws: 0,
      failedLaws: 0,
      totalLaws: 0,
    });
    expect(json.results).toEqual([]);

    // The CSV has no law rows; it must say the audit did not run.
    const csv = AuditResultProcessor.exportResults(result, 'csv');
    expect(csv).toMatch(/^audit,REFUSED,.*liveness floor/m);
    expect(AuditResultProcessor.exportResults(result, 'html')).toContain(
      'Audit refused'
    );
  });

  it('an empty selection is refused as no-laws, with zero counts', async () => {
    const root = fixture({ 'src/a.ts': 'export const a = 1;\n' }, {
      laws: { enabled: {} },
    });
    const { result } = await audit(root);

    expect(result.passed).toBe(false);
    expect(result.failedLaws).toBe(0);
    expect(result.refused).toMatchObject({ reason: 'no-laws', selectedLaws: 0 });
  });

  it('a run that executed reports executedLaws equal to its results', async () => {
    const root = fixture({ 'src/a.ts': 'export const a = 1;\n' }, {
      laws: { enabled: { 'Magic Number Prevention': true } },
    });
    const { result } = await audit(root);
    const json = JSON.parse(AuditResultProcessor.exportResults(result, 'json'));
    expect(result.refused).toBeUndefined();
    expect(json.refused).toBeUndefined();
    expect(json.stats.executedLaws).toBe(json.results.length);
    expect(json.stats.executedLaws).toBeGreaterThan(0);
  });
});

describe('#302 a law that judged nothing is a failure scored 0', () => {
  const JUDGED_NOTHING = [
    'Professional Component Testing Policy',
    'Stores In Data Access',
    'Requires Spec',
    'Defensive Array Coercion',
    'No Passthrough Cast',
  ];

  it('through the engine: every judged-nothing result is passed:false, score 0', async () => {
    // The reporter's static site: an HTML page, no package.json. It used to be
    // typed React from `public/index.html` alone; since #319 a file name is no
    // framework evidence, so the frontend type these laws need is declared.
    const root = fixture(
      { 'public/index.html': '<html lang="en"></html>\n' },
      {
        project: { type: 'react' },
        laws: {
          enabled: Object.fromEntries(JUDGED_NOTHING.map(name => [name, true])),
        },
      }
    );
    const { result } = await audit(root);
    const byTitle = new Map(
      [...result.results.values()].map(r => {
        const law = r as { lawTitle: string; passed: boolean; score: number; judgedNothing?: boolean };
        return [law.lawTitle, law];
      })
    );

    for (const title of JUDGED_NOTHING) {
      const law = byTitle.get(title);
      expect({ title, ...law }).toMatchObject({
        title,
        passed: false,
        score: 0,
        judgedNothing: true,
      });
    }
    // The meta-gates pass at 100; the five judged-nothing laws add nothing.
    const scores = [...result.results.values()].map(r => (r as { score?: number }).score ?? 0);
    expect(result.score).toBe(
      Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    );
    expect(result.score).toBeLessThan(100);
  });

  it('the component-testing law itself no longer scores 100 on nothing', () => {
    const result = ProfessionalComponentTestingPolicyLaw.check(
      ctx(project({ 'public/index.html': '<html lang="en"></html>' }))
    );
    expect(result).toMatchObject({ passed: false, score: 0, judgedNothing: true });
  });

  it.each([
    ['Stores In Data Access', StoresInDataAccessLaw],
    ['Requires Spec', RequiresSpecLaw],
    ['Defensive Array Coercion', DefensiveArrayCoercionLaw],
    ['No Passthrough Cast', NoPassthroughCastLaw],
  ])('%s with an empty layer scores 0, not 90', (_title, law) => {
    const result = law.check(ctx(project({ 'src/app/page.ts': 'export const x = 1;' })));
    expect(result).toMatchObject({ passed: false, score: 0, judgedNothing: true });
  });

  it('Content Security Policy with nothing to read scores 0', () => {
    const result = ContentSecurityPolicyLaw.check(
      ctx(project({ 'src/lib/x.ts': 'export const x = 1;' }))
    );
    expect(result).toMatchObject({ passed: false, score: 0, judgedNothing: true });
  });

  it('the engine normalises a result that only SAYS it judged nothing', () => {
    const normalised = AuditResultProcessor.normalizeJudgedNothing({
      passed: false,
      score: 100,
      violations: ['found nothing to read — this law judged nothing'],
    });
    expect(normalised).toMatchObject({ passed: false, score: 0, judgedNothing: true });

    const untouched = { passed: false, score: 80, violations: ['a real finding'] };
    expect(AuditResultProcessor.normalizeJudgedNothing(untouched)).toBe(untouched);
  });
});

describe('#305 the audit cache hits, and only when nothing it depends on moved', () => {
  const CACHED = {
    performance: { cache: true },
    laws: { enabled: { 'Magic Number Prevention': true } },
  };

  it('the second identical run is served from the cache', async () => {
    const root = fixture({ 'src/a.ts': 'export const a = 1;\n' }, CACHED);
    const first = await audit(root);
    const second = await audit(root);

    expect(first.out).not.toContain('cache hit');
    expect(second.out).toContain('cache hit');
    expect(second.result.passed).toBe(first.result.passed);
    expect(second.result.score).toBe(first.result.score);
  });

  it('an edited source file is a miss (the key covers scanned files)', async () => {
    const root = fixture({ 'src/a.ts': 'export const a = 1;\n' }, CACHED);
    await audit(root);
    const file = path.join(root, 'src', 'a.ts');
    fs.writeFileSync(file, 'export const a = 2; // edited\n');
    const later = new Date(Date.now() + 5000);
    fs.utimesSync(file, later, later);

    expect((await audit(root)).out).not.toContain('cache hit');
  });

  it('a new file of a non-TypeScript type is a miss too', async () => {
    const root = fixture({ 'src/a.ts': 'export const a = 1;\n' }, CACHED);
    await audit(root);
    fs.writeFileSync(path.join(root, 'src', 'b.py'), 'print(1)\n');

    expect((await audit(root)).out).not.toContain('cache hit');
  });

  it('the config hash ignores what the engine writes into the config', () => {
    const config = { laws: { minLawsChecked: 3 } };
    const before = AuditCache.generateConfigHash(config);
    (config.laws as Record<string, unknown>).__plannedLawCount = 42;
    expect(AuditCache.generateConfigHash(config)).toBe(before);

    (config.laws as Record<string, unknown>).minLawsChecked = 4;
    expect(AuditCache.generateConfigHash(config)).not.toBe(before);
  });

  it('keys the Capacitor shell on the paths the laws open (android.path honoured)', () => {
    CapacitorProjects.clearCache();
    const root = project({ 'capacitor.config.ts': 'export default {};' });
    const printed = printedConfig(root, {});
    (printed.android as Record<string, string>).srcMainDirAbs = path.join(
      root,
      'native',
      'main'
    );
    fakeCapacitorCli(root, printed);

    const inputs = CapacitorProjects.fixedPathInputs(root).map(file =>
      file.replace(/\\/g, '/')
    );
    expect(inputs).toContain(
      path.join(root, 'native', 'main', 'AndroidManifest.xml').replace(/\\/g, '/')
    );
    CapacitorProjects.clearCache();
  });
});

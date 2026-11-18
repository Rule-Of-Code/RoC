/**
 * #388 — two gaps around the NgRx laws.
 *
 * 1. The release canary had no Angular + NgRx profile, so the Pareto ratchet
 *    (engine-selection-floor-pareto.test.ts) never measured the NgRx gate.
 *    The canary's STACKS now has `ngrx`; the ratchet reads it from there. This
 *    file runs the canary's own passes for that profile in process — the
 *    calibration, green, red and zero-laws passes and its floor and `requires`
 *    gate — so a profile that cannot pass the canary is caught without
 *    running the whole canary.
 * 2. Six NgRx laws (legacyId 90–95, category FRAMEWORK) were titled
 *    "… (SACRED LAW)", a promise of the protection SACRED laws get and these
 *    do not. The decoration is gone; the category is unchanged; the old
 *    title stays an identity (`formerTitles`), so config keys written with
 *    it keep resolving to the same law. The id is unchanged.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ConfigIntegrityGuardLaw } from '../../src/checkers/meta-gate-laws/config-integrity-guard';
import { executeAuditAction } from '../../src/cli/audit-command';
import type { AuditResult } from '../../src/core/auditing/audit-types';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import type { RuleOfCodeConfig } from '../../src/types/law.types';
import { generateLawId } from '../../src/utils/id-generator';

const made: string[] = [];
afterAll(() => {
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

// ── 1. the ngrx profile passes the canary's passes ───────────────────────────

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { STACKS } = require('../../scripts/release-canary') as {
  STACKS: Record<
    string,
    {
      floor: number;
      files: Record<string, string>;
      redFile: Record<string, string>;
      redLaw: string;
      projectType: string;
      mustRun?: string[];
      mustNotRun?: string[];
    }
  >;
};

function writeFiles(root: string, files: Record<string, string>): void {
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
}

/** The canary's writeConfig: project name and type, paretoMode off, then the pass's laws. */
function writeConfig(root: string, key: string, type: string, laws: Record<string, unknown> = {}): void {
  const config = { project: { name: `canary-${key}`, type }, laws: { paretoMode: false, ...laws } };
  fs.writeFileSync(path.join(root, 'ruleofcode.config.json'), JSON.stringify(config, null, 2));
}

async function runAudit(root: string): Promise<{ exitCode: number; result: AuditResult; text: string }> {
  const out: string[] = [];
  const push = (...a: unknown[]): void => void out.push(a.map(String).join(' '));
  const spies = [
    jest.spyOn(console, 'log').mockImplementation(push),
    jest.spyOn(console, 'warn').mockImplementation(push),
    jest.spyOn(console, 'error').mockImplementation(push),
    jest.spyOn(process.stdout, 'write').mockImplementation(chunk => (out.push(String(chunk)), true)),
    jest.spyOn(process.stderr, 'write').mockImplementation(chunk => (out.push(String(chunk)), true)),
  ];
  try {
    const outcome = await executeAuditAction({ mode: 'full' }, root);
    if (!outcome.result) throw outcome.error ?? new Error('no audit result');
    return { exitCode: outcome.exitCode, result: outcome.result as AuditResult, text: out.join('\n') };
  } finally {
    for (const spy of spies) spy.mockRestore();
  }
}

const titlesOf = (result: AuditResult, failedOnly: boolean): string[] =>
  [...result.results.values()]
    .filter(r => !failedOnly || !(r as { passed?: boolean }).passed)
    .map(r => (r as { lawTitle?: string }).lawTitle ?? '');

describe('#388 the canary ngrx profile', () => {
  it('passes the canary passes: floor, requires gate, green, red (by its own law), zero-laws refusal', async () => {
    const stack = STACKS.ngrx;
    if (!stack) throw new Error('no ngrx profile in the canary STACKS');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-388-ngrx-'));
    made.push(root);
    writeFiles(root, stack.files);

    // Calibration.
    writeConfig(root, 'ngrx', stack.projectType);
    const cal = await runAudit(root);
    expect(cal.result.totalLaws).toBeGreaterThanOrEqual(stack.floor);
    const ran = titlesOf(cal.result, false);
    for (const name of stack.mustRun ?? []) expect(ran).toContain(name);
    for (const name of stack.mustNotRun ?? []) expect(ran).not.toContain(name);
    expect(titlesOf(cal.result, true)).not.toContain(stack.redLaw);
    const waivers = Object.fromEntries(titlesOf(cal.result, true).map(name => [name, 'canary fixture: not satisfiable synthetically']));

    // Green: the waived config on the clean tree passes.
    writeConfig(root, 'ngrx', stack.projectType, { notApplicable: waivers });
    expect((await runAudit(root)).exitCode).toBe(0);

    // Red: the planted violation, at error, fails — by the red law.
    writeFiles(root, stack.redFile);
    writeConfig(root, 'ngrx', stack.projectType, { notApplicable: waivers, severity: { [stack.redLaw]: 'error' } });
    const red = await runAudit(root);
    expect(red.exitCode).toBe(1);
    expect(titlesOf(red.result, true)).toContain(stack.redLaw);

    // Zero: an empty allowlist is refused.
    writeConfig(root, 'ngrx', stack.projectType, { enabled: {} });
    const zero = await runAudit(root);
    expect(zero.exitCode).toBe(1);
    expect(zero.text).toMatch(/refusing to report compliance/);
    expect(cal.text + red.text + zero.text).not.toMatch(/TypeError/);
  }, 120000);
});

// ── 2. no FRAMEWORK law is titled SACRED; old titles still resolve ────────────

const RENAMED = [
  'NgRx Store Pattern Mandate',
  'NgRx Actions Hygiene Mandate',
  'NgRx Effects Error Handling Mandate',
  'NgRx Selectors Memoization Mandate',
  'NgRx Reducers Immutability Mandate',
  'NgRx Feature Store Structure Mandate',
];
const OLD = (title: string): string => `${title} (SACRED LAW)`;
const ALL = ModularLawsRegistry.getAll();
const lawTitled = (title: string) => {
  const law = ALL.find(l => l.name === title);
  if (!law) throw new Error(`no law titled ${title}`);
  return law;
};
const configWith = (laws: Record<string, unknown>): RuleOfCodeConfig => ({ laws } as unknown as RuleOfCodeConfig);

describe('#388 SACRED in a title means a SACRED law', () => {
  it('no law outside SACRED_LAW is titled SACRED', () => {
    const titled = ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(l => /SACRED/i.test(l.title) && l.category !== 'SACRED_LAW');
    expect(titled.map(l => `${l.title} (${l.category})`)).toEqual([]);
  });

  it.each(RENAMED)('%s: the category and the id are unchanged', title => {
    const card = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l => l.title === title);
    expect(card?.category).toBe('FRAMEWORK');
    // The id is derived from the old title, as before the rename.
    expect(card?.id).toBe(generateLawId(OLD(title), card?.description ?? '', 'ngrx'));
    expect(card?.formerTitles).toEqual([OLD(title)]);
  });

  it.each(RENAMED)('%s: a config key by the OLD title resolves to the same law (severity, notApplicable, enabled)', title => {
    const law = lawTitled(title);
    const old = OLD(title);
    expect(ModularLawsRegistry.unambiguousIdentityKeys(law)).toContain(old);

    // laws.enabled
    const enabled = ModularLawsRegistry.getEnabled(configWith({ enabled: { [old]: true } }));
    expect(enabled.filter(l => !l.alwaysEnabled).map(l => l.name)).toEqual([title]);

    // laws.notApplicable
    expect(ModularLawsRegistry.waiverReasonOf(law, { [old]: 'no store here' })).toBe('no store here');
    expect(ModularLawsRegistry.getEnabled(configWith({ notApplicable: { [old]: 'no store here' } })).map(l => l.name)).not.toContain(title);

    // laws.severity — known to Config Integrity Guard, so not reported as an unknown key.
    const guard = ConfigIntegrityGuardLaw.check({ projectRoot: process.cwd(), config: configWith({ severity: { [old]: 'error' } }) } as never);
    expect(guard.violations ?? []).toEqual([]);
    expect(guard.passed).toBe(true);
  });
});

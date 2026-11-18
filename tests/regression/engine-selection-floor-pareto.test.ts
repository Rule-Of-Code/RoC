/**
 * #370, #371, #383 — the engine contract written before the code
 * (contract-370-371-383, cells C1–C8, F1–F6, P1–P5). One row per cell, the
 * cell number in the test name.
 *
 * #370  Narrowing by `categories` (public constructor option) selected laws
 *       with a separate registry call: no waivers, no opt-in rule, no
 *       meta-gates, and the run was not partial — a one-category run printed
 *       COMPLIANCE and the art.
 * #371  The default liveness floor took L from `config.project.type`, while
 *       the selection used the detected type: `generic` on a Python project
 *       gave a floor computed over laws that do not run. Rule: L is the larger
 *       of the two counts, so the floor can only go up.
 * #383  The Pareto core was 27 laws from hardcoded arrays, no Python law in
 *       it. Rule: about 20% of the laws of each stack, ranked by their own
 *       fields; a ratchet keeps every stack in [15%, 25%].
 *
 * Every substantive law is stubbed to pass (the #350 harness); the two
 * always-on meta-gates keep their real checks, because the floor is part of
 * what is tested.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import type { AuditResult } from '../../src/core/auditing/audit-types';
import { AuditResultProcessor } from '../../src/core/auditing/result-processor';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import type { EnhancedConstitutionalLaw } from '../../src/types/enhanced-law.types';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { lawAppliesToProjectType, runsWithoutAllowlist } from '../../src/utils/law-identity';
import { lawRequirementsMet } from '../../src/utils/law-requirements';
import { livenessFloorOf } from '../../src/utils/liveness-floor';
import { stubLawChecks, writeFiles } from './waivers-named-verdict.harness';

const META_GATES = ['Audit Liveness Assertion', 'Config Integrity Guard'];
const BARE_PASS = /✅ CONSTITUTIONAL COMPLIANCE: PASSED/;
const ART = /:\+{9}\./;

const TS_PROJECT: Record<string, string> = {
  'package.json': JSON.stringify({ name: 'neutral-fixture', version: '1.0.0', devDependencies: { typescript: '5.6.3' } }),
  'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true } }),
  'src/index.ts': 'export const add = (a: number, b: number): number => a + b;\n',
};
const PY_PROJECT: Record<string, string> = {
  'pyproject.toml': '[project]\nname = "neutral-service"\nversion = "1.0.0"\ndependencies = []\n',
  'app/__init__.py': '',
  'app/main.py': 'def add(a: int, b: int) -> int:\n    return a + b\n',
  'tests/test_main.py': 'from app.main import add\n\n\ndef test_add() -> None:\n    assert add(1, 2) == 3\n',
};

const made: string[] = [];
afterAll(() => {
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function fixture(files: Record<string, string>, config: Record<string, unknown>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-engine-'));
  made.push(root);
  writeFiles(root, { ...files, 'ruleofcode.config.json': JSON.stringify(config, null, 2) });
  return root;
}

interface Run {
  result: AuditResult;
  json: Record<string, any>;
  text: string;
  /** What the CLI exits with for this result (`passed ? 0 : 1`, audit-command). */
  exitCode: number;
  ran: string[];
}

/** Audit through the public constructor — the only door `categories` has. */
async function audit(root: string, categories?: string[], Auditor: typeof RuleOfCodeAuditor = RuleOfCodeAuditor): Promise<Run> {
  const out: string[] = [];
  const line = (...a: unknown[]): void => {
    out.push(a.map(String).join(' '));
  };
  const capture = (chunk: unknown): boolean => {
    out.push(String(chunk).replace(/\n$/, ''));
    return true;
  };
  const spies = [
    jest.spyOn(console, 'log').mockImplementation(line),
    jest.spyOn(console, 'warn').mockImplementation(line),
    jest.spyOn(console, 'error').mockImplementation(line),
    jest.spyOn(process.stdout, 'write').mockImplementation(capture),
    jest.spyOn(process.stderr, 'write').mockImplementation(capture),
  ];
  try {
    const options = categories ? { categories } : {};
    const result = await new Auditor({}, root, false, 'full', options).audit();
    return {
      result,
      json: JSON.parse(AuditResultProcessor.exportResults(result, 'json')),
      // eslint-disable-next-line no-control-regex
      text: out.join('\n').replace(/\u001b\[[0-9;]*m/g, ''),
      exitCode: result.passed ? 0 : 1,
      ran: [...result.results.values()].map(r => (r as { lawTitle?: string }).lawTitle ?? ''),
    };
  } finally {
    for (const spy of spies) spy.mockRestore();
  }
}

// ── Laws the cells use, chosen from the registry by property ────────────────
const ALL = ModularLawsRegistry.getAll();
const byName = (name: string): (typeof ALL)[number] => {
  const law = ALL.find(l => l.name === name);
  if (!law) throw new Error(`no law titled ${name}`);
  return law;
};
const CATEGORIES = [...new Set(ALL.map(l => l.category))].sort();
/** A category with laws on a TypeScript project, and not the one the meta-gates are in. */
const ONE = 'performance';
/** A default-on, ungated, universal law of ONE: waivable on the TS fixture. */
const WAIVED = ALL.find(l => l.category === ONE && !l.stack && !l.requires && l.defaultEnabled !== false && !l.alwaysEnabled);
/** The category holding the most universal core laws (the core changes with #383; chosen by property). */
const CORE_CATEGORY = CATEGORIES.map(c => [c, ALL.filter(l => l.paretoCore && !l.stack && !l.requires && l.category === c).length] as const).sort(
  (a, b) => b[1] - a[1]
)[0]?.[0] as string;
/** An opt-in law of ONE that a TS project selects once it declares the package. */
const OPT_IN = ALL.find(l => l.category === ONE && l.defaultEnabled === false && l.stack === 'typescript');

describe('#370 narrowing by categories (public constructor)', () => {
  stubLawChecks();

  it('C1 — one category, fewer laws than M → partial, narrowedBy categories, PARTIAL SCAN, no COMPLIANCE, no art, exit 0', async () => {
    const run = await audit(fixture(TS_PROJECT, { project: { type: 'typescript' } }), [ONE]);
    const { scope } = run.json;
    expect(scope.selectedLaws).toBeLessThan(scope.applicableLaws);
    expect(scope.narrowedBy).toBe('categories');
    expect(scope.partial).toBe(true);
    expect(run.json.verdict).toBe('partial');
    expect(run.text).toContain(
      `⚠️  PARTIAL SCAN — ${scope.executedLaws} of ${scope.applicableLaws} applicable laws ran (narrowed by categories).`
    );
    expect(run.text).not.toMatch(BARE_PASS);
    expect(run.text).not.toMatch(ART);
    // A category narrowing is deliberate, like laws.enabled: floor 0 there.
    expect(scope.liveness.floorSource).toBe('narrowed');
    expect(run.exitCode).toBe(0);
  }, 60000);

  it('C2 — categories that cover every applicable law → not partial, compliance', async () => {
    const run = await audit(fixture(TS_PROJECT, { project: { type: 'typescript' } }), CATEGORIES);
    expect(run.json.scope.selectedLaws).toBe(run.json.scope.applicableLaws);
    expect(run.json.scope.partial).toBe(false);
    expect(run.json.verdict).toBe('compliance');
    expect(run.exitCode).toBe(0);
  }, 60000);

  it('C3 — one category + a waiver on a law of that category → the law does not run, it is in waivedLaws, partial', async () => {
    if (!WAIVED) throw new Error(`no waivable law in category ${ONE}`);
    const reason = 'the concern does not exist in this project';
    const root = fixture(TS_PROJECT, { project: { type: 'typescript' }, laws: { notApplicable: { [WAIVED.name]: reason } } });
    const run = await audit(root, [ONE]);
    expect(run.ran).not.toContain(WAIVED.name);
    expect(run.json.scope.waivedLaws).toEqual([{ law: WAIVED.name, lawId: WAIVED.id, reason }]);
    expect(run.json.scope.applicableBeforeWaivers).toBe(run.json.scope.applicableLaws + 1);
    expect(run.json.scope.partial).toBe(true);
    expect(run.json.verdict).toBe('partial');
  }, 60000);

  it('C4 — one category → Audit Liveness and Config Integrity Guard ran', async () => {
    const run = await audit(fixture(TS_PROJECT, { project: { type: 'typescript' } }), [ONE]);
    expect(ALL.filter(l => l.alwaysEnabled).every(l => l.category !== ONE)).toBe(true);
    expect(run.ran).toEqual(expect.arrayContaining(META_GATES));
  }, 60000);

  it('C5 — one category + minLawsChecked above the selection → refused, not partial, narrowedBy categories', async () => {
    const root = fixture(TS_PROJECT, { project: { type: 'typescript' }, laws: { minLawsChecked: 9999 } });
    const run = await audit(root, [ONE]);
    expect(run.json.verdict).toBe('refused');
    expect(run.result.refused?.reason).toBe('liveness-floor');
    expect(run.json.scope.partial).toBe(false);
    expect(run.json.scope.narrowedBy).toBe('categories');
    expect(run.exitCode).toBe(1);
  }, 60000);

  it('C6 — one category holding an opt-in law with no severity → the opt-in law is not selected', async () => {
    if (!OPT_IN?.requires?.anyDependency) throw new Error(`no opt-in TypeScript law gated on a package in ${ONE}`);
    const pkg = OPT_IN.requires.anyDependency[0] as string;
    const files = {
      ...TS_PROJECT,
      'package.json': JSON.stringify({ name: 'neutral-fixture', version: '1.0.0', dependencies: { [pkg]: '1.0.0' }, devDependencies: { typescript: '5.6.3' } }),
    };
    const run = await audit(fixture(files, { project: { type: 'typescript' } }), [ONE]);
    expect(run.ran.length).toBeGreaterThan(META_GATES.length);
    expect(run.ran).not.toContain(OPT_IN.name);
    // …and a severity turns it on, exactly as on the default path.
    const on = await audit(fixture(files, { project: { type: 'typescript' }, laws: { severity: { [OPT_IN.name]: 'warning' } } }), [ONE]);
    expect(on.ran).toContain(OPT_IN.name);
  }, 60000);

  it('C7 — categories + paretoMode → partial, narrowedBy paretoMode (precedence)', async () => {
    // The category is one the core has laws in on this project: a category
    // with no core law selects nothing and is refused (no-laws), not partial.
    const run = await audit(fixture(TS_PROJECT, { project: { type: 'typescript' }, laws: { paretoMode: true } }), [CORE_CATEGORY]);
    expect(run.result.refused).toBeUndefined();
    expect(run.ran.length).toBeGreaterThan(META_GATES.length);
    expect(run.json.scope.narrowedBy).toBe('paretoMode');
    expect(run.json.scope.partial).toBe(true);
    expect(run.json.verdict).toBe('partial');
    expect(run.ran).toEqual(expect.arrayContaining(META_GATES));
  }, 60000);

  it('C8 — no categories (and an empty list) → the default path, unchanged (golden: waivers-named-verdict-golden)', async () => {
    const root = fixture(TS_PROJECT, { project: { type: 'typescript' } });
    const none = await audit(root);
    const empty = await audit(root, []);
    expect(empty.json.scope).toEqual(none.json.scope);
    expect(empty.ran).toEqual(none.ran);
    expect(none.json.scope.narrowedBy).toBeUndefined();
    expect(none.json.verdict).toBe('compliance');
  }, 60000);
});

// ── #371 ─────────────────────────────────────────────────────────────────────

/**
 * The 7.27.0 count for ONE type, written out here as the oracle: registry
 * laws that run without an allowlist, apply to `type`, and meet `requires`.
 */
function lawsApplicableTo(type: string | undefined, root: string): number {
  return ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(
    l =>
      runsWithoutAllowlist({ name: l.title, id: l.id, defaultEnabled: l.defaultEnabled }, undefined) &&
      lawAppliesToProjectType(l.stack, type, root, l) &&
      lawRequirementsMet(l.requires, root)
  ).length;
}
const defaultFloor = (l: number): number => Math.max(1, Math.ceil(0.25 * l));

describe('#371 the liveness floor is computed over the type the selection uses (never lowered)', () => {
  const py = fixture(PY_PROJECT, {});

  it('F1 — config generic, detected python → the floor from the larger L (python), higher than 7.27.0', () => {
    const floor = livenessFloorOf({ project: { type: 'generic' }, laws: {} }, py);
    const python = lawsApplicableTo('python', py);
    const generic = lawsApplicableTo('generic', py);
    expect(python).toBeGreaterThan(generic);
    expect(floor.applicableLaws).toBe(python);
    expect(floor.floor).toBe(defaultFloor(python));
    expect(floor.floor).toBeGreaterThan(defaultFloor(generic)); // the 7.27.0 floor
    expect(floor.floorSource).toBe('default-25%');
  });

  it('F2 — config python, detected python → unchanged', () => {
    const floor = livenessFloorOf({ project: { type: 'python' }, laws: {} }, py);
    expect(floor.applicableLaws).toBe(lawsApplicableTo('python', py));
    expect(floor.floor).toBe(defaultFloor(lawsApplicableTo('python', py)));
  });

  it('F3 — no config type, detected python → unchanged (no type counts every law)', () => {
    const floor = livenessFloorOf({ laws: {} }, py);
    expect(floor.applicableLaws).toBe(lawsApplicableTo(undefined, py));
    expect(floor.floor).toBe(defaultFloor(lawsApplicableTo(undefined, py)));
  });

  it.each([
    ['generic', 17],
    ['python', 40],
    [undefined, 3],
  ])('F4 — config %s, laws.minLawsChecked %i → that value, unchanged', (type, min) => {
    const floor = livenessFloorOf({ project: type ? { type } : {}, laws: { minLawsChecked: min } }, py);
    expect(floor).toMatchObject({ floor: min, floorSource: 'laws.minLawsChecked' });
  });

  it.each([
    ['laws.enabled', { enabled: { 'Domain Layer Framework Independence': true } }],
    ['paretoMode', { paretoMode: true }],
  ])('F5 — narrowed by %s → 0 (narrowed), unchanged', (_name, laws) => {
    const floor = livenessFloorOf({ project: { type: 'generic' }, laws }, py);
    expect(floor).toMatchObject({ floor: 0, floorSource: 'narrowed' });
  });

  it('F6 — config type whose L is larger than the detected one → that larger L, unchanged from 7.27.0', () => {
    // A configured non-generic type is also the type the selection uses.
    const floor = livenessFloorOf({ project: { type: 'angular' }, laws: {} }, py);
    expect(lawsApplicableTo('angular', py)).toBeGreaterThan(lawsApplicableTo('python', py));
    expect(floor.applicableLaws).toBe(lawsApplicableTo('angular', py));
    expect(floor.floor).toBe(defaultFloor(lawsApplicableTo('angular', py)));
  });

  describe('F1 through the engine', () => {
    stubLawChecks();

    it('F1 — the engine reports the L it used, and L = M₀ + the 2 meta-gates', async () => {
      const run = await audit(fixture(PY_PROJECT, { project: { type: 'generic' } }));
      expect(run.json.project.type).toBe('python');
      const { liveness, applicableBeforeWaivers } = run.json.scope;
      expect(liveness.applicableLaws).toBe(applicableBeforeWaivers + META_GATES.length);
      expect(liveness.floor).toBe(defaultFloor(liveness.applicableLaws));
      expect(run.text).toContain(`floor ${liveness.floor} — default 25% of ${liveness.applicableLaws} stack-applicable laws`);
    }, 60000);
  });
});

// ── #383 ─────────────────────────────────────────────────────────────────────

/**
 * The five project profiles of the release canary, from its own STACKS table
 * (one source): what a project of each kind actually selects. The band is
 * measured on the SELECTION — core laws a Pareto run selects / laws a full
 * run selects — not on the `stack` field, whose frontend group is shared by
 * Angular, Ionic and React projects.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { STACKS: CANARY } = require('../../scripts/release-canary') as {
  STACKS: Record<string, { files: Record<string, string>; projectType: string }>;
};
const PROFILES = ['python', 'angular', 'ionic', 'react', 'node'] as const;
const BAND = { min: 0.15, max: 0.25 };

interface ProfileShare {
  applicable: number;
  core: number;
  ran: string[];
}

/** The profile's fixture audited twice through the constructor: full, then Pareto. */
async function profileShare(profile: string, Auditor: typeof RuleOfCodeAuditor = RuleOfCodeAuditor): Promise<ProfileShare> {
  const stack = CANARY[profile];
  if (!stack) throw new Error(`no canary profile ${profile}`);
  const project = { name: `canary-${profile}`, type: stack.projectType };
  const full = await audit(fixture(stack.files, { project }), undefined, Auditor);
  const pareto = await audit(fixture(stack.files, { project, laws: { paretoMode: true } }), undefined, Auditor);
  expect(full.json.scope.partial).toBe(false);
  return { applicable: full.json.scope.applicableLaws, core: pareto.json.scope.selectedLaws, ran: pareto.ran };
}

describe('#383 the Pareto core is ~20% of what each project profile selects', () => {
  stubLawChecks();

  it.each(PROFILES)(
    'P1/P2 — %s profile: core selected / applicable selected is in [15%, 25%]',
    async profile => {
      const { applicable, core } = await profileShare(profile);
      expect(core / applicable).toBeGreaterThanOrEqual(BAND.min);
      expect(core / applicable).toBeLessThanOrEqual(BAND.max);
    },
    60000
  );

  it('P1 — the python profile in Pareto mode runs Python laws', async () => {
    const { ran } = await profileShare('python');
    const python = new Set(ALL.filter(l => l.stack === 'python').map(l => l.name));
    expect(ran.filter(name => python.has(name)).length).toBeGreaterThan(0);
  }, 60000);

  it.each([
    ['typescript', TS_PROJECT],
    ['python', PY_PROJECT],
  ])('P3 — %s project in Pareto mode → partial, narrowedBy paretoMode, never compliance', async (type, files) => {
    const run = await audit(fixture(files, { project: { type }, laws: { paretoMode: true } }));
    expect(run.json.scope.partial).toBe(true);
    expect(run.json.scope.narrowedBy).toBe('paretoMode');
    expect(run.json.verdict).toBe('partial');
    expect(run.text).not.toMatch(BARE_PASS);
    expect(run.ran).toEqual(expect.arrayContaining(META_GATES));
  }, 60000);

  it('P4 — a full run does not read the core: its selection is every applicable law (golden: waivers-named-verdict-golden)', async () => {
    const run = await audit(fixture(TS_PROJECT, { project: { type: 'typescript' } }));
    expect(run.json.scope.partial).toBe(false);
    expect(run.json.scope.selectedLaws).toBe(run.json.scope.applicableLaws);
    expect(run.json.verdict).toBe('compliance');
  }, 60000);

  it('P5 — laws added to the registry pass through the rule, no list is edited; gated ones move no other project (ratchet)', async () => {
    // Before: what each profile selects with the registry as shipped.
    const before: Record<string, ProfileShare> = {};
    for (const profile of PROFILES) before[profile] = await profileShare(profile);

    let Auditor: typeof RuleOfCodeAuditor = RuleOfCodeAuditor;
    let Fresh: typeof ModularLawsRegistry = ModularLawsRegistry;
    jest.isolateModules(() => {
      jest.doMock('../../src/data/python-laws', () => {
        const actual = jest.requireActual('../../src/data/python-laws');
        const base = actual.PYTHON_LAWS[0] as EnhancedConstitutionalLaw;
        const added = (
          title: string,
          fields: Pick<EnhancedConstitutionalLaw, 'priority' | 'defaultSeverity'> & Partial<EnhancedConstitutionalLaw>
        ): EnhancedConstitutionalLaw => ({
          ...base,
          id: `ratchet-${title.toLowerCase().replace(/\s+/g, '-')}`,
          legacyId: 9990,
          title,
          requires: undefined,
          ...fields,
        });
        const many = (prefix: string, n: number, fields: Partial<EnhancedConstitutionalLaw>): EnhancedConstitutionalLaw[] =>
          Array.from({ length: n }, (_, k) => added(`${prefix} ${k + 1}`, { priority: 'HIGH', defaultSeverity: 'error', ...fields }));
        return {
          ...actual,
          PYTHON_LAWS: [
            ...actual.PYTHON_LAWS,
            // Ungated: the critical one is core, the minor one is not.
            added('Ratchet Critical Python Law', { priority: 'CRITICAL', defaultSeverity: 'error' }),
            added('Ratchet Minor Python Law', { priority: 'LOW', defaultSeverity: 'info' }),
            // Gated, several at once: universal laws for a package no profile declares…
            ...many('Ratchet Gated Universal Law', 8, { stack: undefined, requires: { anyDependency: ['ratchet-neutral-package'] } }),
            // …and frontend laws for a package the angular and ionic profiles declare.
            ...many('Ratchet Gated Angular Law', 5, { stack: 'frontend', requires: { anyDependency: ['@angular/core'] } }),
          ],
        };
      });
      Fresh = require('../../src/registry/modular-laws-registry').ModularLawsRegistry;
      Auditor = require('../../src/core/auditing/audit-engine').RuleOfCodeAuditor;
    });
    // The isolated registry is a second copy: stub its substantive checks too.
    const real = Fresh.getAll.bind(Fresh);
    const spy = jest.spyOn(Fresh, 'getAll').mockImplementation(() =>
      real().map(law => (law.alwaysEnabled ? law : { ...law, check: (async () => ({ passed: true, score: 100, violations: [], suggestions: [], message: 'stub' })) as unknown as typeof law.check }))
    );
    try {
      const law = (title: string) => Fresh.getAll().find(l => l.name === title);
      expect(law('Ratchet Critical Python Law')?.paretoCore).toBe(true);
      expect(law('Ratchet Minor Python Law')?.paretoCore).toBe(false);
      const after: Record<string, ProfileShare> = {};
      for (const profile of PROFILES) {
        after[profile] = await profileShare(profile, Auditor);
        const { applicable, core } = after[profile] as ProfileShare;
        expect(core / applicable).toBeGreaterThanOrEqual(BAND.min);
        expect(core / applicable).toBeLessThanOrEqual(BAND.max);
      }
      expect(after.python?.ran).toContain('Ratchet Critical Python Law');
      // A gated law that does not apply to a project changes nothing there:
      // eight universal gated laws let no ungated law into node or react.
      expect(after.node?.core).toBe(before.node?.core);
      expect(after.react?.core).toBe(before.react?.core);
      expect(after.python?.core).toBe((before.python?.core ?? 0) + 1);
      // Where the gate is met, the laws count on both sides of the share.
      expect(after.angular?.applicable).toBe((before.angular?.applicable ?? 0) + 5);
    } finally {
      spy.mockRestore();
    }
  }, 180000);
});

it('the cells find their laws in the registry', () => {
  expect(byName('Audit Liveness Assertion').alwaysEnabled).toBe(true);
  expect(WAIVED).toBeDefined();
  expect(OPT_IN).toBeDefined();
  expect(CATEGORIES.length).toBeGreaterThan(1);
});

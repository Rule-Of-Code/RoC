/**
 * #350 — mass waivers yielded a full compliance verdict, and the waivers were
 * not named.
 *
 * Waiving every failing law with `laws.notApplicable` printed
 * "✅ CONSTITUTIONAL COMPLIANCE: PASSED" and the victory art, exit 0, with the
 * waivers nowhere in the output. #348 made a NARROWED run say "PARTIAL SCAN";
 * a waiver is not a narrowing (it changes what applies), so it needs its own
 * words: the waived laws, by name and reason, in the console and the JSON,
 * and a `verdict` that tells a pass with waivers from a clean pass. The exit
 * code never changes.
 *
 * One row per cell of the contract written before the code (waived ×
 * narrowed × refused × mode × outcome, + cache, + invalid waivers, + 50
 * waivers). Every row also asserts the invariants:
 *   M₀ = M + W        scope.applicableBeforeWaivers = applicableLaws + waivedLaws.length
 *   L  = M₀ + G       scope.liveness.applicableLaws = M₀ + the 2 always-on meta-gates
 *   exit = passed ? 0 : 1, and `passed` is what it was before the change.
 */
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import {
  auditFixture,
  makeFixture,
  setFailingLaw,
  stubLawChecks,
  type AuditRun,
} from './waivers-named-verdict.harness';

type Verdict =
  'compliance' | 'compliance-with-waivers' | 'partial' | 'failed' | 'refused';

// ── Laws the cells use, chosen from the registry by property ────────────────
const ALL = ModularLawsRegistry.getAll();
const universal = ALL.filter(
  l => !l.alwaysEnabled && !l.stack && !l.requires && l.defaultEnabled !== false
);
const HISTORY = [
  'Commit Message Standards',
  'Commit Description Standards',
  'Commit Size Control',
];

const WAIVED_A = 'Data Encryption Standards';
const WAIVED_B = 'Semantic Versioning Standards';
const REASON_A = 'no data is stored at rest';
const REASON_B = 'the package is never published';
const WAIVERS: Record<string, string> = {
  [WAIVED_A]: REASON_A,
  [WAIVED_B]: REASON_B,
};
const lawIdOf = (title: string): string => {
  const law = ALL.find(l => l.name === title);
  if (!law) throw new Error(`no law titled ${title}`);
  return law.id;
};
const WAIVED_LIST = [
  { law: WAIVED_A, lawId: lawIdOf(WAIVED_A), reason: REASON_A },
  { law: WAIVED_B, lawId: lawIdOf(WAIVED_B), reason: REASON_B },
];

const spare = universal.filter(
  l =>
    l.severity === 'error' && ![WAIVED_A, WAIVED_B, ...HISTORY].includes(l.name)
);
const spareName = (i: number): string => {
  const law = spare[i];
  if (!law) throw new Error(`fewer than ${i + 1} spare universal laws`);
  return law.name;
};
const FAILING = spareName(0);
/** An allowlist of 3 laws (fewer than apply), the failing law among them. */
const SMALL_ALLOWLIST = {
  [FAILING]: true,
  [spareName(1)]: true,
  [spareName(2)]: true,
};
/** A law stack-gated off a TypeScript project: waiving it waives nothing. */
const PYTHON_LAW = ALL.find(l => l.stack === 'python')?.name ?? '';
const META_GATES = 2;

// ── Expected console lines ───────────────────────────────────────────────────
const BARE_PASS = /✅ CONSTITUTIONAL COMPLIANCE: PASSED$/m;
const ART = /:\+{9}\./;
const blockHeader = (w: number): string =>
  `📋 ${w} law(s) waived by laws.notApplicable — not run, not passed:`;

interface Cell {
  cell: string;
  w: string;
  narrowed: string;
  mode: string | undefined;
  outcome: 'pass' | 'fail' | 'refused';
  laws: () => Record<string, unknown> | Promise<Record<string, unknown>>;
  verdict: Verdict;
  waived: Array<{ law: string; lawId: string; reason: string }>;
  floorSource: 'laws.minLawsChecked' | 'default-25%' | 'narrowed';
  narrowedBy?: 'laws.enabled' | 'paretoMode';
  extra?: (run: AuditRun) => void;
}

/** Cell 7: an allowlist that names every law that applies after the waivers. */
async function allowlistOfEveryApplicableLaw(): Promise<
  Record<string, unknown>
> {
  const run = await auditFixture({
    mode: 'full',
    laws: { notApplicable: WAIVERS },
  });
  const names = [...run.result.results.values()]
    .map(r => (r as { lawTitle?: string }).lawTitle ?? '')
    .filter(
      name =>
        !['Audit Liveness Assertion', 'Config Integrity Guard'].includes(name)
    );
  return {
    notApplicable: WAIVERS,
    enabled: Object.fromEntries(names.map(n => [n, true])),
  };
}

const FIFTY: Array<{ law: string; lawId: string; reason: string }> = universal
  .filter(l => !HISTORY.includes(l.name))
  .map(l => l.name)
  .sort((a, b) => a.localeCompare(b))
  .slice(0, 50)
  .map((law, i) => ({
    law,
    lawId: lawIdOf(law),
    reason: `concern ${i + 1} does not exist here`,
  }));

const CELLS: Cell[] = [
  {
    cell: '01',
    w: '0',
    narrowed: 'none',
    mode: 'full',
    outcome: 'pass',
    laws: () => ({}),
    verdict: 'compliance',
    waived: [],
    floorSource: 'default-25%',
  },
  {
    cell: '02',
    w: '2',
    narrowed: 'none',
    mode: 'full',
    outcome: 'pass',
    laws: () => ({ notApplicable: WAIVERS }),
    verdict: 'compliance-with-waivers',
    waived: WAIVED_LIST,
    floorSource: 'default-25%',
  },
  {
    cell: '03',
    w: '0',
    narrowed: 'none',
    mode: 'full',
    outcome: 'fail',
    laws: () => ({}),
    verdict: 'failed',
    waived: [],
    floorSource: 'default-25%',
  },
  {
    cell: '04',
    w: '2',
    narrowed: 'none',
    mode: 'full',
    outcome: 'fail',
    laws: () => ({ notApplicable: WAIVERS }),
    verdict: 'failed',
    waived: WAIVED_LIST,
    floorSource: 'default-25%',
  },
  {
    cell: '05',
    w: '0',
    narrowed: 'laws.enabled<M',
    mode: 'full',
    outcome: 'pass',
    laws: () => ({ enabled: SMALL_ALLOWLIST }),
    verdict: 'partial',
    waived: [],
    floorSource: 'narrowed',
    narrowedBy: 'laws.enabled',
  },
  {
    cell: '06',
    w: '2',
    narrowed: 'laws.enabled<M',
    mode: 'full',
    outcome: 'pass',
    laws: () => ({ enabled: SMALL_ALLOWLIST, notApplicable: WAIVERS }),
    verdict: 'partial',
    waived: WAIVED_LIST,
    floorSource: 'narrowed',
    narrowedBy: 'laws.enabled',
  },
  {
    cell: '07',
    w: '2',
    narrowed: 'laws.enabled=M',
    mode: 'full',
    outcome: 'pass',
    laws: allowlistOfEveryApplicableLaw,
    verdict: 'compliance-with-waivers',
    waived: WAIVED_LIST,
    floorSource: 'narrowed',
    narrowedBy: 'laws.enabled',
  },
  {
    cell: '08',
    w: '2',
    narrowed: 'laws.enabled<M',
    mode: 'full',
    outcome: 'fail',
    laws: () => ({ enabled: SMALL_ALLOWLIST, notApplicable: WAIVERS }),
    verdict: 'failed',
    waived: WAIVED_LIST,
    floorSource: 'narrowed',
    narrowedBy: 'laws.enabled',
  },
  {
    cell: '09',
    w: '0',
    narrowed: 'paretoMode',
    mode: undefined,
    outcome: 'pass',
    laws: () => ({ paretoMode: true }),
    verdict: 'partial',
    waived: [],
    floorSource: 'narrowed',
    narrowedBy: 'paretoMode',
  },
  {
    cell: '10',
    w: '2',
    narrowed: 'paretoMode',
    mode: undefined,
    outcome: 'pass',
    laws: () => ({ paretoMode: true, notApplicable: WAIVERS }),
    verdict: 'partial',
    waived: WAIVED_LIST,
    floorSource: 'narrowed',
    narrowedBy: 'paretoMode',
  },
  {
    cell: '11',
    w: '2',
    narrowed: '--mode=fast',
    mode: 'fast',
    outcome: 'pass',
    laws: () => ({ notApplicable: WAIVERS }),
    verdict: 'partial',
    waived: WAIVED_LIST,
    floorSource: 'narrowed',
    narrowedBy: 'paretoMode',
  },
  {
    cell: '12',
    w: '0',
    narrowed: 'none',
    mode: 'full',
    outcome: 'refused',
    laws: () => ({ minLawsChecked: 9999 }),
    verdict: 'refused',
    waived: [],
    floorSource: 'laws.minLawsChecked',
  },
  {
    cell: '13',
    w: '2',
    narrowed: 'none',
    mode: 'full',
    outcome: 'refused',
    laws: () => ({ minLawsChecked: 9999, notApplicable: WAIVERS }),
    verdict: 'refused',
    waived: WAIVED_LIST,
    floorSource: 'laws.minLawsChecked',
  },
  {
    cell: '14',
    w: '2',
    narrowed: 'laws.enabled<M',
    mode: 'full',
    outcome: 'refused',
    laws: () => ({
      minLawsChecked: 73,
      enabled: SMALL_ALLOWLIST,
      notApplicable: WAIVERS,
    }),
    verdict: 'refused',
    waived: WAIVED_LIST,
    floorSource: 'laws.minLawsChecked',
    narrowedBy: 'laws.enabled',
  },
  {
    cell: '15',
    w: '0',
    narrowed: 'none',
    mode: 'pre-commit',
    outcome: 'pass',
    laws: () => ({}),
    verdict: 'compliance',
    waived: [],
    floorSource: 'default-25%',
  },
  {
    cell: '16',
    w: '2',
    narrowed: 'none',
    mode: 'pre-commit',
    outcome: 'pass',
    laws: () => ({ notApplicable: WAIVERS }),
    verdict: 'compliance-with-waivers',
    waived: WAIVED_LIST,
    floorSource: 'default-25%',
    extra: run =>
      expect(run.json.scope.executedLaws).toBeLessThan(
        run.json.scope.selectedLaws
      ),
  },
  {
    cell: '17',
    w: '2',
    narrowed: 'none',
    mode: 'pre-commit',
    outcome: 'fail',
    laws: () => ({ notApplicable: WAIVERS }),
    verdict: 'failed',
    waived: WAIVED_LIST,
    floorSource: 'default-25%',
  },
  {
    cell: '18',
    w: '2',
    narrowed: 'none',
    mode: 'pre-commit',
    outcome: 'refused',
    laws: () => ({ minLawsChecked: 9999, notApplicable: WAIVERS }),
    verdict: 'refused',
    waived: WAIVED_LIST,
    floorSource: 'laws.minLawsChecked',
  },
  {
    cell: '19',
    w: '0',
    narrowed: 'none',
    mode: 'pre-push',
    outcome: 'pass',
    laws: () => ({}),
    verdict: 'compliance',
    waived: [],
    floorSource: 'default-25%',
  },
  {
    cell: '20',
    w: '2',
    narrowed: 'none',
    mode: 'pre-push',
    outcome: 'pass',
    laws: () => ({ notApplicable: WAIVERS }),
    verdict: 'compliance-with-waivers',
    waived: WAIVED_LIST,
    floorSource: 'default-25%',
  },
  // 21, 22 (cache) are below: they need two runs on one project.
  /*
   * 23 as written in the contract (redundant + unknown + empty reason → pass,
   * compliance) is not reachable: an UNKNOWN key is a finding of Config
   * Integrity Guard, an always-on meta-gate at error severity, so the run
   * fails. That is correct and is not changed here. The row asserts the
   * nearest true behaviour (none of the three is a waiver, W = 0, verdict
   * `failed` by Config Integrity Guard); 23b is the contract's intent without
   * the unknown key, and adds a whitespace-only reason, which is not a waiver
   * either.
   */
  {
    cell: '23',
    w: '1 redundant + 1 unknown + 1 empty',
    narrowed: 'none',
    mode: 'full',
    outcome: 'fail',
    laws: () => ({
      notApplicable: {
        [PYTHON_LAW]: 'no Python here',
        'No Such Law Anywhere': 'typo',
        [WAIVED_A]: '',
      },
    }),
    verdict: 'failed',
    waived: [],
    floorSource: 'default-25%',
    extra: run => {
      const failed = [...run.result.results.values()].filter(
        r => !(r as { passed?: boolean }).passed
      );
      expect(failed.map(r => (r as { lawTitle?: string }).lawTitle)).toEqual([
        'Config Integrity Guard',
      ]);
    },
  },
  {
    cell: '23b',
    w: '1 redundant + 1 empty + 1 whitespace',
    narrowed: 'none',
    mode: 'full',
    outcome: 'pass',
    laws: () => ({
      notApplicable: {
        [PYTHON_LAW]: 'no Python here',
        [WAIVED_A]: '',
        [WAIVED_B]: '   ',
      },
    }),
    verdict: 'compliance',
    waived: [],
    floorSource: 'default-25%',
    extra: run => {
      const ran = [...run.result.results.values()].map(
        r => (r as { lawTitle?: string }).lawTitle
      );
      expect(ran).toEqual(expect.arrayContaining([WAIVED_A, WAIVED_B]));
      expect(run.text).toContain(
        `laws.notApplicable['${WAIVED_B}'] has no reason`
      );
    },
  },
  {
    cell: '24',
    w: '1 on a meta-gate',
    narrowed: 'none',
    mode: 'full',
    outcome: 'pass',
    laws: () => ({
      notApplicable: { 'Audit Liveness Assertion': 'we trust ourselves' },
    }),
    verdict: 'compliance',
    waived: [],
    floorSource: 'default-25%',
    extra: run => {
      const ran = [...run.result.results.values()].map(
        r => (r as { lawTitle?: string }).lawTitle
      );
      expect(ran).toContain('Audit Liveness Assertion');
    },
  },
  {
    cell: '25',
    w: '50',
    narrowed: 'none',
    mode: 'full',
    outcome: 'pass',
    laws: () => ({
      notApplicable: Object.fromEntries(FIFTY.map(x => [x.law, x.reason])),
    }),
    verdict: 'compliance-with-waivers',
    waived: [...FIFTY].sort((a, b) => a.law.localeCompare(b.law)),
    floorSource: 'default-25%',
  },
];

function expectedFloor(
  cell: Cell,
  laws: Record<string, unknown>,
  livenessApplicable: number
): number {
  if (cell.floorSource === 'laws.minLawsChecked')
    return laws.minLawsChecked as number;
  if (cell.floorSource === 'narrowed') return 0;
  return Math.max(1, Math.ceil(0.25 * livenessApplicable));
}

function verdictLine(cell: Cell, run: AuditRun): string {
  const { executedLaws, applicableLaws, narrowedBy } = run.json.scope;
  const w = cell.waived.length;
  switch (cell.verdict) {
    case 'compliance':
      return '✅ CONSTITUTIONAL COMPLIANCE: PASSED';
    case 'compliance-with-waivers':
      return `✅ CONSTITUTIONAL COMPLIANCE: PASSED WITH WAIVERS — ${executedLaws} of ${applicableLaws} applicable laws ran (${w} waived)`;
    case 'partial':
      return `⚠️  PARTIAL SCAN — ${executedLaws} of ${applicableLaws} applicable laws ran (narrowed by ${narrowedBy}${w > 0 ? `; ${w} waived` : ''}). The selected laws passed; no compliance verdict.`;
    case 'failed':
      return '❌ CONSTITUTIONAL COMPLIANCE: FAILED';
    case 'refused':
      return 'refusing to report compliance.';
  }
}

function assertConsole(cell: Cell, run: AuditRun): void {
  const line = verdictLine(cell, run);
  expect(run.text).toContain(line);
  const w = cell.waived.length;

  // The bare PASSED line and the art belong to a clean compliance only.
  if (cell.verdict === 'compliance') {
    expect(run.text).toMatch(BARE_PASS);
    expect(run.text).toMatch(ART);
  } else {
    expect(run.text).not.toMatch(BARE_PASS);
    expect(run.text).not.toMatch(ART);
  }

  if (w === 0) {
    expect(run.text).not.toContain('📋');
    return;
  }
  // The waiver block names every waived law with its reason, BEFORE the verdict.
  const header = run.text.indexOf(blockHeader(w));
  expect(header).toBeGreaterThanOrEqual(0);
  expect(header).toBeLessThan(run.text.indexOf(line));
  for (const { law, reason } of cell.waived)
    expect(run.text).toContain(`   – ${law}: ${reason}`);
}

function assertLivenessLine(cell: Cell, run: AuditRun): void {
  if (cell.outcome === 'refused') return; // the refusal prints its own floor
  const { floor, applicableLaws } = run.json.scope.liveness;
  const expected = {
    'default-25%': `floor ${floor} — default 25% of ${applicableLaws} stack-applicable laws (meta-gates included, counted before waivers)`,
    'laws.minLawsChecked': `floor ${floor} — laws.minLawsChecked`,
    narrowed: `floor 0 — narrowed by ${cell.narrowedBy}; set laws.minLawsChecked`,
  }[cell.floorSource];
  expect(run.text).toContain(expected);
}

describe('#350 every cell of the waiver contract', () => {
  stubLawChecks();

  it.each(CELLS)(
    'cell $cell — W=$w, narrowed=$narrowed, mode=$mode, $outcome → $verdict',
    async cell => {
      // Cell 23 fails by Config Integrity Guard, not by the stub.
      if (cell.outcome === 'fail' && cell.cell !== '23') setFailingLaw(FAILING);
      const laws = await cell.laws();
      const run = await auditFixture({ mode: cell.mode, laws });
      const { json, result } = run;

      // Exit code and `passed` keep their meaning.
      expect(result.passed).toBe(cell.outcome === 'pass');
      expect(run.exitCode).toBe(result.passed ? 0 : 1);
      expect(Boolean(result.refused)).toBe(cell.outcome === 'refused');

      // verdict, in the result and in the exported JSON (--json and --export).
      expect(json.verdict).toBe(cell.verdict);
      expect(result.verdict).toBe(cell.verdict);

      // The waived laws, by name and reason.
      expect(json.scope.waivedLaws).toEqual(cell.waived);

      // Invariants.
      const w = cell.waived.length;
      expect(json.scope.applicableBeforeWaivers).toBe(
        json.scope.applicableLaws + w
      );
      expect(json.scope.liveness.applicableLaws).toBe(
        json.scope.applicableBeforeWaivers + META_GATES
      );
      expect(json.scope.liveness.floorSource).toBe(cell.floorSource);
      expect(json.scope.liveness.floor).toBe(
        expectedFloor(cell, laws, json.scope.liveness.applicableLaws)
      );
      expect(json.scope.narrowedBy).toBe(cell.narrowedBy);
      // `partial` is a fact about the selection (narrowed, fewer than apply),
      // whatever the outcome; never on a refusal (#348).
      const narrowedBelowM =
        cell.narrowedBy !== undefined && cell.narrowed !== 'laws.enabled=M';
      expect(json.scope.partial).toBe(
        narrowedBelowM && cell.outcome !== 'refused'
      );
      if (cell.outcome === 'refused') expect(json.scope.executedLaws).toBe(0);

      assertConsole(cell, run);
      assertLivenessLine(cell, run);
      cell.extra?.(run);
    },
    60000
  );

  it('cell 21 — W=2, full, cache HIT: the cached run returns and prints the same verdict and waivers', async () => {
    const laws = { notApplicable: WAIVERS };
    const performance = { cache: true };
    const first = await auditFixture({ mode: 'full', laws, performance });
    const second = await auditFixture({
      mode: 'full',
      laws,
      performance,
      root: first.root,
    });

    expect(second.text).toContain('Using cached audit results (cache hit)');
    expect(second.json.verdict).toBe('compliance-with-waivers');
    expect(second.json.verdict).toBe(first.json.verdict);
    expect(second.json.scope.waivedLaws).toEqual(WAIVED_LIST);
    expect(second.json.scope).toEqual(first.json.scope);
    expect(second.exitCode).toBe(0);
    expect(second.text).toContain(blockHeader(2));
    expect(second.text).not.toMatch(BARE_PASS);
    expect(second.text).not.toMatch(ART);
  }, 60000);

  it('cell 22 — W=2→0, config changed between runs: the waiver removed is not served from the cache', async () => {
    const performance = { cache: true };
    const first = await auditFixture({
      mode: 'full',
      laws: { notApplicable: WAIVERS },
      performance,
    });
    expect(first.json.verdict).toBe('compliance-with-waivers');
    const second = await auditFixture({
      mode: 'full',
      laws: {},
      performance,
      root: first.root,
    });

    expect(second.text).not.toContain('cache hit');
    expect(second.json.verdict).toBe('compliance');
    expect(second.json.scope.waivedLaws).toEqual([]);
    expect(second.json.scope.applicableLaws).toBe(
      first.json.scope.applicableLaws + 2
    );
    expect(second.text).toMatch(BARE_PASS);
  }, 60000);

  it('the fixture is a neutral project with at least 8 applicable laws', () => {
    expect(makeFixture({})).toBeTruthy();
    expect(universal.length).toBeGreaterThanOrEqual(8);
    expect(PYTHON_LAW).not.toBe('');
  });
});

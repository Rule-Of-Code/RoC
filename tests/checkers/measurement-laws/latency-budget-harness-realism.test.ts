/**
 * LatencyBudgetHarnessRealism (#355): a latency budget measured one request
 * at a time, against an emulator with no network delay and with no baseline,
 * predicts nothing about a burst in production. Each missing scenario is
 * named at the harness file; a project without a latency budget does not
 * select the law at all (no green over nothing).
 */
import { LatencyBudgetHarnessRealismLaw } from '../../../src/checkers/measurement-laws/latency-budget-harness-realism';
import { MEASUREMENT_LAWS } from '../../../src/data/measurement-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const LAW = MEASUREMENT_LAWS.find(law => law.checkFunction === 'LatencyBudgetHarnessRealismLaw.check');
const run = (files: Record<string, string>) => LatencyBudgetHarnessRealismLaw.check(ctx(project(files)));

const LIGHTHOUSE = JSON.stringify([
  {
    path: '/*',
    timings: [{ metric: 'interactive', budget: 3000 }],
    resourceSizes: [{ resourceType: 'script', budget: 300 }],
    resourceCounts: [{ resourceType: 'third-party', budget: 10 }],
  },
]);
const ANGULAR = JSON.stringify({
  projects: {
    app: { architect: { build: { configurations: { production: { budgets: [{ type: 'initial', maximumWarning: '500kb' }] } } } } },
  },
});

const BUDGET = JSON.stringify({
  p95_ms: 300,
  endpoints: ['/items', '/profile'],
});

/** One request per endpoint, one after another, against a local emulator. */
const SEQUENTIAL = `import json, os, time, httpx
os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"
budget = json.load(open("perf/latency_budget.json"))
for path in budget["endpoints"]:
    t0 = time.perf_counter()
    httpx.get("http://127.0.0.1:8000" + path)
    assert (time.perf_counter() - t0) * 1000 < budget["p95_ms"]
`;

/** The start-up fan-out in parallel, a delay proxy in front of the emulator, a baseline to compare with. */
const REALISTIC = `import asyncio, json, os, httpx
# The emulator is reached through toxiproxy, which adds 20 ms per database call.
os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:18080"
INJECTED_DELAY_MS = 20
budget = json.load(open("perf/latency_budget.json"))
baseline = json.load(open("perf/baseline.json"))

async def burst(client):
    return await asyncio.gather(*(client.get(path) for path in budget["endpoints"]))
`;

describe('LatencyBudgetHarnessRealismLaw (#355)', () => {
  it('is gated on a latency budget: a project without one does not select the law', () => {
    expect(LAW?.requires).toBeDefined();
    expect(lawRequirementsMet(LAW?.requires, project({ 'src/app.py': 'print(1)\n' }))).toBe(false);
    expect(lawRequirementsMet(LAW?.requires, project({ 'perf/latency_budget.json': BUDGET }))).toBe(true);
    expect(lawRequirementsMet(LAW?.requires, project({ 'budgets/api.yaml': 'p95_ms: 300\n' }))).toBe(true);
    expect(lawRequirementsMet(LAW?.requires, project({ 'perf/slo.json': '{"latency_ms": 300}' }))).toBe(true);
    expect(lawRequirementsMet(LAW?.requires, project({ 'config/slots.json': '{"latency_ms": 300}' }))).toBe(false);
  });

  it('angular.json budgets (bundle size) do not select the law', () => {
    const angular = JSON.stringify({
      projects: {
        app: { architect: { build: { configurations: { production: { budgets: [{ type: 'initial', maximumWarning: '500kb' }] } } } } },
      },
    });
    expect(lawRequirementsMet(LAW?.requires, project({ 'angular.json': angular }))).toBe(false);
  });

  it('a Lighthouse budget.json is not a latency budget: it does not select the law, and no harness is asked of it', () => {
    const files = { 'budget.json': LIGHTHOUSE, 'scripts/lighthouse.sh': 'lighthouse --budget-path=budget.json\n' };
    expect(lawRequirementsMet(LAW?.requires, project(files))).toBe(false);
    expect(run(files).violations).toEqual([]);
  });

  it('a frontend key anywhere in the file rules it out, even above a latency key on a later line', () => {
    const mixed = `{\n  "resourceSizes": [],\n  "notes": "x",\n  "p95_ms": 300\n}\n`;
    expect(lawRequirementsMet(LAW?.requires, project({ 'perf/budget.json': mixed }))).toBe(false);
  });

  describe('engine: scope.applicableLaws counts the law only where a latency budget is', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ConfigLoader } = require('../../../src/config/loader');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RuleOfCodeAuditor } = require('../../../src/core/auditing/audit-engine');
    const BASE = {
      'package.json': JSON.stringify({ name: 'a', version: '1.0.0', devDependencies: { typescript: '5.6.3' } }),
      'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true } }),
      'src/index.ts': 'export const one = 1;\n',
      // A floor no project meets refuses the audit before any law runs; scope is still computed.
      'ruleofcode.config.json': JSON.stringify({ project: { type: 'typescript' }, laws: { minLawsChecked: 99999 } }),
    };
    const applicable = async (files: Record<string, string>): Promise<number> => {
      const root = project({ ...BASE, ...files });
      const spies = [
        jest.spyOn(console, 'log').mockImplementation(() => undefined),
        jest.spyOn(console, 'warn').mockImplementation(() => undefined),
        jest.spyOn(process.stdout, 'write').mockImplementation(() => true),
        jest.spyOn(process.stderr, 'write').mockImplementation(() => true),
      ];
      try {
        const auditor = await RuleOfCodeAuditor.create({ projectRoot: root, config: ConfigLoader.load(root), mode: 'full' });
        const result = await auditor.audit();
        expect(result.refused).toBeDefined();
        return result.scope.applicableLaws as number;
      } finally {
        for (const spy of spies) spy.mockRestore();
      }
    };

    it('Lighthouse budget.json and angular.json budgets add nothing; a latency budget adds exactly this law', async () => {
      const frontend = { 'budget.json': LIGHTHOUSE, 'angular.json': ANGULAR };
      const without = await applicable({});
      expect(await applicable(frontend)).toBe(without);
      expect(await applicable({ ...frontend, 'perf/budget.json': '{"/items": {"p95_ms": 300}}' })).toBe(without + 1);
    }, 60000);
  });

  describe('a budget named budget.json, measured by scripts/perf_budget.py', () => {
    const budget = JSON.stringify({ endpoints: { '/items': { p95_ms: 300 }, '/profile': { p95_ms: 300 } } });
    const sequential = `import json, time, httpx
budget = json.load(open("perf/budget.json"))
for path, limit in budget["endpoints"].items():
    t0 = time.perf_counter()
    httpx.get("http://127.0.0.1:8000" + path)
    assert (time.perf_counter() - t0) * 1000 < limit["p95_ms"]
`;
    const parallel = `import asyncio, json, httpx
budget = json.load(open("perf/budget.json"))
baseline = json.load(open("perf/baseline.json"))

async def burst(client):
    return await asyncio.gather(*(client.get(path) for path in budget["endpoints"]))
`;

    it('red: one request at a time and no baseline, each named at the harness', () => {
      const result = run({ 'perf/budget.json': budget, 'scripts/perf_budget.py': sequential });
      expect(result.passed).toBe(false);
      expect(result.violations).toEqual([
        expect.stringMatching(/^scripts\/perf_budget\.py:2: .*no concurrent scenario/),
        expect.stringMatching(/^scripts\/perf_budget\.py:2: no recorded baseline/),
      ]);
    });

    it('green: a parallel scenario and a recorded baseline (no emulator, so no delay is asked)', () => {
      const result = run({ 'perf/budget.json': budget, 'perf/baseline.json': '{}', 'scripts/perf_budget.py': parallel });
      expect(result.violations).toEqual([]);
      expect(result.passed).toBe(true);
    });
  });

  it('a budget directory is named by the harness that reads it', () => {
    const result = run({
      'budgets/api.yaml': '/items: 300ms\n/profile: 250ms\n',
      'perf/run.js': '// reads every file in budgets/ and compares with the baseline\nawait Promise.all(paths.map(p => fetch(p)));\n',
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('red: a single-request harness on an emulator names each missing scenario at the harness file', () => {
    const result = run({
      'perf/latency_budget.json': BUDGET,
      'perf/run_budget.py': SEQUENTIAL,
    });
    expect(result.passed).toBe(false);
    const violations = result.violations ?? [];
    expect(violations).toHaveLength(3);
    expect(violations.find(v => v.includes('one at a time'))).toMatch(/^perf\/run_budget\.py:3: .*no concurrent scenario/);
    expect(violations.find(v => v.includes('emulator'))).toMatch(
      /^perf\/run_budget\.py:2: .*FIRESTORE_EMULATOR_HOST.*no injected network delay/
    );
    expect(violations.find(v => v.includes('baseline'))).toMatch(/^perf\/run_budget\.py:3: no recorded baseline/);
  });

  it('green: a parallel scenario, an injected delay and a recorded baseline', () => {
    const result = run({
      'perf/latency_budget.json': BUDGET,
      'perf/baseline.json': '{}',
      'perf/run_budget.py': REALISTIC,
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('asks for network delay only when the harness runs against an emulator', () => {
    const remote = SEQUENTIAL.replace('os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"\n', '').replace(
      'for path',
      'tasks = [client.get(p) for p in budget["endpoints"]]\nawait asyncio.gather(*tasks)\nfor path'
    );
    const result = run({
      'perf/latency_budget.json': BUDGET,
      'perf/run_budget.py': remote,
      'perf/baseline.csv': 'a,1\n',
    });
    expect(result.violations).toEqual([]);
  });

  it('reads concurrency from a load tool setting in another harness file (k6 vus above one)', () => {
    const result = run({
      'perf/latency_budget.json': BUDGET,
      'perf/run_budget.py': SEQUENTIAL.replace('localhost:8080"', 'localhost:8080"  # through toxiproxy') + '# baseline: perf/main.json\n',
      'perf/burst.js': "// reads latency_budget.json\nexport const options = { vus: 8, duration: '30s' };\n",
    });
    expect(result.violations).toEqual([]);
  });

  it('a k6 script with one virtual user is still one request at a time', () => {
    const result = run({
      'perf/latency_budget.json': BUDGET,
      'perf/burst.js': '// reads latency_budget.json, compares with baseline\nexport const options = { vus: 1 };\n',
    });
    expect(result.violations).toEqual([expect.stringMatching(/^perf\/burst\.js:1: .*no concurrent scenario/)]);
  });

  it('a budget that no script reads is reported as unmeasured, not passed', () => {
    const result = run({ 'docs/latency-budget.yaml': 'p95_ms: 300\n' });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringMatching(/^docs\/latency-budget\.yaml:1: declares a latency budget, but no script/)]);
  });
});

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
    expect(lawRequirementsMet(LAW?.requires, project({ 'bench/latency-budget/run.sh': 'k6 run x.js\n' }))).toBe(true);
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

/**
 * Perf Harness Matches Production (#376 + #377): a perf harness that runs the
 * app with DEBUG logging, or profiles with a single-thread profiler while the
 * project uses a client that works on threads of its own, measures something
 * production does not do. And it does not judge what Latency Budget Harness
 * Realism (#355) judges: the two laws never report the same file for the
 * same thing.
 */
import { PerfHarnessMatchesProductionLaw } from '../../../src/checkers/cache-harness-laws/perf-harness-matches-production';
import { LatencyBudgetHarnessRealismLaw } from '../../../src/checkers/measurement-laws/latency-budget-harness-realism';
import { CACHE_HARNESS_LAWS } from '../../../src/data/cache-harness-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const LAW = CACHE_HARNESS_LAWS.find(law => law.checkFunction === 'PerfHarnessMatchesProductionLaw.check');
const run = (files: Record<string, string>) => PerfHarnessMatchesProductionLaw.check(ctx(project(files)));

const START_DEBUG = '#!/usr/bin/env bash\nset -euo pipefail\nuvicorn app.main:app --port 8000 --log-level debug &\npython perf/burst.py\n';
const START_INFO = START_DEBUG.replace('--log-level debug', '--log-level info');

const CPROFILE = `import cProfile
import pstats

from app.main import handle_burst

cProfile.run("handle_burst()", "burst.prof")
pstats.Stats("burst.prof").sort_stats("cumulative").print_stats(20)
`;
const PY_SPY = '#!/usr/bin/env bash\npy-spy record --threads -o burst.svg -- python perf/burst.py\n';
const GRPC_PROJECT = 'fastapi==0.115.0\ngoogle-cloud-firestore==2.34.1\n';

describe('PerfHarnessMatchesProductionLaw (#376, #377)', () => {
  it('is selected only where git publishes a perf script that starts the app, profiles or sets a log level', () => {
    expect(LAW?.requires).toBeDefined();
    expect(lawRequirementsMet(LAW?.requires, project({ 'perf/run_server.sh': START_DEBUG }))).toBe(true);
    expect(lawRequirementsMet(LAW?.requires, project({ 'scripts/profile_burst.py': CPROFILE }))).toBe(false);
    expect(lawRequirementsMet(LAW?.requires, project({ 'scripts/profiling_burst.py': CPROFILE }))).toBe(true);
    expect(lawRequirementsMet(LAW?.requires, project({ 'perf/README.txt': 'uvicorn --log-level debug\n', 'app/main.py': 'import logging\n' }))).toBe(false);
    expect(lawRequirementsMet(LAW?.requires, project({ 'perf/notes.md': 'Plain notes, no server.\n' }))).toBe(false);
  });

  describe('#377 DEBUG logging', () => {
    it('red: a harness starting uvicorn with --log-level debug — named at the line', () => {
      const result = run({ 'perf/run_server.sh': START_DEBUG });
      expect(result.passed).toBe(false);
      expect(result.violations).toEqual([
        expect.stringMatching(/^perf\/run_server\.sh:3: the perf harness runs at a DEBUG\/TRACE log level \(--log-level debug\) — production logs at INFO/),
      ]);
    });

    it('green: the production level, with the counter in the message and metrics', () => {
      const result = run({ 'perf/run_server.sh': START_INFO });
      expect(result.violations).toEqual([]);
      expect(result.passed).toBe(true);
      expect(result.message).toMatch(/1 perf script\(s\) read; 0 DEBUG\/TRACE log level setting\(s\), 1 setting\(s\) at a production level/);
      expect(result.metrics).toMatchObject({ filesRead: 1, debugLevelSettings: 0, productionLevelSettings: 1 });
    });

    it.each([
      ['logging.basicConfig', 'import logging\nlogging.basicConfig(level=logging.DEBUG)\nimport uvicorn\n', 2],
      ['uvicorn.run(log_level=)', 'import uvicorn\nuvicorn.run("app.main:app", port=8000, log_level="debug")\n', 2],
      ['an exported LOG_LEVEL', 'import os\nos.environ["LOG_LEVEL"] = "DEBUG"\n', 2],
      ['a shell default', 'export APP_LOG_LEVEL=${APP_LOG_LEVEL:-debug}\ngunicorn app:app\n', 1],
      ['an argparse default', 'parser.add_argument("--log-level", default="debug")\n', 1],
    ])('red: %s', (_label, script, line) => {
      const file = script.startsWith('export') ? 'bench/start.sh' : 'perf/latency_run.py';
      expect(run({ [file]: script }).violations).toEqual([expect.stringMatching(new RegExp(`^${file.replace('.', '\\.')}:${line}: the perf harness runs at a DEBUG`))]);
    });

    it('a DEBUG run next to a harness that pins the production level is not the measuring one: not reported', () => {
      const result = run({ 'perf/run_server.sh': START_INFO, 'perf/debug_server.sh': START_DEBUG });
      expect(result.violations).toEqual([]);
      expect(result.message).toMatch(/1 DEBUG\/TRACE log level setting\(s\), 1 setting\(s\) at a production level \(a harness pins the production level/);
    });

    it('a named logger at DEBUG, or debug offered only as a choice, is not the app log level', () => {
      const script = 'import logging, uvicorn\nlogging.getLogger("harness").setLevel(logging.DEBUG)\nparser.add_argument("--log-level", choices=["debug", "info"], default="info")\n';
      expect(run({ 'perf/latency_run.py': script }).violations).toEqual([]);
    });
  });

  describe('#376 single-thread profiler with a threaded client', () => {
    it('red: grpc-backed client declared + a cProfile-only perf script — the message is about the thread the profiler sees', () => {
      const result = run({ 'requirements.txt': GRPC_PROJECT, 'perf/profile_burst.py': CPROFILE });
      expect(result.passed).toBe(false);
      expect(result.violations).toEqual([
        expect.stringMatching(
          /^perf\/profile_burst\.py:1: cProfile records only the thread it runs in, and the project declares client\(s\) that work on threads of their own \(google-cloud-firestore\)/
        ),
      ]);
    });

    it('green: a py-spy (all threads) script in the harness', () => {
      const result = run({ 'requirements.txt': GRPC_PROJECT, 'perf/profile_burst.py': CPROFILE, 'perf/profile_threads.sh': PY_SPY });
      expect(result.violations).toEqual([]);
      expect(result.metrics).toMatchObject({ singleThreadProfilers: 1, threadAwareProfilerFiles: 1, threadedClients: 1 });
    });

    it('green: the same cProfile script without a threaded client', () => {
      expect(run({ 'requirements.txt': 'fastapi==0.115.0\n', 'perf/profile_burst.py': CPROFILE }).violations).toEqual([]);
    });

    it('yappi counts as thread-aware unless profile_threads=False', () => {
      const yappi = (args: string) => `import yappi\nyappi.set_clock_type("cpu")\nyappi.start(${args})\n`;
      expect(run({ 'requirements.txt': 'grpcio==1.75.1\n', 'perf/profiling.py': yappi('') }).violations).toEqual([]);
      expect(run({ 'requirements.txt': 'grpcio==1.75.1\n', 'perf/profiling.py': yappi('profile_threads=False') }).violations).toEqual([
        expect.stringMatching(/^perf\/profiling\.py:3: yappi with profile_threads=False records only the thread it runs in/),
      ]);
    });
  });

  it('judged nothing, never compliant, when no perf script can be read', () => {
    const result = run({ 'app/main.py': 'print(1)\n' });
    expect(result.passed).toBe(false);
    expect(result.judgedNothing).toBe(true);
  });

  it('does not judge what Latency Budget Harness Realism judges: no file is reported by both laws for the same thing', () => {
    // One harness file that both laws read: it names the latency budget, runs one request at a time
    // against an emulator with no baseline or read report (#355's subject), and starts the app with
    // DEBUG logging and profiles it with cProfile (this law's subject).
    const files = {
      'requirements.txt': GRPC_PROJECT,
      'perf/latency_budget.json': JSON.stringify({ p95_ms: 300, endpoints: ['/items'] }),
      'perf/run_budget.py': `import cProfile, json, os, subprocess, httpx
os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"
subprocess.Popen(["uvicorn", "app.main:app", "--log-level", "debug"])
subprocess.Popen("uvicorn app.main:app --log-level debug", shell=True)
budget = json.load(open("perf/latency_budget.json"))
cProfile.run("httpx.get('http://127.0.0.1:8000/items')")
`,
    };
    const harness = LatencyBudgetHarnessRealismLaw.check(ctx(project(files))).violations ?? [];
    const perf = run(files).violations ?? [];
    expect(harness.length).toBeGreaterThan(0);
    expect(perf.map(v => v.slice(0, v.indexOf(': ')))).toEqual(['perf/run_budget.py:3', 'perf/run_budget.py:4', 'perf/run_budget.py:1']);
    const topic = (v: string): string => v.replace(/^[^:]+:\d+: /, '').split(' — ')[0] ?? v;
    const PERF_TOPICS = /log level|DEBUG|profile|thread/i;
    const HARNESS_TOPICS = /concurrent|one at a time|emulator|baseline|read report|reads repeated/i;
    expect(harness.filter(v => PERF_TOPICS.test(topic(v)))).toEqual([]);
    expect(perf.filter(v => HARNESS_TOPICS.test(topic(v)))).toEqual([]);
    const at = (v: string): string => /^([^:]+:\d+):/.exec(v)?.[1] ?? '';
    const sameSpot = harness.filter(h => perf.some(p => at(p) === at(h) && topic(p) === topic(h)));
    expect(sameSpot).toEqual([]);
  });
});

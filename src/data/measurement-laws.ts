/**
 * Measurement Laws Data Module
 *
 * Places where a measurement is green and cannot see what production does: a
 * latency budget measured one request at a time on an emulator, tracing that
 * samples few requests and stops at the HTTP layer, a test server that makes
 * every connection pay for a failed IPv6 attempt. Each law reads the harness,
 * the manifests or the test configs the project commits, and names the file
 * and line a finding is about. legacyId range: 889–891.
 */

import { LATENCY_BUDGET_FILES } from '../checkers/measurement-laws/latency-budget-harness-realism';
import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';

export const MEASUREMENT_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Latency Budget Harness Realism',
      'A latency budget harness runs a concurrent scenario, injects network delay when it runs against an emulator, and compares with a recorded baseline',
      'measurement'
    ),
    legacyId: 889,
    article: 'VII',
    subsection: '7.38',
    title: 'Latency Budget Harness Realism',
    rationale:
      'A per-endpoint budget measured one request at a time against a local emulator has neither CPU contention nor network round trips. A client that opens a screen with several requests at once makes them queue for the same CPU, and every database call that costs a network round trip in production costs a loopback hop on the emulator, so the harness reports every endpoint under budget while production reports most of them over it. Without a recorded baseline the harness can only say "under the budget", never "no endpoint got slower than the previous release".',
    satisfiedBy: {
      typescript:
        'Add a scenario that fires the start-up requests together (Promise.all, k6 with vus > 1, autocannon), put toxiproxy or a delay setting between the app and the emulator, and store per-endpoint baseline results to compare with.',
      python:
        'Add a scenario that fires the start-up requests together (asyncio.gather, Locust with -u > 1), put toxiproxy or a delay setting between the app and the emulator, and store per-endpoint baseline results to compare with.',
    },
    detectionLimits: [
      'Applies only where a file or directory name says latency budget (*latency*budget*, *budget*latency*, *response-time*budget*, *response_time*budget*); a budget kept under another name, or only as thresholds inside a k6/Locust script, does not select the law.',
      'The harness is the budget file when it is a .py/.js/.ts/.sh script, plus every .py/.js/.ts/.sh/.yml/.toml file that names the budget file (by its name without extension); a harness that reads the budget without naming it is not seen, and a budget no file names is reported as unmeasured.',
      'All three checks are text matches over the harness set, not an execution: concurrency is a primitive or load-tool setting above one (Promise.all, asyncio.gather, ThreadPoolExecutor, autocannon, k6 vus, Artillery arrivalRate, Locust -u, hey/wrk/ab -c, concurrency=N, xargs -P); a concurrent call that never runs, or one in a comment, counts.',
      'Network delay is asked for only when the harness names an emulator (the *_EMULATOR_HOST variables, firebase/gcloud emulators, DynamoDB Local, LocalStack, Cosmos DB emulator, mongodb-memory-server, Azurite); it counts toxiproxy, netem, or an identifier like injected_delay / NETWORK_LATENCY / rpcDelay — a variable that only measures network latency under such a name also counts.',
      'The baseline counts when any harness file mentions "baseline" or a *baseline*.json/csv/yaml/toml/txt/ndjson file exists; whether the comparison is per endpoint, and against which branch, is not checked.',
    ],
    emoji: '⏱️',
    description:
      'A latency budget harness runs a concurrent scenario, injects network delay when it runs against an emulator, and compares with a recorded baseline',
    priority: 'MEDIUM',
    category: 'TESTING',
    requires: { anyFile: LATENCY_BUDGET_FILES },
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'LatencyBudgetHarnessRealismLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.38: Latency budget measured one request at a time, without network delay or baseline',
    remediation: 'Add a concurrent scenario, inject network delay against the emulator, and record a baseline to compare with',
  },
];

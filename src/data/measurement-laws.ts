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
import { REQUIRES_OTEL_SDK } from '../checkers/measurement-laws/tracing-explains-latency';
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

  {
    id: generateLawId(
      'Tracing Explains Latency',
      'OpenTelemetry tracing chooses its sampler explicitly and instruments the database clients the project uses',
      'measurement'
    ),
    legacyId: 890,
    article: 'VI',
    subsection: '6.27',
    title: 'Tracing Explains Latency',
    rationale:
      "OpenTelemetry can be installed and exporting and still unable to say where a slow request's time went. With no sampler chosen, the SDK default parentbased_always_on follows the caller's sampled flag whenever a trace context arrives, and a platform front end that forwards mostly unsampled contexts leaves most requests without a trace although their log lines carry a trace id. Without instrumentation for the database client, spans stop at the HTTP layer and the time spent in database calls is one opaque server span.",
    satisfiedBy: {
      typescript:
        'Pass sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(r) }) to NodeSDK, or set OTEL_TRACES_SAMPLER in the deployed environment; declare the instrumentation for each database client (or @opentelemetry/auto-instrumentations-node).',
      python:
        'Pass sampler= to TracerProvider, or set OTEL_TRACES_SAMPLER in the deployed environment; declare the instrumentation for each database client (opentelemetry-instrumentation-grpc for the Google Cloud gRPC clients, -sqlalchemy, -psycopg, -asyncpg, -pymongo, -redis, …) or run opentelemetry-bootstrap.',
    },
    detectionLimits: [
      'Selected where opentelemetry-sdk or opentelemetry-distro (Python manifests), or @opentelemetry/sdk-node, sdk-trace-node, sdk-trace-base or sdk-trace (package.json) is declared; a vendor distribution that bundles the SDK under another name does not select it.',
      'A sampler counts per setup file: a file that constructs TracerProvider / NodeSDK / NodeTracerProvider / BasicTracerProvider counts as sampled when it mentions sampler= / sampler: or a built-in sampler class anywhere. OTEL_TRACES_SAMPLER given a value in any non-test file (env, Dockerfile, YAML, TOML, JSON, shell, code) counts for the whole repository — which service a deploy file belongs to is not checked.',
      "Instrumentation counts when declared in a manifest — not whether it is activated (instrument() / registerInstrumentations), and not a client's own built-in tracing (some database and cloud clients emit spans themselves when enabled). opentelemetry-bootstrap mentioned in any file counts as instrumenting every Python client.",
      "The client table is fixed: Python google-cloud-firestore, google-cloud-datastore, sqlalchemy, psycopg2(-binary), psycopg, asyncpg, aiopg, pymysql, mysqlclient, mysql-connector-python, pymongo, redis; Node mongodb, mongoose, pg, mysql, mysql2, ioredis, redis, tedious, knex, @google-cloud/firestore, @google-cloud/datastore, @prisma/client. A client reached only through a wrapper (firebase-admin's Firestore, an ORM over an undeclared driver) is not seen.",
    ],
    emoji: '🔭',
    description: 'OpenTelemetry tracing chooses its sampler explicitly and instruments the database clients the project uses',
    priority: 'MEDIUM',
    category: 'PERFORMANCE',
    requires: REQUIRES_OTEL_SDK,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'TracingExplainsLatencyLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VI.6.27: Tracing on the default sampler, or a database client without instrumentation',
    remediation: 'Choose the sampler in code or OTEL_TRACES_SAMPLER, and declare instrumentation for each database client',
  },

  {
    id: generateLawId(
      'Test Server Loopback Address Match',
      'A test or perf server bound to 127.0.0.1 is not called through localhost',
      'measurement'
    ),
    legacyId: 891,
    article: 'VII',
    subsection: '7.39',
    title: 'Test Server Loopback Address Match',
    rationale:
      'localhost usually resolves to ::1 before 127.0.0.1. A test or perf server that listens on 127.0.0.1 only, called as http://localhost:…, makes every new connection try IPv6 first; where that attempt is not refused at once, a browser moves to IPv4 only when its Happy Eyeballs fallback timer fires (300 ms in Chromium). The harness still compares A and B fairly, but its absolute timings carry that delay on every new connection, the document included.',
    satisfiedBy: {
      typescript:
        "Bind the server with host '::' (dual-stack) or to both loopback addresses, or point the client at http://127.0.0.1:<port> — the same literal on both sides.",
      python:
        'Run uvicorn/gunicorn/http.server with --host :: (dual-stack) or on both loopback addresses, or point the client at http://127.0.0.1:<port> — the same literal on both sides.',
    },
    detectionLimits: [
      'Reads test and perf files only — by directory (tests/, e2e/, perf/, performance/, bench/, load-test/, harness/, mocks/, fixtures/, cypress/, playwright/, scripts/), by name (test, spec, e2e, perf, bench, load, harness, mock), playwright/cypress/vitest/jest/karma/wdio configs, and package.json scripts whose name says test, e2e, perf, bench, load, mock or harness.',
      "A server bind is a line with --host/--bind/-b/-a/-H 127.0.0.1, .listen(port, '127.0.0.1'), a (\"127.0.0.1\", port) tuple on a server or bind call, or host: '127.0.0.1' within two lines of a server word; a bind spread over more lines, or an address built from a variable, is not seen. A file that also binds :: or ::1 is taken to listen on both families.",
      "Ports are compared when both are known. A port from a variable (the server's argument, or a client URL's ${name}) resolves only through a numeric assignment of that name in the same file; an unresolved server port is paired with every localhost URL, an unresolved client port with none, and a port-0 bind (an OS-assigned port, whose address the client gets at runtime) is skipped. Client URLs are http(s)/ws(s)://localhost literals in the same file set; a base URL assembled otherwise is not seen.",
      'Only an IPv4-only bind called through localhost is reported; a server on localhost called as 127.0.0.1, and a server on 0.0.0.0, are not. A project whose test files bind no server to 127.0.0.1 passes: there is nothing to compare.',
    ],
    emoji: '🔁',
    description: 'A test or perf server bound to 127.0.0.1 is not called through localhost',
    priority: 'LOW',
    category: 'TESTING',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'TestServerLoopbackAddressMatchLaw.check',
    violationMessage: 'CONSTITUTIONAL VIOLATION Article VII.7.39: Test server bound to 127.0.0.1 while the client calls localhost',
    remediation: 'Bind the test server dual-stack, or use the same loopback literal on both sides',
  },
];

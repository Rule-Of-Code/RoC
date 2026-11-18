/**
 * Latency Budget Harness Realism
 *
 * A latency budget measured by sending each request alone, against a local
 * emulator, measures neither CPU contention nor network round trips: the
 * client that opens a screen with several requests at once makes them queue
 * for the same CPU, and every database call that costs a network round trip
 * in production costs a loopback hop on the emulator. Such a harness is green
 * while production is red. And without a recorded baseline, the harness can
 * only say "under the absolute budget", never "no endpoint got slower".
 *
 * The law applies where a latency budget exists — a file whose name says so
 * (`requires.anyFile`, {@link LATENCY_BUDGET_FILES}). The harness is that file
 * when it is a script, plus every script or config that names it. Across that
 * harness set it asks for three things, each reported at the harness file
 * that lacks it: a concurrent scenario; when an emulator is the database, an
 * injected network delay; and a recorded baseline to compare with.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { LawBase } from '../law-base';
import { firstMatch, readProjectFiles, type TextFile } from './project-text-files';

/** A latency budget, by file or directory name. Also the law's `requires.anyFile`. */
export const LATENCY_BUDGET_FILES: readonly string[] = [
  '**/*latency*budget*',
  '**/*budget*latency*',
  '**/*response-time*budget*',
  '**/*response_time*budget*',
];

/** A budget file that is itself a script measures the budget; a JSON/YAML/TOML budget is data. */
const SCRIPT = /\.(?:py|[cm]?js|[cm]?ts|sh|bash)$/i;
/** Files that run or read a harness: scripts, and the YAML/TOML that configures load tools and CI. */
const HARNESS_CANDIDATES = ['**/*.{py,js,mjs,cjs,ts,mts,cts,sh,bash,yml,yaml,toml}'];

/** N requests in flight at once: language primitives and load-tool settings above one. */
const MORE_THAN_ONE = String.raw`(?:[2-9]|\d{2,})`;
const CONCURRENCY: readonly RegExp[] = [
  /\bPromise\.(?:all|allSettled|any)\s*\(/,
  /\basyncio\.(?:gather|TaskGroup|as_completed)\b/,
  /\b(?:ThreadPoolExecutor|ProcessPoolExecutor)\b|\bconcurrent\.futures\b/,
  /\banyio\.create_task_group\b|\btrio\.open_nursery\b|\bgevent\.(?:joinall|pool)\b/,
  /\bautocannon\b/,
  new RegExp(String.raw`\b(?:vus|maxVUs|preAllocatedVUs)\s*:\s*${MORE_THAN_ONE}`),
  new RegExp(String.raw`--vus[= ]${MORE_THAN_ONE}`),
  /\barrivalRate\s*:/,
  new RegExp(String.raw`\blocust\b[^\n]*(?:--users|-u)[= ]?${MORE_THAN_ONE}`),
  new RegExp(String.raw`\b(?:hey|wrk|ab|oha|bombardier)\b[^\n]*\s-c\s*${MORE_THAN_ONE}`),
  new RegExp(String.raw`\bconcurrency\s*[=:]\s*${MORE_THAN_ONE}`, 'i'),
  new RegExp(String.raw`--concurrency[= ]${MORE_THAN_ONE}`),
  new RegExp(String.raw`\bxargs\b[^\n]*\s-P\s*${MORE_THAN_ONE}`),
];

/** A local emulator standing in for a cloud database. */
const EMULATOR: readonly RegExp[] = [
  /\b(?:FIRESTORE|DATASTORE|PUBSUB|BIGTABLE|SPANNER|FIREBASE_DATABASE|FIREBASE_STORAGE|FIREBASE_AUTH)_EMULATOR_HOST\b/,
  /\bemulators:(?:start|exec)\b/,
  /\bgcloud\s+(?:beta\s+)?emulators\b/,
  /\bdynamodb[-_]?local\b/i,
  /\blocalstack\b/i,
  /\bcosmos(?:db)?[-_ ]?emulator\b/i,
  /\bmongodb-memory-server\b|\bMongoMemoryServer\b/,
  /\bazurite\b/i,
];

/** Network delay injected on purpose: a proxy, the kernel's netem, or a named delay setting. */
const INJECTED_DELAY: readonly RegExp[] = [
  /\btoxiproxy\b/i,
  /\bnetem\b/,
  /(?<![a-z])(?:inject(?:ed)?|added|extra|artificial|simulated|network|rpc|db)[_-]?(?:delay|latency)(?![a-z])/i,
];

const BASELINE = /\bbaseline\b/i;
const BASELINE_FILES = ['**/*baseline*.{json,csv,yaml,yml,toml,txt,ndjson}'];

/** Where a harness states its budget, as the anchor for findings about the whole harness. */
const BUDGET_MENTION = [/budget/i, /\bp(?:50|90|95|99)\b/i, /percentile/i];

export class LatencyBudgetHarnessRealismLaw extends LawBase {
  static readonly LAW_NAME = 'Latency Budget Harness Realism';

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const budgets = readProjectFiles(
      projectRoot,
      LATENCY_BUDGET_FILES.flatMap(glob => [glob, `${glob}/**`])
    );
    const harness = this.harnessFiles(projectRoot, budgets);
    const violations =
      harness.length === 0
        ? budgets.map(
            budget =>
              `${budget.rel}:1: declares a latency budget, but no script or config in the repository reads or runs it — nothing measures the budget`
          )
        : [...this.missingConcurrency(harness), ...this.emulatorWithoutDelay(harness), ...this.missingBaseline(projectRoot, harness)];
    return this.createResult(
      violations,
      this.LAW_NAME,
      'TESTING',
      [
        'Replay the client start-up fan-out (N requests in parallel) and compare each request with the baseline branch',
        'Against an emulator, inject a network delay per database call (toxiproxy, tc netem, or a delay setting) and say so in the harness',
        'Record per-endpoint results of the baseline so "no endpoint got slower" is checked, not only "under the budget"',
      ],
      context
    );
  }

  /** Budget files that are scripts, plus every script or config that names a budget file. */
  private static harnessFiles(projectRoot: string, budgets: TextFile[]): TextFile[] {
    const stems = [...new Set(budgets.map(budget => (budget.rel.split('/').pop() ?? '').replace(/\.[^.]+$/, '')))].filter(
      stem => stem.length > 0
    );
    const budgetRels = new Set(budgets.map(budget => budget.rel));
    const scripts = budgets.filter(budget => SCRIPT.test(budget.rel));
    const naming = readProjectFiles(projectRoot, HARNESS_CANDIDATES).filter(
      file => !budgetRels.has(file.rel) && stems.some(stem => file.content.includes(stem))
    );
    return [...scripts, ...naming];
  }

  private static missingConcurrency(harness: TextFile[]): string[] {
    if (harness.some(file => firstMatch(file.content, CONCURRENCY))) return [];
    return harness.map(
      file =>
        `${file.rel}:${this.anchor(file)}: the latency budget harness sends requests one at a time — no concurrent scenario (N requests in parallel, as a client opening a screen sends them) in any harness file, so queueing for CPU under a burst is never measured`
    );
  }

  private static emulatorWithoutDelay(harness: TextFile[]): string[] {
    if (harness.some(file => firstMatch(file.content, INJECTED_DELAY))) return [];
    return harness.flatMap(file => {
      const emulator = firstMatch(file.content, EMULATOR);
      return emulator
        ? [
            `${file.rel}:${emulator.line}: the harness runs against an emulator (${emulator.text}) with no injected network delay — every database call costs a loopback hop instead of a network round trip; add a proxy (toxiproxy), tc netem or a per-call delay setting, and document it in the harness`,
          ]
        : [];
    });
  }

  private static missingBaseline(projectRoot: string, harness: TextFile[]): string[] {
    if (harness.some(file => BASELINE.test(file.content))) return [];
    if (readProjectFiles(projectRoot, BASELINE_FILES).length > 0) return [];
    return harness.map(
      file =>
        `${file.rel}:${this.anchor(file)}: no recorded baseline — the harness compares with the absolute budget only, so "no endpoint got slower than the previous release" cannot be checked`
    );
  }

  private static anchor(file: TextFile): number {
    return firstMatch(file.content, BUDGET_MENTION)?.line ?? 1;
  }
}

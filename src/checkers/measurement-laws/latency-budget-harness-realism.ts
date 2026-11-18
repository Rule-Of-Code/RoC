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
 * A latency budget is a JSON/YAML/TOML file with "budget" in its name or in a
 * directory's name, or "slo" as a word of either ({@link LATENCY_BUDGET_CANDIDATES}),
 * whose content holds endpoint latency keys — p50/p90/p95/p99, latency,
 * response time, `*_ms`, a `"/path": 300ms` value — and none of the keys of a
 * frontend size or timing budget (Lighthouse, Angular, webpack, bundlesize,
 * size-limit): {@link LATENCY_BUDGET_PATTERN}. The law is selected only where
 * such a file exists ({@link REQUIRES_LATENCY_BUDGET}, `requires.anyFileContaining`)
 * and reads exactly the files that gate matched. The harness is every script or
 * config that names a budget file (or its budget directory). Across that
 * harness set the law asks for three things, each reported at the harness
 * file that lacks it: a concurrent scenario; when an emulator is the
 * database, an injected network delay; and a recorded baseline.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LawRequirement } from '../../types/enhanced-law.types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { filesContaining } from '../../utils/law-requirements';
import { LawBase } from '../law-base';
import { firstMatch, readProjectFiles, type TextFile } from './project-text-files';

/** Budget candidates by name: "budget" in the file or a directory name, or "slo" as a word of either. */
export const LATENCY_BUDGET_CANDIDATES: readonly string[] = [
  '**/*{budget,Budget}*.{json,yaml,yml,toml}',
  '**/*{budget,Budget}*/**/*.{json,yaml,yml,toml}',
  '**/{,*[-_.]}{slo,SLO}{,s}{,[-_.]*}.{json,yaml,yml,toml}',
  '**/{,*[-_.]}{slo,SLO}{,s}{,[-_.]*}/**/*.{json,yaml,yml,toml}',
];

/** Keys of budgets that are not endpoint latency: Lighthouse, Angular, webpack, bundlesize, size-limit. */
const NOT_ENDPOINT_LATENCY = String.raw`resourceSizes|resourceCounts|["']?timings["']?\s*:|maximumWarning|maximumError|maxAssetSize|maxEntrypointSize|bundlesize|size-limit`;
/** Endpoint latency keys and values; case is spelled out so the pattern needs no flags. */
const LATENCY_KEY = String.raw`(?<![A-Za-z])[pP](?:50|90|95|99)(?![0-9])|[lL]atency|LATENCY|[rR]esponse[_-]?[tT]ime|RESPONSE_TIME|[A-Za-z0-9]_(?:ms|MS)\b|["']?/[\w/{}:.-]*["']?\s*:\s*["']?\d+(?:\.\d+)?\s*ms\b`;
/**
 * A candidate's content is a latency budget: a latency key, and no key of a
 * frontend size or timing budget anywhere in the file. `(?<![\s\S])` anchors
 * at the start of the text: `requires` compiles with the `m` flag, where `^`
 * would also match each line start and the look-ahead would only see the
 * lines below it.
 */
export const LATENCY_BUDGET_PATTERN = String.raw`(?<![\s\S])(?![\s\S]*(?:${NOT_ENDPOINT_LATENCY}))[\s\S]*?(?:${LATENCY_KEY})`;

/** Selected only where a latency budget exists; the law reads the very files this gate matched. */
export const REQUIRES_LATENCY_BUDGET: LawRequirement = {
  anyFileContaining: [{ files: LATENCY_BUDGET_CANDIDATES, pattern: LATENCY_BUDGET_PATTERN }],
};

/** A directory name that makes its files budget candidates. */
const BUDGET_DIRECTORY = /budget|(?:^|[-_.])slos?(?:[-_.]|$)/i;

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
    const budgets = this.latencyBudgets(projectRoot);
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

  /** The latency budgets the gate matched, read through the gate's own reader so the two cannot disagree. */
  private static latencyBudgets(projectRoot: string): TextFile[] {
    return REQUIRES_LATENCY_BUDGET.anyFileContaining!.flatMap(entry => filesContaining(projectRoot, entry)).flatMap(file => {
      try {
        return [{ rel: path.relative(projectRoot, file).replace(/\\/g, '/'), content: fs.readFileSync(file, 'utf8') }];
      } catch {
        return [];
      }
    });
  }

  /** Every script or config that names a budget file, or the budget directory it sits in. */
  private static harnessFiles(projectRoot: string, budgets: TextFile[]): TextFile[] {
    const references = [
      ...new Set(
        budgets.flatMap(budget => {
          const segments = budget.rel.split('/');
          const directories = segments.slice(0, -1).filter(segment => BUDGET_DIRECTORY.test(segment));
          return [segments[segments.length - 1] ?? budget.rel, ...directories.map(directory => `${directory}/`)];
        })
      ),
    ];
    const budgetRels = new Set(budgets.map(budget => budget.rel));
    return readProjectFiles(projectRoot, HARNESS_CANDIDATES).filter(
      file => !budgetRels.has(file.rel) && references.some(reference => file.content.includes(reference))
    );
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

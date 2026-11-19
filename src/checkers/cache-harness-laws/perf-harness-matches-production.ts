/**
 * Perf Harness Matches Production (#376, #377)
 *
 * A latency or CPU harness measures the app the way it runs it. Two ways it
 * measures something production never does:
 *
 * - DEBUG logging (#377). The app under test logs at DEBUG (or TRACE) while
 *   production logs at INFO: every library's debug line costs CPU, the
 *   numbers are inflated and the profile shows logging as a hot spot. A
 *   finding is each line of a perf script that sets a DEBUG/TRACE level —
 *   a server's `--log-level`, `log_level=`, `logging.basicConfig(level=…)`,
 *   the root logger's `setLevel`, or a `*LOG_LEVEL` environment variable.
 * - A profiler that sees one thread (#376). `cProfile` and `profile` hook
 *   the calls of the thread that runs them, and yappi does too when told
 *   `profile_threads=False`. A client that does part of its work on its own
 *   threads (a gRPC poller, a C library's I/O threads) puts CPU where such a
 *   profiler cannot see it, and the short, frequently called functions it
 *   does see look hot. Reported when the project declares a client from
 *   {@link THREADED_PYTHON_CLIENTS} and no perf script uses a profiler that
 *   samples every thread (py-spy, yappi with threads on).
 *
 * The subject is the perf, benchmark, load and profiling scripts git
 * publishes ({@link REQUIRES_PERF_HARNESS}); the law judges exactly the files
 * that selected it.
 */

import type { LawRequirement } from '../../types/enhanced-law.types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  readFilesContaining,
  type ContainingFile,
} from '../../utils/law-requirements';
import {
  declaredPythonDependencies,
  normalizePythonName,
} from '../../utils/python-dependencies';
import { LawBase } from '../law-base';
import { matchesWithLines, subjectResult } from './subject-result';

/**
 * Python clients that run work on threads of their own, confirmed per name:
 * grpcio is the gRPC runtime (its poller thread runs outside the event
 * loop); the Google Cloud clients and firebase-admin declare grpcio and
 * google-api-core[grpc] as plain dependencies on PyPI (not an extra);
 * confluent-kafka is built on librdkafka, which "uses multiple threads
 * internally". A client whose gRPC transport is an optional extra
 * (google-cloud-storage) is not listed.
 */
export const THREADED_PYTHON_CLIENTS: readonly string[] = [
  'grpcio',
  'google-cloud-firestore',
  'google-cloud-pubsub',
  'google-cloud-spanner',
  'google-cloud-bigtable',
  'google-cloud-datastore',
  'google-cloud-tasks',
  'google-cloud-logging',
  'firebase-admin',
  'confluent-kafka',
];

const SCRIPT_EXTENSIONS =
  '{py,sh,bash,zsh,ps1,js,mjs,cjs,ts,mts,yml,yaml,toml,ini,cfg,env,md}';
const PERF_DIRECTORIES =
  '{perf,performance,bench,benchmark,benchmarks,benches,profiling,load,loadtest,loadtests,load-test,load_test,latency,stress}';
const PERF_NAMES =
  '{perf,Perf,PERF,bench,Bench,profiling,profiler,latency,loadtest,load_test,load-test,locustfile,stress}';

/** The perf, benchmark, load and profiling files: by directory, or by name. */
export const PERF_HARNESS_FILES: readonly string[] = [
  `**/${PERF_DIRECTORIES}/**/*.${SCRIPT_EXTENSIONS}`,
  `**/*${PERF_NAMES}*.${SCRIPT_EXTENSIONS}`,
  `**/${PERF_DIRECTORIES}/**/.env*`,
];

/** What makes such a file a harness that runs or profiles the app: a profiler, an app server, a log level. */
const HARNESS_SUBJECT = String.raw`\bcProfile\b|^\s*(?:import\s+profile\b|from\s+profile\s+import\b)|-m\s+profile\b|\byappi\b|\bpy-spy\b|\b(?:uvicorn|gunicorn|hypercorn|daphne|granian)\b|--log-?level\b|\blog_?level\b|\bLOG_?LEVEL\b|\bbasicConfig\s*\(|\.setLevel\s*\(`;

/** Selected where git publishes a perf script that profiles, starts a server or sets a log level. */
export const REQUIRES_PERF_HARNESS: LawRequirement = {
  anyFileContaining: [{ files: PERF_HARNESS_FILES, pattern: HARNESS_SUBJECT }],
};

const NOT_PRODUCTION = '(?:debug|trace)';
const PRODUCTION = '(?:info|warning|warn|error|critical)';

/** Every way a perf script sets the app's log level; `{LEVEL}` is replaced by the level alternatives. */
const LEVEL_SETTINGS: readonly string[] = [
  // uvicorn / gunicorn / hypercorn / granian / celery: --log-level debug, --log-level=debug, --loglevel debug
  String.raw`--log-?level(?:=|\s+)["']?{LEVEL}\b`,
  // an argument list: ["uvicorn", "app:app", "--log-level", "debug"]
  String.raw`--log-?level["']\s*,\s*["']{LEVEL}\b`,
  // argparse: add_argument("--log-level", default="debug")
  String.raw`--log-?level["']\s*,[^)\n]*\bdefault\s*=\s*["']{LEVEL}\b`,
  // uvicorn.run(..., log_level="debug"), logLevel: 'debug', log_level: debug
  String.raw`\blog_?level["']?\s*[=:]\s*["']?{LEVEL}\b`,
  // logging.basicConfig(level=logging.DEBUG), the root logger's setLevel
  String.raw`\bbasicConfig\s*\([^)]*\blevel\s*=\s*(?:logging\.)?["']?{LEVEL}\b`,
  String.raw`\bgetLogger\(\s*\)\s*\.setLevel\(\s*(?:logging\.)?["']?{LEVEL}\b`,
  // LOG_LEVEL=DEBUG, export APP_LOG_LEVEL=debug, LOG_LEVEL: DEBUG, ${LOG_LEVEL:-debug}, os.environ["LOG_LEVEL"] = "DEBUG", {"LOG_LEVEL": "DEBUG"}
  String.raw`\b\w*LOG_?LEVEL["']?\s*\]?\s*(?:=|:-|:|,)\s*["']?{LEVEL}\b`,
];

const levelPatterns = (level: string): RegExp[] =>
  LEVEL_SETTINGS.map(
    source => new RegExp(source.replace('{LEVEL}', level), 'gim')
  );
const DEBUG_SETTINGS = levelPatterns(NOT_PRODUCTION);
const PRODUCTION_SETTINGS = levelPatterns(PRODUCTION);

/** Profilers that record only the thread they run in. */
const SINGLE_THREAD_PROFILERS: ReadonlyArray<{
  name: string;
  pattern: RegExp;
}> = [
  { name: 'cProfile', pattern: /\bcProfile\b/g },
  {
    name: 'profile',
    pattern:
      /^\s*(?:import\s+profile\b|from\s+profile\s+import\b)|-m\s+profile\b/gm,
  },
  {
    name: 'yappi with profile_threads=False',
    pattern: /\byappi\.start\([^)]*\bprofile_threads\s*=\s*False/g,
  },
];

/** Profilers that see every thread: py-spy samples all threads; yappi profiles all threads unless told not to. */
const THREAD_AWARE_PROFILERS: readonly RegExp[] = [
  /\bpy-spy\b/,
  /\byappi\.start\((?![^)]*\bprofile_threads\s*=\s*False)/,
];

interface Hit {
  rel: string;
  line: number;
  text: string;
}

/** Each line of a file that one of the patterns matches, once per line. */
function hitsOf(file: ContainingFile, patterns: readonly RegExp[]): Hit[] {
  const byLine = new Map<number, Hit>();
  for (const pattern of patterns) {
    for (const { text, line } of matchesWithLines(file.content, pattern)) {
      if (!byLine.has(line))
        byLine.set(line, { rel: file.rel, line, text: text.trim() });
    }
  }
  return [...byLine.values()].sort((a, b) => a.line - b.line);
}

export class PerfHarnessMatchesProductionLaw extends LawBase {
  static readonly LAW_NAME = 'Perf Harness Matches Production';

  static check(context: LawCheckContext): LawResult {
    const ignores = context.config.ignores?.global ?? [];
    const files = (REQUIRES_PERF_HARNESS.anyFileContaining ?? []).flatMap(
      entry => readFilesContaining(context.projectRoot, entry, ignores)
    );
    const debug = files.flatMap(file => hitsOf(file, DEBUG_SETTINGS));
    const pinned = files.flatMap(file => hitsOf(file, PRODUCTION_SETTINGS));
    const threaded = this.threadedClients(context.projectRoot);
    const profilers = this.singleThreadProfilers(files);
    const threadAware = files.filter(file =>
      THREAD_AWARE_PROFILERS.some(pattern => pattern.test(file.content))
    ).length;
    const blind = threaded.length > 0 && threadAware === 0 ? profilers : [];
    return subjectResult({
      lawName: this.LAW_NAME,
      category: 'TESTING',
      context,
      // A harness that pins the production level is the measuring one; a DEBUG run next to it is for reading logs (#377).
      findings: [
        ...(pinned.length === 0 ? debug : []).map(hit =>
          this.describeDebug(hit)
        ),
        ...blind.map(hit => this.describeProfiler(hit, threaded)),
      ],
      suggestions: [
        'Start the app under test with the log level production runs (INFO): --log-level info, or the production LOG_LEVEL',
        'Profile with a sampler that sees every thread: py-spy record (add --threads for per-thread stacks), or yappi with profile_threads left on',
      ],
      filesRead: files.length,
      nothingRead: 'no perf, benchmark, load or profiling script could be read',
      // Every script read is judged: its log level lines and its profilers.
      judged: files.length,
      noSubject: '',
      passSummary: `${files.length} perf script(s) read; ${debug.length} DEBUG/TRACE log level setting(s), ${pinned.length} setting(s) at a production level${debug.length > 0 && pinned.length > 0 ? ' (a harness pins the production level, so the DEBUG runs are not the measuring ones)' : ''}; ${profilers.length} single-thread profiler use(s), ${threadAware} file(s) with a thread-aware profiler; threaded client(s) declared: ${threaded.length === 0 ? 'none' : threaded.join(', ')}`,
      notSeen:
        'not seen: a log level set in app code or config the scripts do not name, a level passed through a variable, and profilers other than cProfile, profile, yappi and py-spy',
      metrics: {
        filesRead: files.length,
        debugLevelSettings: debug.length,
        productionLevelSettings: pinned.length,
        singleThreadProfilers: profilers.length,
        threadAwareProfilerFiles: threadAware,
        threadedClients: threaded.length,
      },
    });
  }

  /** The declared Python clients that run threads of their own. */
  private static threadedClients(projectRoot: string): string[] {
    const declared = declaredPythonDependencies(projectRoot);
    return THREADED_PYTHON_CLIENTS.filter(name =>
      declared.has(normalizePythonName(name))
    );
  }

  /** The first use of each single-thread profiler in each file. */
  private static singleThreadProfilers(
    files: readonly ContainingFile[]
  ): Array<Hit & { profiler: string }> {
    return files.flatMap(file =>
      SINGLE_THREAD_PROFILERS.flatMap(({ name, pattern }) => {
        const first = matchesWithLines(file.content, pattern)[0];
        return first
          ? [
              {
                rel: file.rel,
                line: first.line,
                text: first.text.trim(),
                profiler: name,
              },
            ]
          : [];
      })
    );
  }

  private static describeDebug(hit: Hit): string {
    return `${hit.rel}:${hit.line}: the perf harness runs at a DEBUG/TRACE log level (${hit.text}) — production logs at INFO, so every debug line is work production never does: the numbers are inflated and the profile shows logging as a hot spot; start the app under test with the production log level`;
  }

  private static describeProfiler(
    hit: Hit & { profiler: string },
    threaded: readonly string[]
  ): string {
    return `${hit.rel}:${hit.line}: ${hit.profiler} records only the thread it runs in, and the project declares client(s) that work on threads of their own (${threaded.join(', ')}) — their CPU is missing from the profile and short, frequently called functions look hot; profile with a sampler that sees every thread (py-spy record, --threads for per-thread stacks) or yappi with profile_threads on`;
  }
}

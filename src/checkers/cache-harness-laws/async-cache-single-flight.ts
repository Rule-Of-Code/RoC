/**
 * Async Cache Single-Flight (#374)
 *
 * A cache that stores the value only after the `await` finishes does
 * nothing for a burst: all concurrent requests check, all miss, and all hit
 * the database. Single-flight caches the in-flight future / promise before
 * the await and drops it on failure, so an error is not cached. See
 * `utils/request-path/single-flight.ts` for what is read.
 *
 * The subject is an async Python or TS/JS file git publishes that checks a
 * keyed container and later stores into the same one
 * ({@link REQUIRES_ASYNC_CACHE}); the law judges exactly those files.
 */

import type {
  FileContaining,
  LawRequirement,
} from '../../types/enhanced-law.types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { readFilesContaining } from '../../utils/law-requirements';
import {
  describeFlightSite,
  scanSingleFlight,
} from '../../utils/request-path/single-flight';
import { sourcesFromFiles } from '../../utils/request-path/sources';
import { LawBase } from '../law-base';
import { subjectResult } from './subject-result';

const PY_TESTS = [
  '**/tests/**',
  '**/test/**',
  '**/test_*.py',
  '**/*_test.py',
  '**/conftest.py',
];
const TS_TESTS = [
  '**/*.{spec,test,e2e}.*',
  '**/__tests__/**',
  '**/__mocks__/**',
  '**/*.d.{ts,mts,cts}',
];

/** The text from the file's start, so a pattern sees the whole file (`^` matches every line under the `m` flag). */
const FILE_START = String.raw`(?<![\s\S])`;
/** How far a check may sit from its store: one function's reach. */
const REACH = '{0,3000}';
/** Python: something async between the check and the store, or on the store line — an await, or a future / task. */
const PY_ASYNC = String.raw`(?:\bawait\b|\bensure_future\b|\bcreate_task\b|\bFuture\s*\(|\bcreate_future\b)`;
/** TS/JS: an await, or a promise made between the check and the store, or stored. */
const TS_ASYNC = String.raw`(?:\bawait\b|\.then\s*\(|\.catch\s*\(|\.finally\s*\(|\bnew\s+Promise\b|\bPromise\.\w)`;
const PY_STORE = String.raw`^\s*\1\s*\[[^\]\n]+\]\s*=(?!=)`;
/**
 * A container name starts here, not inside a longer name: without it the
 * back-reference to `s` matched the tail of `constants.set(` (#437).
 */
const TS_NAME_START = String.raw`(?<![\w$.])`;

/** A check of a name, then — with something async between them, or on the store — a store into the same name. */
const pythonCheckThenStore = (check: string): string =>
  String.raw`${FILE_START}[\s\S]*?${check}(?:[\s\S]${REACH}?${PY_ASYNC}[\s\S]${REACH}?${PY_STORE}|[\s\S]${REACH}?${PY_STORE}[^\n]*${PY_ASYNC})`;

/**
 * A file that checks a keyed container and then, with an await or a
 * future / promise in between (or stored), stores into the same one within
 * a function's reach. A sync memo (`if (!seen.has(k)) seen.set(k, v)`)
 * does not select the law: it has nothing to coalesce.
 */
export const ASYNC_CACHE_FILES: readonly FileContaining[] = [
  {
    files: ['**/*.py'],
    pattern: pythonCheckThenStore(
      String.raw`(?<![\w.])([A-Za-z_][\w.]*)\.get\(`
    ),
    exclude: PY_TESTS,
  },
  {
    files: ['**/*.py'],
    pattern: pythonCheckThenStore(String.raw`\bin\s+([A-Za-z_][\w.]*)\s*:`),
    exclude: PY_TESTS,
  },
  {
    files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    pattern: String.raw`${FILE_START}[\s\S]*?${TS_NAME_START}([A-Za-z_$][\w$.]*)\.(?:get|has)\((?:[\s\S]${REACH}?${TS_ASYNC}[\s\S]${REACH}?${TS_NAME_START}\1\.set\(|[\s\S]${REACH}?${TS_NAME_START}\1\.set\([^\n]*${TS_ASYNC})`,
    exclude: TS_TESTS,
  },
];

/** Selected where git publishes a file that checks a keyed container and stores an awaited or in-flight value into it. */
export const REQUIRES_ASYNC_CACHE: LawRequirement = {
  anyFileContaining: ASYNC_CACHE_FILES,
};

export class AsyncCacheSingleFlightLaw extends LawBase {
  static readonly LAW_NAME = 'Async Cache Single-Flight';

  static check(context: LawCheckContext): LawResult {
    const ignores = context.config.ignores?.global ?? [];
    const found = ASYNC_CACHE_FILES.flatMap(entry =>
      readFilesContaining(context.projectRoot, entry, ignores)
    );
    const files = found.filter(
      (file, index) => found.findIndex(f => f.rel === file.rel) === index
    );
    const sources = sourcesFromFiles(context.projectRoot, files);
    const filesRead = sources.counts.python + sources.counts.typescript;
    const all = scanSingleFlight(sources.modules);
    // The subject: a check-then-store whose stored value is awaited or in flight.
    const sites = all.filter(site => site.inFlight || site.awaited !== null);
    const findings = sites.flatMap(site => describeFlightSite(site) ?? []);
    const shared = sites.filter(site => !site.perCall);
    const inFlight = shared.filter(site => site.inFlight).length;
    const joined = shared.filter(
      site => !site.inFlight && site.joinedFlight
    ).length;
    const afterAwait = shared.length - inFlight - joined;
    const perCall = sites.length - shared.length;
    return subjectResult({
      lawName: this.LAW_NAME,
      category: 'PERFORMANCE',
      context,
      findings,
      notRead: sources.unread,
      suggestions: [
        'Store the in-flight future/promise before the await so concurrent callers share it (single-flight)',
        'Remove the entry when the fetch fails (except/finally, .catch/finally), so an error is not cached',
      ],
      filesRead,
      nothingRead:
        sources.unread.length > 0
          ? sources.unread.join('; ')
          : 'no file that selected the law could be read',
      judged: sites.length,
      noSubject: `0 functions that check a keyed container and store an awaited or in-flight value into it — nothing to judge (${all.length} sync check-then-store site(s) read, nothing to coalesce)`,
      passSummary: `${sites.length} async check-then-store site(s) in ${filesRead} file(s): ${inFlight} shared cache(s) store the in-flight future/promise and remove it on failure, ${joined} store the result of awaiting such a shared flight, ${afterAwait} store after an await under a lock, ${perCall} per-call memo(s) not shared by concurrent requests`,
      notSeen:
        'not seen: a store and its check in different functions, a cache behind a wrapper class (cache.get_or_set), a value awaited through more than three assignments, and concurrency inside one call over a per-call memo',
      metrics: {
        filesRead,
        cacheSites: sites.length,
        inFlightSites: inFlight,
        joinedFlightSites: joined,
        storeAfterAwaitSites: afterAwait,
        perCallSites: perCall,
        syncSites: all.length - sites.length,
      },
    });
  }
}

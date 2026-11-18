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
const PY_ASYNC = String.raw`(?=[\s\S]*^\s*async\s+def\s)`;
const PY_STORE_INTO = (group: string): string =>
  String.raw`[\s\S]{0,3000}?^\s*${group}\s*\[[^\]\n]+\]\s*=(?!=)`;

/** An async file that checks a keyed container and stores into the same one within a function's reach. */
export const ASYNC_CACHE_FILES: readonly FileContaining[] = [
  {
    files: ['**/*.py'],
    pattern: String.raw`${FILE_START}${PY_ASYNC}[\s\S]*?([A-Za-z_][\w.]*)\.get\(${PY_STORE_INTO(String.raw`\1`)}`,
    exclude: PY_TESTS,
  },
  {
    files: ['**/*.py'],
    pattern: String.raw`${FILE_START}${PY_ASYNC}[\s\S]*?\bin\s+([A-Za-z_][\w.]*)\s*:${PY_STORE_INTO(String.raw`\1`)}`,
    exclude: PY_TESTS,
  },
  {
    files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    pattern: String.raw`${FILE_START}(?=[\s\S]*(?:\bawait\b|\bPromise\b|\.then\())[\s\S]*?([A-Za-z_$][\w$.]*)\.(?:get|has)\([\s\S]{0,3000}?\1\.set\(`,
    exclude: TS_TESTS,
  },
];

/** Selected where git publishes an async file that checks a keyed container and stores into it. */
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
    const sites = scanSingleFlight(sources.modules);
    const findings = sites.flatMap(site => describeFlightSite(site) ?? []);
    const shared = sites.filter(site => !site.perCall);
    const inFlight = shared.filter(site => site.inFlight).length;
    const afterAwait = shared.filter(
      site => !site.inFlight && site.awaited !== null
    ).length;
    const perCall = sites.length - shared.length;
    const noAwait = shared.length - inFlight - afterAwait;
    return subjectResult({
      lawName: this.LAW_NAME,
      category: 'PERFORMANCE',
      context,
      findings: [...sources.unread, ...findings],
      suggestions: [
        'Store the in-flight future/promise before the await so concurrent callers share it (single-flight)',
        'Remove the entry when the fetch fails (except/finally, .catch/finally), so an error is not cached',
      ],
      judged: sites.length,
      nothingJudged:
        sources.unread.length > 0
          ? sources.unread.join('; ')
          : `no function in the ${files.length} file(s) that selected the law checks a keyed container and then stores into it (the match spanned two functions, or sat in a comment or a string)`,
      passSummary: `${sites.length} check-then-store site(s) in ${files.length} file(s): ${inFlight} shared cache(s) store the in-flight future/promise and remove it on failure, ${afterAwait} store after an await under a lock, ${noAwait} store a value computed without an await, ${perCall} per-call memo(s) not shared by concurrent requests`,
      notSeen:
        'not seen: a store and its check in different functions, a cache behind a wrapper class (cache.get_or_set), a value awaited through more than three assignments, and concurrency inside one call over a per-call memo',
      metrics: {
        filesRead: files.length,
        cacheSites: sites.length,
        inFlightSites: inFlight,
        storeAfterAwaitSites: afterAwait,
        perCallSites: perCall,
      },
    });
  }
}

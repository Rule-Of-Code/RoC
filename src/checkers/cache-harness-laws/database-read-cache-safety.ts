/**
 * Database Read Cache Safety (#373)
 *
 * An in-process cache is the cheapest latency fix and the easiest way to
 * serve stale or foreign data. A cache of database reads needs four things,
 * each visible in code: an expiry (TTL), a size bound, invalidation on the
 * write paths, and no use inside an authorization check — a suspension or a
 * role change must apply at once. And when the read is per user, the key
 * carries the user.
 *
 * The subject is a cache git publishes in a project that declares a
 * database client ({@link REQUIRES_READ_CACHE}): a caching decorator, a
 * cache class, or a dict / Map named as a cache (`utils/request-path/
 * read-caches.ts`). The law judges the caches found in exactly the files
 * that selected it; to see who clears them, who writes their collections and
 * which authorization checks read them, it also reads the project files
 * that name a cache or such a collection (`cache-usage.ts`).
 */

import type {
  FileContaining,
  LawRequirement,
} from '../../types/enhanced-law.types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  readFilesContaining,
  type ContainingFile,
} from '../../utils/law-requirements';
import {
  declaredClients,
  REQUIRES_DATA_CLIENT,
} from '../../utils/request-path/data-clients';
import {
  authorizationUses,
  invalidationOf,
  keysWithoutUser,
  type UsageContext,
} from '../../utils/request-path/cache-usage';
import { ModuleGraph } from '../../utils/request-path/module-graph';
import {
  cacheCollections,
  findCaches,
  holdsDatabaseReads,
  type CacheSite,
} from '../../utils/request-path/read-caches';
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
/** TS/JS, and a component's <script> (#607). */
const TS_FILES = ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,vue}'];

/** A caching decorator, a cache class, or a dict / Map bound under a cache-like name. */
export const READ_CACHE_FILES: readonly FileContaining[] = [
  {
    files: ['**/*.py'],
    pattern: String.raw`^\s*@(?:(?:functools|cachetools|cachetools\.func|func|async_lru|aiocache)\.)?(?:lru_cache|cache|ttl_cache|lfu_cache|fifo_cache|rr_cache|alru_cache|cached|cachedmethod)\b|\b(?:TTLCache|TLRUCache|LRUCache|LFUCache|FIFOCache|RRCache)\s*\(|^\s*(?:(?:self|cls)\.|[\w.]*\bstate\.)?\w*(?:cache|Cache|CACHE|memo|Memo|MEMO)\w*\s*(?::[^=\n]+)?=\s*(?:\{\s*\}|dict\(\s*\)|(?:collections\.)?(?:OrderedDict|defaultdict)\()`,
    exclude: PY_TESTS,
  },
  {
    files: TS_FILES,
    vueScript: true,
    pattern: String.raw`\bnew\s+LRUCache\b|\b(?:this\.)?#?\w*(?:cache|Cache|CACHE|memo|Memo|MEMO)\w*\s*(?:!?:[^=\n]+)?=\s*new\s+Map\b`,
    exclude: TS_TESTS,
  },
];

/** Selected where a database client is declared and git publishes an in-process cache. */
export const REQUIRES_READ_CACHE: LawRequirement = {
  anyOf: REQUIRES_DATA_CLIENT.anyOf,
  anyFileContaining: READ_CACHE_FILES,
};

const escapeRe = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The project files that name one of the caches or one of their collections: who clears, writes and authorizes. */
function referenceFiles(
  context: LawCheckContext,
  caches: readonly CacheSite[],
  collections: readonly string[]
): ContainingFile[] {
  const words = [...new Set(caches.map(site => site.name))].map(escapeRe);
  const quoted = collections.map(
    c => String.raw`["'\x60]${escapeRe(c)}["'\x60]`
  );
  const pattern = [
    ...words.map(w => String.raw`(?<![\w$])${w}(?![\w$])`),
    ...quoted,
  ].join('|');
  const ignores = context.config.ignores?.global ?? [];
  return [
    ...readFilesContaining(
      context.projectRoot,
      { files: ['**/*.py'], pattern, exclude: PY_TESTS },
      ignores
    ),
    ...readFilesContaining(
      context.projectRoot,
      { files: TS_FILES, pattern, exclude: TS_TESTS, vueScript: true },
      ignores
    ),
  ];
}

export class DatabaseReadCacheSafetyLaw extends LawBase {
  static readonly LAW_NAME = 'Database Read Cache Safety';

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const ignores = context.config.ignores?.global ?? [];
    const clients = declaredClients(projectRoot);
    const subject = READ_CACHE_FILES.flatMap(entry =>
      readFilesContaining(projectRoot, entry, ignores)
    );
    const sources = sourcesFromFiles(projectRoot, subject);
    const filesRead = sources.counts.python + sources.counts.typescript;
    const graph = new ModuleGraph(sources.modules, clients);
    const caches = findCaches(sources.modules, { clients, graph });
    const dbCaches = caches.filter(holdsDatabaseReads);
    const collections = new Map(
      dbCaches.map(site => [site, cacheCollections(site, graph)])
    );
    const references =
      dbCaches.length > 0
        ? referenceFiles(context, dbCaches, [
            ...new Set([...collections.values()].flat()),
          ])
        : [];
    const subjectRels = new Set(subject.map(file => file.rel));
    const extra = references.filter(
      (file, index) =>
        !subjectRels.has(file.rel) &&
        references.findIndex(f => f.rel === file.rel) === index
    );
    const all = sourcesFromFiles(projectRoot, [...subject, ...extra]);
    const ctx: UsageContext = {
      modules: all.modules,
      graph: new ModuleGraph(all.modules, clients),
      clients,
    };
    const findings = dbCaches.flatMap(site =>
      this.judge(site, collections.get(site) ?? [], ctx)
    );
    return subjectResult({
      lawName: this.LAW_NAME,
      category: 'SECURITY',
      context,
      findings,
      notRead: sources.unread,
      suggestions: [
        'Give the cache an expiry and a size bound (cachetools.TTLCache(maxsize, ttl), lru-cache { max, ttl })',
        'Clear it on every write path of the collections it holds (any non-GET request, or the writes themselves)',
        'Never read authorization state (active, suspended, roles) through a cache; key per-user reads by the user id',
      ],
      filesRead,
      nothingRead:
        sources.unread.length > 0
          ? sources.unread.join('; ')
          : 'no file that selected the law could be read',
      judged: caches.length,
      noSubject:
        '0 in-process caches (the selecting text was in a comment, a string or another shape) — nothing to judge',
      passSummary: `${caches.length} in-process cache(s) found in ${filesRead} file(s), ${dbCaches.length} of them holding database reads, each with an expiry, a size bound, invalidation on a write path, no authorization use and a key that carries the user`,
      notSeen:
        'not seen: caches held in other shapes (a class wrapping a dict under another name, functools.cached_property), reads through a client the registry does not list, and write paths more than one call away from the invalidation',
      metrics: {
        filesRead,
        referenceFiles: references.length,
        caches: caches.length,
        databaseReadCaches: dbCaches.length,
      },
    });
  }

  /** Every finding for one cache of database reads. */
  private static judge(
    site: CacheSite,
    collections: readonly string[],
    ctx: UsageContext
  ): string[] {
    const at = `${site.module.rel}:${site.line}`;
    const what = `the cache ${site.label} holds database reads`;
    const findings: string[] = [];
    if (!site.unknownBackend && !site.ttl) {
      findings.push(
        `${at}: ${what} with no expiry (TTL) — an entry is served until it is evicted or the process restarts, whatever was written since`
      );
    }
    if (!site.unknownBackend && !site.bounded) {
      findings.push(
        `${at}: ${what} with no size bound — every distinct key stays in memory for the life of the process`
      );
    }
    const invalidation = invalidationOf(site, collections, ctx);
    if (!invalidation.onWritePath) {
      findings.push(
        `${at}: ${what} and no write path clears it — no ${site.kind === 'decorator' ? `${site.name}.cache_clear()` : `${site.name}.clear() / .pop(key)`} in a POST/PUT/PATCH/DELETE handler, a function that writes, or a function they call`
      );
    }
    for (const write of invalidation.staleWrites) {
      findings.push(
        `${write.rel}:${write.line}: writes collection "${write.collection}", whose reads the cache at ${at} holds, without clearing it — this process keeps returning the old document`
      );
    }
    for (const use of authorizationUses(site, ctx)) {
      findings.push(
        `${use.rel}:${use.line}: the authorization check ${use.check} reads through the cache at ${at} — a suspension, a role change or a revoked membership is not seen until the entry goes; read authorization state uncached`
      );
    }
    for (const key of keysWithoutUser(site)) {
      findings.push(
        `${key.rel}:${key.line}: the cache at ${at} stores a read of ${key.user} under a key without the user (${key.key}) — one user's data can be served to another`
      );
    }
    return findings;
  }
}

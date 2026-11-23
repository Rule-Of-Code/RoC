/**
 * Cache and Harness Laws Data Module
 *
 * From the fix phase of the incident behind #361: an in-process cache is
 * the cheapest latency fix and the easiest way to serve stale or foreign
 * data, an async cache that stores after the await does nothing for a burst,
 * and a harness that runs the app with DEBUG logging, profiles one thread or
 * re-declares the app's routes measures something production never does.
 * Each law is selected by what git publishes, judges exactly those files and
 * names the file and line of every finding. legacyId range: 900–903.
 */

import { REQUIRES_ASYNC_CACHE } from '../checkers/cache-harness-laws/async-cache-single-flight';
import { REQUIRES_READ_CACHE } from '../checkers/cache-harness-laws/database-read-cache-safety';
import {
  REQUIRES_PERF_HARNESS,
  THREADED_PYTHON_CLIENTS,
} from '../checkers/cache-harness-laws/perf-harness-matches-production';
import { REQUIRES_ROUTE_RIG } from '../checkers/cache-harness-laws/test-rig-keeps-route-guards';
import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';

const GIT_VIEW =
  'inside a git work tree only the files git publishes are read (tracked ones from the index when the working copy differs, untracked ones that are not ignored), so a git-ignored file — generated output, a local note — never selects it; outside git the disk is walked; ignores.global leaves the same files out of the gate and the law';

export const CACHE_HARNESS_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Database Read Cache Safety',
      'An in-process cache of database reads expires, is bounded, is cleared on the write paths, is not read by authorization checks, and keys per-user reads by the user',
      'cache'
    ),
    legacyId: 901,
    article: 'VI',
    subsection: '6.30',
    title: 'Database Read Cache Safety',
    rationale:
      "An in-process cache is the cheapest latency fix and the easiest way to serve stale or foreign data. Without an expiry an entry outlives every write; without a bound every key stays for the life of the process; without invalidation on the write paths a user sees the old document right after changing it; read inside an authorization check, a suspension or a revoked role applies only when the entry goes; keyed without the user, one user is served another's data. Each of the four properties is visible in code, so each can be checked before the cache ships.",
    satisfiedBy: {
      python:
        'Use cachetools.TTLCache(maxsize=…, ttl=…) (or @cached(cache=TTLCache(…))) keyed by the user id and the read; clear it on every write path (a middleware that clears on any non-GET request, or cache.pop(key) next to each write); read "is this account active" and roles uncached.',
      typescript:
        'Use new LRUCache({ max, ttl }) from lru-cache keyed by the user id and the read; cache.delete(key) next to each write (or clear on any non-GET request); read authorization state uncached.',
    },
    detectionLimits: [
      `Selected where a database client from the request-path registry is declared (package.json or a Python manifest) and a non-test .py file has a caching decorator (functools lru_cache / cache, cachetools.func *_cache, cachetools cached / cachedmethod, async_lru alru_cache, aiocache cached), a cachetools class (TTLCache, TLRUCache, LRUCache, LFUCache, FIFOCache, RRCache) or a dict / OrderedDict / defaultdict bound under a name with cache or memo in it, or a non-test TS/JS file has new LRUCache (lru-cache) or a Map bound under such a name — a text match; ${GIT_VIEW}. The law parses exactly those files; when they hold no cache (the match was in a comment), it passes with "0 in-process caches — nothing to judge" and the counters; it reports judged nothing only when no selecting file could be read.`,
      "A cache holds database reads when its decorated function reads (itself or through a function it calls one step deep), or when the value stored into the container comes, through the function's own assignments, from a statement that reads: an awaited registry or repository read, or a sync registry call on a receiver (a distinctive name like find_one / getDoc, or get / stream chained from a collection, document or query). A cache filled through a wrapper class, functools.cached_property, or a client the registry does not list is not seen.",
      'Expiry: a TTL class or ttl= / ttl: option, or — for a plain dict / Map — a clock read (time.monotonic, time.time, datetime.now, Date.now, performance.now, "expir", "ttl") in any function of the module that names the cache; whether the clock is compared correctly is not checked. Bound: a bounded class or maxsize / max / maxSize (lru_cache\'s default 128 counts; maxsize=None does not), or len(cache) / popitem / .size in a function that names it. A cached(…) whose cache object cannot be told is not judged for expiry or bound.',
      'Invalidation: cache_clear() / cache_invalidate() on the decorated function, or clear / pop / delete / del on the container, in a function on a write path or one it calls one step deep (same module, one import, self./this. methods). A write path is a handler routed for POST/PUT/PATCH/DELETE (a decorator such as router.post, methods=[…], @Post, app.post), a function making a registry write call, or a middleware branching on request.method. Where the cache\'s reads name a literal collection (collection("x")), each function that names that collection and writes is reported when it reaches no invalidation; collections named otherwise (Mongo db.x, an ORM model) fall back to "some write path clears it".',
      'Authorization: a function whose source raises with 401/403 (HTTPException, status codes, PermissionDenied / Unauthorized / Forbidden errors) or throws an Unauthorized/Forbidden exception, sets status 401/403, or is a canActivate guard, and calls the decorated function or reads the container (get / has / [ ] / in) — itself, or through a helper it calls one step deep (same module, one import, self./this. methods: require_admin → is_admin). A check two calls away from the cached read is not seen.',
      "Per-user key: a stored read that uses a user id (uid, user_id, user, current_user, account_id, owner_id, member_id, principal, caller_id) under a key that, through the function's assignments, carries none; a decorated function whose read uses such a name that is neither its parameter nor bound in it (g.user, request.state.user, a context variable). Ids named otherwise are not recognised.",
    ],
    emoji: '🗃️',
    description:
      'An in-process cache of database reads expires, is bounded, is cleared on the write paths, is not read by authorization checks, and keys per-user reads by the user',
    priority: 'HIGH',
    category: 'SECURITY',
    requires: REQUIRES_READ_CACHE,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'DatabaseReadCacheSafetyLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VI.6.30: An in-process cache of database reads can serve stale or foreign data',
    remediation:
      'Give the cache a TTL and a size bound, clear it on the write paths, keep authorization reads uncached, and key per-user reads by the user',
  },

  {
    id: generateLawId(
      'Async Cache Single-Flight',
      'An async cache stores the in-flight future or promise before the await and removes it when it fails',
      'cache'
    ),
    legacyId: 902,
    article: 'VI',
    subsection: '6.31',
    title: 'Async Cache Single-Flight',
    rationale:
      'A cache that stores the value only after the await finishes does nothing for a burst: a client that opens a screen fires several requests within milliseconds, every one checks the cache before the first fetch returns, all miss, and all hit the database — in the incident behind this law the same per-user reads were decoded up to 30 times in one burst. Single-flight stores the in-flight future or promise first, so the requests that arrive meanwhile wait for the same fetch; and it drops the entry when the fetch fails, or the error is cached and served to everyone after.',
    satisfiedBy: {
      python:
        'fut = cache.get(key); if fut is None: fut = asyncio.ensure_future(load(key)); cache[key] = fut — then try: return await fut, except: cache.pop(key, None); raise.',
      typescript:
        'let p = cache.get(key); if (!p) { p = load(key).catch(e => { cache.delete(key); throw e; }); cache.set(key, p); } return p;',
    },
    detectionLimits: [
      `Selected where a non-test .py file checks a name (NAME.get( or "in NAME:") and, within 3000 characters, stores into the same name (NAME[key] = …) with an await, ensure_future, create_task, Future( or create_future between the two or on the store line, or a non-test TS/JS file checks NAME.get( / NAME.has( and stores NAME.set( on the same name (not the tail of a longer one, constants.set( is not s.set() with an await, .then / .catch / .finally, new Promise or Promise.* between the two or in the store — so a sync memo (if (!seen.has(k)) seen.set(k, v)) does not select it, and neither does an in-flight store whose promise is made only by calling an async function, with nothing of the above in sight — a text match over the code (comments and the contents of strings and docstrings do not count); ${GIT_VIEW}. The law parses exactly those files; a check-then-store whose stored value is neither awaited nor in flight is counted as sync, not judged; when no async one is found it passes with "0 functions that check a keyed container and store an awaited or in-flight value — nothing to judge" and the counters; it reports judged nothing only when no selecting file could be read (none left, or the TypeScript parser did not load).`,
      'Per function: a container it checks (NAME.get, NAME[…], in NAME, NAME.has — not a for loop over it; in TS/JS a get / has with the key as its only argument, the Map signature, so get(root, key, mode) of a file-backed API is not a check) and later stores into (NAME[key] = value, NAME.set(key, value)); a container created in the same function, or handed in as a parameter (a memo the caller made for one call), is not shared by concurrent requests and is skipped — concurrency inside one call over such a memo (a gather over items that share it) is not seen. The check and the store must be in one function: a cache class whose get and set are separate methods is not seen.',
      "Store-after-await: the stored value comes, through at most three of the function's own assignments, from an await after the check. A value that comes from an await is a result, never a future; and an await of a name (not a call) that the function reads from or stores into a container, or binds to a future / task / promise, joins a flight shared by every caller — the two-container idiom (an in-flight map plus a cache of results) is not reported. Not reported when the check and the store run under one lock: in Python an async with …lock / semaphore / mutex block that holds the store and a re-check of the container (a lock around the fetch alone is still reported — each waiter fetches in turn); in TS/JS a runExclusive / mutex.acquire anywhere in the function. A global lock counts like a per-key one.",
      "Cached error: the stored value is in flight — ensure_future / create_task / Future() / create_future (Python); an un-awaited .then/.catch/.finally chain, new Promise, Promise.*, a call of an async function of the module, or a name awaited later (TS/JS) — and the function's source has no except / finally / add_done_callback followed by NAME.pop / del NAME[…] (Python), or .catch / catch {} / finally followed by NAME.delete (TS/JS). Whether the removal sits on the failure path is a text order, not control flow.",
    ],
    emoji: '🛬',
    description:
      'An async cache stores the in-flight future or promise before the await and removes it when it fails',
    priority: 'MEDIUM',
    category: 'PERFORMANCE',
    requires: REQUIRES_ASYNC_CACHE,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'AsyncCacheSingleFlightLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VI.6.31: An async cache misses for every request of a burst, or caches an error',
    remediation:
      'Store the in-flight future/promise before the await, and remove it when the fetch fails',
  },

  {
    id: generateLawId(
      'Test Rig Keeps Route Guards',
      "A test that sets up the router uses the app's route objects, not hand-written copies that drop the app's guards, resolvers and redirects",
      'testing'
    ),
    legacyId: 900,
    article: 'VII',
    subsection: '7.40',
    title: 'Test Rig Keeps Route Guards',
    rationale:
      "A test that builds its own router config by copying the app's paths and components drops the guards, resolvers and redirects those routes have in the app. It then passes for flows the real app blocks or redirects: in the incident behind this law a spec re-declared a route that sat behind a catalogue guard, stayed green, and the real deep link landed elsewhere — found only when the rig was switched to the routes exported from the app's route file.",
    satisfiedBy: {
      angular:
        "provideRouter(appRoutes) (or the feature's exported routes) in the test; to stub a guard keep the key — { ...route, canMatch: [() => true] } — so the test sees the app's route shape.",
      typescript:
        'Import the route table the app exports and pass it to provideRouter / RouterTestingModule.withRoutes, instead of writing { path, component } objects in the spec.',
    },
    detectionLimits: [
      `Selected where @angular/router is declared and a test file (*.spec / *.test / *.cy / *.e2e .ts/.js, or any .ts/.js under e2e/, cypress/, playwright/, test/, tests/, testing/, __tests__/) calls provideRouter, RouterTestingModule.withRoutes or RouterModule.forRoot/forChild and writes a path: literal — a text match; ${GIT_VIEW}. The law parses exactly those files with the TypeScript compiler; when none holds a router setup (the match was in a comment), it passes with "0 router setups — nothing to judge" and the counters; it reports judged nothing only when no test file could be read or the TypeScript parser did not load.`,
      'Test routes are the object literals with a string path in the setup\'s first argument — an array written in the call, or a variable of the same file bound to one; routes spread from an import, built by a function or passed from another file are not read (and are not reported: importing the app\'s routes is the fix). The paths "" and "**" are not compared.',
      "App routes are the route objects of every non-test .ts file git publishes that holds a canActivate, canActivateChild, canMatch, canLoad, canDeactivate, resolve or redirectTo key. A route's full path joins the paths of the parents whose children hold it in the same file, with parameter names normalised; a feature route reached through loadChildren from another file is read without its parent's prefix, so it is compared under its own path only.",
      "A finding is a test route with the same full path as a guarded app route that lacks one of the app route's guard keys (its own, or canActivate / canActivateChild / canMatch / canLoad / resolve of its parents). A test route that keeps the key with a stub guard passes: which guard runs is not compared.",
    ],
    emoji: '🧭',
    description:
      "A test that sets up the router uses the app's route objects, not hand-written copies that drop the app's guards, resolvers and redirects",
    priority: 'MEDIUM',
    category: 'TESTING',
    requires: REQUIRES_ROUTE_RIG,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'TestRigKeepsRouteGuardsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.40: A test re-declares an app route by hand and drops its guards',
    remediation:
      "Import the app's route objects (or their guards) in the test instead of copying paths and components",
  },

  {
    id: generateLawId(
      'Perf Harness Matches Production',
      'A perf harness runs the app at the production log level, and profiles every thread when the project uses a client that works on threads of its own',
      'measurement'
    ),
    legacyId: 903,
    article: 'VII',
    subsection: '7.41',
    title: 'Perf Harness Matches Production',
    rationale:
      "A harness measures the app the way it runs it. Run with DEBUG logging, every library's debug line is work production never does: in the incident behind this law a gRPC library logged at DEBUG for about 4% of the profiled CPU, a harness artefact the team had to subtract by hand. Profiled with cProfile, which records only the thread it runs in, a process whose gRPC client does part of its work on its own poller thread pointed at a deep copy as 18% of request CPU; removing it changed nothing, while a sampler across all threads showed the time in the client's decoding. Decisions taken from such numbers are wrong.",
    satisfiedBy: {
      python:
        'Start the app under test with the production level (uvicorn --log-level info, the production LOG_LEVEL), and profile with py-spy record (add --threads for per-thread stacks) or yappi with profile_threads left on, instead of cProfile.',
      typescript:
        'Start the server under test with the log level production uses (LOG_LEVEL=info, --log-level info), not debug or trace.',
    },
    detectionLimits: [
      `Reads perf, benchmark, load and profiling files — under a directory named perf, performance, bench, benchmark(s), benches, profiling, load, loadtest(s), load-test, load_test, latency or stress, or with perf, bench, profiling, profiler, latency, loadtest, load_test, load-test, locustfile or stress in the file name (.py, .sh, .bash, .zsh, .ps1, .js, .mjs, .cjs, .ts, .mts, .yml, .yaml, .toml, .ini, .cfg, .env, .md, and .env* files in those directories) — that mention a profiler (cProfile, profile, yappi, py-spy), an app server (uvicorn, gunicorn, hypercorn, daphne, granian) or a log level setting (--log-level, log_level, LOG_LEVEL, basicConfig, setLevel). This is the selection gate (a text match; ${GIT_VIEW}), and the law reads exactly the files it matched. A harness under another name, or a Makefile / package.json script, is not seen. Every file read is judged (its log level lines and its profilers), so a clean read passes with the counters; judged nothing only when no selecting file could be read.`,
      "DEBUG logging (#377): each line that sets debug or trace through --log-level / --loglevel (on a command line, in an argument list, or as an argparse default), log_level= / logLevel:, logging.basicConfig(level=…), the root logger's setLevel, or a *LOG_LEVEL / *LOGLEVEL variable (=, :, :- default, a dict entry, os.environ[…]). A level passed through a variable, set in the app's own config, or a named (non-root) logger set to DEBUG is not seen; a DEBUG setting meant only for the harness client's own output is still reported. DEBUG settings are reported only when no perf file pins a production level (info / warning / error / critical by the same mechanisms): a pinned harness is taken to be the measuring one and a DEBUG run next to it to be for reading logs — which of the two produced a published number is not seen.",
      `Single-thread profiler (#376): cProfile, the profile module, or yappi.start(profile_threads=False), reported once per file at its first use, only when the project declares (Python manifests) a client that works on threads of its own — ${THREADED_PYTHON_CLIENTS.join(', ')} (grpcio and the clients that declare it as a plain dependency on PyPI, and confluent-kafka over librdkafka) — and no perf file uses py-spy or yappi with threads on. A client outside that list, a Node profiler (--prof, --cpu-prof), py-spy run with --gil (only threads holding the GIL), and profilers named in comments are not told apart.`,
    ],
    emoji: '🎛️',
    description:
      'A perf harness runs the app at the production log level, and profiles every thread when the project uses a client that works on threads of its own',
    priority: 'MEDIUM',
    category: 'TESTING',
    requires: REQUIRES_PERF_HARNESS,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'PerfHarnessMatchesProductionLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.41: The perf harness measures work production does not do, or misses work on other threads',
    remediation:
      'Run the app under test at the production log level, and profile with a sampler that sees every thread',
  },
];

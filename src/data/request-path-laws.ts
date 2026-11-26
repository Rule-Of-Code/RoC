/**
 * Request-path laws — what one request pays in round trips and decoding.
 *
 * Static checks, call site by call site, over Python and TS/JS sources,
 * through the shared request-path model (`utils/request-path`): a structural
 * Python reader (RoC has no Python runtime) and the TypeScript compiler,
 * with one registry of database clients. Each finding names its file and
 * line; none is a project-level boolean.
 */

import type {
  EnhancedConstitutionalLaw,
  LawRequirement,
} from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';
import { REQUIRES_DATA_CLIENT } from '../utils/request-path/data-clients';
import { ONE_OFF_SCRIPT_GLOBS } from '../utils/request-path/one-off-scripts';

/**
 * A project that has async code to judge: a Python `async def`, or a TS/JS
 * async function, arrow or method. Without one (a sync Django app, a Go
 * module, a static site) the law has nothing to read and is not selected.
 * One-off scripts (scripts/, migrations/, bin/, management commands …) are
 * not a request path: excluded here, so the gate and the law, which reads
 * exactly the files this gate matched, leave out the same files (#384).
 */
export const REQUIRES_ASYNC_CODE: LawRequirement = {
  anyFileContaining: [
    {
      files: ['**/*.py'],
      pattern: String.raw`^\s*async\s+def\s`,
      // Test files set up fixtures; they are not a request path (as the law always read it).
      exclude: [
        '**/tests/**',
        '**/test/**',
        '**/test_*.py',
        '**/*_test.py',
        '**/conftest.py',
        ...ONE_OFF_SCRIPT_GLOBS,
      ],
    },
    {
      // A component's <script> too, read by its script (#607).
      files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,vue}'],
      pattern: String.raw`\basync\s+(?:function\b|\(|[A-Za-z_$][\w$]*\s*(?:=>|\())`,
      exclude: [
        '**/*.{spec,test,e2e}.*',
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/*.d.{ts,mts,cts}',
        ...ONE_OFF_SCRIPT_GLOBS,
      ],
      vueScript: true,
    },
  ],
};

export const REQUEST_PATH_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Independent Awaits Run Concurrently',
      "Awaited calls that do not use each other's results are started together, not one after another",
      'performance'
    ),
    legacyId: 886,
    article: 'VI',
    subsection: '6.24',
    title: 'Independent Awaits Run Concurrently',
    rationale:
      'Every await on I/O is a round trip. An async function that awaits several calls in a row, where no call needs an earlier result, makes the request wait for the sum of the round trips instead of the longest one; a handler that builds a response from ten such reads pays ten network latencies. Running them together costs one.',
    satisfiedBy: {
      python:
        'Start independent calls together and await them once: a, b = await asyncio.gather(fetch_a(), fetch_b()). Keep an order that is part of the meaning (a write before its read, a transaction) and mark the line: # roc: sequential-ok <reason>.',
      typescript:
        'Start independent calls together and await them once: const [a, b] = await Promise.all([fetchA(), fetchB()]). Keep an order that is part of the meaning and mark the line: // roc: sequential-ok <reason>.',
    },
    detectionLimits: [
      'Scope: the request path, not code that runs once. Files under scripts/, migrations/, alembic/, bin/, seeds/, seeders/ or management/commands/ (Django), at any depth, are excluded by the gate itself, so the gate and the law leave out the same files and a project whose async code is only there does not get the law. Recognised by location only: a one-off script kept elsewhere is judged, and request code a handler imports from one of those directories is left out with it.',
      'Reads async functions in Python (a structural reader of logical lines and indented blocks, not a Python AST) and TS/JS (the TypeScript compiler), test files excluded. A run is two or more consecutive statements in one block that each await a call, plus several awaits inside one expression; it is reported once, at its first line, with every call.',
      'Independence is simple def-use: a later call depends on an earlier one when its statement reads a name (or attribute chain) the earlier statement bound, or both receive the same freshly created list/dict/Map. A dependency through shared object state (a method that mutates self, a module global) is not seen and can be reported as independent.',
      "A run is cut, never reported across, by any statement that is not a simple await (a guard, a branch, a plain computation), by a call whose name is a write or an ordered side effect (save, update, delete, commit, send, sleep, lock and the registry's write calls), by gather / Promise.all, by an await of a value that is not a call, by a statement that is only await call(…) (its result discarded: awaited for its effect, such as a guard that raises), and by a marked line (roc: sequential-ok with a reason). A function decorated as a transaction, passed to runTransaction / $transaction / transaction(), or taking a tx / transaction parameter is not judged.",
      'Selected only where some .py file has an async def, or some TS/JS file an async function, arrow or method (a text match, comments included, test files excluded, outside installed and built trees, at most eight levels deep; inside a git work tree only the files git publishes are read (tracked ones from the index when the working copy differs, untracked ones that are not ignored), so a git-ignored file — generated output, a local note — never selects it; outside git the disk is walked); a project without one does not get the law. The law parses exactly the files that selected it; ignores.global leaves the same files out of both. When the parse of those files finds no async function (the match was in a comment or a string), it reports judged nothing, not compliant.',
      'A Vue single-file component (.vue) is read by its <script> and <script setup> blocks, at its own lines, both to select the law and to judge it; its <template> and <style> are not read (#607).',
    ],
    emoji: '⏱️',
    description:
      "Awaited calls that do not use each other's results are started together, not one after another",
    priority: 'MEDIUM',
    category: 'PERFORMANCE',
    requires: REQUIRES_ASYNC_CODE,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'IndependentAwaitsRunConcurrentlyLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VI.6.24: Independent awaits run one after another',
    remediation:
      'Run independent awaited calls together (asyncio.gather / Promise.all), or mark an intended order with roc: sequential-ok <reason>',
  },

  {
    id: generateLawId(
      'Document Read Once Per Request',
      'One request reads each document once: helpers on the same request path share the value instead of reading it again',
      'performance'
    ),
    legacyId: 887,
    article: 'VI',
    subsection: '6.25',
    title: 'Document Read Once Per Request',
    rationale:
      "Helpers on one request path that each read the same document — the caller's profile, a settings record — make the request pay for it two or three times, in round trips and in decoding. Nothing in the code looks wrong in either helper alone; the cost only shows when the path is read as a whole.",
    satisfiedBy: {
      python:
        'Read the document once where the request starts and pass the value down to the helpers that need it, or keep it in a request-scoped cache (a FastAPI dependency is cached once per request).',
      typescript:
        'Read the document once where the request starts and pass the value down, or keep it in a request-scoped cache.',
    },
    detectionLimits: [
      'Scope: the request path, not code that runs once. Files under scripts/, migrations/, alembic/, bin/, seeds/, seeders/ or management/commands/ (Django), at any depth, are not read; how many were left out is said in the message and in metrics.oneOffScriptsSkipped. Recognised by location only: a one-off script kept elsewhere is judged, and request code imported from one of those directories is left out with it.',
      "Heuristic, precision before recall. Two reads are the same document only when the collection is a string literal (or a module-level string constant, also one imported from a project module) and the id expression is identical once a helper's parameters are replaced by the arguments the caller passed (str() / String() wrappers kept). A collection or id computed at run time is not compared.",
      'Document reads recognised: Firestore collection(…).document(…)/doc(…).get() and a path argument, modular getDoc(doc(db, …)) (also through a local ref), Mongo find_one / findOne by _id and findById, Prisma findUnique by id, SQLAlchemy session.get(Model, id), Django objects.get / aget by pk or id. A one-key repository read — an awaited read-shaped call with one argument, users.get(uid) — counts by its receiver, method and argument.',
      'Scope: a function, its own reads, and the functions it calls one step deep — same module, self./this. methods of its class, or one relative / project import. A read two calls deep, or through an object whose class is not known statically, is not seen.',
      'Not a duplicate: a re-read after a write between the two reads (a write call, or a helper whose body writes), since it sees the new state. Branches are not distinguished: two reads on mutually exclusive paths of one handler can be reported.',
      'Selected where a database client from the registry is declared in package.json or a Python manifest. A project whose reads it cannot key (dynamic collection names, an unresolved wrapper) passes with a counter of files read and keyed reads compared (0 = nothing to compare) and the list of what it does not compare, in the message, details and metrics; it reports judged nothing only when no source file could be read (no Python or TS/JS source outside tests, or the TypeScript parser did not load).',
      'A Vue single-file component (.vue) is read by its <script> and <script setup> blocks, at its own lines; its <template> and <style> are not read by this law (#607).',
    ],
    emoji: '📄',
    description:
      'One request reads each document once: helpers on the same request path share the value instead of reading it again',
    priority: 'MEDIUM',
    category: 'PERFORMANCE',
    requires: REQUIRES_DATA_CLIENT,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'DocumentReadOncePerRequestLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VI.6.25: The same document is read more than once in one request',
    remediation:
      'Read the document once and pass the value down, or cache it per request',
  },

  {
    id: generateLawId(
      'Count With An Aggregation',
      'A number of documents is asked of the database with a count aggregation, not computed by fetching the documents',
      'performance'
    ),
    legacyId: 888,
    article: 'VI',
    subsection: '6.26',
    title: 'Count With An Aggregation',
    rationale:
      'Fetching documents only to take their number makes the database bill and transfer every one of them, and the client library decode and copy each one: on a busy instance that CPU, not the application code, is what slows every request. A count aggregation returns the number alone.',
    satisfiedBy: {
      python:
        'Count on the server: await query.count().get() (Firestore), collection.count_documents(filter) (MongoDB), select(func.count()) (SQLAlchemy), .count() / await .acount() (Django).',
      typescript:
        'Count on the server: getCountFromServer(query) (Firebase web) or query.count().get() (Admin SDK), countDocuments(filter) (MongoDB), count() (Prisma, TypeORM, Sequelize).',
    },
    detectionLimits: [
      'Scope: the request path, not code that runs once. Files under scripts/, migrations/, alembic/, bin/, seeds/, seeders/ or management/commands/ (Django), at any depth, are not read; how many were left out is said in the message and in metrics.oneOffScriptsSkipped. Recognised by location only: a one-off script kept elsewhere is judged, and request code imported from one of those directories is left out with it.',
      'Python: len() of a whole-result fetch — list(fetch), a comprehension over a fetch with no if filter, await fetch, the fetch itself — or of a local whose only binding is such a fetch and that is used nowhere else in the function. TS/JS: (await fetch).size / .length / .docs.length, or the same on a local bound only to await fetch and read once.',
      'A fetch is a call the client registry lists as returning a whole result set: Firestore stream / getDocs and get on a query, Mongo find / to_list / toArray, SQLAlchemy .all(), Django .all() / .filter(), Prisma findMany, TypeORM find / findBy / getMany, Sequelize findAll. Generic names (get, find, all, filter) count only when awaited or, in Python, chained from a query builder (collection, where, order_by, objects, execute …), so len(data.get(…)) is not one; a get on …document(id) / …doc(id) reads one document and is not one either.',
      'Not seen: a count through a repository method whose name the registry does not list (len(await repo.list_ids(x))), a count over a filtered comprehension (the filter may not be expressible on the server), and documents counted in a helper the fetch was passed to.',
      'Selected where a database client from the registry is declared in package.json or a Python manifest. With no violation it passes with a counter of files read and whole-result fetches checked (0 = nothing to check) and what it does not check, in the message, details and metrics; it reports judged nothing only when no source file could be read (no Python or TS/JS source outside tests, or the TypeScript parser did not load).',
      'A Vue single-file component (.vue) is read by its <script> and <script setup> blocks, at its own lines; its <template> and <style> are not read by this law (#607).',
    ],
    emoji: '🔢',
    description:
      'A number of documents is asked of the database with a count aggregation, not computed by fetching the documents',
    priority: 'MEDIUM',
    category: 'PERFORMANCE',
    requires: REQUIRES_DATA_CLIENT,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'CountWithAggregationLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VI.6.26: Documents fetched only to be counted',
    remediation: 'Replace the fetch-and-count with a count aggregation query',
  },
];

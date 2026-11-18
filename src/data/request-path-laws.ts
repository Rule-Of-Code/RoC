/**
 * Request-path laws — what one request pays in round trips and decoding.
 *
 * Static checks, call site by call site, over Python and TS/JS sources,
 * through the shared request-path model (`utils/request-path`): a structural
 * Python reader (RoC has no Python runtime) and the TypeScript compiler,
 * with one registry of database clients. Each finding names its file and
 * line; none is a project-level boolean.
 */

import type { EnhancedConstitutionalLaw, LawRequirement } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';
import { REQUIRES_DATA_CLIENT } from '../utils/request-path/data-clients';

/**
 * A project with a JS/TS or Python toolchain: where async code can exist.
 * Without one (a Go module, a static site) these laws would inspect nothing.
 */
const REQUIRES_PY_OR_JS_PROJECT: LawRequirement = {
  anyFile: ['package.json', 'tsconfig.json', 'pyproject.toml', 'requirements.txt', 'setup.py', 'setup.cfg', 'Pipfile'],
};

export const REQUEST_PATH_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Independent Awaits Run Concurrently',
      'Awaited calls that do not use each other\'s results are started together, not one after another',
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
      'Reads async functions in Python (a structural reader of logical lines and indented blocks, not a Python AST) and TS/JS (the TypeScript compiler), test files excluded. A run is two or more consecutive statements in one block that each await a call, plus several awaits inside one expression; it is reported once, at its first line, with every call.',
      'Independence is simple def-use: a later call depends on an earlier one when its statement reads a name (or attribute chain) the earlier statement bound, or both receive the same freshly created list/dict/Map. A dependency through shared object state (a method that mutates self, a module global) is not seen and can be reported as independent.',
      'A run is cut, never reported across, by any statement that is not a simple await (a guard, a branch, a plain computation), by a call whose name is a write or an ordered side effect (save, update, delete, commit, send, sleep, lock and the registry\'s write calls), by gather / Promise.all, by an await of a value that is not a call, and by a marked line (roc: sequential-ok with a reason). A function decorated as a transaction, passed to runTransaction / $transaction / transaction(), or taking a tx / transaction parameter is not judged.',
      'Selected where a package.json, tsconfig.json or a Python manifest (pyproject.toml, requirements.txt, setup.py, setup.cfg, Pipfile) sits at the root or in a workspace project; a Python service in a subdirectory of a repository without one at its root is not selected. A project with no async function is reported as judged nothing, not as compliant.',
    ],
    emoji: '⏱️',
    description: 'Awaited calls that do not use each other\'s results are started together, not one after another',
    priority: 'MEDIUM',
    category: 'PERFORMANCE',
    requires: REQUIRES_PY_OR_JS_PROJECT,
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
      'Helpers on one request path that each read the same document — the caller\'s profile, a settings record — make the request pay for it two or three times, in round trips and in decoding. Nothing in the code looks wrong in either helper alone; the cost only shows when the path is read as a whole.',
    satisfiedBy: {
      python:
        'Read the document once where the request starts and pass the value down to the helpers that need it, or keep it in a request-scoped cache (a FastAPI dependency is cached once per request).',
      typescript:
        'Read the document once where the request starts and pass the value down, or keep it in a request-scoped cache.',
    },
    detectionLimits: [
      'Heuristic, precision before recall. Two reads are the same document only when the collection is a string literal (or a module-level string constant, also one imported from a project module) and the id expression is identical once a helper\'s parameters are replaced by the arguments the caller passed (str() / String() wrappers kept). A collection or id computed at run time is not compared.',
      'Document reads recognised: Firestore collection(…).document(…)/doc(…).get() and a path argument, modular getDoc(doc(db, …)) (also through a local ref), Mongo find_one / findOne by _id and findById, Prisma findUnique by id, SQLAlchemy session.get(Model, id), Django objects.get / aget by pk or id. A one-key repository read — an awaited read-shaped call with one argument, users.get(uid) — counts by its receiver, method and argument.',
      'Scope: a function, its own reads, and the functions it calls one step deep — same module, self./this. methods of its class, or one relative / project import. A read two calls deep, or through an object whose class is not known statically, is not seen.',
      'Not a duplicate: a re-read after a write between the two reads (a write call, or a helper whose body writes), since it sees the new state. Branches are not distinguished: two reads on mutually exclusive paths of one handler can be reported.',
      'Selected where a database client from the registry is declared in package.json or a Python manifest; with no read it can key, it reports judged nothing.',
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
    remediation: 'Read the document once and pass the value down, or cache it per request',
  },
];

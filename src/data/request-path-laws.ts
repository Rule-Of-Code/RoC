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
];

/**
 * Independent awaits that run one after another (#351).
 *
 * In an async function, a run of consecutive statements that each await a
 * call, where no later call reads a name an earlier one in the run bound,
 * costs the sum of the round trips instead of the largest one. The run is
 * cut — never reported across — by anything whose order is part of its
 * meaning:
 *
 * - a statement that is not a simple await (control flow, a guard, a plain
 *   computation between the awaits);
 * - a write, a commit, a send, a sleep, a lock — an ordered side effect;
 * - an await that is already concurrent (`gather`, `Promise.all`) or awaits
 *   a task started earlier (not a call);
 * - a statement that is only `await call(...)`: its result is discarded, so
 *   it is awaited for its effect — a guard that raises, a write;
 * - a function that runs inside a transaction (decorator, callback or
 *   parameter);
 * - a statement marked on its line `# roc: sequential-ok <reason>` (Python)
 *   or `// roc: sequential-ok <reason>` (TS/JS) — the reason is required.
 *
 * Two calls that both receive the same freshly created mutable value (a list
 * one fills and the other reads) are treated as dependent.
 */

import { apisFor, isWrite, type ProjectClients } from './data-clients';
import type {
  CallSite,
  FunctionModel,
  ModuleModel,
  StatementModel,
} from './model';

/** Calls whose order is their meaning, whatever the client. */
const ORDERED = new Set([
  'save',
  'insert',
  'put',
  'post',
  'patch',
  'send',
  'publish',
  'emit',
  'delete',
  'remove',
  'update',
  'upsert',
  'commit',
  'rollback',
  'flush',
  'refresh',
  'write',
  'append',
  'sleep',
  'wait',
  'wait_for',
  'acquire',
  'release',
  'lock',
  'unlock',
  'close',
  'connect',
  'disconnect',
  'start',
  'stop',
  'join',
  'shutdown',
  'create',
  'add',
  'set',
  'increment',
  'decrement',
  'grant',
  'revoke',
  'record',
  'log',
  'notify',
  'enqueue',
  'dispatch',
  'schedule',
  'drop',
  'move',
  'copy',
  'apply',
  'archive',
  'purge',
  'clear',
  'reset',
  'mark',
  'assign',
  'attach',
  'detach',
  'register',
  'subscribe',
  'unsubscribe',
  'accept',
  'reject',
  'approve',
  'cancel',
  'expire',
  'push',
  'tick',
  'process',
  'sweep',
  'migrate',
  'backfill',
  'seed',
  'sync',
  'run',
]);

/** Already concurrent: the fix itself. */
const CONCURRENT = new Set([
  'gather',
  'all',
  'allSettled',
  'any',
  'race',
  'as_completed',
  'TaskGroup',
]);

const MARKER = /roc:\s*sequential-ok\s+\S/;

export interface SequentialRun {
  rel: string;
  line: number;
  function: string;
  calls: Array<{ callee: string; line: number }>;
  language: ModuleModel['language'];
}

/** A call whose order is its meaning: a write, a side effect, a wait, or one already concurrent. */
export function orderedCall(
  call: CallSite,
  clients: ProjectClients,
  module: ModuleModel
): boolean {
  // The first word of the name: `_create_follows` → create, `#pushAll` → push.
  const verb = /^[_#$]*([a-z]+)/.exec(call.method)?.[1] ?? call.method;
  return (
    ORDERED.has(call.method) ||
    ORDERED.has(verb) ||
    CONCURRENT.has(call.method) ||
    isWrite(call, apisFor(clients, module.language))
  );
}

function marked(module: ModuleModel, statement: StatementModel): boolean {
  return module.lines
    .slice(statement.line - 1, statement.endLine)
    .some(line => MARKER.test(line));
}

/** The calls a statement awaits, or null when it cuts the run. */
function memberCalls(
  module: ModuleModel,
  statement: StatementModel,
  clients: ProjectClients
): CallSite[] | null {
  if (
    !statement.simple ||
    statement.awaits.length === 0 ||
    marked(module, statement)
  )
    return null;
  // `await guard(...)` as a statement of its own: the result is discarded,
  // so the call is awaited for its effect (a check that raises, a write).
  if (statement.bound.length === 0 && /^await\b/.test(statement.text))
    return null;
  const calls: CallSite[] = [];
  for (const site of statement.awaits) {
    if (site.nested || !site.call || orderedCall(site.call, clients, module))
      return null;
    calls.push(site.call);
  }
  return calls;
}

interface Member {
  statement: StatementModel;
  calls: CallSite[];
}

function dependsOn(
  member: Member,
  group: readonly Member[],
  mutable: ReadonlySet<string>
): boolean {
  const used = new Set(member.statement.used);
  return group.some(
    earlier =>
      earlier.statement.bound.some(name => used.has(name)) ||
      earlier.statement.used.some(name => mutable.has(name) && used.has(name))
  );
}

function runOf(
  module: ModuleModel,
  fn: FunctionModel,
  group: readonly Member[]
): SequentialRun | null {
  const calls = group.flatMap(m =>
    m.calls.map(c => ({ callee: c.callee, line: c.line }))
  );
  if (calls.length < 2) return null;
  return {
    rel: module.rel,
    line: group[0]?.statement.line ?? fn.line,
    function: fn.name,
    calls,
    language: module.language,
  };
}

/** Runs of independent awaits in one statement list. */
function runsInBlock(
  module: ModuleModel,
  fn: FunctionModel,
  block: readonly StatementModel[],
  clients: ProjectClients,
  mutable: ReadonlySet<string>
): SequentialRun[] {
  const runs: SequentialRun[] = [];
  let group: Member[] = [];
  const flush = (): void => {
    const run = runOf(module, fn, group);
    if (run) runs.push(run);
  };
  for (const statement of block) {
    const calls = memberCalls(module, statement, clients);
    if (!calls) {
      flush();
      group = [];
      continue;
    }
    const member = { statement, calls };
    if (dependsOn(member, group, mutable)) {
      flush();
      group = [member];
    } else {
      group.push(member);
    }
  }
  flush();
  return runs;
}

/** Every run of two or more independent awaited calls in the modules' async functions. */
export function scanSequentialAwaits(
  modules: readonly ModuleModel[],
  clients: ProjectClients
): { runs: SequentialRun[]; asyncFunctions: number } {
  const runs: SequentialRun[] = [];
  let asyncFunctions = 0;
  for (const module of modules) {
    for (const fn of module.functions) {
      if (!fn.isAsync) continue;
      asyncFunctions++;
      if (fn.transactional) continue;
      const mutable = new Set(fn.blocks.flat().flatMap(s => s.mutableBindings));
      for (const block of fn.blocks)
        runs.push(...runsInBlock(module, fn, block, clients, mutable));
    }
  }
  return { runs, asyncFunctions };
}

/**
 * The finding for one run of independent awaits in a row, listing each call
 * and line, with the fix for its language: `Promise.all` or `asyncio.gather`,
 * or the `roc: sequential-ok` marker with a reason.
 */
export function describeSequentialRun(run: SequentialRun): string {
  const listed = run.calls
    .map(c => `${c.callee}() (line ${c.line})`)
    .join(', ');
  const fix =
    run.language === 'python'
      ? "run them together with asyncio.gather(...), or mark the line '# roc: sequential-ok <reason>'"
      : "run them together with Promise.all([...]), or mark the line '// roc: sequential-ok <reason>'";
  return (
    `${run.rel}:${run.line}: ${run.calls.length} independent awaits run one after another in ${run.function}() — ${listed}; ` +
    `none uses another's result, so the request waits for the sum of the round trips — ${fix}`
  );
}

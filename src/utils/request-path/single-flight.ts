/**
 * Async caches without single-flight (#374).
 *
 * A function that checks a keyed container, awaits a fetch on a miss and
 * only then stores the value does nothing for a burst: every concurrent
 * caller checks before the first fetch returns, all miss, and all fetch.
 * Single-flight stores the in-flight future / promise before the await, so
 * the callers that arrive meanwhile await the same one — and drops it when
 * it fails, or the error itself is cached and served to every later caller.
 *
 * Per function, for each container it both checks (`NAME.get(k)`,
 * `k in NAME`, `NAME[k]`, `NAME.has(k)`) and later stores into
 * (`NAME[k] = v`, `NAME.set(k, v)`):
 *
 * - store-after-await: the stored value comes, through the function's own
 *   assignments, from an `await` that runs after the check — unless the
 *   function holds a lock while it does so (`async with lock`, a mutex);
 * - cached error: the stored value is a future / task / promise (an
 *   `ensure_future` / `create_task` / `Future()` in Python; an un-awaited
 *   promise chain, `new Promise`, or a call of an async function in TS/JS)
 *   and the function has no `except` / `finally` / `.catch` /
 *   `add_done_callback` that removes it again.
 *
 * A container created inside the function is a local value, not a cache.
 *
 * In TS/JS a check is a call of `get` / `has` on the container with one
 * argument, the key: the signature of Map, WeakMap, Set and the in-memory
 * cache libraries. A call with more arguments is another API that uses the
 * name (a class whose static `get(root, hash, mode)` reads a file), not a
 * keyed container that concurrent callers share (#437).
 */

import type { FunctionModel, ModuleModel, StatementModel } from './model';
import { functionText, lastSegment } from './read-caches';

export interface FlightSite {
  rel: string;
  /** The line of the store. */
  line: number;
  function: string;
  container: string;
  checkLine: number;
  /** For store-after-await: the awaited expression and its line. */
  awaited: { text: string; line: number } | null;
  /** The stored value is an in-flight future / promise. */
  inFlight: boolean;
  /** For an in-flight store: it is removed again on failure. */
  removedOnFailure: boolean;
  /** The check and the store run under one lock. */
  locked: boolean;
  /** The container belongs to the call (created in it, or a parameter): concurrent requests do not share it. */
  perCall: boolean;
  /** The awaited value is the result of a flight shared by every caller (an in-flight map's task or promise). */
  joinedFlight: boolean;
}

const escapeRe = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const PY_FUTURE =
  /\b(?:asyncio\.)?(?:ensure_future|create_task|Future|run_coroutine_threadsafe)\s*\(|\.create_future\s*\(/;
const TS_PROMISE =
  /\.(?:then|catch|finally)\s*\(|\bnew\s+Promise\b|\bPromise\.\w+\s*\(/;
/** A lock held in Python: `async with <...lock / semaphore / mutex>`. */
const PY_LOCK =
  /^async with [^:]*(?:lock|Lock|semaphore|Semaphore|mutex|Mutex)\b/;
/** A lock or mutex in TS/JS (async-mutex runExclusive, acquire). */
const TS_LOCK = /\.runExclusive\s*\(|\b(?:mutex|Mutex|lock|Lock)\.acquire\s*\(/;

interface Store {
  container: string;
  line: number;
  value: string;
  statement: StatementModel;
}

const PY_STORE =
  /^((?:[A-Za-z_]\w*\.)*[A-Za-z_]\w*)\s*\[(.+)\]\s*=(?!=)\s*(.+)$/s;

function storesOf(module: ModuleModel, fn: FunctionModel): Store[] {
  const statements = fn.blocks.flat();
  if (module.language === 'python') {
    return statements.flatMap(statement => {
      const m = statement.simple ? PY_STORE.exec(statement.text) : null;
      return m
        ? [
            {
              container: m[1] as string,
              line: statement.line,
              value: (m[3] as string).trim(),
              statement,
            },
          ]
        : [];
    });
  }
  return fn.calls
    .filter(
      call =>
        call.method === 'set' && call.args.length >= 2 && call.receiver !== ''
    )
    .flatMap(call => {
      const statement = statements.find(
        s => call.line >= s.line && call.line <= s.endLine
      );
      return statement
        ? [
            {
              container: call.receiver,
              line: call.line,
              value: call.args[1]?.text ?? '',
              statement,
            },
          ]
        : [];
    });
}

/** The statements of the function between two lines (exclusive) that check the container, in order. */
function checksOf(
  module: ModuleModel,
  fn: FunctionModel,
  container: string,
  after: number,
  before: number
): StatementModel[] {
  const name = escapeRe(container);
  const pythonCheck = new RegExp(
    String.raw`(?<![\w.])${name}\.get\(|(?<![\w.])${name}\s*\[|\bin\s+${name}(?![\w.])`
  );
  // TS/JS: a call of get / has on the container with the key alone (#437).
  const checks = (s: StatementModel): boolean =>
    module.language === 'python'
      ? pythonCheck.test(s.text)
      : fn.calls.some(
          call =>
            call.receiver === container &&
            (call.method === 'get' || call.method === 'has') &&
            call.args.length === 1 &&
            call.line >= s.line &&
            call.line <= s.endLine
        );
  return fn.blocks
    .flat()
    .filter(
      s =>
        s.line > after &&
        s.line < before &&
        !/^(?:async\s+)?for\b/.test(s.text) &&
        checks(s)
    )
    .sort((a, b) => a.line - b.line);
}

/** The first statement before `line` that checks the container. */
function checkOf(
  module: ModuleModel,
  fn: FunctionModel,
  container: string,
  line: number
): StatementModel | null {
  return checksOf(module, fn, container, 0, line)[0] ?? null;
}

/**
 * The container belongs to this call, not to the process: created inside
 * the function, or handed in by the caller as a parameter (a memo the
 * caller made for one request). Concurrent requests do not share it.
 */
function isLocal(fn: FunctionModel, container: string): boolean {
  const root = container.split('.')[0] ?? container;
  if (root === 'self' || root === 'cls' || root === 'this') return false;
  const name = escapeRe(root);
  // Bound as a whole name — `x = …`, `const x = …`, `for x in`, `as x` — not a subscript store into it.
  const binds = new RegExp(
    String.raw`^(?:(?:const|let|var)\s+)?${name}\s*(?::[^=]+)?=(?!=)|^(?:async\s+)?for\s+(?:[^=]*[\s,(])?${name}\b[^=]*\sin\s|\bas\s+${name}\b`
  );
  return (
    fn.params.includes(root) || fn.blocks.flat().some(s => binds.test(s.text))
  );
}

/** The statements the stored value comes from, through the function's own assignments, nearest first. */
function sources(fn: FunctionModel, store: Store): StatementModel[] {
  const names = new Set<string>(store.value.match(/[A-Za-z_$][\w$]*/g) ?? []);
  const found: StatementModel[] = [];
  const earlier = fn.blocks
    .flat()
    .filter(s => s.line < store.line)
    .sort((a, b) => b.line - a.line);
  for (let pass = 0; pass < 3; pass++) {
    for (const s of earlier) {
      if (found.includes(s) || !s.bound.some(name => names.has(name))) continue;
      found.push(s);
      // What an await yields is a value: the task or promise behind it is its producer, not the value.
      if (s.awaits.length > 0) continue;
      s.used.forEach(name => names.add(name.split('.')[0] as string));
    }
  }
  return found;
}

/**
 * The await joins a flight started for every caller: it awaits a name (not
 * a call) that the function stores into a container or reads from one, or
 * binds to a future / task / promise. `value = await task` after
 * `task = inflight.get(k)` / `inflight[k] = task` is the coalesced fetch.
 */
function joinsFlight(
  module: ModuleModel,
  fn: FunctionModel,
  awaitStatement: StatementModel
): boolean {
  const site = awaitStatement.awaits[0];
  if (!site || site.call !== null) return false;
  const operand = /\bawait\s+([A-Za-z_$][\w$]*)(?![\w$.([])/.exec(
    awaitStatement.text
  )?.[1];
  if (!operand) return false;
  const name = escapeRe(operand);
  const stored = new RegExp(
    String.raw`\[[^\]]+\]\s*=\s*${name}\s*$|\.set\([^,]+,\s*${name}\s*\)`
  );
  const flight = module.language === 'python' ? PY_FUTURE : TS_PROMISE;
  return fn.blocks
    .flat()
    .some(
      s =>
        stored.test(s.text) ||
        (s.bound.includes(operand) &&
          (/\.get\(/.test(s.text) || flight.test(s.text)))
    );
}

/** Does the stored value (or what it comes from) hold an in-flight future / promise? */
function inFlightValue(
  module: ModuleModel,
  fn: FunctionModel,
  store: Store,
  from: readonly StatementModel[]
): boolean {
  const texts = [store.value, ...from.map(s => s.text)];
  // A value that comes from an await is a result, whatever the awaited thing was.
  if (/\bawait\b/.test(store.value) || from.some(s => s.awaits.length > 0))
    return false;
  if (module.language === 'python')
    return texts.some(text => PY_FUTURE.test(text));
  const asyncNames = new Set(
    module.functions.filter(f => f.isAsync).map(f => f.shortName)
  );
  const callsAsync = texts.some(text =>
    [...text.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)].some(m =>
      asyncNames.has(m[1] as string)
    )
  );
  return (
    callsAsync ||
    texts.some(text => TS_PROMISE.test(text)) ||
    awaitedLater(fn, store)
  );
}

/** The stored name is awaited later in the function (`await p`): it was a promise. */
function awaitedLater(fn: FunctionModel, store: Store): boolean {
  if (!/^[A-Za-z_$][\w$]*$/.test(store.value)) return false;
  const re = new RegExp(String.raw`\bawait\s+${escapeRe(store.value)}\b`);
  return fn.blocks.flat().some(s => s.line >= store.line && re.test(s.text));
}

/** The await the stored value comes from, after the check. */
function awaitedSource(
  store: Store,
  from: readonly StatementModel[],
  checkLine: number
): { text: string; line: number; statement: StatementModel } | null {
  const candidates = [store.statement, ...from].filter(s => s.line > checkLine);
  for (const s of candidates) {
    const site = s.awaits[0];
    if (site && (s !== store.statement || /\bawait\b/.test(store.value))) {
      return {
        text: site.call ? `${site.call.callee}(…)` : 'await',
        line: site.line,
        statement: s,
      };
    }
  }
  return null;
}

function removedOnFailure(
  module: ModuleModel,
  fn: FunctionModel,
  container: string
): boolean {
  const name = String.raw`(?:[\w$.]*\.)?${escapeRe(lastSegment(container))}`;
  const text = functionText(module, fn);
  const pattern =
    module.language === 'python'
      ? new RegExp(
          String.raw`(?:^\s*except\b[^\n]*:|^\s*finally\s*:|add_done_callback)[\s\S]*?(?:\b${name}\.pop\(|\bdel\s+${name}\s*\[)`,
          'm'
        )
      : new RegExp(
          String.raw`(?:\.catch\s*\(|\bcatch\s*(?:\([^)]*\))?\s*\{|\bfinally\s*(?:\(|\{))[\s\S]*?\b${name}\.delete\s*\(`
        );
  return pattern.test(text);
}

/**
 * The check and the store run under one lock: in Python an `async with
 * …lock` block that holds the store and a check of the container (a
 * double-checked lock — a lock around the fetch alone still lets every
 * waiter fetch in turn); in TS/JS a mutex the function acquires.
 */
function lockedCheckAndStore(
  module: ModuleModel,
  fn: FunctionModel,
  store: Store
): boolean {
  if (module.language !== 'python')
    return TS_LOCK.test(functionText(module, fn));
  return fn.blocks
    .flat()
    .some(
      s =>
        PY_LOCK.test(s.text) &&
        s.line < store.line &&
        store.line <= s.endLine &&
        checksOf(module, fn, store.container, s.line, store.line).length > 0
    );
}

function siteOf(
  module: ModuleModel,
  fn: FunctionModel,
  store: Store
): FlightSite | null {
  const check = checkOf(module, fn, store.container, store.line);
  if (!check) return null;
  const from = sources(fn, store);
  const inFlight = inFlightValue(module, fn, store, from);
  const source = inFlight ? null : awaitedSource(store, from, check.line);
  const awaited = source ? { text: source.text, line: source.line } : null;
  return {
    joinedFlight: source !== null && joinsFlight(module, fn, source.statement),
    perCall: isLocal(fn, store.container),
    rel: module.rel,
    line: store.line,
    function: fn.name,
    container: store.container,
    checkLine: check.line,
    awaited,
    inFlight,
    removedOnFailure: inFlight && removedOnFailure(module, fn, store.container),
    locked: lockedCheckAndStore(module, fn, store),
  };
}

/** Every check-then-store site: shared or per call, awaited, in flight, or computed without an await. */
export function scanSingleFlight(
  modules: readonly ModuleModel[]
): FlightSite[] {
  return modules.flatMap(module =>
    module.functions.flatMap(fn =>
      storesOf(module, fn).flatMap(store => siteOf(module, fn, store) ?? [])
    )
  );
}

/** The finding for a site, or null when it is single-flight (or serialised by a lock). */
export function describeFlightSite(site: FlightSite): string | null {
  if (site.perCall) return null;
  if (site.inFlight) {
    return site.removedOnFailure
      ? null
      : `${site.rel}:${site.line}: ${site.function} stores the in-flight future/promise in ${site.container} but never removes it when it fails — the error is cached and every later caller gets it; remove the entry in except/finally (Python) or .catch/finally (TS/JS)`;
  }
  if (site.locked || site.joinedFlight || !site.awaited) return null;
  return `${site.rel}:${site.line}: ${site.function} checks ${site.container} (line ${site.checkLine}) and stores into it only after awaiting ${site.awaited.text} (line ${site.awaited.line}) — concurrent callers all miss and all run the fetch; store the in-flight future/promise before the await (single-flight), and drop it on failure`;
}

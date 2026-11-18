/**
 * Reads that run once per item of a loop (N+1), per call site.
 *
 * An awaited read inside the body of a loop in the same function — `for`,
 * `async for`, `while`, a comprehension element (Python); `for`, `for…of`,
 * `for await`, `for…in`, `while`, `do`, a `.forEach` callback (TS/JS) — costs
 * one round trip per item. A call that reads many keys at once (a batch read,
 * an `in` / `$in` query, a paged read) is the fix at that site and is not
 * reported; neither is a read whose promise is not awaited inside the loop
 * (`asyncio.gather` / `Promise.all` over the items).
 */

import { apisFor, classifyRead, isBatchedText, type ProjectClients } from './data-clients';
import type { AwaitSite, FunctionModel, LoopAwait, ModuleModel, StatementModel } from './model';

export interface LoopRead {
  rel: string;
  line: number;
  loopLine: number;
  loopKind: string;
  callee: string;
  asyncIteration: boolean;
  function: string;
}

export interface LoopReadScan {
  sites: LoopRead[];
  /** Awaited calls the client registry recognised as reads or batch reads, anywhere. */
  recognisedReads: number;
}

function isRecognised(site: AwaitSite, module: ModuleModel, clients: ProjectClients): boolean {
  return site.call !== null && classifyRead(site.call, apisFor(clients, module.language)) !== 'none';
}

/**
 * `query = coll.where("id", "in", chunk)` then `query.stream()`: the batch is
 * in the statement that built the receiver. The last statement of the same
 * function, at or before the call, that binds the receiver's root name is
 * read for a batch operator or a page cursor.
 */
function receiverBuiltBatched(fn: FunctionModel, line: number, receiver: string): boolean {
  const root = /^[A-Za-z_$][\w$]*/.exec(receiver)?.[0];
  if (!root || root === 'self' || root === 'this') return false;
  let builder: StatementModel | null = null;
  for (const statement of fn.blocks.flat()) {
    if (statement.line <= line && statement.bound.includes(root) && (!builder || statement.line >= builder.line)) {
      builder = statement;
    }
  }
  return builder !== null && isBatchedText(builder.text);
}

function loopRead(module: ModuleModel, fn: FunctionModel, loopAwait: LoopAwait, clients: ProjectClients): LoopRead | null {
  const call = loopAwait.site.call;
  if (loopAwait.fixedCount) return null;
  if (!call || classifyRead(call, apisFor(clients, module.language)) !== 'read') return null;
  if (receiverBuiltBatched(fn, loopAwait.site.line, call.receiver)) return null;
  return {
    rel: module.rel,
    line: loopAwait.site.line,
    loopLine: loopAwait.loopLine,
    loopKind: loopAwait.loopKind,
    callee: call.callee,
    asyncIteration: loopAwait.site.asyncIteration,
    function: fn.name,
  };
}

/** Every read-in-a-loop site in the modules, and how many reads were recognised at all. */
export function scanLoopReads(modules: readonly ModuleModel[], clients: ProjectClients): LoopReadScan {
  const sites: LoopRead[] = [];
  const seen = new Set<string>();
  let recognisedReads = 0;
  for (const module of modules) {
    for (const fn of module.functions) {
      recognisedReads += fn.blocks.flat().flatMap(s => s.awaits).filter(a => isRecognised(a, module, clients)).length;
      recognisedReads += fn.loopAwaits.filter(l => l.site.asyncIteration && isRecognised(l.site, module, clients)).length;
      for (const loopAwait of fn.loopAwaits) {
        const site = loopRead(module, fn, loopAwait, clients);
        const key = site ? `${site.rel}:${site.line}:${site.callee}` : '';
        if (site && !seen.has(key)) {
          seen.add(key);
          sites.push(site);
        }
      }
    }
  }
  return { sites, recognisedReads };
}

/** The finding text for one site. */
export function describeLoopRead(site: LoopRead): string {
  const what = site.asyncIteration ? `async iteration over ${site.callee}()` : `await ${site.callee}()`;
  return (
    `${site.rel}:${site.line}: ${what} runs once per item of the ${site.loopKind} loop at line ${site.loopLine} ` +
    `in ${site.function}() — one database round trip per item (N+1). Read the keys in one call at this site ` +
    '(get_all / getAll, an "in" query, $in, findMany with in) or run the reads together (asyncio.gather / Promise.all)'
  );
}

/**
 * Does a read in a loop depend on the loop's item?
 *
 * N+1 means one read per item: the read's arguments or receiver use the
 * loop's target, or a name derived from it in the loop body (simple def-use:
 * a statement that reads a derived name makes the names it binds derived
 * too). A read that does not — a retry loop re-reading one key, a `while`
 * that polls — is not one read per item.
 */

import type { CallSite, LoopAwait, StatementModel } from './model';

function root(name: string): string {
  return name.split('.')[0] as string;
}

function touches(names: readonly string[], derived: ReadonlySet<string>): boolean {
  return names.some(name => derived.has(name) || derived.has(root(name)));
}

/** The loop's targets and every name the body derives from them (to a fixed point). */
export function loopDerivedNames(targets: Iterable<string>, statements: readonly StatementModel[]): Set<string> {
  const derived = new Set(targets);
  let grew = derived.size > 0;
  while (grew) {
    grew = false;
    for (const statement of statements) {
      if (!touches(statement.used, derived)) continue;
      for (const name of statement.bound) {
        if (!derived.has(name)) {
          derived.add(name);
          grew = true;
        }
      }
    }
  }
  return derived;
}

/** Does the call read a name derived from the loop's item? */
export function callDependsOn(call: CallSite | null, derived: ReadonlySet<string>): boolean {
  return call !== null && derived.size > 0 && touches(call.names, derived);
}

/** A loop being walked: what it binds, the statements in its body, and the awaits recorded in it. */
export interface WalkedLoop {
  line: number;
  kind: string;
  fixedCount?: boolean;
  targets: string[];
  statements: StatementModel[];
  awaits: LoopAwait[];
}

/** Once the body is walked: mark each await in the loop as depending on its item or not. */
export function finishLoop(loop: WalkedLoop): void {
  const derived = loopDerivedNames(loop.targets, loop.statements);
  for (const loopAwait of loop.awaits) loopAwait.dependsOnLoop = callDependsOn(loopAwait.site.call, derived);
}

/**
 * What the Next server laws share: reading the project's source through one
 * module graph (so a file that cannot be read is reported once, never passed)
 * and recognising a call to a configured guard.
 */

import type * as TS from 'typescript';
import type { LawCheckContext } from '../../types/law.types';
import { calleeChain, callsIn, unwrap } from '../../utils/react/module-exports';
import { NextModuleGraph } from '../../utils/react/next-module-graph';
import { calleeNamed } from '../../utils/react/next-thresholds';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';

export interface ReadProject {
  graph: NextModuleGraph | null;
  sources: TsxSource[];
  /** Messages for what could not be read; each is a violation. */
  unread: string[];
}

/** Parse every non-test source file; a missing parser makes every file unread. */
export function readProject(context: LawCheckContext): ReadProject {
  const files = ReactProject.sourceFiles(context);
  const graph = NextModuleGraph.create(context);
  if (typeof graph === 'string') {
    return { graph: null, sources: [], unread: files.length > 0 ? [`${files.length} file(s): ${graph}`] : [] };
  }
  const sources = graph.sourcesOf(files);
  return { graph, sources, unread: graph.unread };
}

/** A call whose callee is one of `guards` (`requireUser()`, `auth.requireUser()`). */
export function isGuardCall(source: TsxSource, call: TS.CallExpression, guards: readonly string[]): boolean {
  const callee = unwrap(source.ts, call.expression).getText(source.sourceFile);
  return calleeNamed(callee, guards);
}

/** A call built from a guard anywhere in its callee chain (`withAuth(fn)`, `authClient.action(fn)`). */
export function isGuardWrapper(source: TsxSource, call: TS.CallExpression, guards: readonly string[]): boolean {
  return calleeChain(source.ts, call, source).some(name => calleeNamed(name, guards));
}

/** Whether `node`'s subtree calls a guard (nested functions included when `ownBodyOnly` is false). */
export function callsGuard(
  source: TsxSource,
  node: TS.Node,
  guards: readonly string[],
  ownBodyOnly: boolean
): boolean {
  return callsIn(source.ts, node, ownBodyOnly).some(call => isGuardCall(source, call, guards));
}

/** `a, b, c` — at most `limit` names, then `… and N more`. */
export function listed(names: readonly string[], limit = 5): string {
  const shown = names.slice(0, limit).join(', ');
  return names.length > limit ? `${shown} … and ${names.length - limit} more` : shown;
}

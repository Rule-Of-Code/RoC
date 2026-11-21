/**
 * What a walk of the Next module graph did not read, worded for the client
 * graph law and the Server Component law (Next Heavy Lib In Client Graph,
 * Next Client Props Serializable). The graph and its conclusions are the
 * ones every Next law shares; only the wording of an import that resolved to
 * nothing is theirs, kept from before the graphs were one (#287).
 */

import {
  NOT_RESOLVED,
  type NextModuleGraph,
  type Unresolved,
  type WalkResult,
} from '../../utils/react/next-module-graph';

/** The configs and imports a walk could not read, one message each. */
export function notReadInWalk(
  graph: NextModuleGraph,
  walk: WalkResult
): string[] {
  const messages = [
    ...walk.configs,
    ...walk.unresolved.map(item => describe(graph, item)),
  ];
  return [...new Set(messages)];
}

function describe(graph: NextModuleGraph, item: Unresolved): string {
  return item.reason === NOT_RESOLVED
    ? `${graph.relative(item.from)}:${item.line}: '${item.specifier}' did not resolve to a file — the modules below it were not read`
    : graph.describeUnresolved(item);
}

/**
 * Next Heavy Lib In Client Graph
 *
 * A Server Component's imports stay on the server. A `'use client'` module's
 * imports — and theirs, transitively — ship to the browser in the route's
 * first-load JavaScript. One static `import moment from 'moment'` deep in a
 * shared helper puts the whole library into every page that reaches it, and
 * nothing at the import site says so. Loaded with `next/dynamic`,
 * `React.lazy` or `import()`, the same library becomes its own chunk,
 * fetched when it is needed.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { importChain } from '../../utils/react/module-graph';
import { NextAppFiles } from '../../utils/react/next-app-files';
import { NextSourcesLoader } from '../../utils/react/next-sources';
import { ReactProject } from '../../utils/react/react-project';
import { LawBase } from '../law-base';
import { matchesAny, nextThresholds } from './next-client-law-support';

/**
 * Libraries that are large as a whole and are commonly imported whole. The
 * list is a judgement, not a measurement; `thresholds.next.heavyClientLibraries`
 * replaces it. Globs over the import specifier: `lodash` matches the root
 * import only (`lodash/debounce` is the remedy), `three/**` its subpaths.
 */
export const DEFAULT_HEAVY_CLIENT_LIBRARIES: readonly string[] = [
  'moment',
  'lodash',
  'chart.js',
  'chart.js/auto',
  'd3',
  'three',
  'three/**',
  'plotly.js',
  'plotly.js-dist',
  'plotly.js-dist-min',
  'mapbox-gl',
  'monaco-editor',
  'pdfjs-dist',
];

export class NextHeavyLibInClientGraphLaw extends LawBase {
  static readonly LAW_NAME = 'Next Heavy Lib In Client Graph';

  static check(context: LawCheckContext): LawResult {
    const sources = NextSourcesLoader.load(context);
    if (!NextSourcesLoader.hasRouter(sources)) {
      return this.result([...sources.unread, NextAppFiles.noRouterDirectory(context)], context);
    }
    const graph = NextSourcesLoader.clientGraph(context, sources);
    if (sources.unread.length === 0 && graph.unread.length === 0 && graph.nodes.size === 0) {
      return NextAppFiles.withoutSubject(
        this.LAW_NAME,
        "no 'use client' module and no Pages Router page — nothing ships a client bundle of its own",
        context
      );
    }
    const heavy = nextThresholds(context).heavyClientLibraries ?? DEFAULT_HEAVY_CLIENT_LIBRARIES;
    const violations = [...sources.unread, ...graph.unread];
    for (const [file, node] of graph.nodes) {
      for (const edge of node.edges) {
        if (edge.resolution.kind !== 'external' || !matchesAny(edge.specifier, heavy)) continue;
        violations.push(
          `${ReactProject.relative(context, file)}:${edge.line}: imports '${edge.specifier}' statically, and this module ships to the browser (${importChain(context, graph, file)}) — load it with next/dynamic or import()`
        );
      }
    }
    return this.result(violations, context);
  }

  private static result(violations: string[], context: LawCheckContext): LawResult {
    return this.createResult(
      violations,
      this.LAW_NAME,
      'PERFORMANCE',
      [
        "Load the component that needs it with next/dynamic(() => import('./chart'))",
        "Or call import('library') where it is used, so it becomes its own chunk",
        'Import a subpath (lodash/debounce) instead of the whole library',
        'Keep the import in a Server Component when the browser does not need it',
      ],
      context
    );
  }
}

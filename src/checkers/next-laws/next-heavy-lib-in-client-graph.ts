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
import { NextAppFiles } from '../../utils/react/next-app-files';
import { clientGraph, type GraphChoice } from '../../utils/react/next-entries';
import {
  isBareSpecifier,
  type ModuleEdge,
  NOT_RESOLVED,
} from '../../utils/react/next-module-graph';
import { NextSourcesLoader } from '../../utils/react/next-sources';
import { ReactProject } from '../../utils/react/react-project';
import { LawBase } from '../law-base';
import { matchesAny, nextThresholds } from './next-client-law-support';
import { readProject } from './next-server-support';
import { notReadInWalk } from './next-walk-messages';

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

  /**
   * First-load JavaScript is what this law weighs: `require()` is bundled in
   * the same chunk, so it is an edge; `import()` is a chunk fetched when
   * needed — the remedy this law recommends — so it is not. A `'use server'`
   * module is a node without edges.
   */
  static readonly GRAPH: GraphChoice = {
    require: true,
    dynamicImport: false,
    boundary: 'module',
  };

  static check(context: LawCheckContext): LawResult {
    const { graph, unread } = readProject(context);
    const apps = ReactProject.nextApps(context.projectRoot);
    if (!NextSourcesLoader.hasRouter({ apps })) {
      return this.result(
        [...unread, NextAppFiles.noRouterDirectory(context)],
        context
      );
    }
    if (!graph) return this.result(unread, context);
    const walk = clientGraph(graph, apps, this.GRAPH);
    if (
      graph.unread.length === 0 &&
      walk.unresolved.length === 0 &&
      walk.configs.length === 0 &&
      walk.modules.size === 0
    ) {
      return NextAppFiles.withoutSubject(
        this.LAW_NAME,
        "no 'use client' module and no Pages Router page — nothing ships a client bundle of its own",
        context
      );
    }
    const heavy =
      nextThresholds(context).heavyClientLibraries ??
      DEFAULT_HEAVY_CLIENT_LIBRARIES;
    const violations: string[] = [];
    for (const [file, visit] of walk.modules) {
      for (const edge of visit.edges) {
        if (!this.isPackage(edge) || !matchesAny(edge.specifier, heavy))
          continue;
        violations.push(
          `${graph.relative(file)}:${edge.line}: imports '${edge.specifier}' statically, and this module ships to the browser (${graph.chain(walk.modules, file)}) — load it with next/dynamic or import()`
        );
      }
    }
    return this.result(
      [...graph.unread, ...notReadInWalk(graph, walk), ...violations],
      context
    );
  }

  /**
   * An import of a package: an installed one, or a package name that did not
   * resolve (then the walk also reports it as not read — the import is
   * written all the same).
   */
  private static isPackage(edge: ModuleEdge): boolean {
    const resolution = edge.resolution;
    return (
      resolution.kind === 'external' ||
      (resolution.kind === 'unresolved' &&
        resolution.reason === NOT_RESOLVED &&
        isBareSpecifier(edge.specifier))
    );
  }

  private static result(
    violations: string[],
    context: LawCheckContext
  ): LawResult {
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

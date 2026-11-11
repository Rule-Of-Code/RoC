/**
 * Next Server Only Boundary
 *
 * A `'use client'` module pulls every module it imports, transitively, into
 * the browser bundle. A database driver or `fs` that a shared helper imports
 * reaches the browser through any client component that imports the helper —
 * a build error at best, a leaked connection string at worst. `server-only`
 * turns that import into a build error ("'server-only' cannot be imported
 * from a Client Component module", next/dist/build/webpack-config.js), but
 * only in a module that carries the marker, and nothing requires it.
 *
 * Rule 1: no module in a client graph imports a server module (the built-in
 * list in DEFAULT_SERVER_MODULES plus `thresholds.next.serverModules`).
 * Rule 2 (`thresholds.next.requireServerOnlyMarker`, default true): a module
 * the server graph imports, which imports a server module itself, carries
 * `import 'server-only'` — so the next client import of it fails the build.
 * Next's own entry files (pages, layouts, route handlers, proxy) and
 * `'use server'` modules are not imported by client code and are exempt.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  clientGraph,
  DEFAULT_SERVER_MODULES,
  isClientModule,
  isListedModule,
  isServerModule,
  NextModuleGraph,
  type Unresolved,
  type Visit,
} from '../../utils/react/next-module-graph';
import { nextServerEntries } from '../../utils/react/next-entries';
import { NextThresholds } from '../../utils/react/next-thresholds';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';
import { readProject } from './next-server-support';

export class NextServerOnlyBoundaryLaw extends LawBase {
  static readonly LAW_NAME = 'Next Server Only Boundary';

  static check(context: LawCheckContext): LawResult {
    const extra = NextThresholds.serverModules(context);
    const marker = NextThresholds.requireServerOnlyMarker(context);
    const serverModules = [...DEFAULT_SERVER_MODULES, ...(extra.value ?? [])];
    const { graph, unread } = readProject(context);
    const violations = [...extra.problems, ...marker.problems];
    if (!graph) return this.result([...violations, ...unread], context);
    const apps = ReactProject.nextApps(context.projectRoot);
    const client = clientGraph(graph, apps);
    const unresolved: Unresolved[] = [...client.unresolved];
    for (const [file, visit] of client.modules) {
      for (const specifier of this.serverImports(graph, visit.source, serverModules)) {
        violations.push(
          `${graph.relative(file)}:${specifier.line}: imports '${specifier.specifier}', and is bundled for the browser through ${graph.chain(client.modules, file)} — move the server code behind a Server Component, a route handler or a 'use server' action`
        );
      }
    }
    if (marker.value !== false) {
      const entries = nextServerEntries(graph, apps);
      const server = graph.walk(entries, isClientModule);
      unresolved.push(...server.unresolved);
      violations.push(...this.unmarked(graph, server.modules, new Set(entries), client.modules, serverModules));
    }
    const seen = new Set<string>();
    for (const item of unresolved) {
      const message = graph.describeUnresolved(item);
      if (!seen.has(message)) violations.push(message);
      seen.add(message);
    }
    return this.result([...violations, ...graph.unread], context);
  }

  private static result(violations: string[], context: LawCheckContext): LawResult {
    return this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        'Keep database drivers and Node built-ins out of every module a \'use client\' file imports',
        "Add `import 'server-only'` to each module that imports one, so a client import of it fails the build",
        'Hand client components data as props, or call a Server Action, instead of importing server code',
      ],
      context
    );
  }

  private static serverImports(
    graph: NextModuleGraph,
    source: TsxSource,
    serverModules: readonly string[]
  ): Array<{ specifier: string; line: number }> {
    return graph.importsOf(source).filter(item => isListedModule(item.specifier, serverModules));
  }

  private static unmarked(
    graph: NextModuleGraph,
    modules: Map<string, Visit>,
    entries: Set<string>,
    clientModules: Map<string, Visit>,
    serverModules: readonly string[]
  ): string[] {
    const violations: string[] = [];
    for (const [file, visit] of modules) {
      if (entries.has(file) || clientModules.has(file) || isServerModule(visit.source)) continue;
      const imports = graph.importsOf(visit.source);
      if (imports.some(item => item.specifier === 'server-only')) continue;
      const direct = imports.filter(item => isListedModule(item.specifier, serverModules));
      if (direct.length === 0) continue;
      violations.push(
        `${graph.relative(file)}:${direct[0]?.line ?? 1}: imports '${direct.map(d => d.specifier).join("', '")}' without import 'server-only' — the first client component that imports it ships it to the browser instead of failing the build (reached through ${graph.chain(modules, file)})`
      );
    }
    return violations;
  }
}

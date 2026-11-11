/**
 * No Test-Only Leakage
 *
 * A fake auth provider, a mock API, a `/api/test/seed` route: code that exists
 * for tests ships to production the moment a route imports it and nothing
 * ties it to an environment. The test suite cannot catch this — in the test
 * environment the fake is exactly what should run.
 *
 * The law walks the import graph of each Next app from its routes (every
 * non-test file under `app/` and `pages/`, plus `middleware`, `proxy` and
 * `instrumentation`) and follows only UNGATED edges (see test-only-graph). A
 * test-only file reached that way — by the default patterns or
 * `thresholds.testing.testOnlyPaths` — is a finding, unless the file stops
 * itself under an environment condition (`if (process.env.NODE_ENV ===
 * 'production') return notFound()`).
 */

import * as fs from 'fs';
import { minimatch } from 'minimatch';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PathOperations } from '../../utils/path-operations';
import { type NextApp, ReactProject } from '../../utils/react/react-project';
import {
  loadTypeScript,
  parserUnavailable,
  TsxSource,
  type TypeScriptModule,
} from '../../utils/react/tsx-source';
import { TestSources } from '../../utils/testing/test-sources';
import { LawBase } from '../law-base';
import { ImportGraph, selfGated } from './test-only-graph';

/** Files that exist for tests only, by convention, matched from the project root. */
export const DEFAULT_TEST_ONLY_PATHS = [
  '**/__mocks__/**',
  '**/__fixtures__/**',
  '**/mocks/**',
  '**/test-utils/**',
  '**/*.{mock,mocks,fake,fakes,fixture,fixtures}.*',
  '**/test-utils.*',
  '**/{app,pages}/**/{test,tests,e2e,__test__}/**',
];

export const TEST_ONLY_PATHS_KEY = 'thresholds.testing.testOnlyPaths';

/** Files Next runs on its own, beside the router directories. */
const ROOT_ENTRY = /^(?:src\/)?(?:middleware|proxy|instrumentation)\.[cm]?[jt]sx?$/;

interface Reach {
  /** Entry → … → test-only file, absolute paths. */
  chain: string[];
}

export class NoTestOnlyLeakageLaw extends LawBase {
  static readonly LAW_NAME = 'No Test-Only Leakage';

  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const patterns = this.patterns(context, violations);
    const apps = ReactProject.nextApps(context.projectRoot);
    const ts = loadTypeScript(context.projectRoot);
    if (apps.length > 0 && !ts) violations.push(parserUnavailable(context.projectRoot));
    // Tests included in the scan, then test FILES dropped: a route under
    // app/api/test/ is a route, and the default test ignores (`**/test/**`)
    // would hide exactly the routes this law is about.
    const sourceFiles = TestSources.codeFiles(context)
      .filter(file => !TestSources.isTestFile(file))
      .map(file => PathOperations.resolve(file));
    for (const app of ts ? apps : []) {
      violations.push(...this.checkApp(context, ts as TypeScriptModule, app, sourceFiles, patterns));
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        "Gate the use on the environment: {process.env.NEXT_PUBLIC_E2E === 'true' && <FakeProvider />}, or import() it inside that branch",
        "Make a test-only route stop itself: if (process.env.NODE_ENV === 'production') notFound()",
      ],
      context
    );
  }

  /** Defaults plus the configured globs; a malformed setting is reported, not ignored. */
  private static patterns(context: LawCheckContext, violations: string[]): string[] {
    const configured: unknown = context.config.thresholds?.testing?.testOnlyPaths;
    if (configured === undefined) return DEFAULT_TEST_ONLY_PATHS;
    if (Array.isArray(configured) && configured.every(entry => typeof entry === 'string')) {
      return [...DEFAULT_TEST_ONLY_PATHS, ...configured];
    }
    violations.push(
      `${TEST_ONLY_PATHS_KEY} is ${JSON.stringify(configured)} — not a list of globs. Only the default patterns were used`
    );
    return DEFAULT_TEST_ONLY_PATHS;
  }

  private static checkApp(
    context: LawCheckContext,
    ts: TypeScriptModule,
    app: NextApp,
    sourceFiles: string[],
    patterns: string[]
  ): string[] {
    const where = ReactProject.relative(context, app.root) || '.';
    const routerDirs = [...app.appDirs, ...app.pagesDirs];
    if (routerDirs.length === 0) {
      return [`${where}: declares next but has no app/ or pages/ directory (or src/app, src/pages) — no route was read`];
    }
    const appRoot = PathOperations.resolve(app.root);
    const entries = sourceFiles.filter(
      file =>
        routerDirs.some(dir => PathOperations.isInDirectory(file, dir)) ||
        ROOT_ENTRY.test(PathOperations.getRelative(appRoot, file))
    );
    const testOnly = (file: string): boolean => {
      const relative = PathOperations.getRelative(context.projectRoot, file);
      return patterns.some(pattern => minimatch(relative, pattern, { dot: true }));
    };
    const graph = new ImportGraph(ts, app.root, PathOperations.resolve(context.projectRoot));
    const { reached, unread } = this.walk(ts, graph, entries, testOnly);
    return [
      ...unread.map(file => `${ReactProject.relative(context, file)}: could not be read — the routes importing it were not followed through it`),
      ...reached.map(reach => this.describe(context, reach)),
    ];
  }

  /** Breadth-first over ungated edges; stops at each test-only file and judges it. */
  private static walk(
    ts: TypeScriptModule,
    graph: ImportGraph,
    entries: string[],
    testOnly: (file: string) => boolean
  ): { reached: Reach[]; unread: string[] } {
    const parent = new Map<string, string | null>(entries.map(entry => [entry, null]));
    const queue = [...entries];
    const reached: Reach[] = [];
    const unread: string[] = [];
    while (queue.length > 0) {
      const file = queue.shift() as string;
      const source = this.read(ts, file);
      if (!source) {
        unread.push(file);
        continue;
      }
      if (testOnly(file)) {
        if (!selfGated(source)) reached.push({ chain: this.chain(parent, file) });
        continue;
      }
      for (const edge of graph.edges(source)) {
        if (edge.gated || parent.has(edge.target)) continue;
        parent.set(edge.target, file);
        queue.push(edge.target);
      }
    }
    return { reached, unread };
  }

  private static read(ts: TypeScriptModule, file: string): TsxSource | null {
    try {
      return TsxSource.parse(ts, file, fs.readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  }

  private static chain(parent: Map<string, string | null>, file: string): string[] {
    const chain = [file];
    let current = parent.get(file) ?? null;
    while (current) {
      chain.unshift(current);
      current = parent.get(current) ?? null;
    }
    return chain;
  }

  private static describe(context: LawCheckContext, reach: Reach): string {
    const names = reach.chain.map(file => ReactProject.relative(context, file));
    const leaked = names[names.length - 1];
    const route =
      names.length === 1
        ? 'is itself a route'
        : `is reachable from ${names.join(' → ')}`;
    return `${leaked} is test-only and ${route} with no environment gate on the way — it ships in the production build. Gate its use on process.env, or make it stop itself outside tests`;
  }
}

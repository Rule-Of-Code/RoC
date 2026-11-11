/**
 * Next Proxy Placement And Matcher
 *
 * Next's proxy (named middleware before v16) fails quietly in four ways, all
 * read from next@16 itself:
 * - It is looked for only in the parent of the pages (else app) directory —
 *   `proxy.ts` at the root beside `src/app/` is never loaded, and nothing says
 *   so (next/dist/build/index.js, the `isAtConventionLevel` scan).
 * - `middleware` is deprecated since v16; with both files present the build
 *   stops ("Both middleware file … and proxy file … are detected").
 * - Without a `config.matcher` it "runs on every request, including static
 *   files", and a matcher that is not a constant "will be ignored"
 *   (next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
 * - The file "must export a single function, either as a default export or
 *   named proxy".
 * A proxy that deliberately runs everywhere is declared in
 * `thresholds.next.proxyWithoutMatcher` with the reason.
 */

import * as fs from 'fs';
import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { PathOperations } from '../../utils/path-operations';
import { moduleExports, unwrap } from '../../utils/react/module-exports';
import { NextModuleGraph } from '../../utils/react/next-module-graph';
import { routerLayout, specialFile } from '../../utils/react/next-routes';
import { NextThresholds } from '../../utils/react/next-thresholds';
import { ReactProject, type NextApp } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

const MATCHER_KEY = 'thresholds.next.proxyWithoutMatcher';

export class NextProxyPlacementAndMatcherLaw extends LawBase {
  static readonly LAW_NAME = 'Next Proxy Placement And Matcher';

  static check(context: LawCheckContext): LawResult {
    const withoutMatcher = NextThresholds.proxyWithoutMatcher(context);
    const violations = [...withoutMatcher.problems];
    const graph = NextModuleGraph.create(context);
    for (const app of ReactProject.nextApps(context.projectRoot)) {
      violations.push(...this.checkApp(context, app, graph, withoutMatcher.value));
    }
    if (typeof graph !== 'string') violations.push(...graph.unread);
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        'Put proxy.ts beside the app/ (or pages/) directory Next uses: the project root, or src/ when the router is in src/',
        'Rename middleware.ts to proxy.ts on Next 16 (npx @next/codemod@canary middleware-to-proxy .)',
        'Export a literal config.matcher that excludes _next/static, _next/image and public assets',
        'Export exactly one proxy function: default, or named proxy',
      ],
      context
    );
  }

  private static checkApp(
    context: LawCheckContext,
    app: NextApp,
    graph: NextModuleGraph | string,
    withoutMatcher: string | undefined
  ): string[] {
    const conventionDir = routerLayout(app).conventionDir;
    if (!conventionDir) return [];
    const rel = (file: string): string => ReactProject.relative(context, file);
    const major = this.nextMajor(app);
    const expected = major !== null && major < 16 ? 'middleware' : 'proxy';
    const { found, violations } = this.locate(app, conventionDir, rel);
    const proxy = found.get('proxy');
    const middleware = found.get('middleware');
    const naming = this.namingProblem(expected, major, proxy, middleware, rel);
    if (naming) violations.push(naming);
    const effective = expected === 'proxy' ? (proxy ?? middleware) : middleware;
    if (!effective) return violations;
    if (typeof graph === 'string') return [...violations, `${rel(effective)}: ${graph}`];
    const source = graph.source(effective);
    if (!source) return violations;
    violations.push(...this.exportProblems(source, rel(effective), effective === proxy ? 'proxy' : 'middleware'));
    const matcher = this.matcherProblem(source);
    if (matcher && !(withoutMatcher && matcher.absent)) violations.push(`${rel(effective)}: ${matcher.message}`);
    return violations;
  }

  /** proxy/middleware files at the app root and in src/: the ones Next loads, and the ones it never will. */
  private static locate(
    app: NextApp,
    conventionDir: string,
    rel: (file: string) => string
  ): { found: Map<string, string>; violations: string[] } {
    const found = new Map<string, string>();
    const violations: string[] = [];
    const loaded = PathOperations.normalize(conventionDir);
    for (const dir of [app.root, PathOperations.join(app.root, 'src')]) {
      for (const name of ['proxy', 'middleware']) {
        const file = specialFile(dir, name);
        if (!file) continue;
        if (PathOperations.normalize(dir) === loaded) found.set(name, file);
        else violations.push(`${rel(file)}: is never loaded — Next looks for ${name} only in ${rel(conventionDir) || '.'}, beside the router directory it uses. Move it there`);
      }
    }
    return { found, violations };
  }

  private static namingProblem(
    expected: string,
    major: number | null,
    proxy: string | undefined,
    middleware: string | undefined,
    rel: (file: string) => string
  ): string | null {
    if (expected === 'proxy' && proxy && middleware) {
      return `${rel(middleware)} and ${rel(proxy)}: both exist — Next 16 refuses to build with both. Keep ${rel(proxy)} only`;
    }
    if (expected === 'proxy' && middleware) {
      return `${rel(middleware)}: the middleware convention is deprecated since Next 16 — rename it proxy (npx @next/codemod@canary middleware-to-proxy .)`;
    }
    if (expected === 'middleware' && proxy) {
      return `${rel(proxy)}: next@${major} reads middleware, not proxy — this file is never loaded. Rename it middleware, or upgrade to Next 16`;
    }
    return null;
  }

  private static exportProblems(source: TsxSource, where: string, name: string): string[] {
    const names = moduleExports(source).map(entry => entry.name);
    const hasDefault = names.includes('default');
    const hasNamed = names.includes(name);
    if (hasDefault && hasNamed) {
      return [`${where}: exports both a default and a named ${name} function — Next supports one proxy per file. Keep one`];
    }
    if (!hasDefault && !hasNamed) {
      return [`${where}: exports no default and no '${name}' function — Next has nothing to run`];
    }
    return [];
  }

  /** What is wrong with `config.matcher`; `absent` when there is none at all. */
  private static matcherProblem(source: TsxSource): { message: string; absent: boolean } | null {
    const ts = source.ts;
    const config = this.exportedConfig(source);
    const absentMessage = `has no config.matcher — it runs on every request, static files and images included. Export a literal matcher, or declare the reason in ${MATCHER_KEY}`;
    if (config === undefined) return { message: absentMessage, absent: true };
    if (config === null) {
      return { message: 'config is not a literal object — Next reads it statically and ignores what it cannot evaluate', absent: false };
    }
    const property = config.properties.find(
      (p): p is TS.PropertyAssignment => ts.isPropertyAssignment(p) && p.name.getText(source.sourceFile) === 'matcher'
    );
    if (!property) return { message: absentMessage, absent: true };
    if (!this.isLiteralMatcher(ts, property.initializer)) {
      return {
        message: `config.matcher (${property.initializer.getText(source.sourceFile)}) is not a constant — Next ignores a dynamic matcher value. Write the paths literally`,
        absent: false,
      };
    }
    return null;
  }

  /** The exported `config` object literal; null when it is exported but not a literal; undefined when absent. */
  private static exportedConfig(source: TsxSource): TS.ObjectLiteralExpression | null | undefined {
    const ts = source.ts;
    const declaration = source.sourceFile.statements
      .filter(ts.isVariableStatement)
      .filter(statement => (ts.getModifiers(statement) ?? []).some(m => m.kind === ts.SyntaxKind.ExportKeyword))
      .flatMap(statement => [...statement.declarationList.declarations])
      .find(d => ts.isIdentifier(d.name) && d.name.text === 'config');
    if (declaration) {
      const value = declaration.initializer ? unwrap(ts, declaration.initializer) : undefined;
      return value && ts.isObjectLiteralExpression(value) ? value : null;
    }
    return moduleExports(source).some(entry => entry.name === 'config') ? null : undefined;
  }

  private static isLiteralMatcher(ts: typeof TS, node: TS.Expression): boolean {
    const value = unwrap(ts, node);
    if (ts.isStringLiteralLike(value)) return true;
    if (!ts.isArrayLiteralExpression(value) || value.elements.length === 0) return false;
    return value.elements.every(element => this.isLiteralMatcherItem(ts, unwrap(ts, element)));
  }

  /** A path string, or `{ source: '…', has/missing/locale }` written as constants. */
  private static isLiteralMatcherItem(ts: typeof TS, item: TS.Expression): boolean {
    if (ts.isStringLiteralLike(item)) return true;
    if (!ts.isObjectLiteralExpression(item)) return false;
    const hasSource = item.properties.some(
      p => ts.isPropertyAssignment(p) && p.name.getText() === 'source' && ts.isStringLiteralLike(unwrap(ts, p.initializer))
    );
    return hasSource && this.isConstant(ts, item);
  }

  private static isConstant(ts: typeof TS, node: TS.Expression): boolean {
    const value = unwrap(ts, node);
    if (ts.isStringLiteralLike(value) || ts.isNumericLiteral(value)) return true;
    if (value.kind === ts.SyntaxKind.TrueKeyword || value.kind === ts.SyntaxKind.FalseKeyword) return true;
    if (ts.isArrayLiteralExpression(value)) return value.elements.every(e => this.isConstant(ts, e));
    if (ts.isObjectLiteralExpression(value)) {
      return value.properties.every(p => ts.isPropertyAssignment(p) && this.isConstant(ts, p.initializer));
    }
    return false;
  }

  /** The installed next major, else the one the manifest declares; null when neither is readable. */
  static nextMajor(app: NextApp): number | null {
    try {
      const manifestPath = require.resolve('next/package.json', { paths: [app.root] });
      const version = (JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { version?: string }).version;
      const major = /^(\d+)/.exec(version ?? '')?.[1];
      if (major) return Number(major);
    } catch {
      /* not installed: fall back to the declared range */
    }
    const manifest = FileSystemOperations.readJsonFile<{
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    }>(PathOperations.join(app.root, 'package.json'), {});
    const range = manifest?.dependencies?.next ?? manifest?.devDependencies?.next ?? '';
    const declared = /(\d+)/.exec(range)?.[1];
    return declared ? Number(declared) : null;
  }
}

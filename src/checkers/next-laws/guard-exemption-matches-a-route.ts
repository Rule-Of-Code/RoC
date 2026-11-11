/**
 * Guard Exemption Matches A Route
 *
 * A CSRF, auth or rate-limit guard usually carries a list of exempt path
 * patterns, and nothing connects that list to the routes. A pattern with a
 * typo or a stale prefix matches no route and nobody finds out: the dead
 * exemption waits for the next route that happens to match it, and the route
 * it was written for is handled differently from what the code says.
 *
 * The lists are declared in `thresholds.next.guardExemptions` (file, top-level
 * constant, and how the guard compares: exact, prefix, glob or regex). Each
 * constant must be a literal array of strings (or RegExp literals); each
 * pattern must match at least one page or route handler of the filesystem
 * route tree (route groups and parallel slots removed, private folders
 * excluded). What every pattern covers is returned in the result's metrics,
 * so a pattern wider than intended is visible.
 */

import { minimatch } from 'minimatch';
import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { PathOperations } from '../../utils/path-operations';
import { unwrap } from '../../utils/react/module-exports';
import { NextModuleGraph } from '../../utils/react/next-module-graph';
import { nextRoutes, routerLayout, type NextRoute, type RouteSegment } from '../../utils/react/next-routes';
import { NextThresholds, type ExemptionMatch, type GuardExemption } from '../../utils/react/next-thresholds';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';
import { listed } from './next-server-support';

const KEY = 'thresholds.next.guardExemptions';

interface Pattern {
  text: string;
  regex: RegExp | null;
  line: number;
}

export class GuardExemptionMatchesARouteLaw extends LawBase {
  static readonly LAW_NAME = 'Guard Exemption Matches A Route';

  static check(context: LawCheckContext): LawResult {
    const declared = NextThresholds.guardExemptions(context);
    const violations = [...declared.problems];
    const coverage: Record<string, string[]> = {};
    if (declared.value === undefined && declared.problems.length === 0) {
      violations.push(
        `${KEY} is not declared — the law cannot find your guards' exemption lists. Declare each one ({ file, constant, match }), or [] when no guard has one`
      );
    }
    const graph = NextModuleGraph.create(context);
    const routes = nextRoutes(ReactProject.nextApps(context.projectRoot).map(routerLayout));
    for (const exemption of declared.value ?? []) {
      if (typeof graph === 'string') {
        violations.push(`${exemption.file}: ${graph}`);
        continue;
      }
      const read = this.patterns(graph, context, exemption);
      if (typeof read === 'string') {
        violations.push(`${exemption.file}: ${exemption.constant} ${read}`);
        continue;
      }
      const candidates = this.routesFor(context, exemption, routes);
      for (const pattern of read) {
        const covered = candidates.filter(route => this.matches(exemption.match, pattern, route)).map(r => r.path);
        coverage[`${exemption.file}#${exemption.constant}: ${pattern.text}`] = covered;
        if (covered.length === 0) {
          violations.push(
            `${exemption.file}:${pattern.line}: ${exemption.constant} pattern '${pattern.text}' (${exemption.match}) matches no route of ${candidates.length} — a dead exemption is the next matching route's silent hole. Correct it or remove it`
          );
        }
      }
    }
    if (typeof graph !== 'string') violations.push(...graph.unread);
    const result = this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        `Declare each guard's exemption constant in ${KEY} with how the guard matches it`,
        'Remove or correct every pattern that matches no page or route handler',
      ],
      context
    );
    result.metrics = {
      exemptionCoverage: Object.fromEntries(
        Object.entries(coverage).map(([pattern, paths]) => [pattern, `${paths.length}: ${listed(paths, 10)}`])
      ),
    };
    return result;
  }

  /** The routes of the Next app that holds the file, else every app's. */
  private static routesFor(context: LawCheckContext, exemption: GuardExemption, routes: NextRoute[]): NextRoute[] {
    const file = PathOperations.join(context.projectRoot, exemption.file);
    const roots = [...new Set(routes.map(route => route.app.root))]
      .filter(root => PathOperations.isInDirectory(file, root))
      .sort((a, b) => b.length - a.length);
    const owner = roots[0];
    return owner ? routes.filter(route => route.app.root === owner) : routes;
  }

  /** The literal patterns of the constant, or why they cannot be read. */
  private static patterns(graph: NextModuleGraph, context: LawCheckContext, exemption: GuardExemption): Pattern[] | string {
    const file = PathOperations.join(context.projectRoot, exemption.file);
    if (!FileSystemOperations.isFile(file)) return 'cannot be read: the file is missing — a stale declaration exempts nothing it names';
    const source = graph.source(file);
    if (!source) return 'could not be read — its patterns were not checked';
    const initializer = this.constantValue(source, exemption.constant);
    if (!initializer) return `is not a top-level const in this file — the law cannot read the list it is meant to check`;
    const ts = source.ts;
    const value = unwrap(ts, initializer);
    if (!ts.isArrayLiteralExpression(value)) {
      return `is not a literal array (${value.getText(source.sourceFile).slice(0, 60)}) — patterns built at runtime cannot be checked, so they are not passed`;
    }
    const patterns: Pattern[] = [];
    for (const element of value.elements) {
      const item = unwrap(ts, element);
      const line = source.lineOf(item);
      if (ts.isStringLiteralLike(item)) {
        patterns.push({ text: item.text, regex: exemption.match === 'regex' ? this.regex(item.text) : null, line });
      } else if (ts.isRegularExpressionLiteral(item)) {
        patterns.push({ text: item.text, regex: this.regexLiteral(item.text), line });
      } else {
        return `holds a non-literal element (${item.getText(source.sourceFile).slice(0, 60)}) at line ${line} — it cannot be checked, so the list is not passed`;
      }
    }
    return patterns;
  }

  private static constantValue(source: TsxSource, name: string): TS.Expression | undefined {
    const ts = source.ts;
    for (const statement of source.sourceFile.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === name) return declaration.initializer;
      }
    }
    return undefined;
  }

  private static regex(text: string): RegExp | null {
    try {
      return new RegExp(text);
    } catch {
      return null;
    }
  }

  private static regexLiteral(text: string): RegExp | null {
    const match = /^\/(.*)\/([a-z]*)$/s.exec(text);
    if (!match) return null;
    try {
      return new RegExp(match[1] ?? '', match[2]);
    } catch {
      return null;
    }
  }

  /** Whether the guard, comparing `pattern` its way, covers some URL of `route`. */
  static matches(mode: ExemptionMatch, pattern: Pattern, route: NextRoute): boolean {
    if (pattern.regex) return this.samples(route).some(url => (pattern.regex as RegExp).test(url));
    if (mode === 'regex') return false;
    if (mode === 'glob') return this.samples(route).some(url => minimatch(url, pattern.text));
    return this.segmentMatch(route.segments, this.split(pattern.text), mode === 'prefix', pattern.text.endsWith('/'));
  }

  /** Two concrete URLs of a route: dynamic segments as written (`[id]`) and as a value (`1`). */
  private static samples(route: NextRoute): string[] {
    const asValue = route.segments
      .filter(segment => segment.kind !== 'optionalCatchAll')
      .map(segment => (segment.kind === 'static' ? segment.text : '1'));
    return [route.path, `/${asValue.join('/')}`];
  }

  private static split(path: string): string[] {
    return path.split('/').filter(Boolean);
  }

  /**
   * Segment-wise: a dynamic route segment matches any one pattern segment, a
   * catch-all one or more. In prefix mode the pattern may stop early, and its
   * last segment (when the pattern has no trailing slash) may be a prefix of
   * the route's.
   */
  private static segmentMatch(route: RouteSegment[], pattern: string[], prefix: boolean, trailingSlash: boolean): boolean {
    for (let i = 0; i < pattern.length; i++) {
      const segment = route[i];
      const part = pattern[i] as string;
      if (!segment) return false;
      if (segment.kind === 'catchAll' || segment.kind === 'optionalCatchAll') return true;
      const last = i === pattern.length - 1;
      if (segment.kind === 'dynamic') continue;
      const partial = prefix && last && !trailingSlash;
      if (partial ? !segment.text.startsWith(part) : segment.text !== part) return false;
    }
    if (prefix) return true;
    const rest = route.slice(pattern.length);
    return rest.length === 0 || (rest.length === 1 && rest[0]?.kind === 'optionalCatchAll');
  }
}

/**
 * Next Segment Config Consistent
 *
 * Without Cache Components, `export const dynamic = 'force-static'` forces a
 * route to prerender and makes `cookies()` and `headers()` return EMPTY
 * values — a segment that reads them under force-static silently reads
 * nothing. `export const revalidate = 60` asks for a page regenerated every
 * minute, while reading `cookies()` or `headers()` renders the route per
 * request, so the interval never makes it static. With Cache Components
 * (`cacheComponents: true`) both exports are removed and a segment that still
 * exports them fails the build. Either way the file says two things at once.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { exportedBindings, importedNames, namespaceNames, NextAppFiles, unwrapExpression } from '../../utils/react/next-app-files';
import { NextSourcesLoader } from '../../utils/react/next-sources';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

const REQUEST_APIS = ['cookies', 'headers'];
const SEGMENT_FILES = new Set(['page', 'layout', 'route']);

export class NextSegmentConfigConsistentLaw extends LawBase {
  static readonly LAW_NAME = 'Next Segment Config Consistent';

  static check(context: LawCheckContext): LawResult {
    const sources = NextSourcesLoader.load(context);
    if (!NextSourcesLoader.hasAppRouter(sources) && sources.unread.length === 0) {
      return NextAppFiles.withoutSubject(this.LAW_NAME, 'no app/ directory — route segment config exists only in the App Router', context);
    }
    const violations = [...sources.unread];
    for (const appFile of sources.appFiles) {
      if (!appFile.kind || !SEGMENT_FILES.has(appFile.kind)) continue;
      const source = sources.parsed.get(appFile.file);
      if (source) violations.push(...this.checkSource(context, source));
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        "Drop dynamic = 'force-static' / revalidate from a segment that reads cookies() or headers(), or move that read into a segment that is dynamic",
        "With Cache Components: replace them with 'use cache' + cacheLife, and wrap the request-time read in <Suspense>",
      ],
      context
    );
  }

  static checkSource(context: LawCheckContext, source: TsxSource): string[] {
    const contradiction = this.staticExport(source);
    if (!contradiction) return [];
    const where = ReactProject.relative(context, source.fileName);
    return this.requestApiCalls(source).map(
      ({ name, line }) =>
        `${where}:${line}: calls ${name}() but exports ${contradiction} — ${
          contradiction.startsWith('dynamic')
            ? `without Cache Components force-static makes ${name}() return empty values`
            : `reading ${name}() renders the route per request, so the revalidate interval never makes it static`
        }; with Cache Components the export itself fails the build`
    );
  }

  /** `dynamic = 'force-static'` or `revalidate = <positive number>`, as written; null when neither. */
  static staticExport(source: TsxSource): string | null {
    const ts = source.ts;
    const bindings = exportedBindings(source);
    const dynamic = unwrapExpression(ts, bindings.get('dynamic')?.value);
    if (dynamic && ts.isStringLiteralLike(dynamic) && dynamic.text === 'force-static') return "dynamic = 'force-static'";
    const revalidate = unwrapExpression(ts, bindings.get('revalidate')?.value);
    if (revalidate && ts.isNumericLiteral(revalidate) && Number(revalidate.text) > 0) {
      return `revalidate = ${revalidate.text}`;
    }
    return null;
  }

  /** Calls of `cookies` / `headers` imported from next/headers (named or through a namespace). */
  static requestApiCalls(source: TsxSource): Array<{ name: string; line: number }> {
    const ts = source.ts;
    const locals = new Map<string, string>();
    for (const api of REQUEST_APIS) for (const local of importedNames(source, ['next/headers'], api)) locals.set(local, api);
    const namespaces = namespaceNames(source, 'next/headers');
    const calls: Array<{ name: string; line: number }> = [];
    source.walk(node => {
      if (!ts.isCallExpression(node)) return;
      const name = this.apiName(ts, node.expression, locals, namespaces);
      if (name) calls.push({ name, line: source.lineOf(node) });
    });
    return calls;
  }

  private static apiName(
    ts: TsxSource['ts'],
    callee: TS.Expression,
    locals: Map<string, string>,
    namespaces: Set<string>
  ): string | null {
    if (ts.isIdentifier(callee)) return locals.get(callee.text) ?? null;
    if (
      ts.isPropertyAccessExpression(callee) &&
      ts.isIdentifier(callee.expression) &&
      namespaces.has(callee.expression.text) &&
      REQUEST_APIS.includes(callee.name.text)
    ) {
      return callee.name.text;
    }
    return null;
  }
}

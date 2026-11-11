/**
 * Next Metadata Declared
 *
 * A page with no title ships as "localhost:3000/…" in a tab, a bookmark and a
 * search result, and no test notices, because nothing renders wrong. In the
 * App Router the title is metadata: `export const metadata` or
 * `generateMetadata` in the page or in any layout above it — Next merges
 * metadata down the segment tree, so a title in a layout covers every page
 * below it. In the Pages Router it is a `<title>` inside `next/head`, in the
 * page or in `_app`.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  exportedBindings,
  importedNames,
  NextAppFiles,
  unwrapExpression,
  type AppFile,
} from '../../utils/react/next-app-files';
import { type NextSources, NextSourcesLoader } from '../../utils/react/next-sources';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';
import { matchesAny, nextThresholds } from './next-client-law-support';

/** What a module says about the title. */
type Verdict = 'titled' | 'untitled' | null;

const EXEMPT_KEY = 'thresholds.next.metadataExemptRoutes';

export class NextMetadataDeclaredLaw extends LawBase {
  static readonly LAW_NAME = 'Next Metadata Declared';

  static check(context: LawCheckContext): LawResult {
    const sources = NextSourcesLoader.load(context);
    if (!NextSourcesLoader.hasRouter(sources)) {
      return this.result([...sources.unread, NextAppFiles.noRouterDirectory(context)], context);
    }
    const exempt = nextThresholds(context).metadataExemptRoutes ?? [];
    const violations = [
      ...sources.unread,
      ...this.appRouter(context, sources, exempt),
      ...this.pagesRouter(context, sources, exempt),
    ];
    const pageCount =
      NextAppFiles.pages(sources.appFiles).length +
      sources.pagesFiles.filter(page => !page.api && !page.special).length;
    if (violations.length === 0 && pageCount === 0) {
      return NextAppFiles.withoutSubject(
        this.LAW_NAME,
        'no page.* under app/ and no route under pages/ — there is no page to title',
        context
      );
    }
    return this.result(violations, context);
  }

  private static result(violations: string[], context: LawCheckContext): LawResult {
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        "Export `metadata` with a `title` (or `generateMetadata`) from the page, or from a layout above it — a root layout title with `title.template` covers every page",
        'Pages Router: render <Head><title>…</title></Head> from next/head in the page or in _app',
        `List a route that needs no title of its own in ${EXEMPT_KEY}`,
      ],
      context
    );
  }

  private static appRouter(context: LawCheckContext, sources: NextSources, exempt: string[]): string[] {
    const violations: string[] = [];
    for (const page of NextAppFiles.pages(sources.appFiles)) {
      const route = NextAppFiles.routeOf(page.appDir, page.segmentDir);
      if (matchesAny(route, exempt)) continue;
      const source = sources.parsed.get(page.file);
      if (!source) continue; // reported through sources.unread
      const verdicts = this.chain(sources, page).map(file => this.verdictOf(sources.parsed.get(file)));
      if (verdicts.includes('titled')) continue;
      const where = ReactProject.relative(context, page.file);
      violations.push(
        verdicts.includes('untitled')
          ? `${where} (${route}): metadata is declared, but neither the page nor any layout above it gives a title`
          : `${where} (${route}): no \`metadata\` or \`generateMetadata\` in the page or any layout above it — the page has no title`
      );
    }
    return violations;
  }

  /** The page, then the layout of its segment and of every ancestor segment. */
  private static chain(sources: NextSources, page: AppFile): string[] {
    const files = [page.file];
    for (const dir of NextAppFiles.segmentChain(page.appDir, page.segmentDir)) {
      const layout = NextAppFiles.specialIn(sources.appFiles, dir, 'layout');
      if (layout) files.push(layout.file);
    }
    return files;
  }

  /** `generateMetadata`, or `metadata` whose literal has a title, or one whose value cannot be read. */
  static verdictOf(source: TsxSource | undefined): Verdict {
    if (!source) return null;
    const bindings = exportedBindings(source);
    if (bindings.has('generateMetadata')) return 'titled';
    const metadata = bindings.get('metadata');
    if (!metadata) return null;
    const value = unwrapExpression(source.ts, metadata.value);
    if (!value || !source.ts.isObjectLiteralExpression(value)) return 'titled';
    return this.literalHasTitle(source.ts, value) ? 'titled' : 'untitled';
  }

  private static literalHasTitle(ts: TsxSource['ts'], literal: TS.ObjectLiteralExpression): boolean {
    return literal.properties.some(
      property =>
        ts.isSpreadAssignment(property) ||
        ((ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) &&
          property.name.getText() === 'title')
    );
  }

  private static pagesRouter(context: LawCheckContext, sources: NextSources, exempt: string[]): string[] {
    const appTitled = sources.pagesFiles
      .filter(page => page.special === '_app')
      .some(page => this.headHasTitle(sources.parsed.get(page.file)));
    if (appTitled) return [];
    return sources.pagesFiles
      .filter(page => !page.api && !page.special && !matchesAny(page.route, exempt))
      .filter(page => sources.parsed.has(page.file) && !this.headHasTitle(sources.parsed.get(page.file)))
      .map(
        page =>
          `${ReactProject.relative(context, page.file)} (${page.route}): no <title> inside next/head in the page or in _app — the page has no title`
      );
  }

  /** A `<title>` element nested in the `next/head` component. */
  static headHasTitle(source: TsxSource | undefined): boolean {
    if (!source) return false;
    const ts = source.ts;
    const heads = importedNames(source, ['next/head'], 'default');
    if (heads.size === 0) return false;
    let found = false;
    source.walk(node => {
      if (found || !ts.isJsxElement(node)) return;
      if (!heads.has(node.openingElement.tagName.getText(source.sourceFile))) return;
      found = this.containsTitle(source, node);
    });
    return found;
  }

  private static containsTitle(source: TsxSource, head: TS.JsxElement): boolean {
    const ts = source.ts;
    let found = false;
    const visit = (node: TS.Node): void => {
      if (found) return;
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source.sourceFile) === 'title') {
        found = true;
        return;
      }
      ts.forEachChild(node, visit);
    };
    head.children.forEach(visit);
    return found;
  }
}

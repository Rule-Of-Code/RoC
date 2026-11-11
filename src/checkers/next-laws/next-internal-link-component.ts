/**
 * Next Internal Link Component
 *
 * A plain `<a href="/pricing">` to a page of the same app is a full document
 * load: the browser drops the JavaScript heap, every client state and the
 * router cache, and downloads and hydrates the app again. `next/link`
 * navigates client-side and prefetches the target. The law reads literal
 * root-relative hrefs and flags the ones that match a page of the app — a
 * link to a route handler, a static file or another app on the same domain
 * is a full load on purpose and is not a page here.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { NextAppFiles } from '../../utils/react/next-app-files';
import { type NextSources, NextSourcesLoader } from '../../utils/react/next-sources';
import { ReactProject } from '../../utils/react/react-project';
import { jsxAttribute, type JsxElementInfo, type TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';
import { matchesAny, nextThresholds, reasonedEntries } from './next-client-law-support';

const CONFIG_KEY = 'thresholds.next.fullReloadLinks';
/** The marker followed by a reason that starts with a word, not by the comment's closing. */
const INLINE_REASON = /roc-allow-full-reload:\s*[A-Za-z0-9]/;

export class NextInternalLinkComponentLaw extends LawBase {
  static readonly LAW_NAME = 'Next Internal Link Component';

  static check(context: LawCheckContext): LawResult {
    const sources = NextSourcesLoader.load(context, ['.tsx', '.jsx', '.js']);
    const { allowed, problems } = reasonedEntries(nextThresholds(context).fullReloadLinks, 'path', CONFIG_KEY);
    const violations = [...sources.unread, ...problems];
    if (!NextSourcesLoader.hasRouter(sources)) violations.push(NextAppFiles.noRouterDirectory(context));
    const routes = this.routes(sources);
    for (const source of sources.parsed.values()) {
      violations.push(...this.checkSource(context, source, routes, allowed));
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'PERFORMANCE',
      [
        "Link to the app's own pages with <Link href=\"/x\"> from next/link",
        `A link that must reload the page: add {/* roc-allow-full-reload: <reason> */} before it, or list it with a reason in ${CONFIG_KEY}`,
      ],
      context
    );
  }

  /** Every page route of every router, as segment patterns. */
  static routes(sources: NextSources): string[][] {
    const routes = new Set<string>();
    for (const page of NextAppFiles.pages(sources.appFiles)) routes.add(NextAppFiles.routeOf(page.appDir, page.segmentDir));
    for (const page of sources.pagesFiles) if (page.route) routes.add(page.route);
    return [...routes].map(route => route.split('/').filter(Boolean));
  }

  /** True when `path` is served by the route pattern (dynamic, catch-all and optional catch-all segments). */
  static matches(pattern: readonly string[], path: readonly string[]): boolean {
    for (const [index, segment] of pattern.entries()) {
      if (segment.startsWith('[[...')) return true;
      if (segment.startsWith('[...')) return path.length > index;
      if (index >= path.length) return false;
      if (segment.startsWith('[')) continue;
      if (segment !== path[index]) return false;
    }
    return pattern.length === path.length;
  }

  static checkSource(
    context: LawCheckContext,
    source: TsxSource,
    routes: readonly string[][],
    allowed: readonly string[]
  ): string[] {
    const where = ReactProject.relative(context, source.fileName);
    const violations: string[] = [];
    for (const element of source.jsxElements()) {
      if (element.tag !== 'a') continue;
      const path = this.internalPath(element);
      if (path === null || matchesAny(path, allowed)) continue;
      const segments = path.split('/').filter(Boolean);
      if (!routes.some(route => this.matches(route, segments))) continue;
      if (this.hasInlineReason(source, element)) continue;
      violations.push(
        `${where}:${element.line}: <a href="${path}"> links to a page of this app with a full page load — use <Link> from next/link`
      );
    }
    return violations;
  }

  /** The path of a literal root-relative href on a same-tab, non-download link; null otherwise. */
  static internalPath(element: JsxElementInfo): string | null {
    const href = jsxAttribute(element, 'href');
    if (href?.kind !== 'string') return null;
    if (!href.value.startsWith('/') || href.value.startsWith('//')) return null;
    if (jsxAttribute(element, 'download')) return null;
    const target = jsxAttribute(element, 'target');
    if (target && !(target.kind === 'string' && target.value === '_self')) return null;
    const path = href.value.split(/[?#]/)[0] ?? '';
    return path.length > 1 ? path.replace(/\/+$/, '') : '/';
  }

  /** `roc-allow-full-reload: <reason>` in a comment right before the element. */
  static hasInlineReason(source: TsxSource, element: JsxElementInfo): boolean {
    const ts = source.ts;
    const jsx: TS.Node = ts.isJsxOpeningElement(element.node) ? element.node.parent : element.node;
    const leading = ts.getLeadingCommentRanges(source.text, jsx.getFullStart()) ?? [];
    if (leading.some(range => INLINE_REASON.test(source.text.slice(range.pos, range.end)))) return true;
    const parent = jsx.parent;
    if (!parent || !(ts.isJsxElement(parent) || ts.isJsxFragment(parent))) return false;
    const siblings = parent.children;
    for (let index = siblings.indexOf(jsx as TS.JsxChild) - 1; index >= 0; index--) {
      const sibling = siblings[index];
      if (!sibling) break;
      if (ts.isJsxText(sibling) && sibling.text.trim() === '') continue;
      return ts.isJsxExpression(sibling) && !sibling.expression && INLINE_REASON.test(sibling.getText(source.sourceFile));
    }
    return false;
  }
}

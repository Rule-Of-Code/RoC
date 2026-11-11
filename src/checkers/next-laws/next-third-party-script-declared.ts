/**
 * Next Third Party Script Declared
 *
 * A third-party script is added in one line and costs what its vendor
 * decides: its bytes, its main-thread time, the scripts it loads in turn,
 * and a host that can change all of that without a deploy. The law asks that
 * every external host the app loads a script from be declared, with the
 * reason it is worth that cost, in `thresholds.next.thirdPartyScripts` — so
 * adding one is a reviewed decision and not a side effect of a snippet.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { importedNames } from '../../utils/react/next-app-files';
import { ReactProject } from '../../utils/react/react-project';
import type { JsxElementInfo, TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';
import { matchesAny, nextThresholds, reasonedEntries } from './next-client-law-support';

const CONFIG_KEY = 'thresholds.next.thirdPartyScripts';
const EXTERNAL = /^(?:https?:)?\/\/([^/?#]+)/i;

/** Where a script's `src` points: an external host, the app itself, or somewhere this file cannot show. */
type Target = { host: string } | 'local' | 'unknown' | null;

export class NextThirdPartyScriptDeclaredLaw extends LawBase {
  static readonly LAW_NAME = 'Next Third Party Script Declared';

  static check(context: LawCheckContext): LawResult {
    const { allowed, problems } = reasonedEntries(nextThresholds(context).thirdPartyScripts, 'host', CONFIG_KEY);
    const files = ReactProject.sourceFiles(context, ['.tsx', '.jsx', '.js']);
    const { sources, unread } = ReactProject.parse(context, files);
    const violations = [...unread, ...problems];
    for (const source of sources) violations.push(...this.checkSource(context, source, allowed));
    return this.createResult(
      violations,
      this.LAW_NAME,
      'PERFORMANCE',
      [
        `Declare each external script host with its reason in ${CONFIG_KEY}: [{ "host": "www.example.com", "reason": "…" }]`,
        'Write the src as a literal URL so the host can be read',
        'Prefer next/script with strategy="lazyOnload" for anything not needed to render',
      ],
      context
    );
  }

  static checkSource(context: LawCheckContext, source: TsxSource, allowed: readonly string[]): string[] {
    const scriptTags = importedNames(source, ['next/script'], 'default');
    const where = ReactProject.relative(context, source.fileName);
    const violations: string[] = [];
    for (const element of source.jsxElements()) {
      if (element.tag !== 'script' && !scriptTags.has(element.tag)) continue;
      const target = this.targetOf(source, element);
      if (target === 'unknown') {
        violations.push(
          `${where}:${element.line}: <${element.tag}> src is computed — the host it loads from cannot be read. Write it as a literal URL and declare the host in ${CONFIG_KEY}`
        );
      } else if (target && target !== 'local' && !matchesAny(target.host.toLowerCase(), allowed)) {
        violations.push(
          `${where}:${element.line}: <${element.tag}> loads a script from ${target.host}, which is not declared in ${CONFIG_KEY} with a reason`
        );
      }
    }
    return violations;
  }

  private static srcInitializer(source: TsxSource, element: JsxElementInfo): TS.Expression | null | undefined {
    const ts = source.ts;
    for (const property of element.node.attributes.properties) {
      if (!ts.isJsxAttribute(property) || property.name.getText(source.sourceFile) !== 'src') continue;
      const initializer = property.initializer;
      if (!initializer) return null;
      if (ts.isStringLiteral(initializer)) return initializer;
      return ts.isJsxExpression(initializer) ? (initializer.expression ?? null) : null;
    }
    return undefined;
  }

  /** Read the host from a literal, or from the fixed head of a template literal. */
  static targetOf(source: TsxSource, element: JsxElementInfo): Target {
    const ts = source.ts;
    const src = this.srcInitializer(source, element);
    if (src === undefined) return element.hasSpread ? 'unknown' : null;
    if (src === null) return null;
    let text: string | null = null;
    if (ts.isStringLiteralLike(src)) text = src.text;
    else if (ts.isTemplateExpression(src)) text = src.head.text;
    if (text === null) return 'unknown';
    const head = text.trim();
    const isTemplate = ts.isTemplateExpression(src);
    if (!/^(?:https?:)?\/\//i.test(head)) return isTemplate && head === '' ? 'unknown' : 'local';
    // A template whose host is still open (`https://${region}.cdn…`) cannot be read.
    const hostClosed = !isTemplate || /^(?:https?:)?\/\/[^/?#]+[/?#]/i.test(head);
    const host = EXTERNAL.exec(head)?.[1];
    return hostClosed && host ? { host } : 'unknown';
  }
}

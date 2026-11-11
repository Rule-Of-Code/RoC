/**
 * React Href Scheme Guarded
 *
 * A URL from a user or an API in `<a href>` or `<iframe src>` decides where a
 * click goes and what a frame runs. react-dom 19 replaces a `javascript:` URL
 * in these attributes with one that throws (its sanitizeURL), but `data:`,
 * `vbscript:` and an attacker's own `https:` page pass through untouched.
 *
 * A non-literal `href` on `<a>` or `src` on `<iframe>` is accepted when its
 * scheme is fixed by the code itself — the static start of the value is a
 * path (`/`, `./`, `#`, `?`) or a known scheme (`https:`, `mailto:` …), as in
 * `` `/users/${id}` `` — or when the value is a call to a configured URL guard
 * (thresholds.react.urlGuards). Anything else is a warning that needs review:
 * without data flow the law cannot tell a constant from a user's input.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';
import { calleeText, literalText, nameList, parseFilesMentioning, unwrap } from './react-security-support';

/** The element → attribute pairs judged. */
const URL_ATTRIBUTES: Record<string, string> = { a: 'href', iframe: 'src' };
/** Schemes a static prefix may fix without review. */
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel', 'sms']);

/**
 * Whether a static start of a URL fixes its scheme to a safe one: a path,
 * fragment or query before any `:`, or a safe scheme. `//host` is
 * scheme-relative (the page's own scheme), so it is fixed too.
 */
export function prefixFixesScheme(prefix: string): boolean {
  const scheme = /^\s*([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(prefix);
  if (scheme) return SAFE_SCHEMES.has((scheme[1] ?? '').toLowerCase());
  return /^\s*[/?#.]/.test(prefix) || /^[^:]*[/?#]/.test(prefix);
}

export class ReactHrefSchemeGuardedLaw extends LawBase {
  static readonly LAW_NAME = 'React Href Scheme Guarded';

  static check(context: LawCheckContext): LawResult {
    const guards = new Set(nameList(context.config.thresholds?.react?.urlGuards));
    const { sources, unread } = parseFilesMentioning(context, ['href', 'src']);
    const violations = [...unread];
    for (const source of sources) {
      const rel = ReactProject.relative(context, source.fileName);
      for (const element of source.jsxElements()) {
        const attributeName = URL_ATTRIBUTES[element.tag];
        if (!attributeName) continue;
        const attribute = element.node.attributes.properties.find(
          p => source.ts.isJsxAttribute(p) && p.name.getText(source.sourceFile) === attributeName
        ) as TS.JsxAttribute | undefined;
        const init = attribute?.initializer;
        if (!init || !source.ts.isJsxExpression(init) || !init.expression) continue;
        if (this.fixed(source, init.expression, guards)) continue;
        violations.push(
          `${rel}:${element.line}: <${element.tag} ${attributeName}={${this.text(source, init.expression)}}> — the URL's scheme is not fixed by the code; a data: or vbscript: value, or a user's own page, would be used as is. Build it from a fixed prefix ('/…', 'https://…') or pass it through a URL guard named in thresholds.react.urlGuards`
        );
      }
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        "Build links from a fixed prefix: href={`/users/${id}`}, not href={user.website}",
        'Pass user-supplied URLs through one guard that allows only http(s)/mailto, and name it in thresholds.react.urlGuards',
      ],
      context
    );
  }

  /** Whether the expression's scheme is fixed by code, or it passes a guard. */
  private static fixed(source: TsxSource, expression: TS.Expression, guards: Set<string>): boolean {
    const ts = source.ts;
    const e = unwrap(ts, expression);
    const literal = literalText(ts, e);
    // A whole literal is written by the author, not taken from data: out of scope.
    if (literal !== null) return true;
    if (e.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(e) && e.text === 'undefined')) return true;
    if (ts.isTemplateExpression(e)) return prefixFixesScheme(e.head.text);
    if (ts.isConditionalExpression(e)) {
      return this.fixed(source, e.whenTrue, guards) && this.fixed(source, e.whenFalse, guards);
    }
    if (ts.isBinaryExpression(e)) return this.fixedBinary(source, e, guards);
    return ts.isCallExpression(e) && guards.has(calleeText(e, source.sourceFile));
  }

  /** `prefix + rest` is fixed by its head; `a ?? b` / `a || b` when both are. */
  private static fixedBinary(source: TsxSource, e: TS.BinaryExpression, guards: Set<string>): boolean {
    const ts = source.ts;
    const op = e.operatorToken.kind;
    if (op === ts.SyntaxKind.PlusToken) {
      const head = literalText(ts, unwrap(ts, e.left));
      return head !== null ? prefixFixesScheme(head) : this.fixed(source, e.left, guards);
    }
    if (op === ts.SyntaxKind.QuestionQuestionToken || op === ts.SyntaxKind.BarBarToken) {
      return this.fixed(source, e.left, guards) && this.fixed(source, e.right, guards);
    }
    return false;
  }

  private static text(source: TsxSource, node: TS.Node): string {
    const text = node.getText(source.sourceFile).replace(/\s+/g, ' ');
    return text.length > 60 ? `${text.slice(0, 57)}...` : text;
  }
}

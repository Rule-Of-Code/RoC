/**
 * React Dangerous HTML Guarded
 *
 * `dangerouslySetInnerHTML` writes its `__html` into the page as markup: a
 * string that came from a user, a CMS or an API becomes script. Every sink is
 * read on the syntax tree — the JSX attribute and the `dangerouslySetInnerHTML`
 * property of a props object (`createElement`) — and its `__html` must be:
 *
 * - a literal (no substitutions), or literals joined by `?:` / `+`;
 * - a call to a sanitizer (`DOMPurify.sanitize`, or one named in
 *   thresholds.security.htmlSanitizers);
 * - a call to a function allow-listed with a reason
 *   (thresholds.react.trustedHtmlFunctions);
 * - serialized JSON that escapes `<`: `JSON.stringify(x).replace(/</g,
 *   '\\u003c')`, the form Next's JSON-LD guide gives because JSON.stringify
 *   "does not sanitize", or a serializer named in thresholds.react.jsonSerializers.
 *
 * Anything else is a violation, and so is a sink whose `__html` cannot be read
 * here (a props variable instead of an object literal). A file that cannot be
 * parsed is reported, never passed.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import type { TsxSource } from '../../utils/react/tsx-source';
import { ReactProject } from '../../utils/react/react-project';
import { htmlSanitizers } from '../security-laws/xss-prevention';
import { LawBase } from '../law-base';
import { calleeText, literalText, nameList, parseFilesMentioning, unwrap } from './react-security-support';

const SINK = 'dangerouslySetInnerHTML';

interface Policy {
  sanitizers: Set<string>;
  trusted: Set<string>;
  serializers: Set<string>;
}

interface Sink {
  line: number;
  value: TS.Expression | undefined;
}

export class ReactDangerousHtmlGuardedLaw extends LawBase {
  static readonly LAW_NAME = 'React Dangerous HTML Guarded';

  static check(context: LawCheckContext): LawResult {
    const { policy, configErrors } = this.policy(context);
    const { sources, unread } = parseFilesMentioning(context, [SINK]);
    const violations = [...configErrors, ...unread];
    for (const source of sources) {
      const rel = ReactProject.relative(context, source.fileName);
      for (const sink of this.sinks(source)) {
        const problem = this.judge(source, sink.value, policy);
        if (problem) violations.push(`${rel}:${sink.line}: ${problem}`);
      }
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        'Render text by default; reach for dangerouslySetInnerHTML only for HTML you must render',
        'Sanitize at the sink: __html: DOMPurify.sanitize(html) (name other sanitizers in thresholds.security.htmlSanitizers)',
        "For JSON-LD: __html: JSON.stringify(data).replace(/</g, '\\\\u003c')",
      ],
      context
    );
  }

  private static policy(context: LawCheckContext): { policy: Policy; configErrors: string[] } {
    const react = context.config.thresholds?.react;
    const configErrors: string[] = [];
    const trusted = new Set<string>();
    for (const entry of Array.isArray(react?.trustedHtmlFunctions) ? react.trustedHtmlFunctions : []) {
      const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
      if (!name) continue;
      if (typeof entry.reason === 'string' && entry.reason.trim()) trusted.add(name);
      else configErrors.push(`thresholds.react.trustedHtmlFunctions: '${name}' has no reason — an allow-listed HTML function must say why its output is safe; it is not honoured`);
    }
    return {
      policy: {
        sanitizers: new Set(htmlSanitizers(context)),
        trusted,
        serializers: new Set(nameList(react?.jsonSerializers)),
      },
      configErrors,
    };
  }

  /** Every sink in the file: the JSX attribute and the props-object property. */
  private static sinks(source: TsxSource): Sink[] {
    const ts = source.ts;
    const sinks: Sink[] = [];
    source.walk(node => {
      if (ts.isJsxAttribute(node) && node.name.getText(source.sourceFile) === SINK) {
        const init = node.initializer;
        const value = init && ts.isJsxExpression(init) ? init.expression : undefined;
        sinks.push({ line: source.lineOf(node), value });
      } else if (
        (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) &&
        node.name.getText(source.sourceFile).replace(/['"]/g, '') === SINK
      ) {
        sinks.push({
          line: source.lineOf(node),
          value: ts.isPropertyAssignment(node) ? node.initializer : node.name,
        });
      }
    });
    return sinks;
  }

  /** Why this sink is unguarded, or null when its __html is accepted. */
  private static judge(source: TsxSource, value: TS.Expression | undefined, policy: Policy): string | null {
    const ts = source.ts;
    const object = value ? unwrap(ts, value) : undefined;
    if (!object || !ts.isObjectLiteralExpression(object)) {
      return `${SINK} is given ${value ? `\`${this.text(source, value)}\`` : 'no value'}, not an object literal — the __html it sets cannot be read here; write ${SINK}={{ __html: … }} at the sink`;
    }
    const property = object.properties.find(p => p.name?.getText(source.sourceFile).replace(/['"]/g, '') === '__html');
    if (!property || (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property))) {
      return `${SINK} has no readable __html property (a spread or a computed key) — write __html: … at the sink`;
    }
    const html = ts.isPropertyAssignment(property) ? property.initializer : property.name;
    if (this.accepted(source, html, policy)) return null;
    if (this.isBareJsonStringify(source, html)) {
      return `__html is JSON.stringify(...), which does not escape '<' — a '</script>' in the data ends the tag. Append .replace(/</g, '\\\\u003c'), or use a serializer named in thresholds.react.jsonSerializers`;
    }
    return `__html is \`${this.text(source, html)}\` — not a literal, a sanitizer call (DOMPurify.sanitize or thresholds.security.htmlSanitizers), a function allow-listed with a reason (thresholds.react.trustedHtmlFunctions) or JSON with '<' escaped`;
  }

  private static accepted(source: TsxSource, expression: TS.Expression, policy: Policy): boolean {
    const ts = source.ts;
    const e = unwrap(ts, expression);
    if (literalText(ts, e) !== null) return true;
    if (ts.isConditionalExpression(e)) {
      return this.accepted(source, e.whenTrue, policy) && this.accepted(source, e.whenFalse, policy);
    }
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      return this.accepted(source, e.left, policy) && this.accepted(source, e.right, policy);
    }
    if (!ts.isCallExpression(e)) return false;
    const callee = calleeText(e, source.sourceFile);
    return (
      policy.sanitizers.has(callee) ||
      policy.trusted.has(callee) ||
      policy.serializers.has(callee) ||
      this.isEscapedJson(source, e)
    );
  }

  /** `JSON.stringify(x).replace(/</g, '\\u003c')`. */
  private static isEscapedJson(source: TsxSource, call: TS.CallExpression): boolean {
    const ts = source.ts;
    const callee = call.expression;
    if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'replace') return false;
    const [pattern, replacement] = call.arguments;
    return (
      this.isBareJsonStringify(source, callee.expression) &&
      pattern !== undefined &&
      ts.isRegularExpressionLiteral(pattern) &&
      pattern.text === '/</g' &&
      replacement !== undefined &&
      literalText(ts, replacement)?.toLowerCase() === '\\u003c'
    );
  }

  private static isBareJsonStringify(source: TsxSource, expression: TS.Expression): boolean {
    const e = unwrap(source.ts, expression);
    return source.ts.isCallExpression(e) && calleeText(e, source.sourceFile) === 'JSON.stringify';
  }

  private static text(source: TsxSource, node: TS.Node): string {
    const text = node.getText(source.sourceFile).replace(/\s+/g, ' ');
    return text.length > 60 ? `${text.slice(0, 57)}...` : text;
  }
}

/**
 * React List Key Stability
 *
 * React matches list items between renders by `key`. With the array index as
 * the key, inserting, removing or reordering an item gives the remaining items
 * each other's keys: React keeps the wrong row's state — a typed value, a
 * checkbox, an open panel, a focused input — on the row that moved into its
 * position. The law reads JSX from the parse and flags a `key` that is the
 * index parameter of the enclosing `.map` callback (alone or as the only
 * interpolation of a template). A list that never changes order cannot be
 * told apart from one that does, so it is answered inline with a reason.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  hasInlineReason,
  isFunctionNode,
  readReactSources,
  unwrap,
  where,
} from '../../utils/react/react-hooks-ast';
import type { JsxElementInfo, TsxSource, TypeScriptModule } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

/** The inline answer for a list that never reorders. */
export const INDEX_KEY_REASON_MARKER = 'roc-allow-index-key';

export class ReactListKeyStabilityLaw extends LawBase {
  static readonly LAW_NAME = 'React List Key Stability';

  static check(context: LawCheckContext): LawResult {
    const { sources, violations } = readReactSources(context, this.LAW_NAME);
    for (const source of sources) {
      for (const element of source.jsxElements()) {
        const index = this.indexKey(source, element);
        if (!index || hasInlineReason(source, element.line, INDEX_KEY_REASON_MARKER)) continue;
        violations.push(
          `${where(context, source, element.node)}: <${element.tag} key={…${index}…}> uses the .map index as its key — when the list changes, rows inherit each other's state. Key by a stable id from the item`
        );
      }
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'CODE_QUALITY',
      [
        'Key each row by a stable identity from the data: key={item.id}',
        `For a list that never reorders, say so on the line above: // ${INDEX_KEY_REASON_MARKER}: <why the list is static>`,
      ],
      context
    );
  }

  /** The index parameter's name when `key` is that parameter, or null. */
  private static indexKey(source: TsxSource, element: JsxElementInfo): string | null {
    const ts = source.ts;
    const attribute = element.node.attributes.properties.find(
      property => ts.isJsxAttribute(property) && property.name.getText() === 'key'
    ) as TS.JsxAttribute | undefined;
    const initializer = attribute?.initializer;
    if (!initializer || !ts.isJsxExpression(initializer) || !initializer.expression) return null;
    const index = this.mapIndexParameter(ts, element.node);
    if (!index) return null;
    return this.isOnlyIndex(ts, unwrap(ts, initializer.expression), index) ? index : null;
  }

  /** `key={i}`, `` key={`${i}`} ``, `key={String(i)}`, `key={i.toString()}`. */
  private static isOnlyIndex(ts: TypeScriptModule, value: TS.Expression, index: string): boolean {
    const isIndex = (node: TS.Expression): boolean => {
      const inner = unwrap(ts, node);
      return ts.isIdentifier(inner) && inner.text === index;
    };
    if (isIndex(value)) return true;
    if (ts.isTemplateExpression(value)) {
      return value.templateSpans.every(span => isIndex(span.expression));
    }
    if (ts.isCallExpression(value)) {
      const callee = value.expression;
      if (ts.isIdentifier(callee) && callee.text === 'String' && value.arguments.length === 1) {
        return isIndex(value.arguments[0] as TS.Expression);
      }
      if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'toString') {
        return isIndex(callee.expression);
      }
    }
    return false;
  }

  /** The second parameter of the nearest enclosing `.map((item, index) => …)`. */
  private static mapIndexParameter(ts: TypeScriptModule, node: TS.Node): string | null {
    for (let current = node.parent; current; current = current.parent) {
      if (!isFunctionNode(ts, current)) continue;
      const fn = current as TS.SignatureDeclaration;
      const call = fn.parent;
      const isMapCallback =
        ts.isCallExpression(call) &&
        call.arguments[0] === fn &&
        ts.isPropertyAccessExpression(call.expression) &&
        call.expression.name.text === 'map';
      if (!isMapCallback) return null;
      const second = fn.parameters[1];
      return second && ts.isIdentifier(second.name) ? second.name.text : null;
    }
    return null;
  }
}

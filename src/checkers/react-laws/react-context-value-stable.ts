/**
 * React Context Value Stable
 *
 * A context provider re-renders every consumer when its `value` changes by
 * identity, and an object or array literal written inline in `value={…}` is a
 * new identity on every render of the provider. Every consumer below it then
 * re-renders whether or not anything it reads changed. The law reads JSX from
 * the parse: a `*.Provider` element, or an element whose tag is a context
 * (React 19 renders `<ThemeContext value={…}>` directly), with an object or
 * array literal as its value.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { reactHookName, readReactSources, unwrap, where } from '../../utils/react/react-hooks-ast';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

export class ReactContextValueStableLaw extends LawBase {
  static readonly LAW_NAME = 'React Context Value Stable';

  static check(context: LawCheckContext): LawResult {
    const { sources, violations } = readReactSources(context, this.LAW_NAME);
    for (const source of sources) {
      const contexts = this.contextNames(source);
      for (const element of source.jsxElements()) {
        if (!this.isProvider(element.tag, contexts)) continue;
        const literal = this.inlineValue(source, element.node);
        if (!literal) continue;
        violations.push(
          `${where(context, source, element.node)}: <${element.tag} value={${literal}}> — an inline ${literal === '{…}' ? 'object' : 'array'} is a new value on every render, so every consumer re-renders. Memoize it with useMemo (and its functions with useCallback)`
        );
      }
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'PERFORMANCE',
      [
        'Build the provider value with useMemo(() => ({ … }), [deps]) and pass the memoized value',
        'Split a context whose parts change at different rates',
      ],
      context
    );
  }

  /** `<X.Provider>`; a tag bound by `createContext` in this file; an imported `…Context`. */
  private static isProvider(tag: string, contexts: Set<string>): boolean {
    if (tag.endsWith('.Provider')) return true;
    if (contexts.has(tag)) return true;
    return /^[A-Z]\w*Context$/.test(tag);
  }

  /** Names this file binds to `createContext(…)`. */
  private static contextNames(source: TsxSource): Set<string> {
    const ts = source.ts;
    const names = new Set<string>();
    source.walk(node => {
      if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) {
        return;
      }
      const init = unwrap(ts, node.initializer);
      if (ts.isCallExpression(init) && reactHookName(source, init) === 'createContext') {
        names.add(node.name.text);
      }
    });
    return names;
  }

  /** '{…}' or '[…]' when `value` is an inline object or array literal. */
  private static inlineValue(source: TsxSource, node: TS.JsxOpeningLikeElement): string | null {
    const ts = source.ts;
    for (const property of node.attributes.properties) {
      if (!ts.isJsxAttribute(property) || property.name.getText() !== 'value') continue;
      const initializer = property.initializer;
      if (!initializer || !ts.isJsxExpression(initializer) || !initializer.expression) return null;
      const value = unwrap(ts, initializer.expression);
      if (ts.isObjectLiteralExpression(value)) return '{…}';
      if (ts.isArrayLiteralExpression(value)) return '[…]';
      return null;
    }
    return null;
  }
}

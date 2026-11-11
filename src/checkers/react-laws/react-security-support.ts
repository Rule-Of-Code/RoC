/**
 * What the React security laws share: which files to parse, how a callee is
 * named, and the configured name lists.
 *
 * A file is parsed only when its text mentions what the law judges
 * (`dangerouslySetInnerHTML`, `href`, `redirect`), so a large app is not
 * parsed whole for a sink it has in three files. A file that cannot be read,
 * or a parser that cannot be loaded, is reported — those files were NOT
 * inspected, and the law must not pass over them.
 */

import * as fs from 'fs';
import type * as TS from 'typescript';
import type { LawCheckContext } from '../../types/law.types';
import { type ParsedSources, ReactProject } from '../../utils/react/react-project';

/** Non-test React source whose text contains any of `tokens`, parsed. */
export function parseFilesMentioning(
  context: LawCheckContext,
  tokens: readonly string[]
): ParsedSources {
  const unread: string[] = [];
  const candidates: string[] = [];
  for (const file of ReactProject.sourceFiles(context)) {
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      unread.push(`${ReactProject.relative(context, file)}: could not be read`);
      continue;
    }
    if (tokens.some(token => text.includes(token))) candidates.push(file);
  }
  const parsed = ReactProject.parse(context, candidates);
  return { sources: parsed.sources, unread: [...unread, ...parsed.unread] };
}

/** An expression without the wrappers that do not change its value: `( )`, `as T`, `!`, `satisfies T`. */
export function unwrap(ts: typeof TS, expression: TS.Expression): TS.Expression {
  let e = expression;
  for (;;) {
    if (
      ts.isParenthesizedExpression(e) ||
      ts.isAsExpression(e) ||
      ts.isNonNullExpression(e) ||
      // `satisfies` exists from TypeScript 4.9; the project's own copy may be older
      (typeof ts.isSatisfiesExpression === 'function' && ts.isSatisfiesExpression(e))
    ) {
      e = e.expression;
    } else {
      return e;
    }
  }
}

/** A call's callee as written, without type arguments or `?.`: `DOMPurify.sanitize`. */
export function calleeText(call: TS.CallExpression, sourceFile: TS.SourceFile): string {
  return call.expression.getText(sourceFile).replace(/\?\./g, '.').replace(/\s+/g, '');
}

/** A configured list of names: strings only, blanks dropped. */
export function nameList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((name): name is string => typeof name === 'string' && name.trim() !== '').map(name => name.trim())
    : [];
}

/** The literal text of a string or no-substitution template, or null. */
export function literalText(ts: typeof TS, expression: TS.Expression): string | null {
  return ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)
    ? expression.text
    : null;
}

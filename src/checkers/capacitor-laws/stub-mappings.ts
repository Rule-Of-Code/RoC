/**
 * The module mappings of Capacitor Plugin Stub Has Contract Test: Jest
 * `moduleNameMapper` and Vitest `alias` entries, read from the test configs
 * at the root and in each workspace project, regardless of ignores.
 */

import type * as TS from 'typescript';
import { codeExcerpt } from '../../utils/code-excerpt';
import type { TsxSource } from '../../utils/react/tsx-source';

/** One mapping of a module name to a stand-in, as a test config states it. */
export interface StubMapping {
  /** The pattern: a Jest regex source, a Vitest alias string, or a Vitest regex source. */
  pattern: string;
  regex: boolean;
  /** The stand-in as written (a path, or the expression that builds one). */
  stub: string;
  config: string;
}

/** Where a mapper value is being read, and where an unreadable one is reported. */
interface MapperSite {
  config: string;
  key: 'moduleNameMapper' | 'alias';
  unread: string[];
  /** Same-file const hops taken so far. */
  depth: number;
}

/** `const a = b; const b = { … }` is followed this many hops, then reported as not read. */
const MAX_CONST_HOPS = 3;

/** The mappings of a mapper / alias value: a literal, or a same-file const holding one. */
export function mapperValue(
  source: TsxSource,
  value: TS.Expression,
  at: MapperSite
): StubMapping[] {
  const ts = source.ts;
  const regex = at.key === 'moduleNameMapper';
  const inner = unwrap(source, value);
  if (ts.isObjectLiteralExpression(inner))
    return objectEntries(source, inner, at);
  if (at.key === 'alias' && ts.isArrayLiteralExpression(inner))
    return aliasArray(source, inner, at.config);
  const held =
    ts.isIdentifier(inner) && at.depth < MAX_CONST_HOPS
      ? sameFileConst(source, inner.text)
      : null;
  if (held) return mapperValue(source, held, { ...at, depth: at.depth + 1 });
  at.unread.push(
    `${at.config}:${source.lineOf(value)}: ${at.key} is \`${excerpt(source, value)}\`, which this law cannot read (only an object literal${regex ? '' : ' or array'}, or a same-file const holding one, is read) — a Capacitor plugin stubbed in it would not be seen, so this law does not pass on it`
  );
  return [];
}

/** `x as T`, `x satisfies T`, `(x)` → `x`. */
function unwrap(source: TsxSource, value: TS.Expression): TS.Expression {
  const ts = source.ts;
  let current = value;
  while (
    ts.isAsExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

/** The initializer of a top-level `const name = …` in the same file; null when there is none. */
function sameFileConst(source: TsxSource, name: string): TS.Expression | null {
  const ts = source.ts;
  for (const statement of source.sourceFile.statements) {
    if (
      !ts.isVariableStatement(statement) ||
      !(statement.declarationList.flags & ts.NodeFlags.Const)
    )
      continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === name &&
        declaration.initializer
      ) {
        return declaration.initializer;
      }
    }
  }
  return null;
}

function excerpt(source: TsxSource, value: TS.Expression): string {
  return codeExcerpt(value.getText(source.sourceFile));
}

function objectEntries(
  source: TsxSource,
  object: TS.ObjectLiteralExpression,
  at: MapperSite
): StubMapping[] {
  const ts = source.ts;
  const regex = at.key === 'moduleNameMapper';
  return object.properties.flatMap(property => {
    // `{ ...base, … }`: the spread is read like the value itself.
    if (ts.isSpreadAssignment(property))
      return mapperValue(source, property.expression, at);
    if (!ts.isPropertyAssignment(property)) return [];
    const name = property.name;
    const pattern =
      ts.isStringLiteral(name) ||
      ts.isIdentifier(name) ||
      ts.isNoSubstitutionTemplateLiteral(name)
        ? name.text
        : null;
    return pattern === null
      ? []
      : [
          {
            pattern,
            regex,
            stub: stubText(source, property.initializer),
            config: at.config,
          },
        ];
  });
}

function aliasArray(
  source: TsxSource,
  array: TS.ArrayLiteralExpression,
  config: string
): StubMapping[] {
  const ts = source.ts;
  return array.elements.flatMap((element): StubMapping[] => {
    if (!ts.isObjectLiteralExpression(element)) return [];
    const property = (name: string) =>
      element.properties.find(
        (candidate): candidate is TS.PropertyAssignment =>
          ts.isPropertyAssignment(candidate) &&
          ts.isIdentifier(candidate.name) &&
          candidate.name.text === name
      )?.initializer;
    const find = property('find');
    const replacement = property('replacement');
    if (!find || !replacement) return [];
    if (ts.isStringLiteralLike(find))
      return [
        {
          pattern: find.text,
          regex: false,
          stub: stubText(source, replacement),
          config,
        },
      ];
    if (ts.isRegularExpressionLiteral(find)) {
      const literal = find.text;
      return [
        {
          pattern: literal.slice(1, literal.lastIndexOf('/')),
          regex: true,
          stub: stubText(source, replacement),
          config,
        },
      ];
    }
    return [];
  });
}

/** A path as written: a literal, or the string pieces of path.join / resolve(…). */
function stubText(source: TsxSource, value: TS.Expression): string {
  const ts = source.ts;
  if (ts.isStringLiteralLike(value)) return value.text;
  if (ts.isCallExpression(value)) {
    const pieces = value.arguments
      .filter(ts.isStringLiteralLike)
      .map(argument => argument.text);
    if (pieces.length) return pieces.join('/');
  }
  return value.getText(source.sourceFile);
}

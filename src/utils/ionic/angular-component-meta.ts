/**
 * What an Angular `@Component` decorator says, read from the parse: its
 * element selectors, host keys, template and styles (inline, or from the
 * files they name). What could not be read is pushed to `unread` with the
 * place it was written. See angular-components.ts for the scan built on it.
 */

import * as fs from 'fs';
import type * as TS from 'typescript';
import type { LawCheckContext } from '../../types/law.types';
import { PathOperations } from '../path-operations';
import { internalArray, type TsxSource } from '../react/tsx-source';

export interface SourceText {
  file: string;
  text: string;
  /** Line in `file` the text starts on. */
  firstLine: number;
}

/** The decorators of a node, across TypeScript versions (getDecorators arrived in 4.8). */
export function decoratorsOf(
  ts: typeof TS,
  node: TS.Node
): readonly TS.Decorator[] {
  if (typeof ts.getDecorators === 'function' && ts.canHaveDecorators(node)) {
    return ts.getDecorators(node) ?? [];
  }
  return internalArray<TS.Decorator>(node, 'decorators');
}

/** The object literal argument of `@Name({...})` on a class, or null. */
export function decoratorObject(
  ts: typeof TS,
  node: TS.Node,
  name: string
): TS.ObjectLiteralExpression | null {
  for (const decorator of decoratorsOf(ts, node)) {
    const call = decorator.expression;
    if (!ts.isCallExpression(call) || !ts.isIdentifier(call.expression))
      continue;
    if (call.expression.text !== name) continue;
    const arg = call.arguments[0];
    return arg && ts.isObjectLiteralExpression(arg) ? arg : null;
  }
  return null;
}

/** The initializer of `key:` in an object literal, or undefined. */
export function propertyOf(
  ts: typeof TS,
  object: TS.ObjectLiteralExpression,
  key: string
): TS.Expression | undefined {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = property.name;
    const text =
      ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
    if (text === key) return property.initializer;
  }
  return undefined;
}

/** A file relative to the project root, with forward slashes. */
export function relativePath(context: LawCheckContext, file: string): string {
  return PathOperations.getRelative(context.projectRoot, file).replace(
    /\\/g,
    '/'
  );
}

/** The element selectors of a component's `selector` (attribute selectors dropped). */
export function selectorsOf(
  ts: typeof TS,
  meta: TS.ObjectLiteralExpression
): string[] {
  const value = propertyOf(ts, meta, 'selector');
  if (!value || !ts.isStringLiteralLike(value)) return [];
  return value.text
    .split(',')
    .map(one => /^\s*([a-zA-Z][\w-]*)/.exec(one)?.[1]?.toLowerCase() ?? '')
    .filter(Boolean);
}

/** The keys of the decorator's `host` object. */
export function hostKeysOf(
  ts: typeof TS,
  meta: TS.ObjectLiteralExpression
): string[] {
  const host = propertyOf(ts, meta, 'host');
  if (!host || !ts.isObjectLiteralExpression(host)) return [];
  return host.properties
    .map(property => property.name)
    .filter((name): name is TS.PropertyName => Boolean(name))
    .map(name =>
      ts.isStringLiteral(name) || ts.isIdentifier(name) ? name.text : ''
    )
    .filter(Boolean);
}

/** The inline template, or the text of `templateUrl`; null when there is neither. */
export function templateOf(
  context: LawCheckContext,
  source: TsxSource,
  meta: TS.ObjectLiteralExpression,
  unread: string[]
): SourceText | null {
  const ts = source.ts;
  const inline = propertyOf(ts, meta, 'template');
  if (inline) return inlineText(context, source, inline, unread, 'template');
  const url = propertyOf(ts, meta, 'templateUrl');
  if (!url) return null;
  return urlText(context, source, url, unread);
}

/** The inline styles and the text of `styleUrl` / `styleUrls`. */
export function stylesOf(
  context: LawCheckContext,
  source: TsxSource,
  meta: TS.ObjectLiteralExpression,
  unread: string[]
): SourceText[] {
  const ts = source.ts;
  const found: SourceText[] = [];
  const each = (
    value: TS.Expression | undefined,
    read: (e: TS.Expression) => SourceText | null
  ): void => {
    if (!value) return;
    const items = ts.isArrayLiteralExpression(value)
      ? [...value.elements]
      : [value];
    for (const item of items) {
      const text = read(item);
      if (text) found.push(text);
    }
  };
  each(propertyOf(ts, meta, 'styles'), e =>
    inlineText(context, source, e, unread, 'styles')
  );
  each(propertyOf(ts, meta, 'styleUrl'), e =>
    urlText(context, source, e, unread)
  );
  each(propertyOf(ts, meta, 'styleUrls'), e =>
    urlText(context, source, e, unread)
  );
  return found;
}

function inlineText(
  context: LawCheckContext,
  source: TsxSource,
  value: TS.Expression,
  unread: string[],
  what: string
): SourceText | null {
  if (source.ts.isStringLiteralLike(value)) {
    return {
      file: source.fileName,
      text: value.text,
      firstLine: source.lineOf(value),
    };
  }
  unread.push(
    `${relativePath(context, source.fileName)}:${source.lineOf(value)}: inline ${what} is not a literal (built with substitutions or a variable) — it was not read`
  );
  return null;
}

function urlText(
  context: LawCheckContext,
  source: TsxSource,
  value: TS.Expression,
  unread: string[]
): SourceText | null {
  if (!source.ts.isStringLiteralLike(value)) {
    unread.push(
      `${relativePath(context, source.fileName)}:${source.lineOf(value)}: a template/style URL that is not a literal — it was not read`
    );
    return null;
  }
  const file = PathOperations.resolve(
    PathOperations.getDirectory(source.fileName),
    value.text
  );
  try {
    return { file, text: fs.readFileSync(file, 'utf8'), firstLine: 1 };
  } catch {
    unread.push(
      `${relativePath(context, source.fileName)}:${source.lineOf(value)}: '${value.text}' could not be read — it was not judged`
    );
    return null;
  }
}

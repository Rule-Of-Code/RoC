/**
 * Hooks, effects and their callbacks, read from the parse.
 *
 * The runtime React laws judge what an effect does — what it starts, what its
 * cleanup returns, what a callback calls — and a text search cannot tell an
 * effect's body from its cleanup, a call from a comment that names it, or the
 * index parameter of a `.map` from another `i`. Everything here works on the
 * `TsxSource` AST: a hook is a call of React's export (imported by name or
 * through the `React` namespace), an effect's cleanup is what its setup
 * returns, and an inline reason is a real comment, not a string in code.
 */

import type * as TS from 'typescript';
import type { LawCheckContext } from '../../types/law.types';
import { ReactProject } from './react-project';
import type { TsxSource, TypeScriptModule } from './tsx-source';

/** The hooks whose callback runs after render and may return a cleanup. */
export const EFFECT_HOOKS: readonly string[] = ['useEffect', 'useLayoutEffect'];

/** Receivers a browser global is reached through: `window.setInterval`. */
const GLOBAL_RECEIVERS = new Set(['window', 'globalThis', 'self']);

const REACT_MODULE = 'react';

type SetupFunction = TS.ArrowFunction | TS.FunctionExpression;

/** One `useEffect(setup, deps)` call. */
export interface EffectCall {
  /** The React export called: `useEffect` or `useLayoutEffect`. */
  hook: string;
  call: TS.CallExpression;
  /** The inline setup function; null when it is passed by reference. */
  setup: SetupFunction | null;
  line: number;
}

/** The local names that reach React's exports in one file. */
class ReactImports {
  /** local name → the React export it binds. */
  readonly named = new Map<string, string>();
  /** `import React from 'react'`, `import * as React from 'react'`. */
  readonly namespaces = new Set<string>();
}

const importsCache = new WeakMap<TsxSource, ReactImports>();

function reactImports(source: TsxSource): ReactImports {
  const cached = importsCache.get(source);
  if (cached) return cached;
  const imports = new ReactImports();
  for (const info of source.imports()) {
    if (info.module !== REACT_MODULE || info.typeOnly) continue;
    if (info.defaultName) imports.namespaces.add(info.defaultName);
    if (info.namespaceName) imports.namespaces.add(info.namespaceName);
    for (const { imported, local } of info.named) imports.named.set(local, imported);
  }
  importsCache.set(source, imports);
  return imports;
}

/** The React export `call` invokes (`useState`, `useEffect`…), or null. */
export function reactHookName(source: TsxSource, call: TS.CallExpression): string | null {
  const ts = source.ts;
  const imports = reactImports(source);
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return imports.named.get(callee.text) ?? null;
  if (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    imports.namespaces.has(callee.expression.text)
  ) {
    return callee.name.text;
  }
  return null;
}

/** True when the file imports anything from React at runtime. */
export function importsReact(source: TsxSource): boolean {
  const imports = reactImports(source);
  return imports.named.size > 0 || imports.namespaces.size > 0;
}

/** Every effect call in the file, in source order. */
export function effectCalls(source: TsxSource): EffectCall[] {
  const ts = source.ts;
  const effects: EffectCall[] = [];
  if (!importsReact(source)) return effects;
  source.walk(node => {
    if (!ts.isCallExpression(node)) return;
    const hook = reactHookName(source, node);
    if (!hook || !EFFECT_HOOKS.includes(hook)) return;
    const first = node.arguments[0];
    const setup =
      first && (ts.isArrowFunction(first) || ts.isFunctionExpression(first)) ? first : null;
    effects.push({ hook, call: node, setup, line: source.lineOf(node) });
  });
  return effects;
}

/** Function-like nodes: a boundary a walk of one function's own body stops at. */
export function isFunctionNode(ts: TypeScriptModule, node: TS.Node): boolean {
  return ts.isFunctionLike(node);
}

/**
 * Visit `root` and its descendants depth first. `skip` returns true for a node
 * whose subtree is not visited (the node itself is not visited either).
 */
export function walkWithin(
  ts: TypeScriptModule,
  root: TS.Node,
  visit: (node: TS.Node) => void,
  skip: (node: TS.Node) => boolean = () => false
): void {
  const recurse = (node: TS.Node): void => {
    if (skip(node)) return;
    visit(node);
    ts.forEachChild(node, recurse);
  };
  recurse(root);
}

/** The expressions a function returns, not counting nested functions' returns. */
export function returnedValues(ts: TypeScriptModule, fn: SetupFunction): TS.Expression[] {
  if (!ts.isBlock(fn.body)) return [fn.body];
  const values: TS.Expression[] = [];
  walkWithin(
    ts,
    fn.body,
    node => {
      if (ts.isReturnStatement(node) && node.expression) values.push(node.expression);
    },
    node => node !== fn.body && isFunctionNode(ts, node)
  );
  return values;
}

/** Strip parentheses and type assertions: `(x as Y)` is `x`. */
export function unwrap(ts: TypeScriptModule, expression: TS.Expression): TS.Expression {
  let current = expression;
  while (isWrapper(ts, current)) current = current.expression;
  return current;
}

type Wrapper =
  | TS.AsExpression
  | TS.NonNullExpression
  | TS.ParenthesizedExpression
  | TS.SatisfiesExpression;

function isWrapper(ts: TypeScriptModule, node: TS.Expression): node is Wrapper {
  // `satisfies` arrived in TypeScript 4.9; the project's own compiler may be older.
  const isSatisfies = (ts as Partial<TypeScriptModule>).isSatisfiesExpression;
  return (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isNonNullExpression(node) ||
    (typeof isSatisfies === 'function' && isSatisfies(node))
  );
}

/**
 * The function a name is bound to inside `scope`: `function f() {}`,
 * `const f = () => {}` or `const f = function () {}`. Null when the name is
 * bound to something else, or not inside `scope`.
 */
export function localFunction(
  ts: TypeScriptModule,
  scope: TS.Node,
  name: string
): TS.FunctionLikeDeclaration | null {
  let found: TS.FunctionLikeDeclaration | null = null;
  walkWithin(ts, scope, node => {
    if (found) return;
    if (ts.isFunctionDeclaration(node) && node.name?.text === name && node.body) {
      found = node;
      return;
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer
    ) {
      const value = unwrap(ts, node.initializer);
      if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) found = value;
    }
  });
  return found;
}

/**
 * The cleanup of an effect: what its setup returns, and the local function a
 * returned name is bound to (`const stop = () => …; return stop;`).
 */
export function cleanupNodes(ts: TypeScriptModule, setup: SetupFunction): TS.Node[] {
  const nodes: TS.Node[] = [];
  for (const value of returnedValues(ts, setup)) {
    nodes.push(value);
    const inner = unwrap(ts, value);
    if (ts.isIdentifier(inner)) {
      const bound = localFunction(ts, setup.body, inner.text);
      if (bound) nodes.push(bound);
    }
  }
  return nodes;
}

/** Visit an effect's setup — its body without the cleanup it returns. */
export function walkSetup(
  ts: TypeScriptModule,
  setup: SetupFunction,
  visit: (node: TS.Node) => void,
  skip: (node: TS.Node) => boolean = () => false
): void {
  const cleanup = new Set(cleanupNodes(ts, setup));
  walkWithin(ts, setup.body, visit, node => cleanup.has(node) || skip(node));
}

/** Calls that run a callback LATER, and repeatedly or on an event — not when the effect runs. */
const DEFERRING_CALLS = new Set([
  'setInterval',
  'setTimeout',
  'requestAnimationFrame',
  'addEventListener',
  'subscribe',
]);

/**
 * A function handed to a timer, a listener, a subscription or an Observer:
 * `setInterval(() => …)`, `el.addEventListener('x', () => …)`,
 * `new ResizeObserver(() => …)`. What it does happens on a later tick, not
 * when the effect runs.
 */
export function isDeferredCallback(ts: TypeScriptModule, node: TS.Node): boolean {
  if (!ts.isArrowFunction(node) && !ts.isFunctionExpression(node)) return false;
  const parent = node.parent;
  if (ts.isNewExpression(parent)) {
    return ts.isIdentifier(parent.expression) && /Observer$/.test(parent.expression.text);
  }
  if (!ts.isCallExpression(parent) || !parent.arguments.includes(node as TS.Expression)) return false;
  const name = callTarget(ts, parent)?.name;
  return name !== undefined && DEFERRING_CALLS.has(name);
}

/** What a call invokes: `f()` → f; `a.b.f()` → f with receiver `a.b`. */
export interface CallTarget {
  name: string;
  receiver: TS.Expression | null;
}

export function callTarget(ts: TypeScriptModule, call: TS.CallExpression): CallTarget | null {
  const callee = unwrap(ts, call.expression);
  if (ts.isIdentifier(callee)) return { name: callee.text, receiver: null };
  if (ts.isPropertyAccessExpression(callee)) {
    return { name: callee.name.text, receiver: callee.expression };
  }
  return null;
}

/** A call of a browser global: `setInterval(…)`, `window.setInterval(…)`. */
export function isGlobalCall(
  ts: TypeScriptModule,
  call: TS.CallExpression,
  name: string
): boolean {
  const target = callTarget(ts, call);
  if (!target || target.name !== name) return false;
  if (!target.receiver) return true;
  const receiver = unwrap(ts, target.receiver);
  return ts.isIdentifier(receiver) && GLOBAL_RECEIVERS.has(receiver.text);
}

/** `fetch(…)`, `window.fetch(…)`, `globalThis.fetch(…)`. */
export function isFetchCall(ts: TypeScriptModule, node: TS.Node): node is TS.CallExpression {
  return ts.isCallExpression(node) && isGlobalCall(ts, node, 'fetch');
}

/** Every name a file binds with `const [value, setValue] = useState(…)`. */
export function stateSetters(source: TsxSource): Set<string> {
  const ts = source.ts;
  const setters = new Set<string>();
  source.walk(node => {
    if (!ts.isVariableDeclaration(node) || !node.initializer) return;
    if (!ts.isArrayBindingPattern(node.name)) return;
    const init = unwrap(ts, node.initializer);
    if (!ts.isCallExpression(init)) return;
    if (reactHookName(source, init) !== 'useState') return;
    const second = node.name.elements[1];
    if (second && ts.isBindingElement(second) && ts.isIdentifier(second.name)) {
      setters.add(second.name.text);
    }
  });
  return setters;
}

const commentsCache = new WeakMap<TsxSource, Array<{ line: number; text: string }>>();

/**
 * Every comment of the file with the 1-based line it ends on. Read from the
 * trivia the parser keeps around tokens — `{/* … *\/}` inside JSX included —
 * so a string that looks like a comment is never one.
 */
function comments(source: TsxSource): Array<{ line: number; text: string }> {
  const cached = commentsCache.get(source);
  if (cached) return cached;
  const ts = source.ts;
  const { text, sourceFile } = source;
  const seen = new Map<number, { line: number; text: string }>();
  const collect = (ranges: readonly TS.CommentRange[] | undefined): void => {
    for (const range of ranges ?? []) {
      if (seen.has(range.pos)) continue;
      seen.set(range.pos, {
        line: sourceFile.getLineAndCharacterOfPosition(range.end).line + 1,
        text: text.slice(range.pos, range.end),
      });
    }
  };
  source.walk(node => {
    if (ts.isJsxText(node)) return;
    collect(ts.getLeadingCommentRanges(text, node.pos));
    collect(ts.getTrailingCommentRanges(text, node.end));
    if (ts.isJsxExpression(node) && !node.expression) {
      // `{/* … */}`: the comment follows the brace on the same line, which the
      // compiler reports as trailing trivia, not leading.
      const inside = node.getStart(sourceFile) + 1;
      collect(ts.getTrailingCommentRanges(text, inside));
      collect(ts.getLeadingCommentRanges(text, inside));
    }
  });
  const list = [...seen.values()];
  commentsCache.set(source, list);
  return list;
}

/**
 * True when a comment on `line` or the line above carries `marker: <reason>`
 * with a non-empty reason — the inline answer a finding the law cannot judge
 * (a bounded one-shot timer, a list that never reorders) is given.
 */
export function hasInlineReason(source: TsxSource, line: number, marker: string): boolean {
  const pattern = new RegExp(`${marker}\\s*:\\s*\\S`);
  return comments(source).some(
    comment => (comment.line === line || comment.line === line - 1) && pattern.test(comment.text)
  );
}

/** `file:line` for a message, relative to the project root. */
export function where(context: LawCheckContext, source: TsxSource, node: TS.Node): string {
  return `${ReactProject.relative(context, source.fileName)}:${source.lineOf(node)}`;
}

/**
 * Parse the React source a law reads. A file that was not read becomes a
 * violation, and so does a scan that found no React source at all: the law is
 * selected because the project declares React, so an empty scan means
 * `ignores` hid the subject, and a green from it would be a green over nothing.
 */
export function readReactSources(
  context: LawCheckContext,
  lawName: string
): { sources: TsxSource[]; violations: string[] } {
  const files = ReactProject.sourceFiles(context);
  if (files.length === 0) {
    return {
      sources: [],
      violations: [
        `no React source file (.tsx/.jsx/.ts/.js) was found to inspect although the project declares react — ${lawName} does not pass on an empty scan; check that ignores do not hide the source`,
      ],
    };
  }
  const { sources, unread } = ReactProject.parse(context, files);
  return {
    sources,
    violations: unread.map(reason => `${reason} — ${lawName} did not inspect them`),
  };
}

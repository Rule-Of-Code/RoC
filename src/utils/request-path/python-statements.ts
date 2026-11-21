/**
 * One Python function body → its statements (see model.ts): per statement
 * the outermost awaits, the names it binds and reads, and every call; per
 * loop in the same function (`for`, `async for`, `while`, and the element of
 * a comprehension) the awaited calls that run once per iteration.
 */

import type {
  AwaitSite,
  FunctionModel,
  LoopAwait,
  StatementModel,
} from './model';
import { chainPrefixes, matchingClose } from './expr-text';
import {
  iterationAwait,
  pythonAwaits,
  pythonCalls,
  renderPython,
} from './python-expr';
import {
  type Comprehension,
  pythonComprehensions,
} from './python-comprehensions';
import { finishLoop, type WalkedLoop } from './loop-dependence';
import { headerDefUse, simpleDefUse } from './python-def-use';
import type { PyLiteral, PyNode } from './python-source';

const LOOP_KEYWORDS = new Set(['for', 'async for', 'while']);
/** The keywords that open a function definition. */
export const FUNCTION_KEYWORDS = new Set(['def', 'async def']);
const TRANSACTION_SCOPE = /transaction|\batomic\b|\.begin\(/i;

type Loop = WalkedLoop;

/** `("a", "b")`, `{…}`, `[x, y]` with no comprehension in it: a display whose length is written in the source. */
export function isLiteralDisplay(text: string): boolean {
  const t = text
    .trim()
    .replace(/^(?:frozenset|tuple|set|list)\((.*)\)$/s, '$1');
  if (!/^[([{]/.test(t) || matchingClose(t, 0) !== t.length - 1) return false;
  return pythonComprehensions(t).length === 0;
}

/**
 * A `for` iterable whose length is written in the source: a literal display,
 * `range(3)`, or a module-level name bound to a literal display.
 */
function fixedIterable(
  header: string,
  literalCollections: ReadonlySet<string>
): boolean {
  const iterable = (/\s+in\s+(.*)$/.exec(header)?.[1] ?? '').trim();
  if (/^range\(\s*\d+\s*(?:,\s*\d+\s*)?\)$/.test(iterable)) return true;
  if (literalCollections.has(iterable)) return true;
  return isLiteralDisplay(iterable);
}

/** What walking one function body carries: the function, the literals, the open loops. */
export interface WalkState {
  fn: FunctionModel;
  literals: readonly PyLiteral[];
  loops: Loop[];
  literalCollections: ReadonlySet<string>;
}

function count(fn: FunctionModel, names: readonly string[]): void {
  for (const name of new Set(names))
    fn.nameUses.set(name, (fn.nameUses.get(name) ?? 0) + 1);
}

function pushLoopAwait(
  state: WalkState,
  loop: Loop | undefined,
  site: AwaitSite
): void {
  if (!loop) return;
  const loopAwait: LoopAwait = {
    loopLine: loop.line,
    loopKind: loop.kind,
    fixedCount: loop.fixedCount === true,
    dependsOnLoop: false,
    site,
  };
  state.fn.loopAwaits.push(loopAwait);
  loop.awaits.push(loopAwait);
}

/** Awaits of a statement's text that run per comprehension element, and async-for iterables. */
function comprehensionAwaits(
  comps: readonly Comprehension[],
  line: number,
  awaits: Array<AwaitSite & { start: number; end: number }>,
  state: WalkState
): void {
  const outer = state.loops[state.loops.length - 1];
  for (const comp of comps) {
    const comprehension: Loop = {
      line,
      kind: 'comprehension',
      targets: comp.targets,
      statements: [],
      awaits: [],
    };
    for (const site of awaits) {
      if (comp.perElement.some(([a, b]) => site.start >= a && site.start < b))
        pushLoopAwait(state, comprehension, site);
    }
    if (comp.asyncIterable)
      pushLoopAwait(
        state,
        outer,
        iterationAwait(comp.asyncIterable, line, state.literals)
      );
    for (const later of comp.laterAsyncIterables) {
      pushLoopAwait(
        state,
        comprehension,
        iterationAwait(later, line, state.literals)
      );
    }
    finishLoop(comprehension);
  }
}

/** Is `at` inside a part of a comprehension that runs once per element? */
function inPerElement(comps: readonly Comprehension[], at: number): boolean {
  return comps.some(c => c.perElement.some(([s, e]) => at >= s && at < e));
}

/**
 * A `while` condition runs once per iteration, but binds no item: what it
 * awaits is a poll or a retry, never one read per item.
 */
function whileLoopOf(node: PyNode): Loop | null {
  return node.keyword === 'while'
    ? {
        line: node.line,
        kind: 'while',
        targets: [],
        statements: [],
        awaits: [],
      }
    : null;
}

/**
 * Record a statement's awaits on the loop they run in: the `while` the
 * statement heads, else the loop around it; and per comprehension element.
 */
function recordStatementAwaits(
  node: PyNode,
  awaits: Array<AwaitSite & { start: number; end: number }>,
  comps: readonly Comprehension[],
  state: WalkState
): void {
  const whileLoop = whileLoopOf(node);
  const ownLoop = whileLoop ?? state.loops[state.loops.length - 1];
  for (const site of awaits) {
    if (!inPerElement(comps, site.start)) pushLoopAwait(state, ownLoop, site);
  }
  if (whileLoop) finishLoop(whileLoop);
  comprehensionAwaits(comps, node.line, awaits, state);
}

/** `[d async for d in q.stream()]` awaits every step of the stream. */
function comprehensionIterations(
  comps: readonly Comprehension[],
  awaits: Array<AwaitSite & { start: number; end: number }>,
  line: number,
  literals: readonly PyLiteral[]
): AwaitSite[] {
  return comps
    .filter(
      c =>
        c.asyncIterable &&
        !inPerElement(comps, c.start) &&
        !awaits.some(a => a.start < c.start && c.end <= a.end)
    )
    .map(c => iterationAwait(c.asyncIterable as string, line, literals));
}

/** An `async for` header awaits each step of its iterable, in the loop around it. */
function recordAsyncForAwait(node: PyNode, state: WalkState): void {
  if (node.keyword !== 'async for') return;
  const iterable = /\s+in\s+(.*)$/.exec(node.header)?.[1];
  if (iterable)
    pushLoopAwait(
      state,
      state.loops[state.loops.length - 1],
      iterationAwait(iterable, node.line, state.literals)
    );
}

/** A `with` / `async with` that opens a transaction. */
function isTransactionScope(node: PyNode, text: string): boolean {
  return (
    (node.keyword === 'with' || node.keyword === 'async with') &&
    TRANSACTION_SCOPE.test(text)
  );
}

/** Analyse one statement and record its awaits, calls and names on the function. */
function statementOf(node: PyNode, state: WalkState): StatementModel {
  const { literals, fn } = state;
  const simple = node.keyword === null;
  const text = simple ? node.text : node.header;
  const awaits = pythonAwaits(text, node.line, literals);
  const defUse = simple
    ? simpleDefUse(text, literals)
    : { ...headerDefUse(node, literals), mutable: [] };
  const comps = pythonComprehensions(text);
  recordStatementAwaits(node, awaits, comps, state);
  const iterations = comprehensionIterations(
    comps,
    awaits,
    node.line,
    literals
  );
  recordAsyncForAwait(node, state);
  if (isTransactionScope(node, text)) fn.transactional = true;
  fn.calls.push(...pythonCalls(text, node.line, literals));
  count(fn, defUse.used);
  return {
    line: node.line,
    endLine: node.endLine,
    simple: simple && !/^(?:import|from|global|nonlocal)\b/.test(text),
    awaits: [
      ...awaits.map(({ start: _start, end: _end, ...site }) => site),
      ...iterations,
    ],
    bound: defUse.bound.flatMap(name =>
      name.includes('.') ? [name] : chainPrefixes(name)
    ),
    used: defUse.used,
    mutableBindings: defUse.mutable,
    text: renderPython(
      simple ? node.text : `${node.keyword} ${node.header}`,
      literals
    ),
  };
}

/** Walk one statement list of a function body. */
export function walkBlock(nodes: readonly PyNode[], state: WalkState): void {
  const block: StatementModel[] = [];
  state.fn.blocks.push(block);
  for (const node of nodes) {
    if (node.keyword === '@') continue;
    if (isDefinition(node)) {
      block.push(definitionStatement(node));
      continue;
    }
    const statement = statementOf(node, state);
    block.push(statement);
    state.loops.forEach(loop => loop.statements.push(statement));
    if (node.children.length === 0) continue;
    walkBody(node, statement, state);
  }
}

/** A `def`, `async def` or `class`: its body runs elsewhere, not here. */
function isDefinition(node: PyNode): boolean {
  return (
    node.keyword !== null &&
    (FUNCTION_KEYWORDS.has(node.keyword) || node.keyword === 'class')
  );
}

/** A definition as a statement of the block around it: no awaits, no names. */
function definitionStatement(node: PyNode): StatementModel {
  return {
    line: node.line,
    endLine: node.endLine,
    simple: false,
    awaits: [],
    bound: [],
    used: [],
    mutableBindings: [],
    text: node.text,
  };
}

/** Walk a compound statement's body, inside the loop the statement opens. */
function walkBody(
  node: PyNode,
  statement: StatementModel,
  state: WalkState
): void {
  const loop =
    node.keyword !== null && LOOP_KEYWORDS.has(node.keyword)
      ? newLoop(node, statement, state)
      : null;
  if (loop) state.loops.push(loop);
  walkBlock(node.children, state);
  if (loop) {
    state.loops.pop();
    finishLoop(loop);
  }
}

/** A `for` / `async for` / `while` about to be walked; a `for` binds its targets. */
function newLoop(node: PyNode, header: StatementModel, state: WalkState): Loop {
  const isWhile = node.keyword === 'while';
  return {
    line: node.line,
    kind: node.keyword as string,
    fixedCount:
      !isWhile && fixedIterable(node.header, state.literalCollections),
    targets: isWhile ? [] : header.bound,
    statements: [],
    awaits: [],
  };
}

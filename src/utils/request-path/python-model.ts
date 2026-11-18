/**
 * Python block tree → the request-path model (see model.ts).
 *
 * Per function: its statement lists, the outermost awaits of each statement,
 * the names each statement binds and reads (simple def-use: assignment and
 * augmented-assignment targets, tuple unpacking, walrus, `as`, `for`
 * targets), the awaited calls that run once per iteration of a loop in the
 * same function (`for`, `async for`, `while`, and the element of a
 * comprehension), and every call. A nested `def` is a function of its own:
 * what it awaits runs when it is called, not where it is defined.
 */

import type {
  AwaitSite,
  FunctionModel,
  ImportBinding,
  LoopAwait,
  ModuleModel,
  StatementModel,
} from './model';
import { chainPrefixes, depthMap, matchingClose, splitTopLevel } from './expr-text';
import {
  iterationAwait,
  pythonAwaits,
  pythonCalls,
  pythonComprehensions,
  type Comprehension,
  pythonNames,
  renderPython,
} from './python-expr';
import { finishLoop, type WalkedLoop } from './loop-dependence';
import { lexPython, pythonTree, type PyLiteral, type PyNode } from './python-source';

const LOOP_KEYWORDS = new Set(['for', 'async for', 'while']);
const FUNCTION_KEYWORDS = new Set(['def', 'async def']);
const TRANSACTION_SCOPE = /transaction|\batomic\b|\.begin\(/i;
const TRANSACTION_PARAM = /^(?:transaction|txn|tx)$/;
const FRESH_MUTABLE = /^(?:\[.*\]|\{.*\}|(?:set|dict|list|defaultdict|deque|OrderedDict|Counter)\(.*\))$/;

type Loop = WalkedLoop;

/** `("a", "b")`, `{…}`, `[x, y]` with no comprehension in it: a display whose length is written in the source. */
function isLiteralDisplay(text: string): boolean {
  const t = text.trim().replace(/^(?:frozenset|tuple|set|list)\((.*)\)$/s, '$1');
  if (!/^[([{]/.test(t) || matchingClose(t, 0) !== t.length - 1) return false;
  return pythonComprehensions(t).length === 0;
}

/**
 * A `for` iterable whose length is written in the source: a literal display,
 * `range(3)`, or a module-level name bound to a literal display.
 */
function fixedIterable(header: string, literalCollections: ReadonlySet<string>): boolean {
  const iterable = (/\s+in\s+(.*)$/.exec(header)?.[1] ?? '').trim();
  if (/^range\(\s*\d+\s*(?:,\s*\d+\s*)?\)$/.test(iterable)) return true;
  if (literalCollections.has(iterable)) return true;
  return isLiteralDisplay(iterable);
}

interface WalkState {
  fn: FunctionModel;
  literals: readonly PyLiteral[];
  loops: Loop[];
  literalCollections: ReadonlySet<string>;
}

/** Index of the assignment `=` at depth 0 (not `==`, `<=`, `:=`, …), and whether it is augmented. */
function assignmentOperators(text: string): Array<{ at: number; augmented: boolean }> {
  const depths = depthMap(text);
  const out: Array<{ at: number; augmented: boolean }> = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '=' || depths[i] !== 0) continue;
    const prev = text[i - 1] ?? '';
    if (text[i + 1] === '=' || prev === '=' || prev === '!' || prev === ':') continue;
    if ((prev === '<' || prev === '>') && text[i - 2] !== prev) continue;
    out.push({ at: i, augmented: '+-*/%@&|^<>'.includes(prev) });
  }
  return out;
}

/** Strip a depth-0 annotation (`x: int`) from an assignment target. */
function withoutAnnotation(target: string): string {
  const depths = depthMap(target);
  for (let i = 0; i < target.length; i++) {
    if (target[i] === ':' && depths[i] === 0) return target.slice(0, i).trim();
  }
  return target.trim();
}

/** Names an assignment target binds, and names its subscripts read. */
function targetNames(raw: string, literals: readonly PyLiteral[]): { bound: string[]; used: string[] } {
  let target = withoutAnnotation(raw.replace(/[+\-*/%@&|^<>]+$/, '')).replace(/^\*+/, '').trim();
  const wrapped = /^[([]/.test(target) && matchingClose(target, 0) === target.length - 1;
  if (wrapped) target = target.slice(1, -1);
  const parts = splitTopLevel(target);
  if (parts.length > 1 || wrapped) {
    return parts
      .map(part => targetNames(part, literals))
      .reduce((acc, r) => ({ bound: [...acc.bound, ...r.bound], used: [...acc.used, ...r.used] }), {
        bound: [] as string[],
        used: [] as string[],
      });
  }
  if (/^[A-Za-z_][\w.]*$/.test(target)) return { bound: [target.replace(/\s+/g, '')], used: [] };
  const sub = /^([A-Za-z_][\w.]*)\s*\[/.exec(target);
  if (sub) return { bound: [sub[1] as string], used: pythonNames(target.slice(sub[0].length - 1), literals) };
  return { bound: [], used: pythonNames(target, literals) };
}

function walrusNames(text: string): string[] {
  return [...text.matchAll(/([A-Za-z_]\w*)\s*:=/g)].map(m => m[1] as string);
}

/** Bound and used names of a simple statement. */
function simpleDefUse(
  text: string,
  literals: readonly PyLiteral[]
): { bound: string[]; used: string[]; mutable: string[] } {
  const imported = /^(?:from\s+\S+\s+)?import\s+(.+)$/.exec(text);
  if (imported) {
    const bound = splitTopLevel((imported[1] as string).replace(/[()]/g, '')).map(part => {
      const as = /\bas\s+(\w+)$/.exec(part);
      return as ? (as[1] as string) : (part.split('.')[0] as string).trim();
    });
    return { bound, used: [], mutable: [] };
  }
  const ops = assignmentOperators(text);
  if (ops.length === 0) {
    const annotated = /^([A-Za-z_][\w.]*)\s*:\s*\S/.exec(text);
    if (annotated && !/^(?:return|yield|raise|assert|del|lambda)\b/.test(text)) {
      return { bound: [annotated[1] as string], used: [], mutable: [] };
    }
    return { bound: walrusNames(text), used: pythonNames(text, literals), mutable: [] };
  }
  const last = ops[ops.length - 1] as { at: number; augmented: boolean };
  const value = text.slice(last.at + 1).trim();
  const bound: string[] = [];
  const used = pythonNames(value, literals);
  let from = 0;
  for (const op of ops) {
    const names = targetNames(text.slice(from, op.at), literals);
    bound.push(...names.bound);
    used.push(...names.used);
    if (op.augmented) used.push(...names.bound);
    from = op.at + 1;
  }
  bound.push(...walrusNames(value));
  return { bound, used, mutable: FRESH_MUTABLE.test(value) && !last.augmented ? bound : [] };
}

/** Bound and used names of a compound header. */
function headerDefUse(node: PyNode, literals: readonly PyLiteral[]): { bound: string[]; used: string[] } {
  const header = node.header;
  if (node.keyword === 'for' || node.keyword === 'async for') {
    const m = /^(.*?)\s+in\s+(.*)$/.exec(header);
    if (!m) return { bound: [], used: pythonNames(header, literals) };
    return { bound: targetNames(m[1] as string, literals).bound, used: pythonNames(m[2] as string, literals) };
  }
  if (node.keyword === 'with' || node.keyword === 'async with' || node.keyword?.startsWith('except')) {
    const bound = [...header.matchAll(/\bas\s+([A-Za-z_]\w*)/g)].map(m => m[1] as string);
    return { bound, used: pythonNames(header.replace(/\bas\s+[A-Za-z_]\w*/g, ''), literals) };
  }
  return { bound: walrusNames(header), used: pythonNames(header, literals) };
}

function count(fn: FunctionModel, names: readonly string[]): void {
  for (const name of new Set(names)) fn.nameUses.set(name, (fn.nameUses.get(name) ?? 0) + 1);
}

function pushLoopAwait(state: WalkState, loop: Loop | undefined, site: AwaitSite): void {
  if (!loop) return;
  const loopAwait: LoopAwait = { loopLine: loop.line, loopKind: loop.kind, fixedCount: loop.fixedCount === true, dependsOnLoop: false, site };
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
    const comprehension: Loop = { line, kind: 'comprehension', targets: comp.targets, statements: [], awaits: [] };
    for (const site of awaits) {
      if (comp.perElement.some(([a, b]) => site.start >= a && site.start < b)) pushLoopAwait(state, comprehension, site);
    }
    if (comp.asyncIterable) pushLoopAwait(state, outer, iterationAwait(comp.asyncIterable, line, state.literals));
    for (const later of comp.laterAsyncIterables) {
      pushLoopAwait(state, comprehension, iterationAwait(later, line, state.literals));
    }
    finishLoop(comprehension);
  }
}

/** Analyse one statement and record its awaits, calls and names on the function. */
function statementOf(node: PyNode, state: WalkState): StatementModel {
  const { literals, fn } = state;
  const simple = node.keyword === null;
  const text = simple ? node.text : node.header;
  const awaits = pythonAwaits(text, node.line, literals);
  const defUse = simple ? simpleDefUse(text, literals) : { ...headerDefUse(node, literals), mutable: [] };
  const outer = state.loops[state.loops.length - 1];
  // A `while` condition runs once per iteration, but binds no item: what it
  // awaits is a poll or a retry, never one read per item.
  const whileLoop: Loop | null =
    node.keyword === 'while' ? { line: node.line, kind: 'while', targets: [], statements: [], awaits: [] } : null;
  const ownLoop = whileLoop ?? outer;
  const comps = pythonComprehensions(text);
  const perElement = (at: number): boolean =>
    comps.some(c => c.perElement.some(([s, e]) => at >= s && at < e));
  for (const site of awaits) {
    if (!perElement(site.start)) pushLoopAwait(state, ownLoop, site);
  }
  if (whileLoop) finishLoop(whileLoop);
  comprehensionAwaits(comps, node.line, awaits, state);
  // `[d async for d in q.stream()]` awaits every step of the stream.
  const iterations = comps
    .filter(c => c.asyncIterable && !perElement(c.start) && !awaits.some(a => a.start < c.start && c.end <= a.end))
    .map(c => iterationAwait(c.asyncIterable as string, node.line, literals));
  if (node.keyword === 'async for') {
    const iterable = /\s+in\s+(.*)$/.exec(node.header)?.[1];
    if (iterable) pushLoopAwait(state, outer, iterationAwait(iterable, node.line, literals));
  }
  if ((node.keyword === 'with' || node.keyword === 'async with') && TRANSACTION_SCOPE.test(text)) {
    fn.transactional = true;
  }
  fn.calls.push(...pythonCalls(text, node.line, literals));
  count(fn, defUse.used);
  return {
    line: node.line,
    endLine: node.endLine,
    simple: simple && !/^(?:import|from|global|nonlocal)\b/.test(text),
    awaits: [...awaits.map(({ start: _start, end: _end, ...site }) => site), ...iterations],
    bound: defUse.bound.flatMap(name => (name.includes('.') ? [name] : chainPrefixes(name))),
    used: defUse.used,
    mutableBindings: defUse.mutable,
    text: renderPython(simple ? node.text : `${node.keyword} ${node.header}`, literals),
  };
}

/** Walk one statement list of a function body. */
function walkBlock(nodes: readonly PyNode[], state: WalkState): void {
  const block: StatementModel[] = [];
  state.fn.blocks.push(block);
  for (const node of nodes) {
    if (node.keyword === '@') continue;
    if (node.keyword !== null && (FUNCTION_KEYWORDS.has(node.keyword) || node.keyword === 'class')) {
      block.push({ line: node.line, endLine: node.endLine, simple: false, awaits: [], bound: [], used: [], mutableBindings: [], text: node.text });
      continue;
    }
    const statement = statementOf(node, state);
    block.push(statement);
    state.loops.forEach(loop => loop.statements.push(statement));
    if (node.children.length === 0) continue;
    const loop = node.keyword !== null && LOOP_KEYWORDS.has(node.keyword) ? newLoop(node, statement, state) : null;
    if (loop) state.loops.push(loop);
    walkBlock(node.children, state);
    if (loop) {
      state.loops.pop();
      finishLoop(loop);
    }
  }
}

/** A `for` / `async for` / `while` about to be walked; a `for` binds its targets. */
function newLoop(node: PyNode, header: StatementModel, state: WalkState): Loop {
  const isWhile = node.keyword === 'while';
  return {
    line: node.line,
    kind: node.keyword as string,
    fixedCount: !isWhile && fixedIterable(node.header, state.literalCollections),
    targets: isWhile ? [] : header.bound,
    statements: [],
    awaits: [],
  };
}

function paramsOf(header: string): string[] {
  const open = header.indexOf('(');
  const close = open >= 0 ? matchingClose(header, open) : -1;
  if (close < 0) return [];
  return splitTopLevel(header.slice(open + 1, close))
    .map(part => /^\**\s*([A-Za-z_]\w*)/.exec(part)?.[1] ?? '')
    .filter(Boolean);
}

function newFunction(node: PyNode, prefix: string, decorators: readonly string[], literals: readonly PyLiteral[]): FunctionModel {
  const shortName = /^([A-Za-z_]\w*)/.exec(node.header)?.[1] ?? '<anonymous>';
  const params = paramsOf(node.header);
  return {
    decorators: decorators.map(d => renderPython(d, literals)),
    name: prefix ? `${prefix}.${shortName}` : shortName,
    shortName,
    line: node.line,
    endLine: node.endLine,
    isAsync: node.keyword === 'async def',
    params,
    blocks: [],
    loopAwaits: [],
    calls: [],
    nameUses: new Map(),
    transactional:
      decorators.some(d => /transaction/i.test(d)) || params.some(p => TRANSACTION_PARAM.test(p)),
  };
}

/** Every def in a node list (methods and nested functions included). */
interface ModuleContext {
  literals: readonly PyLiteral[];
  literalCollections: ReadonlySet<string>;
}

function collectFunctions(nodes: readonly PyNode[], prefix: string, module: ModuleContext, out: FunctionModel[]): void {
  let decorators: string[] = [];
  for (const node of nodes) {
    if (node.keyword === '@') {
      decorators.push(node.header);
      continue;
    }
    if (node.keyword !== null && FUNCTION_KEYWORDS.has(node.keyword)) {
      const fn = newFunction(node, prefix, decorators, module.literals);
      walkBlock(node.children, { fn, literals: module.literals, loops: [], literalCollections: module.literalCollections });
      out.push(fn);
      collectFunctions(node.children, fn.name, module, out);
    } else if (node.keyword === 'class') {
      const name = /^([A-Za-z_]\w*)/.exec(node.header)?.[1] ?? '';
      collectFunctions(node.children, prefix ? `${prefix}.${name}` : name, module, out);
    } else if (node.children.length > 0) {
      collectFunctions(node.children, prefix, module, out);
    }
    decorators = [];
  }
}

const COLLECTION_ASSIGNMENT = /^([A-Za-z_]\w*)\s*(?::\s*[^=]+)?=\s*(.+)$/s;

/** Module-level `RULES = ("a", "b")` / `[…]` / `{…}`: names bound to a literal display. */
function literalCollectionsOf(nodes: readonly PyNode[]): Set<string> {
  const names = new Set<string>();
  for (const node of nodes) {
    const m = node.keyword === null ? COLLECTION_ASSIGNMENT.exec(node.text) : null;
    if (m && isLiteralDisplay(m[2] as string)) names.add(m[1] as string);
  }
  return names;
}

const NAME_AS = /^([A-Za-z_]\w*)(?:\s+as\s+([A-Za-z_]\w*))?$/;
const DOTTED_AS = /^([A-Za-z_][\w.]*)(?:\s+as\s+([A-Za-z_]\w*))?$/;

/** The bindings of one `from m import …` or `import …` statement. */
function importBindings(text: string): ImportBinding[] {
  const from = /^from\s+(\S+)\s+import\s+(.+)$/.exec(text);
  if (from) {
    return splitTopLevel((from[2] as string).replace(/[()]/g, ''))
      .map(part => NAME_AS.exec(part.trim()))
      .filter((m): m is RegExpExecArray => m !== null)
      .map(m => ({ local: m[2] ?? (m[1] as string), module: from[1] as string, imported: m[1] as string }));
  }
  const plain = /^import\s+(.+)$/.exec(text);
  if (!plain) return [];
  return splitTopLevel(plain[1] as string)
    .map(part => DOTTED_AS.exec(part.trim()))
    .filter((m): m is RegExpExecArray => m !== null)
    .map(m => ({ local: m[2] ?? (m[1] as string), module: m[1] as string, imported: null }));
}

function importsOf(nodes: readonly PyNode[]): ImportBinding[] {
  return nodes.filter(node => node.keyword === null).flatMap(node => importBindings(node.text));
}

const STRING_CONSTANT = /^([A-Za-z_]\w*)\s*(?::\s*[\w[\]., ]+)?=\s*«(\d+)»$/;

/** Module-level `NAME = "literal"` (an annotation such as `Final` allowed). */
function constantsOf(nodes: readonly PyNode[], literals: readonly PyLiteral[]): Map<string, string> {
  const constants = new Map<string, string>();
  for (const node of nodes) {
    const m = node.keyword === null ? STRING_CONSTANT.exec(node.text) : null;
    const literal = m ? literals[Number(m[2])] : undefined;
    if (m && literal && !literal.formatted) constants.set(m[1] as string, literal.value);
  }
  return constants;
}

/** Parse a Python module into the request-path model. Never throws. */
export function pythonModule(file: string, rel: string, content: string): ModuleModel {
  const { code, literals } = lexPython(content);
  const tree = pythonTree(code);
  const functions: FunctionModel[] = [];
  const literalCollections = literalCollectionsOf(tree);
  collectFunctions(tree, '', { literals, literalCollections }, functions);
  return {
    file,
    rel,
    language: 'python',
    functions,
    imports: importsOf(tree),
    constants: constantsOf(tree, literals),
    literalCollections,
    lines: content.split(/\r\n|\r|\n/),
  };
}

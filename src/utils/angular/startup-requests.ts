/**
 * The HTTP requests an Angular component starts while it opens.
 *
 * A screen that fires many independent requests at once makes them contend on
 * the backend, and the screen waits for the slowest. What fires "at once" is
 * what runs synchronously from the hooks that run when a component opens —
 * its constructor, `ngOnInit`, and Ionic's `ionViewWillEnter` — read from the
 * TypeScript AST:
 *
 * - an HttpClient call (`this.http.get(…)`, where `http` is an injected
 *   HttpClient — constructor parameter, `inject(HttpClient)` or a field typed
 *   HttpClient) or a global `fetch(…)`;
 * - the same, inside a method of the same class the hook calls (`this.load()`);
 * - the same, inside a method of an injected service the hook calls
 *   (`this.users.loadProfile()`): ONE service hop, resolved by the injected
 *   type's class name among the project's own classes — or, for an abstract
 *   class used as the token, in the classes that extend or implement it.
 *
 * A call inside a nested function is deferred — a `subscribe`/`then` callback
 * runs after a response, `setTimeout` after the hook, an event handler on an
 * event — and is not counted. The callbacks of synchronous array iteration
 * (`forEach`, `map`, …) run in the hook, so their calls are counted, once per
 * call site: how many elements the array holds is not known statically.
 */

import type * as TS from 'typescript';
import type { TsxSource } from '../react/tsx-source';

/** HttpClient methods that send a request. */
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'request', 'jsonp']);
/** Array methods whose callback runs synchronously, in the caller. */
const SYNC_ITERATION = new Set(['forEach', 'map', 'flatMap', 'filter', 'some', 'every', 'find', 'reduce']);
/** The hooks that run when a component opens. */
export const OPENING_HOOKS: readonly string[] = ['constructor', 'ngOnInit', 'ionViewWillEnter'];
const MAX_SAME_CLASS_DEPTH = 6;

/** One request a component starts on open. */
export interface StartupRequest {
  /** `GET '/api/me'`, `fetch(url)`. */
  label: string;
  /** Where the request call is written: `rel/path.ts:line`. */
  at: string;
  /** Where the hook reaches a service method that makes it, when it does. */
  via?: string;
}

/** A class of the project, read for what it injects and the methods it has. */
export interface ClassModel {
  name: string;
  source: TsxSource;
  line: number;
  /** Method name → body (constructor included as `constructor`). */
  methods: Map<string, TS.Node>;
  /** Member (or constructor parameter) names that hold an HttpClient. */
  httpMembers: Set<string>;
  /** Member name → injected class name. */
  injected: Map<string, string>;
  /** Names in its extends / implements clauses. */
  heritage: string[];
}

type Relative = (file: string) => string;

function typeName(ts: typeof TS, type: TS.TypeNode | undefined): string | null {
  if (!type || !ts.isTypeReferenceNode(type)) return null;
  return ts.isIdentifier(type.typeName) ? type.typeName.text : null;
}

/** `inject(X)` → `X`. */
function injectedName(ts: typeof TS, expression: TS.Expression | undefined): string | null {
  if (!expression || !ts.isCallExpression(expression)) return null;
  if (!ts.isIdentifier(expression.expression) || expression.expression.text !== 'inject') return null;
  const arg = expression.arguments[0];
  return arg && ts.isIdentifier(arg) ? arg.text : null;
}

function memberName(ts: typeof TS, name: TS.PropertyName | TS.BindingName | undefined): string | null {
  if (!name) return null;
  return ts.isIdentifier(name) || ts.isPrivateIdentifier(name) ? name.text : null;
}

function addInjection(model: ClassModel, name: string | null, injected: string | null): void {
  if (!name || !injected) return;
  if (injected === 'HttpClient') model.httpMembers.add(name);
  else model.injected.set(name, injected);
}

function readMember(ts: typeof TS, model: ClassModel, member: TS.ClassElement): void {
  if (ts.isConstructorDeclaration(member)) {
    if (member.body) model.methods.set('constructor', member.body);
    for (const param of member.parameters) {
      addInjection(model, memberName(ts, param.name), typeName(ts, param.type));
    }
    return;
  }
  if (ts.isMethodDeclaration(member) && member.body) {
    const name = memberName(ts, member.name);
    if (name) model.methods.set(name, member.body);
    return;
  }
  if (!ts.isPropertyDeclaration(member)) return;
  const name = memberName(ts, member.name);
  const init = member.initializer;
  if (name && init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
    model.methods.set(name, init.body);
    return;
  }
  addInjection(model, name, injectedName(ts, init) ?? typeName(ts, member.type));
}

/** Every named class in the sources, by name. */
export function classModels(sources: TsxSource[]): Map<string, ClassModel[]> {
  const byName = new Map<string, ClassModel[]>();
  for (const source of sources) {
    const ts = source.ts;
    source.walk(node => {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      const model: ClassModel = {
        name: node.name.text,
        source,
        line: source.lineOf(node.name),
        methods: new Map(),
        httpMembers: new Set(),
        injected: new Map(),
        heritage: (node.heritageClauses ?? []).flatMap(clause =>
          clause.types.map(type => (ts.isIdentifier(type.expression) ? type.expression.text : '')).filter(Boolean)
        ),
      };
      for (const member of node.members) readMember(ts, model, member);
      byName.set(model.name, [...(byName.get(model.name) ?? []), model]);
    });
  }
  return byName;
}

/** `this.x` → `x`; anything else → null. */
function thisMember(ts: typeof TS, expression: TS.Expression): string | null {
  if (!ts.isPropertyAccessExpression(expression)) return null;
  if (expression.expression.kind !== ts.SyntaxKind.ThisKeyword) return null;
  return expression.name.text;
}

function describe(source: TsxSource, node: TS.Expression | undefined): string {
  if (!node) return '?';
  const ts = source.ts;
  if (ts.isStringLiteralLike(node)) return `'${node.text}'`;
  const text = node.getText(source.sourceFile).replace(/\s+/g, ' ');
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

interface Walk {
  models: Map<string, ClassModel[]>;
  rel: Relative;
  found: StartupRequest[];
  /** Methods being followed right now, to stop on recursion. */
  active: Set<string>;
}

function isFunctionLike(ts: typeof TS, node: TS.Node): boolean {
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node) || ts.isClassLike(node);
}

/** A callback that runs synchronously in the caller: `items.forEach(x => …)`. */
function runsInCaller(ts: typeof TS, fn: TS.Node): boolean {
  const call = fn.parent;
  if (!call || !ts.isCallExpression(call) || !call.arguments.includes(fn as TS.Expression)) return false;
  const callee = call.expression;
  return ts.isPropertyAccessExpression(callee) && SYNC_ITERATION.has(callee.name.text);
}

/** The request this call sends, if it is one. */
function requestOf(model: ClassModel, call: TS.CallExpression): string | null {
  const ts = model.source.ts;
  const callee = call.expression;
  if (ts.isIdentifier(callee) && callee.text === 'fetch') return `fetch(${describe(model.source, call.arguments[0])})`;
  if (!ts.isPropertyAccessExpression(callee)) return null;
  const method = callee.name.text;
  const target = callee.expression;
  if (method === 'fetch' && ts.isIdentifier(target) && (target.text === 'window' || target.text === 'globalThis')) {
    return `fetch(${describe(model.source, call.arguments[0])})`;
  }
  if (!HTTP_METHODS.has(method)) return null;
  const holder = thisMember(ts, target) ?? (ts.isIdentifier(target) ? target.text : null);
  if (!holder || !model.httpMembers.has(holder)) return null;
  const url = method === 'request' && call.arguments.length > 1 ? call.arguments[1] : call.arguments[0];
  return `${method.toUpperCase()} ${describe(model.source, url)}`;
}

interface Hop {
  service: ClassModel;
  body: TS.Node;
}

/** The classes that extend or implement `type` (an abstract class used as the DI token). */
function implementations(walk: Walk, type: string): ClassModel[] {
  return [...walk.models.values()].flat().filter(model => model.heritage.includes(type));
}

/**
 * The method bodies an injected-service call can run: the injected class's
 * own method, or — when it declares none (an abstract class used as the DI
 * token) — the same method in each class that extends or implements it.
 */
function serviceMethods(walk: Walk, model: ClassModel, call: TS.CallExpression): Hop[] {
  const ts = model.source.ts;
  const callee = call.expression;
  if (!ts.isPropertyAccessExpression(callee)) return [];
  const holder = thisMember(ts, callee.expression);
  const type = holder ? model.injected.get(holder) : undefined;
  if (!type) return [];
  const method = callee.name.text;
  const withBody = (services: ClassModel[]): Hop[] =>
    services.flatMap(service => {
      const body = service.methods.get(method);
      return body && service !== model ? [{ service, body }] : [];
    });
  const own = withBody(walk.models.get(type) ?? []);
  return own.length > 0 ? own : withBody(implementations(walk, type));
}

function follow(walk: Walk, key: string, next: () => void): void {
  if (walk.active.has(key) || walk.active.size > MAX_SAME_CLASS_DEPTH) return;
  walk.active.add(key);
  next();
  walk.active.delete(key);
}

/** Record the requests one call makes, following one same-class or service step. */
function visitCall(walk: Walk, model: ClassModel, call: TS.CallExpression, via: string | undefined): void {
  const source = model.source;
  const label = requestOf(model, call);
  if (label) {
    walk.found.push({ label, at: `${walk.rel(source.fileName)}:${source.lineOf(call)}`, ...(via ? { via } : {}) });
    return;
  }
  const own = thisMember(source.ts, call.expression);
  const body = own ? model.methods.get(own) : undefined;
  if (own && body) {
    follow(walk, `${model.name}.${own}`, () => visitBody(walk, model, body, via));
    return;
  }
  if (via) return; // one service hop only
  const at = `${walk.rel(source.fileName)}:${source.lineOf(call)}`;
  // Several implementations (an HTTP one, an in-memory one): the first that
  // sends a request stands for the call, so one call is never counted twice.
  for (const hop of serviceMethods(walk, model, call)) {
    const before = walk.found.length;
    follow(walk, `${hop.service.name}#${hop.body.pos}`, () => visitBody(walk, hop.service, hop.body, at));
    if (walk.found.length > before) return;
  }
}

function visitBody(walk: Walk, model: ClassModel, body: TS.Node, via: string | undefined): void {
  const ts = model.source.ts;
  const visit = (node: TS.Node): void => {
    if (node !== body && isFunctionLike(ts, node) && !runsInCaller(ts, node)) return;
    if (ts.isCallExpression(node)) visitCall(walk, model, node, via);
    ts.forEachChild(node, visit);
  };
  visit(body);
}

/** The requests a component starts from its opening hooks, in source order. */
export function startupRequests(
  model: ClassModel,
  models: Map<string, ClassModel[]>,
  rel: Relative
): StartupRequest[] {
  const walk: Walk = { models, rel, found: [], active: new Set() };
  for (const hook of OPENING_HOOKS) {
    const body = model.methods.get(hook);
    if (body) follow(walk, `${model.name}.${hook}`, () => visitBody(walk, model, body, undefined));
  }
  return walk.found;
}

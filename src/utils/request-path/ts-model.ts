/**
 * TypeScript / JavaScript → the request-path model (see model.ts).
 *
 * Read with the compiler's own parser (`loadTypeScript`, the project's
 * `typescript`), so a statement, an `await`, a loop and a binding are what
 * the language says they are. Per function: its statement lists, the
 * outermost awaits of each simple statement, the names each statement binds
 * (declarations, destructuring, assignment targets) and reads, the awaited
 * calls that run once per iteration of a loop in the same function (`for`,
 * `for…of`, `for await`, `for…in`, `while`, `do`, and the callback of
 * `.forEach`), and every call. A nested function is a function of its own.
 */

import type * as TS from 'typescript';
import type {
  AwaitSite,
  CallArgument,
  CallSite,
  ChainLink,
  FunctionModel,
  ImportBinding,
  LoopAwait,
  ModuleModel,
  StatementModel,
} from './model';
import { chainPrefixes, collapse } from './expr-text';
import { TsxSource, type TypeScriptModule } from '../react/tsx-source';

/** A call whose callback runs inside a database transaction. */
const TRANSACTION_CALL = /^(?:runTransaction|\$transaction|transaction|withTransaction)$/;
const TRANSACTION_PARAM = /^(?:transaction|txn|tx)$/;
const FRESH_MUTABLE_CTOR = /^(?:Map|Set|Array|Object|WeakMap|WeakSet)$/;

interface Loop {
  line: number;
  kind: string;
  fixedCount?: boolean;
}

class TsModelBuilder {
  constructor(
    private readonly ts: TypeScriptModule,
    private readonly src: TsxSource
  ) {}

  private get sf(): TS.SourceFile {
    return this.src.sourceFile;
  }

  line(node: TS.Node): number {
    return this.src.lineOf(node);
  }

  endLine(node: TS.Node): number {
    return this.sf.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  }

  /** Normalised source text: whitespace collapsed, `?.` → `.`, `!` dropped, simple quotes → double. */
  norm(node: TS.Node): string {
    const text = node
      .getText(this.sf)
      .replace(/\?\./g, '.')
      .replace(/!(?=[.()[\]])/g, '')
      .replace(/'((?:\\.|[^'\\"])*)'/g, '"$1"');
    return collapse(text);
  }

  unwrap(node: TS.Expression): TS.Expression {
    const ts = this.ts;
    let current = node;
    while (
      ts.isParenthesizedExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isSatisfiesExpression(current)
    ) {
      current = current.expression;
    }
    return current;
  }

  isFunctionLike(node: TS.Node): node is TS.FunctionLikeDeclaration {
    const ts = this.ts;
    return (
      ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    );
  }

  argument(node: TS.Expression): CallArgument {
    const ts = this.ts;
    const literal = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : null;
    return { text: this.norm(node), literal, keyword: null };
  }

  chain(node: TS.Expression): ChainLink[] {
    const ts = this.ts;
    const expr = this.unwrap(node);
    if (ts.isPropertyAccessExpression(expr)) {
      return [...this.chain(expr.expression), { name: expr.name.text, args: null }];
    }
    if (ts.isCallExpression(expr)) {
      const links = this.chain(expr.expression);
      const last = links[links.length - 1];
      if (last) last.args = expr.arguments.map(arg => this.argument(arg));
      return links;
    }
    if (ts.isElementAccessExpression(expr)) {
      const key = expr.argumentExpression;
      const name = ts.isStringLiteral(key) ? key.text : this.norm(key);
      return [...this.chain(expr.expression), { name, args: null }];
    }
    return [{ name: this.norm(expr), args: null }];
  }

  call(node: TS.CallExpression): CallSite {
    const ts = this.ts;
    const callee = this.unwrap(node.expression);
    const chain = this.chain(callee);
    const receiver = ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee) ? callee.expression : null;
    const names = new Set<string>();
    if (receiver) this.namesIn(receiver).forEach(name => names.add(name));
    node.arguments.forEach(arg => this.namesIn(arg).forEach(name => names.add(name)));
    return {
      line: this.line(node),
      callee: this.norm(callee),
      method: chain[chain.length - 1]?.name ?? '',
      receiver: receiver ? this.norm(receiver) : '',
      args: node.arguments.map(arg => this.argument(arg)),
      chain,
      text: this.norm(node),
      names: [...names],
    };
  }

  /** `a.b.c` when the expression is a pure name chain (identifiers / this), else null. */
  pureChain(node: TS.Expression): string | null {
    const ts = this.ts;
    if (ts.isIdentifier(node)) return node.text;
    if (node.kind === ts.SyntaxKind.ThisKeyword) return 'this';
    if (ts.isPropertyAccessExpression(node)) {
      const base = this.pureChain(node.expression);
      return base === null ? null : `${base}.${node.name.text}`;
    }
    return null;
  }

  /** Names (roots and dotted chains) an expression reads. */
  namesIn(node: TS.Node): string[] {
    const ts = this.ts;
    const names = new Set<string>();
    const visit = (n: TS.Node): void => {
      if (ts.isTypeNode(n)) return;
      if (ts.isPropertyAccessExpression(n)) {
        const chain = this.pureChain(n);
        if (chain) {
          chainPrefixes(chain).forEach(name => names.add(name));
          return;
        }
        visit(n.expression);
        return;
      }
      if (ts.isPropertyAssignment(n)) {
        if (ts.isComputedPropertyName(n.name)) visit(n.name);
        visit(n.initializer);
        return;
      }
      if (ts.isIdentifier(n)) {
        names.add(n.text);
        return;
      }
      if (n.kind === ts.SyntaxKind.ThisKeyword) names.add('this');
      ts.forEachChild(n, visit);
    };
    visit(node);
    return [...names];
  }

  bindingNames(name: TS.BindingName): string[] {
    const ts = this.ts;
    if (ts.isIdentifier(name)) return [name.text];
    return name.elements.flatMap(element =>
      ts.isOmittedExpression(element) ? [] : this.bindingNames(element.name)
    );
  }

  /** Names an assignment target binds. */
  targetNames(node: TS.Expression): string[] {
    const ts = this.ts;
    const expr = this.unwrap(node);
    const chain = this.pureChain(expr);
    if (chain) return [chain];
    if (ts.isElementAccessExpression(expr)) return this.targetNames(expr.expression);
    if (ts.isArrayLiteralExpression(expr)) return expr.elements.flatMap(e => this.targetNames(ts.isSpreadElement(e) ? e.expression : e));
    if (ts.isObjectLiteralExpression(expr)) {
      return expr.properties.flatMap(p => {
        if (ts.isShorthandPropertyAssignment(p)) return [p.name.text];
        if (ts.isPropertyAssignment(p)) return this.targetNames(p.initializer);
        if (ts.isSpreadAssignment(p)) return this.targetNames(p.expression);
        return [];
      });
    }
    if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      return this.targetNames(expr.left);
    }
    return [];
  }

  isAssignment(node: TS.Expression): node is TS.BinaryExpression {
    const ts = this.ts;
    return (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    );
  }

  isFreshMutable(node: TS.Expression | undefined): boolean {
    const ts = this.ts;
    if (!node) return false;
    const expr = this.unwrap(node);
    if (ts.isArrayLiteralExpression(expr) || ts.isObjectLiteralExpression(expr)) return true;
    return ts.isNewExpression(expr) && ts.isIdentifier(expr.expression) && FRESH_MUTABLE_CTOR.test(expr.expression.text);
  }

  defUse(statement: TS.Statement): { bound: string[]; used: string[]; mutable: string[] } {
    const ts = this.ts;
    if (ts.isVariableStatement(statement)) {
      const decls = statement.declarationList.declarations;
      const bound = decls.flatMap(d => this.bindingNames(d.name));
      const used = decls.flatMap(d => (d.initializer ? this.namesIn(d.initializer) : []));
      const mutable = decls.filter(d => this.isFreshMutable(d.initializer)).flatMap(d => this.bindingNames(d.name));
      return { bound, used, mutable };
    }
    if (ts.isExpressionStatement(statement)) {
      const expr = this.unwrap(statement.expression);
      if (this.isAssignment(expr)) {
        const bound = this.targetNames(expr.left);
        const compound = expr.operatorToken.kind !== ts.SyntaxKind.EqualsToken;
        const used = [...this.namesIn(expr.right), ...(compound ? bound : [])];
        return { bound, used, mutable: this.isFreshMutable(expr.right) ? bound : [] };
      }
    }
    return { bound: [], used: this.namesIn(statement), mutable: [] };
  }

  awaitSite(node: TS.AwaitExpression): AwaitSite {
    const ts = this.ts;
    const operand = this.unwrap(node.expression);
    let nested = false;
    const find = (n: TS.Node): void => {
      if (this.isFunctionLike(n)) return;
      if (ts.isAwaitExpression(n)) nested = true;
      else ts.forEachChild(n, find);
    };
    ts.forEachChild(node.expression, find);
    return {
      line: this.line(node),
      call: ts.isCallExpression(operand) ? this.call(operand) : null,
      nested,
      asyncIteration: false,
    };
  }

  /** Outermost awaits under a node (not inside nested functions or nested awaits). */
  outermostAwaits(node: TS.Node): AwaitSite[] {
    const ts = this.ts;
    const sites: AwaitSite[] = [];
    const visit = (n: TS.Node): void => {
      if (this.isFunctionLike(n)) return;
      if (ts.isAwaitExpression(n)) {
        sites.push(this.awaitSite(n));
        return;
      }
      ts.forEachChild(n, visit);
    };
    visit(node);
    return sites;
  }

  isSimple(statement: TS.Statement): boolean {
    const ts = this.ts;
    return ts.isExpressionStatement(statement) || ts.isVariableStatement(statement) || ts.isReturnStatement(statement);
  }

  statement(statement: TS.Statement): StatementModel {
    const simple = this.isSimple(statement);
    const { bound, used, mutable } = simple ? this.defUse(statement) : { bound: [], used: [], mutable: [] };
    return {
      line: this.line(statement),
      endLine: this.endLine(statement),
      simple,
      awaits: simple ? this.outermostAwaits(statement) : [],
      bound: bound.flatMap(name => (name.includes('.') ? [name] : chainPrefixes(name))),
      used,
      mutableBindings: mutable,
      text: this.norm(statement).slice(0, 2000),
    };
  }

  functionName(node: TS.FunctionLikeDeclaration): { name: string; shortName: string } {
    const ts = this.ts;
    const own = node.name && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) ? node.name.text : null;
    const parent = node.parent;
    let short = own;
    if (!short && parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) short = parent.name.text;
    if (!short && parent && (ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent)) && ts.isIdentifier(parent.name)) {
      short = parent.name.text;
    }
    if (!short && ts.isConstructorDeclaration(node)) short = 'constructor';
    const shortName = short ?? `<anonymous@${this.line(node)}>`;
    const owner = this.ownerClass(node);
    return { name: owner ? `${owner}.${shortName}` : shortName, shortName };
  }

  ownerClass(node: TS.Node): string | null {
    const ts = this.ts;
    const parent = ts.isPropertyDeclaration(node.parent) ? node.parent.parent : node.parent;
    if (parent && (ts.isClassDeclaration(parent) || ts.isClassExpression(parent))) return parent.name?.text ?? null;
    return null;
  }

  /** The call a function is passed to as a callback, and the method that call makes. */
  callbackOf(node: TS.FunctionLikeDeclaration): { call: TS.CallExpression; method: string } | null {
    const ts = this.ts;
    const parent = node.parent;
    if (!parent || !ts.isCallExpression(parent) || !parent.arguments.includes(node as TS.Expression)) return null;
    const callee = this.unwrap(parent.expression);
    let method = '';
    if (ts.isPropertyAccessExpression(callee)) method = callee.name.text;
    else if (ts.isIdentifier(callee)) method = callee.text;
    return { call: parent, method };
  }

  isAsync(node: TS.FunctionLikeDeclaration): boolean {
    const ts = this.ts;
    return (ts.getCombinedModifierFlags(node as TS.Declaration) & ts.ModifierFlags.Async) !== 0;
  }

  newFunction(node: TS.FunctionLikeDeclaration): FunctionModel {
    const { name, shortName } = this.functionName(node);
    const params = node.parameters.flatMap(p => this.bindingNames(p.name));
    const callback = this.callbackOf(node);
    return {
      name,
      shortName,
      line: this.line(node),
      endLine: this.endLine(node),
      isAsync: this.isAsync(node),
      params,
      blocks: [],
      loopAwaits: [],
      calls: [],
      nameUses: new Map(),
      transactional:
        params.some(p => TRANSACTION_PARAM.test(p)) || (callback !== null && TRANSACTION_CALL.test(callback.method)),
    };
  }

  loopOf(node: TS.Node): Loop | null {
    const ts = this.ts;
    const line = this.line(node);
    if (ts.isForOfStatement(node)) {
      const fixedCount = ts.isArrayLiteralExpression(this.unwrap(node.expression)) && !node.awaitModifier;
      return { line, kind: node.awaitModifier ? 'for await' : 'for-of', fixedCount };
    }
    if (ts.isForInStatement(node)) return { line, kind: 'for-in' };
    if (ts.isForStatement(node)) return { line, kind: 'for', fixedCount: this.literalBound(node) };
    if (ts.isWhileStatement(node)) return { line, kind: 'while' };
    if (ts.isDoStatement(node)) return { line, kind: 'do' };
    return null;
  }

  /** `for (let i = 0; i < 3; i++)`: the bound is a number literal. */
  literalBound(node: TS.ForStatement): boolean {
    const ts = this.ts;
    const condition = node.condition ? this.unwrap(node.condition) : null;
    return condition !== null && ts.isBinaryExpression(condition) && ts.isNumericLiteral(this.unwrap(condition.right));
  }

  /** The part of a loop evaluated once, before the first iteration. */
  onceParts(node: TS.Node): TS.Node[] {
    const ts = this.ts;
    if (ts.isForOfStatement(node) || ts.isForInStatement(node)) return [node.initializer, node.expression];
    if (ts.isForStatement(node) && node.initializer) return [node.initializer];
    return [];
  }

  /** Record one function's body. */
  fill(fn: FunctionModel, node: TS.FunctionLikeDeclaration): void {
    const ts = this.ts;
    const body = node.body;
    if (!body) return;
    const callback = this.callbackOf(node);
    const forEachLoop = callback && callback.method === 'forEach' ? { line: this.line(callback.call), kind: 'forEach' } : null;
    const loops: Loop[] = forEachLoop ? [forEachLoop] : [];
    if (!ts.isBlock(body)) {
      fn.blocks.push([this.syntheticReturn(body)]);
    }
    this.visit(fn, body, loops);
    this.countNames(fn, body);
  }

  syntheticReturn(body: TS.Expression): StatementModel {
    return {
      line: this.line(body),
      endLine: this.endLine(body),
      simple: true,
      awaits: this.outermostAwaits(body),
      bound: [],
      used: this.namesIn(body),
      mutableBindings: [],
      text: this.norm(body).slice(0, 2000),
    };
  }

  recordBlock(fn: FunctionModel, statements: readonly TS.Statement[]): void {
    fn.blocks.push(statements.map(s => this.statement(s)));
  }

  /** Is this identifier a declared or property name rather than a read? */
  isDeclarationName(node: TS.Identifier): boolean {
    const ts = this.ts;
    const parent = node.parent;
    if (!parent) return false;
    if (ts.isPropertyAccessExpression(parent)) return parent.name === node;
    const named =
      ts.isVariableDeclaration(parent) ||
      ts.isBindingElement(parent) ||
      ts.isParameter(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isFunctionDeclaration(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isClassDeclaration(parent);
    return named && (parent as { name?: TS.Node }).name === node;
  }

  /** How many times each name is read in the body (closures included: they read it too). */
  countNames(fn: FunctionModel, body: TS.Node): void {
    const ts = this.ts;
    const visit = (n: TS.Node): void => {
      if (ts.isTypeNode(n)) return;
      if (ts.isIdentifier(n) && !this.isDeclarationName(n)) {
        fn.nameUses.set(n.text, (fn.nameUses.get(n.text) ?? 0) + 1);
      }
      ts.forEachChild(n, visit);
    };
    visit(body);
  }

  visit(fn: FunctionModel, node: TS.Node, loops: Loop[]): void {
    const ts = this.ts;
    if (this.isFunctionLike(node)) return;
    if (ts.isBlock(node) || ts.isCaseClause(node) || ts.isDefaultClause(node)) this.recordBlock(fn, node.statements);
    if (ts.isAwaitExpression(node)) this.recordLoopAwait(fn, loops, this.awaitSite(node));
    if (ts.isCallExpression(node)) fn.calls.push(this.call(node));
    const loop = this.loopOf(node);
    if (!loop) {
      ts.forEachChild(node, child => this.visit(fn, child, loops));
      return;
    }
    if (ts.isForOfStatement(node) && node.awaitModifier) this.recordForAwait(fn, loops, node);
    const once = this.onceParts(node);
    ts.forEachChild(node, child => this.visit(fn, child, once.includes(child) ? loops : [...loops, loop]));
  }

  recordLoopAwait(fn: FunctionModel, loops: readonly Loop[], site: AwaitSite): void {
    const loop = loops[loops.length - 1];
    if (loop) {
      fn.loopAwaits.push({ loopLine: loop.line, loopKind: loop.kind, fixedCount: loop.fixedCount === true, site } satisfies LoopAwait);
    }
  }

  /** `for await (… of stream)`: each step is a round trip, in the enclosing loop. */
  recordForAwait(fn: FunctionModel, loops: readonly Loop[], node: TS.ForOfStatement): void {
    const ts = this.ts;
    const iterable = this.unwrap(node.expression);
    this.recordLoopAwait(fn, loops, {
      line: this.line(node),
      call: ts.isCallExpression(iterable) ? this.call(iterable) : null,
      nested: false,
      asyncIteration: true,
    });
  }

  functions(): FunctionModel[] {
    const out: FunctionModel[] = [];
    this.src.walk(node => {
      if (!this.isFunctionLike(node) || !node.body) return;
      const fn = this.newFunction(node);
      this.fill(fn, node);
      out.push(fn);
    });
    return out;
  }

  imports(): ImportBinding[] {
    return this.src.imports().flatMap(info => [
      ...(info.defaultName ? [{ local: info.defaultName, module: info.module, imported: 'default' }] : []),
      ...(info.namespaceName ? [{ local: info.namespaceName, module: info.module, imported: null }] : []),
      ...info.named.map(n => ({ local: n.local, module: info.module, imported: n.imported })),
    ]);
  }
}

/** Parse a TS/JS module into the request-path model. */
export function typescriptModule(ts: TypeScriptModule, file: string, rel: string, content: string): ModuleModel {
  const src = TsxSource.parse(ts, file, content);
  const builder = new TsModelBuilder(ts, src);
  return {
    file,
    rel,
    language: 'typescript',
    functions: builder.functions(),
    imports: builder.imports(),
    lines: content.split(/\r\n|\r|\n/),
  };
}

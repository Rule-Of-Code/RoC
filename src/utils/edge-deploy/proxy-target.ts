/**
 * Where a proxy sends what it forwards.
 *
 * `new URL(input, base)` resolves `input` as a reference against `base`. A
 * scheme-relative reference (`//other.example/x`, and `/\other.example/x`,
 * which the URL standard reads the same for http/https) replaces the host,
 * so a proxy that builds its upstream URL from the incoming path forwards
 * the request — and every header it adds, a shared origin secret included —
 * to whatever host the path names. Python's `urljoin(base, url)` does the
 * same with a `//` url.
 *
 * Judged (JS/TS, parsed with the project's own TypeScript): every
 * `new URL(a, b)` with a second argument. `a` a literal: safe. `a` derived
 * from an incoming request — a parameter named or typed as one, the first
 * parameter of a `fetch` handler or of a callback given to `serve(...)` or
 * `addEventListener('fetch', …)`, followed through local variables and
 * destructuring — and the URL reaching an HTTP call (fetch, new Request,
 * axios, got, ky, undici, http(s).request/get) directly or through a local
 * variable: a finding. Python: the same for `urljoin(base, url)`.
 */

import type * as TS from 'typescript';
import type { TsxSource } from '../react/tsx-source';

/** Characters of a call or a command quoted in a finding. */
export const QUOTE_LENGTH = 80;

/** One two-argument `new URL` / `urljoin` call and what was concluded. */
export interface UpstreamCall {
  line: number;
  /** The first argument (JS) / the joined url (Python), as written. */
  input: string;
  verdict: 'constant' | 'not-forwarded' | 'not-request' | 'escapes';
}

const REQUEST_NAME =
  /^(?:req|request|incoming|incomingRequest|inbound|event|evt|c|ctx|context)$/;
const REQUEST_TYPE =
  /\b(?:Request|NextRequest|IncomingMessage|FastifyRequest|HonoRequest|FetchEvent|Context)\b/;
const SINK_NAMES = new Set(['fetch', 'axios', 'got', 'ky']);
const SINK_OBJECTS = /^(?:axios|got|ky|undici|https?|globalThis|self|window)$/;
const SINK_METHODS = new Set([
  'fetch',
  'request',
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'stream',
]);
const MAX_HOPS = 6;

type Declaration = {
  name: string;
  node: TS.Node;
  container: TS.Node;
  init?: TS.Expression | undefined;
  param?: TS.ParameterDeclaration | undefined;
};

/** The analysis of one parsed file. */
export class UpstreamUrlScan {
  private readonly ts: typeof TS;
  private readonly declarations = new Map<string, Declaration[]>();

  constructor(private readonly source: TsxSource) {
    this.ts = source.ts;
    source.walk(node => this.collect(node));
  }

  /** Every two-argument `new URL` in the file, with its verdict. */
  calls(): UpstreamCall[] {
    const calls: UpstreamCall[] = [];
    this.source.walk(node => {
      if (!this.ts.isNewExpression(node) || !this.isUrlConstructor(node))
        return;
      const [input] = node.arguments ?? [];
      if (!input) return;
      calls.push({
        line: this.source.lineOf(node),
        input: this.text(input),
        verdict: this.verdict(node, input),
      });
    });
    return calls;
  }

  private verdict(
    call: TS.NewExpression,
    input: TS.Expression
  ): UpstreamCall['verdict'] {
    if (
      this.ts.isStringLiteral(input) ||
      this.ts.isNoSubstitutionTemplateLiteral(input)
    )
      return 'constant';
    if (!this.reachesSink(call)) return 'not-forwarded';
    return this.fromRequest(input, 0, new Set()) ? 'escapes' : 'not-request';
  }

  private isUrlConstructor(node: TS.NewExpression): boolean {
    return (
      this.ts.isIdentifier(node.expression) &&
      node.expression.text === 'URL' &&
      (node.arguments?.length ?? 0) >= 2
    );
  }

  private text(node: TS.Node): string {
    return node
      .getText(this.source.sourceFile)
      .replace(/\s+/g, ' ')
      .slice(0, QUOTE_LENGTH);
  }

  // ── declarations ──────────────────────────────────────────────────────

  private collect(node: TS.Node): void {
    const ts = this.ts;
    if (ts.isVariableDeclaration(node))
      this.bind(node.name, node, node.initializer, undefined);
    else if (ts.isParameter(node)) this.bind(node.name, node, undefined, node);
  }

  /** Record every name a binding introduces, with the expression it comes from. */
  private bind(
    name: TS.BindingName,
    node: TS.Node,
    init: TS.Expression | undefined,
    param: TS.ParameterDeclaration | undefined
  ): void {
    const ts = this.ts;
    if (ts.isIdentifier(name)) {
      const list = this.declarations.get(name.text) ?? [];
      list.push({
        name: name.text,
        node,
        container: this.container(node),
        init,
        param,
      });
      this.declarations.set(name.text, list);
      return;
    }
    for (const element of name.elements) {
      if (ts.isBindingElement(element))
        this.bind(element.name, node, init, param);
    }
  }

  /** The function (or file) a declaration is scoped to. */
  private container(node: TS.Node): TS.Node {
    const ts = this.ts;
    let current: TS.Node | undefined = node.parent;
    if (ts.isParameter(node)) return node.parent;
    while (current && !ts.isFunctionLike(current) && !ts.isSourceFile(current))
      current = current.parent;
    return current ?? node.getSourceFile();
  }

  /** The declaration a use of `name` refers to: the innermost one whose scope holds the use. */
  private resolve(name: string, use: TS.Node): Declaration | undefined {
    const holds = (d: Declaration): boolean =>
      d.container.pos <= use.pos &&
      use.end <= d.container.end &&
      d.node !== use.parent;
    return (this.declarations.get(name) ?? [])
      .filter(holds)
      .sort(
        (a, b) =>
          a.container.end -
          a.container.pos -
          (b.container.end - b.container.pos)
      )[0];
  }

  // ── taint ─────────────────────────────────────────────────────────────

  /** Does the expression read the incoming request (directly or through locals)? */
  private fromRequest(
    node: TS.Node,
    hops: number,
    seen: Set<TS.Node>
  ): boolean {
    const ts = this.ts;
    if (hops > MAX_HOPS || seen.has(node)) return false;
    seen.add(node);
    if (ts.isIdentifier(node))
      return this.identifierFromRequest(node, hops, seen);
    if (ts.isPropertyAccessExpression(node))
      return this.fromRequest(node.expression, hops, seen);
    let found = false;
    ts.forEachChild(node, child => {
      found = found || this.fromRequest(child, hops, seen);
    });
    return found;
  }

  private identifierFromRequest(
    node: TS.Identifier,
    hops: number,
    seen: Set<TS.Node>
  ): boolean {
    const declaration = this.resolve(node.text, node);
    if (!declaration) return false;
    if (declaration.param) return this.isRequestParameter(declaration.param);
    return declaration.init
      ? this.fromRequest(declaration.init, hops + 1, seen)
      : false;
  }

  /** A parameter that receives the incoming request. */
  private isRequestParameter(param: TS.ParameterDeclaration): boolean {
    const ts = this.ts;
    if (ts.isIdentifier(param.name) && REQUEST_NAME.test(param.name.text))
      return true;
    if (
      param.type &&
      REQUEST_TYPE.test(param.type.getText(this.source.sourceFile))
    )
      return true;
    const fn = param.parent;
    return fn.parameters[0] === param && this.isRequestHandler(fn);
  }

  /** A `fetch` handler, or a callback given to `serve(...)` / `addEventListener('fetch', …)`. */
  private isRequestHandler(fn: TS.SignatureDeclaration): boolean {
    const ts = this.ts;
    const named = (fn as { name?: TS.Node }).name;
    if (named && ts.isIdentifier(named) && named.text === 'fetch') return true;
    const parent = fn.parent;
    if (
      ts.isPropertyAssignment(parent) &&
      ts.isIdentifier(parent.name) &&
      parent.name.text === 'fetch'
    )
      return true;
    if (!ts.isCallExpression(parent)) return false;
    const callee = parent.expression.getText(this.source.sourceFile);
    if (/(?:^|\.)serve$/.test(callee)) return true;
    const [first] = parent.arguments;
    return (
      /(?:^|\.)addEventListener$/.test(callee) &&
      !!first &&
      ts.isStringLiteral(first) &&
      first.text === 'fetch'
    );
  }

  // ── sink ──────────────────────────────────────────────────────────────

  /** Does the URL reach an HTTP call, as an argument or through a local variable? */
  private reachesSink(call: TS.NewExpression): boolean {
    const ts = this.ts;
    let node: TS.Node = call;
    while (this.carriesUrl(node.parent, node)) node = node.parent;
    const parent = node.parent;
    if (
      (ts.isCallExpression(parent) || ts.isNewExpression(parent)) &&
      this.isSink(parent) &&
      parent.arguments?.includes(node as TS.Expression)
    )
      return true;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name))
      return this.variableReachesSink(parent.name.text, parent);
    if (
      ts.isBinaryExpression(parent) &&
      parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(parent.left)
    ) {
      return this.variableReachesSink(parent.left.text, parent);
    }
    return false;
  }

  /** Wrappers the URL passes through unchanged: parentheses, casts, .href / .toString(), a template. */
  private carriesUrl(parent: TS.Node, child: TS.Node): boolean {
    const ts = this.ts;
    if (
      ts.isParenthesizedExpression(parent) ||
      ts.isAsExpression(parent) ||
      ts.isNonNullExpression(parent)
    )
      return true;
    if (ts.isTemplateSpan(parent) || ts.isTemplateExpression(parent))
      return true;
    if (ts.isPropertyAccessExpression(parent) && parent.expression === child)
      return ['href', 'toString'].includes(parent.name.text);
    return (
      ts.isCallExpression(parent) &&
      parent.expression === child &&
      ts.isPropertyAccessExpression(child) &&
      child.name.text === 'toString'
    );
  }

  private variableReachesSink(name: string, declaration: TS.Node): boolean {
    const ts = this.ts;
    const scope = this.container(declaration);
    let reached = false;
    const visit = (node: TS.Node): void => {
      if (reached) return;
      if (
        (ts.isCallExpression(node) || ts.isNewExpression(node)) &&
        node.pos > declaration.end &&
        this.isSink(node)
      ) {
        reached = (node.arguments ?? []).some(arg => this.mentions(arg, name));
      }
      ts.forEachChild(node, visit);
    };
    visit(scope);
    return reached;
  }

  private mentions(node: TS.Node, name: string): boolean {
    const ts = this.ts;
    if (ts.isIdentifier(node)) return node.text === name;
    if (ts.isPropertyAccessExpression(node))
      return this.mentions(node.expression, name);
    let found = false;
    ts.forEachChild(node, child => {
      found = found || this.mentions(child, name);
    });
    return found;
  }

  private isSink(node: TS.CallExpression | TS.NewExpression): boolean {
    const ts = this.ts;
    const callee = node.expression;
    if (ts.isNewExpression(node))
      return ts.isIdentifier(callee) && callee.text === 'Request';
    if (ts.isIdentifier(callee)) return SINK_NAMES.has(callee.text);
    if (!ts.isPropertyAccessExpression(callee)) return false;
    if (callee.name.text === 'fetch') return true;
    return (
      ts.isIdentifier(callee.expression) &&
      SINK_OBJECTS.test(callee.expression.text) &&
      SINK_METHODS.has(callee.name.text)
    );
  }
}

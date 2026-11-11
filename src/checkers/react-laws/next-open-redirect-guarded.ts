/**
 * Next Open Redirect Guarded
 *
 * `redirect(next)` with `next` taken from the query string or the request body
 * sends the visitor wherever a crafted link says: the login page that bounces
 * to the attacker's look-alike after a real sign-in. The law reads every
 * redirect on the syntax tree — `redirect` / `permanentRedirect` imported from
 * `next/navigation`, `NextResponse.redirect` from `next/server`, the global
 * `Response.redirect` — and flags one whose target is taken, in the same
 * function, from:
 *
 * - `searchParams` (the page prop, `request.nextUrl.searchParams`,
 *   `url.searchParams`) or `useSearchParams()`;
 * - the request body: `.json()`, `.formData()`, `.text()` on a parameter that
 *   is the request (typed Request / NextRequest, or named request / req);
 * - a `FormData` parameter (a Server Action's form);
 * - a local variable initialised from any of these, followed through
 *   declarations in the same function.
 *
 * A target is accepted when it passes through a guard named in
 * thresholds.react.redirectGuards, or when its static start is a same-site
 * path (`/login?next=…` — a `/` followed by something other than `/` or `\`).
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';
import { calleeText, literalText, nameList, parseFilesMentioning, unwrap } from './react-security-support';

const BODY_READERS = new Set(['json', 'formData', 'text']);
const REQUEST_TYPES = new Set(['Request', 'NextRequest']);
const REQUEST_NAMES = new Set(['request', 'req']);
const SAME_SITE_PATH = /^\/[^/\\]/;

/** What makes an expression come from the request, inside one function. */
interface Taint {
  requests: Set<string>;
  formData: Set<string>;
  locals: Set<string>;
  guards: Set<string>;
}

export class NextOpenRedirectGuardedLaw extends LawBase {
  static readonly LAW_NAME = 'Next Open Redirect Guarded';

  static check(context: LawCheckContext): LawResult {
    const guards = new Set(nameList(context.config.thresholds?.react?.redirectGuards));
    const { sources, unread } = parseFilesMentioning(context, ['redirect', 'Redirect']);
    const violations = [...unread];
    for (const source of sources) {
      const rel = ReactProject.relative(context, source.fileName);
      for (const call of this.redirectCalls(source)) {
        const target = call.arguments[0];
        if (!target || !this.fromRequest(source, target, this.taintOf(source, call, guards))) continue;
        violations.push(
          `${rel}:${source.lineOf(call)}: ${calleeText(call, source.sourceFile)}(${this.text(source, target)}) sends the visitor to a target taken from the request (searchParams / the body) with no guard — a crafted link lands them on any site. Allow only same-site paths, through a guard named in thresholds.react.redirectGuards`
        );
      }
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        "Redirect to a same-site path only: check the target starts with '/' and not '//' or '/\\'",
        'Put that check in one guard and name it in thresholds.react.redirectGuards',
      ],
      context
    );
  }

  /** Calls that redirect, resolved through the file's imports. */
  private static redirectCalls(source: TsxSource): TS.CallExpression[] {
    const ts = source.ts;
    const navigation = new Set<string>();
    const responses = new Set<string>(['Response']);
    for (const info of source.imports()) {
      if (info.typeOnly) continue;
      for (const { imported, local } of info.named) {
        if (info.module === 'next/navigation' && (imported === 'redirect' || imported === 'permanentRedirect')) navigation.add(local);
        if (info.module === 'next/server' && imported === 'NextResponse') responses.add(local);
      }
    }
    const calls: TS.CallExpression[] = [];
    source.walk(node => {
      if (!ts.isCallExpression(node)) return;
      const callee = node.expression;
      if (ts.isIdentifier(callee) && navigation.has(callee.text)) calls.push(node);
      else if (
        ts.isPropertyAccessExpression(callee) &&
        callee.name.text === 'redirect' &&
        ts.isIdentifier(callee.expression) &&
        responses.has(callee.expression.text)
      ) {
        calls.push(node);
      }
    });
    return calls;
  }

  /** The taint sources of the function a call sits in (and of the functions around it). */
  private static taintOf(source: TsxSource, call: TS.CallExpression, guards: Set<string>): Taint {
    const ts = source.ts;
    const taint: Taint = { requests: new Set(), formData: new Set(), locals: new Set(), guards };
    let fn: TS.Node | undefined = call.parent;
    let innermost: TS.Node | undefined;
    while (fn) {
      if (ts.isFunctionLike(fn)) {
        innermost ??= fn;
        for (const param of fn.parameters) this.addParameter(source, param, taint);
      }
      fn = fn.parent;
    }
    this.addLocals(source, innermost ?? source.sourceFile, taint);
    return taint;
  }

  private static addParameter(source: TsxSource, param: TS.ParameterDeclaration, taint: Taint): void {
    const ts = source.ts;
    if (!ts.isIdentifier(param.name)) return;
    const name = param.name.text;
    const type = param.type && ts.isTypeReferenceNode(param.type) ? param.type.typeName.getText(source.sourceFile) : '';
    if (type === 'FormData') taint.formData.add(name);
    else if (REQUEST_TYPES.has(type) || (!param.type && REQUEST_NAMES.has(name))) taint.requests.add(name);
  }

  /** Locals initialised from the request, to a fixpoint, in this function only. */
  private static addLocals(source: TsxSource, fn: TS.Node, taint: Taint): void {
    const ts = source.ts;
    const declarations: TS.VariableDeclaration[] = [];
    const collect = (node: TS.Node): void => {
      if (node !== fn && ts.isFunctionLike(node)) return;
      if (ts.isVariableDeclaration(node) && node.initializer) declarations.push(node);
      ts.forEachChild(node, collect);
    };
    collect(fn);
    let grew = true;
    while (grew) {
      grew = false;
      for (const declaration of declarations) {
        if (!this.fromRequest(source, declaration.initializer as TS.Expression, taint)) continue;
        for (const name of this.boundNames(source, declaration.name)) {
          if (!taint.locals.has(name)) {
            taint.locals.add(name);
            grew = true;
          }
        }
      }
    }
  }

  private static boundNames(source: TsxSource, name: TS.BindingName): string[] {
    const ts = source.ts;
    if (ts.isIdentifier(name)) return [name.text];
    return name.elements.flatMap(element =>
      ts.isBindingElement(element) ? this.boundNames(source, element.name) : []
    );
  }

  /** Whether the expression carries a value from the request, unguarded. */
  private static fromRequest(source: TsxSource, expression: TS.Expression, taint: Taint): boolean {
    const ts = source.ts;
    const e = unwrap(ts, expression);
    if (this.staticallySameSite(source, e)) return false;
    // new URL(target, base): where it lands is decided by the target; the base
    // (request.url) only resolves a relative one against this site.
    const first = ts.isNewExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'URL' ? e.arguments?.[0] : undefined;
    if (first) return this.fromRequest(source, first, taint);
    let found = false;
    const visit = (node: TS.Node): void => {
      if (found || ts.isFunctionLike(node)) return;
      if (ts.isCallExpression(node) && taint.guards.has(calleeText(node, source.sourceFile))) return;
      if (this.isSource(source, node, taint)) {
        found = true;
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(e);
    return found;
  }

  private static isSource(source: TsxSource, node: TS.Node, taint: Taint): boolean {
    const ts = source.ts;
    if (ts.isIdentifier(node)) {
      return node.text === 'searchParams' || taint.formData.has(node.text) || taint.locals.has(node.text);
    }
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'searchParams') return true;
    if (!ts.isCallExpression(node)) return false;
    const callee = node.expression;
    if (ts.isIdentifier(callee)) return callee.text === 'useSearchParams';
    if (!ts.isPropertyAccessExpression(callee) || !BODY_READERS.has(callee.name.text)) return false;
    const receiver = unwrap(ts, callee.expression);
    return node.arguments.length === 0 && ts.isIdentifier(receiver) && taint.requests.has(receiver.text);
  }

  /** A template or + chain (or literal) whose static start is a same-site path. */
  private static staticallySameSite(source: TsxSource, e: TS.Expression): boolean {
    const ts = source.ts;
    const literal = literalText(ts, e);
    if (literal !== null) return true;
    if (ts.isTemplateExpression(e)) return SAME_SITE_PATH.test(e.head.text);
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const head = literalText(ts, unwrap(ts, e.left));
      return head !== null ? SAME_SITE_PATH.test(head) : this.staticallySameSite(source, unwrap(ts, e.left));
    }
    return false;
  }

  private static text(source: TsxSource, node: TS.Node): string {
    const text = node.getText(source.sourceFile).replace(/\s+/g, ' ');
    return text.length > 60 ? `${text.slice(0, 57)}...` : text;
  }
}

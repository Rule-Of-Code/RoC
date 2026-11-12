/**
 * Next Use Client At Leaves
 *
 * `'use client'` marks a boundary: the module and everything it imports
 * become client code, shipped and hydrated in the browser. On a page or a
 * layout it turns the whole route subtree below into client code, data
 * fetching included, and the page can no longer export `metadata`. Next's
 * guidance is to mark only the interactive leaves. A `'use client'` module
 * that uses no hook, no event handler and no browser API needs none of what
 * the directive buys, and pays for all of it.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { NextAppFiles } from '../../utils/react/next-app-files';
import { hasDirective, type NextSources, NextSourcesLoader } from '../../utils/react/next-sources';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

/** Globals that exist only in a browser. */
const BROWSER_GLOBALS = new Set([
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'location',
  'history',
  'matchMedia',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'IntersectionObserver',
  'ResizeObserver',
  'MutationObserver',
  'customElements',
  'getComputedStyle',
  'indexedDB',
  'Notification',
  'alert',
  'confirm',
  'prompt',
]);

/** Attributes whose function value only a client module can hold. */
const FUNCTION_ATTRIBUTES = new Set(['action', 'formAction', 'ref']);
/** Special files Next requires to be Client Components. */
const MUST_BE_CLIENT = new Set(['error', 'global-error']);
const HOOK = /^use[A-Z0-9]/;

export class NextUseClientAtLeavesLaw extends LawBase {
  static readonly LAW_NAME = 'Next Use Client At Leaves';

  static check(context: LawCheckContext): LawResult {
    const sources = NextSourcesLoader.load(context);
    const violations = [...sources.unread];
    if (!NextSourcesLoader.hasRouter(sources)) violations.push(NextAppFiles.noRouterDirectory(context));
    const clientModules = [...sources.parsed.values()].filter(source => hasDirective(source, 'use client'));
    if (violations.length === 0 && clientModules.length === 0) {
      return NextAppFiles.withoutSubject(this.LAW_NAME, "no module declares 'use client' — every component renders on the server", context);
    }
    violations.push(...this.routeModules(context, sources), ...this.unneeded(context, sources, clientModules));
    return this.createResult(
      violations,
      this.LAW_NAME,
      'PERFORMANCE',
      [
        "Keep page and layout files Server Components; move the interactive part into its own 'use client' component and render it from the page",
        "Remove 'use client' from a module that uses no hook, handler or browser API — it renders on the server and ships nothing",
      ],
      context
    );
  }

  private static routeModules(context: LawCheckContext, sources: NextSources): string[] {
    return sources.appFiles
      .filter(appFile => appFile.kind === 'page' || appFile.kind === 'layout')
      .filter(appFile => {
        const source = sources.parsed.get(appFile.file);
        return source !== undefined && hasDirective(source, 'use client');
      })
      .map(
        appFile =>
          `${ReactProject.relative(context, appFile.file)}: '${appFile.kind}' is marked 'use client' — the whole route subtree below it becomes client code. Mark the interactive leaves instead`
      );
  }

  private static unneeded(context: LawCheckContext, sources: NextSources, clientModules: TsxSource[]): string[] {
    const mustBeClient = new Set(
      sources.appFiles.filter(appFile => appFile.kind && MUST_BE_CLIENT.has(appFile.kind)).map(appFile => appFile.file)
    );
    return clientModules
      .filter(source => !mustBeClient.has(source.fileName))
      .filter(source => !this.needsClient(source))
      .map(
        source =>
          `${ReactProject.relative(context, source.fileName)}: 'use client' but no hook, event handler, browser API, class component, context or re-export — the module could render on the server and ship nothing`
      );
  }

  /** True when something in the module can only run in a Client Component. */
  static needsClient(source: TsxSource): boolean {
    const ts = source.ts;
    if (source.sourceFile.statements.some(statement => ts.isExportDeclaration(statement) && statement.moduleSpecifier)) {
      return true;
    }
    let needs = false;
    source.walk(node => {
      if (!needs && this.isClientOnly(ts, source, node)) needs = true;
    });
    return needs;
  }

  private static isClientOnly(ts: TsxSource['ts'], source: TsxSource, node: TS.Node): boolean {
    if (ts.isCallExpression(node)) return this.isHookOrContext(ts, node.expression);
    if (ts.isJsxAttribute(node)) return this.isHandler(ts, source, node);
    if (ts.isIdentifier(node)) return BROWSER_GLOBALS.has(node.text) && this.isReference(ts, node);
    if (ts.isClassLike(node)) {
      return (node.heritageClauses ?? []).some(clause =>
        clause.types.some(type => /\b(?:Pure)?Component$/.test(type.expression.getText(source.sourceFile)))
      );
    }
    return false;
  }

  private static isHookOrContext(ts: TsxSource['ts'], callee: TS.Expression): boolean {
    const name = ts.isIdentifier(callee)
      ? callee.text
      : ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : '';
    return name === 'use' || name === 'createContext' || HOOK.test(name);
  }

  private static isHandler(ts: TsxSource['ts'], source: TsxSource, attribute: TS.JsxAttribute): boolean {
    const name = attribute.name.getText(source.sourceFile);
    if (/^on[A-Z]/.test(name)) return true;
    const initializer = attribute.initializer;
    if (!initializer || !ts.isJsxExpression(initializer) || !initializer.expression) return false;
    const value = initializer.expression;
    if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) return true;
    return FUNCTION_ATTRIBUTES.has(name);
  }

  /** An identifier used as a value, not a property name, declaration name or type. */
  private static isReference(ts: TsxSource['ts'], node: TS.Identifier): boolean {
    const parent = node.parent;
    if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
    if ((ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent) || ts.isMethodDeclaration(parent)) && parent.name === node) {
      return false;
    }
    if (ts.isTypeReferenceNode(parent) || ts.isQualifiedName(parent)) return false;
    return !(ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isBindingElement(parent));
  }
}

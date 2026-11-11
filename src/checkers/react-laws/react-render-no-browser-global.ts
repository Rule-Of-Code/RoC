/**
 * React Render No Browser Global
 *
 * Next renders client components on the server too: a `'use client'` file is
 * pre-rendered to HTML before it is hydrated, and so is every Pages Router
 * page. `window`, `document`, `localStorage` and `sessionStorage` do not exist
 * there, so reading one while rendering throws on the server — or, behind a
 * guard that makes the two renders differ, produces a hydration mismatch. The
 * browser-only read belongs in an effect or an event handler, which run only
 * in the browser. The law reads each component and hook body from the parse
 * and reports a browser global referenced at render scope: not inside a
 * nested function (effects, handlers, callbacks), and not under a
 * `typeof window` guard.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PathOperations } from '../../utils/path-operations';
import {
  isFunctionNode,
  reactHookName,
  readReactSources,
  unwrap,
  walkWithin,
  where,
} from '../../utils/react/react-hooks-ast';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource, TypeScriptModule } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

/** Globals that exist only in a browser. */
const BROWSER_GLOBALS = new Set(['window', 'document', 'localStorage', 'sessionStorage']);

/** Hooks whose function argument runs DURING render: (hook → argument index). */
const RENDER_TIME_CALLBACKS: Readonly<Record<string, number>> = {
  useState: 0,
  useMemo: 0,
  useReducer: 2,
};

type ComponentFunction = TS.ArrowFunction | TS.FunctionDeclaration | TS.FunctionExpression;

/** A component (`Page`, `UserCard`) or a hook (`useWidth`) — both run during render. */
const RENDERS = /^(?:[A-Z]|use[A-Z])/;

export class ReactRenderNoBrowserGlobalLaw extends LawBase {
  static readonly LAW_NAME = 'React Render No Browser Global';

  static check(context: LawCheckContext): LawResult {
    const { sources, violations } = readReactSources(context, this.LAW_NAME);
    const pagesDirs = ReactProject.nextApps(context.projectRoot).flatMap(app => app.pagesDirs);
    for (const source of sources) {
      if (!this.rendersOnServer(source, pagesDirs)) continue;
      const shadowed = this.declaredNames(source);
      const lines = new Set<number>();
      for (const component of this.components(source)) {
        for (const reference of this.renderReferences(source, component, shadowed)) {
          const line = source.lineOf(reference);
          if (lines.has(line)) continue;
          lines.add(line);
          violations.push(
            `${where(context, source, reference)}: \`${reference.text}\` is read while rendering — the server render has no ${reference.text} (it throws, or a guarded read mismatches on hydration). Read it in useEffect or an event handler`
          );
        }
      }
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        'Move the read into useEffect (state set after mount) or into the event handler that needs it',
        'For a value that must render differently in the browser, use useSyncExternalStore with a server snapshot, or next/dynamic with ssr: false',
      ],
      context
    );
  }

  /** A `'use client'` file, or a file under a Pages Router directory (pages/api excluded). */
  private static rendersOnServer(source: TsxSource, pagesDirs: string[]): boolean {
    if (source.directives().includes('use client')) return true;
    return pagesDirs.some(dir => {
      const relative = PathOperations.getRelative(dir, source.fileName);
      if (relative === '' || relative.startsWith('..') || PathOperations.isAbsolute(relative)) {
        return false;
      }
      return !relative.startsWith('api/');
    });
  }

  /** Top-level functions that render: named components and hooks, a default export, memo/forwardRef. */
  private static components(source: TsxSource): ComponentFunction[] {
    return source.sourceFile.statements.flatMap(statement => this.componentsOf(source.ts, statement));
  }

  private static componentsOf(ts: TypeScriptModule, statement: TS.Statement): ComponentFunction[] {
    if (ts.isFunctionDeclaration(statement)) {
      const renders = !statement.name || RENDERS.test(statement.name.text);
      return statement.body && renders ? [statement] : [];
    }
    if (ts.isExportAssignment(statement)) {
      const fn = this.renderFunction(ts, statement.expression);
      return fn ? [fn] : [];
    }
    if (!ts.isVariableStatement(statement)) return [];
    const found: ComponentFunction[] = [];
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !RENDERS.test(declaration.name.text)) continue;
      const fn = declaration.initializer && this.renderFunction(ts, declaration.initializer);
      if (fn) found.push(fn);
    }
    return found;
  }

  /** `() => …`, `function () {}`, or the function wrapped by `memo(…)` / `forwardRef(…)`. */
  private static renderFunction(ts: TypeScriptModule, expression: TS.Expression): ComponentFunction | null {
    const value = unwrap(ts, expression);
    if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) return value;
    if (ts.isCallExpression(value) && value.arguments[0]) {
      return this.renderFunction(ts, value.arguments[0]);
    }
    return null;
  }

  /** Browser-global identifiers evaluated when `component` renders. */
  private static renderReferences(
    source: TsxSource,
    component: ComponentFunction,
    shadowed: Set<string>
  ): TS.Identifier[] {
    const ts = source.ts;
    const found: TS.Identifier[] = [];
    if (!component.body) return found;
    walkWithin(
      ts,
      component.body,
      node => {
        if (!ts.isIdentifier(node) || !BROWSER_GLOBALS.has(node.text) || shadowed.has(node.text)) return;
        if (!this.isValueReference(ts, node) || this.isGuarded(ts, node, component)) return;
        found.push(node);
      },
      node => isFunctionNode(ts, node) && !this.runsDuringRender(source, node)
    );
    return found;
  }

  /** A lazy initializer (`useState(() => …)`, `useMemo(…)`) or an IIFE runs while rendering. */
  private static runsDuringRender(source: TsxSource, fn: TS.Node): boolean {
    const ts = source.ts;
    let child: TS.Node = fn;
    let parent = fn.parent;
    while (ts.isParenthesizedExpression(parent)) {
      child = parent;
      parent = parent.parent;
    }
    if (!ts.isCallExpression(parent)) return false;
    if (parent.expression === child) return true;
    const hook = reactHookName(source, parent);
    const index = hook ? RENDER_TIME_CALLBACKS[hook] : undefined;
    return index !== undefined && parent.arguments[index] === child;
  }

  /** Used as a value: not `x.window`, not a key, a binding, a JSX attribute or a type. */
  private static isValueReference(ts: TypeScriptModule, node: TS.Identifier): boolean {
    const parent = node.parent;
    if (ts.isTypeOfExpression(parent)) return false;
    if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
    if ((ts.isPropertyAssignment(parent) || ts.isJsxAttribute(parent)) && parent.name === node) {
      return false;
    }
    for (let current: TS.Node = node; current.parent; current = current.parent) {
      if (ts.isTypeNode(current)) return false;
    }
    return true;
  }

  /** Under `typeof window !== 'undefined'` (if, ?:, &&), or after `if (typeof window === 'undefined') return`. */
  private static isGuarded(ts: TypeScriptModule, node: TS.Node, component: ComponentFunction): boolean {
    let child: TS.Node = node;
    for (let parent = node.parent; parent && child !== component; parent = parent.parent) {
      if (this.guards(ts, parent, child)) return true;
      child = parent;
    }
    return false;
  }

  private static guards(ts: TypeScriptModule, parent: TS.Node, child: TS.Node): boolean {
    if (ts.isIfStatement(parent) && child !== parent.expression) {
      return this.hasTypeofGuard(ts, parent.expression);
    }
    if (ts.isConditionalExpression(parent) && child !== parent.condition) {
      return this.hasTypeofGuard(ts, parent.condition);
    }
    if (ts.isBinaryExpression(parent) && child === parent.right) {
      const operator = parent.operatorToken.kind;
      const logical =
        operator === ts.SyntaxKind.AmpersandAmpersandToken ||
        operator === ts.SyntaxKind.BarBarToken ||
        operator === ts.SyntaxKind.QuestionQuestionToken;
      return logical && this.hasTypeofGuard(ts, parent.left);
    }
    if (ts.isBlock(parent)) return this.afterEarlyReturnGuard(ts, parent, child);
    return false;
  }

  private static afterEarlyReturnGuard(ts: TypeScriptModule, block: TS.Block, child: TS.Node): boolean {
    for (const statement of block.statements) {
      if (statement === child) return false;
      if (
        ts.isIfStatement(statement) &&
        this.hasTypeofGuard(ts, statement.expression) &&
        this.returns(ts, statement.thenStatement)
      ) {
        return true;
      }
    }
    return false;
  }

  private static returns(ts: TypeScriptModule, statement: TS.Statement): boolean {
    if (ts.isReturnStatement(statement)) return true;
    return ts.isBlock(statement) && statement.statements.some(inner => ts.isReturnStatement(inner));
  }

  private static hasTypeofGuard(ts: TypeScriptModule, expression: TS.Expression): boolean {
    let found = false;
    walkWithin(ts, expression, node => {
      if (
        ts.isTypeOfExpression(node) &&
        ts.isIdentifier(node.expression) &&
        BROWSER_GLOBALS.has(node.expression.text)
      ) {
        found = true;
      }
    });
    return found;
  }

  /** Browser-global names the file binds itself (a parameter named `document`). */
  private static declaredNames(source: TsxSource): Set<string> {
    const ts = source.ts;
    const names = new Set<string>();
    source.walk(node => {
      if (
        (ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) &&
        ts.isIdentifier(node.name) &&
        BROWSER_GLOBALS.has(node.name.text)
      ) {
        names.add(node.name.text);
      }
    });
    return names;
  }
}

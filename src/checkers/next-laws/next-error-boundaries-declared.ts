/**
 * Next Error Boundaries Declared
 *
 * `error.js` wraps the segment below it, not the layout beside it: an error
 * thrown by the root layout is handled only by `global-error.js`, which
 * replaces the root layout and so "must define its own <html> and <body>
 * tags"; error boundaries "must be Client Components"
 * (next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md).
 * Absent files fall back to the framework's defaults and nothing fails — the
 * first sign is a production error page nobody designed.
 *
 * The root of the App Router directory Next uses must hold `not-found`,
 * `error` and `global-error`; `error` and `global-error` open with
 * `'use client'`; `global-error` renders `<html>` and `<body>`.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { isClientModule, NextModuleGraph } from '../../utils/react/next-module-graph';
import { routerLayout, specialFile } from '../../utils/react/next-routes';
import { ReactProject } from '../../utils/react/react-project';
import { LawBase } from '../law-base';

const GLOBAL_ERROR = 'global-error';
const REQUIRED = ['not-found', 'error', GLOBAL_ERROR];
const CLIENT_REQUIRED = new Set(['error', GLOBAL_ERROR]);

export class NextErrorBoundariesDeclaredLaw extends LawBase {
  static readonly LAW_NAME = 'Next Error Boundaries Declared';

  static check(context: LawCheckContext): LawResult {
    const rel = (file: string): string => ReactProject.relative(context, file) || '.';
    const appDirs = ReactProject.nextApps(context.projectRoot)
      .map(app => routerLayout(app).appDir)
      .filter((dir): dir is string => dir !== null);
    const violations: string[] = [];
    if (appDirs.length === 0) {
      violations.push(
        'no App Router directory (app/ or src/app/ beside a package.json declaring next) was found — this law inspected nothing and does not pass on that'
      );
    }
    const graph = NextModuleGraph.create(context);
    for (const appDir of appDirs) violations.push(...this.checkAppDir(appDir, graph, rel));
    if (typeof graph !== 'string') violations.push(...graph.unread);
    const result = this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        "Add app/error.tsx and app/global-error.tsx, each opening with 'use client'",
        'Render <html> and <body> in global-error.tsx — it replaces the root layout',
        'Add app/not-found.tsx so notFound() and unmatched URLs show your page',
      ],
      context
    );
    // No App Router: judged nothing, so failed with score 0 (#302).
    return appDirs.length === 0 ? markJudgedNothing(result) : result;
  }

  private static checkAppDir(
    appDir: string,
    graph: NextModuleGraph | string,
    rel: (file: string) => string
  ): string[] {
    const violations: string[] = [];
    for (const name of REQUIRED) {
      const file = specialFile(appDir, name);
      if (!file) {
        violations.push(`${rel(appDir)}: no ${name}.tsx (or .ts/.jsx/.js) — ${this.why(name)}`);
      } else if (CLIENT_REQUIRED.has(name)) {
        violations.push(...this.checkBoundary(file, name, graph, rel));
      }
    }
    return violations;
  }

  /** `error` and `global-error`: a Client Component; `global-error` renders its own document. */
  private static checkBoundary(
    file: string,
    name: string,
    graph: NextModuleGraph | string,
    rel: (file: string) => string
  ): string[] {
    if (typeof graph === 'string') return [`${rel(file)}: ${graph}`];
    const source = graph.source(file);
    if (!source) return [];
    const violations: string[] = [];
    if (!isClientModule(source)) {
      violations.push(`${rel(file)}: does not open with 'use client' — error boundaries must be Client Components`);
    }
    if (name === GLOBAL_ERROR) {
      const tags = new Set(source.jsxElements().map(element => element.tag));
      const missing = ['html', 'body'].filter(tag => !tags.has(tag));
      if (missing.length > 0) {
        violations.push(`${rel(file)}: renders no <${missing.join('> or <')}> — global-error replaces the root layout and must define its own document`);
      }
    }
    return violations;
  }

  private static why(name: string): string {
    if (name === GLOBAL_ERROR) return 'an error in the root layout is caught by nothing you wrote; Next shows its default page';
    if (name === 'error') return 'a render error shows Next\'s default error page instead of a recovery UI';
    return 'notFound() and unknown URLs show Next\'s default 404';
  }
}

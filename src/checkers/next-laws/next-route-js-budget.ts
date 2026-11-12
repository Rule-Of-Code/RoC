/**
 * Next Route JS Budget
 *
 * Every other performance law checks that tooling exists; this one reads
 * bytes. After a Turbopack build (the default bundler of `next build` in
 * Next 16), Next writes `.next/diagnostics/route-bundle-stats.json`: one row
 * per route with `firstLoadUncompressedJsBytes`, the uncompressed size of
 * every JavaScript chunk the route loads first, shared chunks included. The
 * law compares each route to `thresholds.next.routeJsBudgetKb`.
 *
 * It measures a build, so it cannot pass without one: no stats file, a
 * stats file older than the source, or a format it does not know is "not
 * measured" — a violation, never a pass. That is why it is opt-in.
 */

import * as fs from 'fs';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PathOperations } from '../../utils/path-operations';
import { NextAppFiles } from '../../utils/react/next-app-files';
import { type NextSources, NextSourcesLoader } from '../../utils/react/next-sources';
import { type NextApp, ReactProject } from '../../utils/react/react-project';
import { LawBase } from '../law-base';
import { nextThresholds } from './next-client-law-support';

const BUDGET_KEY = 'thresholds.next.routeJsBudgetKb';
const STATS_FILE = '.next/diagnostics/route-bundle-stats.json';
const KB = 1024;

interface RouteRow {
  route: string;
  firstLoadUncompressedJsBytes: number;
}

export class NextRouteJsBudgetLaw extends LawBase {
  static readonly LAW_NAME = 'Next Route JS Budget';

  static check(context: LawCheckContext): LawResult {
    const budget = nextThresholds(context).routeJsBudgetKb;
    const sources = NextSourcesLoader.load(context);
    const violations = [...sources.unread];
    if (typeof budget !== 'number' || !(budget > 0)) {
      violations.push(`no budget declared — set ${BUDGET_KEY} to the largest first-load JavaScript a route may ship (kB, uncompressed)`);
    }
    const apps = sources.apps.filter(app => app.appDirs.length > 0 || app.pagesDirs.length > 0);
    if (apps.length === 0) violations.push(NextAppFiles.noRouterDirectory(context));
    for (const app of apps) violations.push(...this.checkApp(context, sources, app, typeof budget === 'number' ? budget : 0));
    return this.createResult(
      violations,
      this.LAW_NAME,
      'PERFORMANCE',
      [
        `Run \`next build\` (Turbopack) before the audit, and declare ${BUDGET_KEY}`,
        'Move heavy client code behind next/dynamic, or keep it in Server Components',
      ],
      context
    );
  }

  private static checkApp(context: LawCheckContext, sources: NextSources, app: NextApp, budgetKb: number): string[] {
    const statsFile = PathOperations.join(app.root, STATS_FILE);
    const where = ReactProject.relative(context, statsFile);
    if (!fs.existsSync(statsFile)) {
      return [
        `${where}: not found — route JavaScript was NOT measured. Run \`next build\` with Turbopack (the Next 16 default; a webpack build does not write this file) before the audit`,
      ];
    }
    const rows = this.readRows(statsFile);
    if (typeof rows === 'string') return [`${where}: ${rows} — route JavaScript was NOT measured`];
    const stale = this.newerSource(sources, app, fs.statSync(statsFile).mtimeMs);
    if (stale) {
      return [
        `${where}: older than ${ReactProject.relative(context, stale)} — the build does not reflect the source, so route JavaScript was NOT measured. Rebuild before the audit`,
      ];
    }
    if (budgetKb <= 0) return [];
    return rows
      .filter(row => row.firstLoadUncompressedJsBytes > budgetKb * KB)
      .map(
        row =>
          `${row.route}: ${(row.firstLoadUncompressedJsBytes / KB).toFixed(1)} kB of first-load JavaScript (uncompressed), over the ${budgetKb} kB budget (${where})`
      );
  }

  /** The rows of the stats file, or why they could not be read. */
  static readRows(statsFile: string): RouteRow[] | string {
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    } catch {
      return 'could not be read as JSON';
    }
    const valid =
      Array.isArray(parsed) &&
      parsed.every(
        row =>
          row !== null &&
          typeof row === 'object' &&
          typeof (row as RouteRow).route === 'string' &&
          typeof (row as RouteRow).firstLoadUncompressedJsBytes === 'number'
      );
    return valid ? (parsed as RouteRow[]) : 'is not the format this law reads (an array of { route, firstLoadUncompressedJsBytes })';
  }

  /** A scanned source file of the app (or its next.config / package.json) changed after the build. */
  private static newerSource(sources: NextSources, app: NextApp, builtAt: number): string | null {
    const root = `${PathOperations.normalize(app.root)}/`;
    const candidates = [
      ...sources.files.filter(file => file.startsWith(root) && !file.includes('/.next/')),
      ...['package.json', 'next.config.js', 'next.config.mjs', 'next.config.ts'].map(name => PathOperations.join(app.root, name)),
    ];
    for (const file of candidates) {
      try {
        if (fs.statSync(file).mtimeMs > builtAt) return file;
      } catch {
        /* a candidate config that does not exist */
      }
    }
    return null;
  }
}

/**
 * NextRouteJsBudget (#237): reads .next/diagnostics/route-bundle-stats.json
 * (the file a Turbopack `next build` writes) and compares each route's
 * firstLoadUncompressedJsBytes to thresholds.next.routeJsBudgetKb. No budget,
 * no stats, stale stats or an unknown format is "not measured" — a violation.
 */
import fs from 'fs';
import path from 'path';
import { NextRouteJsBudgetLaw as Law } from '../../../src/checkers/next-laws/next-route-js-budget';
import { ctx, removeProjects } from '../toolkit-fixture';
import { nextApp, PAGE } from './next-fixture';

afterAll(removeProjects);

const STATS = '.next/diagnostics/route-bundle-stats.json';
/** The shape next@16.4.6 writes (two routes of a fresh create-next-app). */
const ROWS = [
  { route: '/', firstLoadUncompressedJsBytes: 474314, firstLoadChunkPaths: ['.next/static/chunks/a.js'] },
  { route: '/_not-found', firstLoadUncompressedJsBytes: 458597, firstLoadChunkPaths: [] },
];

/** A built app: the stats file written after the source, as a build would. */
function built(stats: unknown = ROWS): string {
  const root = nextApp({ 'src/app/page.tsx': PAGE });
  const file = path.join(root, STATS);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof stats === 'string' ? stats : JSON.stringify(stats));
  const later = new Date(Date.now() + 60_000);
  fs.utimesSync(file, later, later);
  return root;
}
const check = (root: string, routeJsBudgetKb?: number) =>
  Law.check(ctx(root, { thresholds: { next: routeJsBudgetKb === undefined ? {} : { routeJsBudgetKb } } }));

describe('NextRouteJsBudgetLaw (#237)', () => {
  it('red: routes over the budget, each named with its size', () => {
    const result = check(built(), 450);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      '/: 463.2 kB of first-load JavaScript (uncompressed), over the 450 kB budget (.next/diagnostics/route-bundle-stats.json)',
    ]);
  });

  it('green: every route under the budget', () => {
    expect(check(built(), 500).violations).toEqual([]);
  });

  it('fails without a declared budget', () => {
    expect(check(built()).violations).toEqual([expect.stringContaining('no budget declared — set thresholds.next.routeJsBudgetKb')]);
  });

  it('fails when there is no build output: not measured', () => {
    const result = check(nextApp({ 'src/app/page.tsx': PAGE }), 500);
    expect(result.violations).toEqual([expect.stringContaining('.next/diagnostics/route-bundle-stats.json: not found — route JavaScript was NOT measured')]);
  });

  it('fails when a source file is newer than the build', () => {
    const root = built();
    const page = path.join(root, 'src/app/page.tsx');
    const evenLater = new Date(Date.now() + 120_000);
    fs.utimesSync(page, evenLater, evenLater);
    expect(check(root, 500).violations).toEqual([expect.stringContaining('older than src/app/page.tsx')]);
  });

  it.each([
    ['not JSON', '{oops', 'could not be read as JSON'],
    ['another shape', { routes: {} }, 'is not the format this law reads'],
    ['a row without bytes', [{ route: '/', size: 1 }], 'is not the format this law reads'],
  ])('fails on a stats file that is %s', (_name, stats, fragment) => {
    expect(check(built(stats), 500).violations).toEqual([expect.stringContaining(fragment)]);
  });
});

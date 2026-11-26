/**
 * #43 — the six performance laws whose "Source/config NOT read …" line shows
 * five files and "(+N more)" name every file they could not read in
 * `violationDetails`. The violation lines are unchanged.
 */
import { BundleSizeOptimizationLaw } from '../../src/checkers/performance-laws/bundle-size-optimization';
import { BundleOptimizationStrategyLaw } from '../../src/laws/performance/bundle-optimization-strategy';
import { CoreWebVitalsComplianceLaw } from '../../src/laws/performance/core-web-vitals-compliance';
import { PerformanceBudgetComplianceLaw } from '../../src/laws/performance/performance-budget-compliance';
import { PerformanceMonitoringPolicyLaw } from '../../src/laws/performance/performance-monitoring-policy';
import { PerformanceStandardsLaw } from '../../src/laws/performance/performance-standards';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';
import { unreadDetails } from '../../src/utils/react/react-performance-source';
import {
  ctx,
  manifest,
  project,
  removeProjects,
} from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const SIX = [1, 2, 3, 4, 5, 6];

/** A React / Next app whose six components do not parse. */
const brokenApp = (): string => {
  const files: Record<string, string> = {
    'package.json': manifest({
      react: '19.3.0',
      'react-dom': '19.3.0',
      next: '16.0.0',
      'chart.js': '4.4.0',
    }),
  };
  for (const n of SIX)
    files[`src/C${n}.tsx`] = `export const C${n} = () => <div>{(</div>;\n`;
  return project(files);
};

const LAWS: Array<
  [string, (c: LawCheckContext) => LawResult | Promise<LawResult>]
> = [
  ['Bundle Size Optimization', c => BundleSizeOptimizationLaw.check(c)],
  [
    'Bundle Optimization Strategy Policy',
    c => BundleOptimizationStrategyLaw.check(c),
  ],
  ['Core Web Vitals Compliance', c => CoreWebVitalsComplianceLaw.check(c)],
  [
    'Performance Budget Compliance',
    c => PerformanceBudgetComplianceLaw.check(c),
  ],
  [
    'Performance Monitoring Policy',
    c => PerformanceMonitoringPolicyLaw.check(c),
  ],
  ['Performance Standards', c => PerformanceStandardsLaw.check(c)],
];

describe('#43 the unread line names every file in violationDetails', () => {
  it.each(LAWS)(
    '%s: five on the line, six in the details',
    async (_name, check) => {
      const result = await check(ctx(brokenApp()));
      expect(
        (result.violations ?? []).filter(v =>
          /^Source\/config NOT read/.test(v)
        )
      ).toEqual([expect.stringMatching(/ \(\+1 more\)$/)]);
      expect(
        (result.violationDetails ?? []).map(d => `${d.file}: ${d.message}`)
      ).toEqual(
        SIX.map(n =>
          expect.stringMatching(
            new RegExp(
              `^src/C${n}\\.tsx: NOT read: could not be parsed \\(line 1: `
            )
          )
        )
      );
    }
  );

  it('unreadDetails: an entry without a single file keeps no file', () => {
    expect(
      unreadDetails([
        'src/a.tsx: could not be read',
        "3 file(s): could not load the 'typescript' package",
      ])
    ).toEqual([
      { file: 'src/a.tsx', message: 'NOT read: could not be read' },
      {
        message: "NOT read: 3 file(s): could not load the 'typescript' package",
      },
    ]);
  });
});

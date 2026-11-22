/**
 * 8.0.1 — the summary counts add up to the laws that ran.
 *
 * Every law lands in exactly one outcome (AuditResultProcessor.outcomeOf):
 * passed, failed, warning, or judged-nothing. A law that judged nothing at
 * error severity is a failure, listed with the failed laws; only one at a
 * non-blocking severity is its own outcome.
 *
 * 8.0.0 printed "◌ Judged nothing" and reported `stats.judgedNothingLaws` from
 * the named list `scope.judgedNothingLaws`, which holds every law that judged
 * nothing whatever its severity. A law that judged nothing at error severity
 * was then counted twice, in Failed and in Judged nothing: the README demo
 * showed 30 + 29 + 12 + 3 = 74 for 72 laws checked. The numbers on screen and
 * in the JSON did not add up.
 *
 * Now both report the judged-nothing outcome, and the four numbers sum to the
 * laws executed. `scope.judgedNothingLaws` still names them all (it decides the
 * partial verdict).
 */
import chalk from 'chalk';

import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import type {
  AuditResult,
  AuditScope,
} from '../../src/core/auditing/audit-types';
import { AuditResultProcessor } from '../../src/core/auditing/result-processor';

const NOTHING = 'no test file found — nothing was judged';

/** One law of each kind, and both kinds of judged nothing. */
const results = new Map<string, unknown>([
  ['p', { lawTitle: 'Passes', passed: true, severity: 'error', score: 100 }],
  ['f', { lawTitle: 'Fails', passed: false, severity: 'error', score: 10 }],
  ['w', { lawTitle: 'Warns', passed: false, severity: 'warning', score: 50 }],
  [
    'je',
    {
      lawTitle: 'Judged nothing at error',
      passed: false,
      severity: 'error',
      judgedNothing: true,
      violations: [NOTHING],
      score: 0,
    },
  ],
  [
    'jw',
    {
      lawTitle: 'Judged nothing at warning',
      passed: false,
      severity: 'warning',
      judgedNothing: true,
      violations: [NOTHING],
      score: 0,
    },
  ],
]);

const scope = (over: Partial<AuditScope>): AuditScope =>
  ({ narrowedBy: undefined, ...over }) as AuditScope;

/** The result the engine builds: the counts, plus the scope lists (withOutcomes). */
function audited(): AuditResult {
  const counted = new AuditResultProcessor().processResults(
    results,
    {},
    {} as never
  );
  const { warningLaws, judgedNothingLaws } =
    AuditResultProcessor.scopedLaws(results);
  return {
    ...counted,
    executionTime: 1,
    scope: scope({
      executedLaws: results.size,
      selectedLaws: results.size,
      applicableLaws: results.size,
      applicableBeforeWaivers: results.size,
      waivedLaws: [],
      warningLaws,
      judgedNothingLaws,
      partial: judgedNothingLaws.length > 0,
    }),
  } as AuditResult;
}

/** The "📊 AUDIT SUMMARY" block, as printed, without colour. */
function summaryLines(result: AuditResult): string[] {
  const lines: string[] = [];
  const log = jest
    .spyOn(console, 'log')
    .mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(' '));
    });
  try {
    const self = Object.create(RuleOfCodeAuditor.prototype) as object;
    Reflect.set(self, 'displayLivenessFloor', () => undefined);
    const fn = Reflect.get(
      RuleOfCodeAuditor.prototype,
      'displaySummaryStats'
    ) as (r: AuditResult, c: chalk.Chalk, s: boolean) => void;
    fn.call(self, result, new chalk.Instance({ level: 0 }), false);
  } finally {
    log.mockRestore();
  }
  return lines;
}

const countOn = (lines: string[], label: string): number => {
  const line = lines.find(l => l.startsWith(label));
  return line === undefined ? 0 : Number(/\d+/.exec(line.slice(label.length)));
};

describe('the summary counts add up to the laws that ran', () => {
  const result = audited();

  it('each law has one outcome: 1 passed, 2 failed, 1 warning, 1 judged nothing', () => {
    expect(result.passedLaws).toBe(1);
    expect(result.failedLaws).toBe(2);
    expect(result.warningLaws).toBe(1);
    expect(result.judgedNothingLaws).toBe(1);
  });

  it('the console: Passed + Failed + Warnings + Judged nothing = Total Laws Checked', () => {
    const lines = summaryLines(result);
    const total = countOn(lines, 'Total Laws Checked:');
    const shown = {
      passed: countOn(lines, '✓ Passed:'),
      failed: countOn(lines, '✗ Failed:'),
      warnings: countOn(lines, '⚠ Warnings:'),
      judgedNothing: countOn(lines, '◌ Judged nothing:'),
    };
    expect(total).toBe(results.size);
    expect(shown).toEqual({
      passed: 1,
      failed: 2,
      warnings: 1,
      judgedNothing: 1,
    });
    expect(
      shown.passed + shown.failed + shown.warnings + shown.judgedNothing
    ).toBe(total);
  });

  it('the JSON: stats add up to executedLaws, and the scope still names both', () => {
    const json = JSON.parse(
      AuditResultProcessor.exportResults(result, 'json')
    ) as {
      stats: {
        executedLaws: number;
        passedLaws: number;
        failedLaws: number;
        warningLaws: number;
        judgedNothingLaws: number;
      };
      scope: { judgedNothingLaws: Array<{ law: string }> };
    };
    const s = json.stats;
    expect(s.judgedNothingLaws).toBe(1);
    expect(
      s.passedLaws + s.failedLaws + s.warningLaws + s.judgedNothingLaws
    ).toBe(s.executedLaws);
    expect(json.scope.judgedNothingLaws.map(l => l.law)).toEqual([
      'Judged nothing at error',
      'Judged nothing at warning',
    ]);
  });
});

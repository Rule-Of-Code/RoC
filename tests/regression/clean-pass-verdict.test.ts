/**
 * 8.0.0 — the victory art and the word `compliance` are for the clean pass only.
 *
 * A self-audit that listed 46 laws with violations at warning level, one of
 * them a law that judged nothing, printed `CONSTITUTIONAL COMPLIANCE: PASSED`
 * and the art, and its JSON verdict was `compliance`. That is the unearned
 * pass this tool exists to refuse. Now:
 *   - the verdict is the first that holds: refused > failed > partial >
 *     compliance-with-waivers > compliance-with-warnings > compliance;
 *   - a law that judged nothing is its own outcome, never a warning, and makes
 *     the run partial (no compliance verdict);
 *   - the art prints only when no law failed, was waived, warned or judged
 *     nothing.
 */
import chalk from 'chalk';

import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import type {
  AuditResult,
  AuditScope,
} from '../../src/core/auditing/audit-types';
import { AuditResultProcessor } from '../../src/core/auditing/result-processor';

const scope = (over: Partial<AuditScope> = {}): AuditScope =>
  ({
    executedLaws: 10,
    selectedLaws: 10,
    applicableLaws: 10,
    applicableBeforeWaivers: 10,
    waivedLaws: [],
    warningLaws: [],
    judgedNothingLaws: [],
    narrowedBy: undefined,
    partial: false,
    ...over,
  }) as AuditScope;

const law = (name: string) => ({ law: name, lawId: `id-${name}` });
const waiver = (name: string) => ({ ...law(name), reason: 'not ours' });

describe('verdictOf: one value, the first that holds', () => {
  it.each([
    ['clean pass', { passed: true, scope: scope() }, 'compliance'],
    [
      'a pass with a warning law',
      {
        passed: true,
        warningLaws: 1,
        scope: scope({ warningLaws: [law('A')] }),
      },
      'compliance-with-warnings',
    ],
    [
      'a pass with a waiver',
      { passed: true, scope: scope({ waivedLaws: [waiver('W')] }) },
      'compliance-with-waivers',
    ],
    [
      'waivers AND warnings: waivers win, both lists kept',
      {
        passed: true,
        warningLaws: 1,
        scope: scope({ waivedLaws: [waiver('W')], warningLaws: [law('A')] }),
      },
      'compliance-with-waivers',
    ],
    [
      'a law that judged nothing: partial',
      {
        passed: true,
        scope: scope({ judgedNothingLaws: [law('J')], partial: true }),
      },
      'partial',
    ],
    [
      'failed beats everything but refused',
      {
        passed: false,
        scope: scope({ judgedNothingLaws: [law('J')], partial: true }),
      },
      'failed',
    ],
  ] as Array<[string, Partial<AuditResult>, string]>)(
    '%s → %s',
    (_l, result, verdict) => {
      expect(
        AuditResultProcessor.verdictOf(
          result as Pick<
            AuditResult,
            'passed' | 'refused' | 'scope' | 'warningLaws'
          >
        )
      ).toBe(verdict);
    }
  );
});

describe('a law that judged nothing is its own outcome, never a warning', () => {
  const results = new Map<string, unknown>([
    [
      'law-0',
      { lawTitle: 'Passing', lawId: 'p', passed: true, severity: 'error' },
    ],
    [
      'law-1',
      { lawTitle: 'Warns B', lawId: 'b', passed: false, severity: 'warning' },
    ],
    [
      'law-2',
      { lawTitle: 'Warns A', lawId: 'a', passed: false, severity: 'info' },
    ],
    [
      'law-3',
      {
        lawTitle: 'Judged nothing',
        lawId: 'j',
        passed: false,
        severity: 'warning',
        judgedNothing: true,
      },
    ],
    [
      'law-4',
      { lawTitle: 'Fails', lawId: 'f', passed: false, severity: 'error' },
    ],
  ]);

  it('outcomeOf: passed, warning, judged-nothing, failed', () => {
    expect(
      [...results.values()].map(r => AuditResultProcessor.outcomeOf(r as never))
    ).toEqual(['passed', 'warning', 'warning', 'judged-nothing', 'failed']);
  });

  it('a judged-nothing law at error severity is a failure, and still named', () => {
    const atError = { passed: false, severity: 'error', judgedNothing: true };
    expect(AuditResultProcessor.outcomeOf(atError)).toBe('failed');
    const lists = AuditResultProcessor.scopedLaws(
      new Map([['law-0', { ...atError, lawTitle: 'J', lawId: 'j' }]])
    );
    expect(lists.judgedNothingLaws).toEqual([{ law: 'J', lawId: 'j' }]);
  });

  it('scopedLaws: sorted lists, the judged-nothing law not among the warnings', () => {
    const { warningLaws, judgedNothingLaws } =
      AuditResultProcessor.scopedLaws(results);
    expect(warningLaws).toEqual([
      { law: 'Warns A', lawId: 'a' },
      { law: 'Warns B', lawId: 'b' },
    ]);
    expect(judgedNothingLaws).toEqual([{ law: 'Judged nothing', lawId: 'j' }]);
  });

  it('the counts agree with the lists: scope.warningLaws.length === stats.warningLaws', () => {
    const counted = new AuditResultProcessor().processResults(
      results,
      {},
      {} as never
    );
    const { warningLaws, judgedNothingLaws } =
      AuditResultProcessor.scopedLaws(results);
    expect(counted.warningLaws).toBe(warningLaws.length);
    expect(counted.judgedNothingLaws).toBe(judgedNothingLaws.length);
    expect(counted.passedLaws).toBe(1);
    expect(counted.failedLaws).toBe(1);
    const stats = AuditResultProcessor.generateStats({
      ...counted,
      scope: scope({ warningLaws, judgedNothingLaws }),
    } as AuditResult);
    expect(stats.warningLaws).toBe(warningLaws.length);
    expect(stats.judgedNothingLaws).toBe(1);
  });
});

describe('the console: the art only for the clean pass', () => {
  let lines: string[];
  let log: jest.SpyInstance;
  beforeEach(() => {
    lines = [];
    log = jest
      .spyOn(console, 'log')
      .mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(' '));
      });
  });
  afterEach(() => log.mockRestore());

  const display = (
    result: Partial<AuditResult>
  ): { text: string; art: boolean } => {
    let art = false;
    const self = { displayVictoryArt: () => (art = true) };
    const fn = Reflect.get(
      RuleOfCodeAuditor.prototype,
      'displayPassedVerdict'
    ) as (r: AuditResult, c: chalk.Chalk) => void;
    fn.call(self, result as AuditResult, new chalk.Instance({ level: 0 }));
    return { text: lines.join('\n'), art };
  };

  it('clean: PASSED and the art', () => {
    const shown = display({ warningLaws: 0, scope: scope() });
    expect(shown.text).toContain('✅ CONSTITUTIONAL COMPLIANCE: PASSED');
    expect(shown.art).toBe(true);
  });

  it('warnings: the exact line, no art', () => {
    const shown = display({
      warningLaws: 46,
      scope: scope({ warningLaws: [law('A')] }),
    });
    expect(shown.text).toContain(
      '✅ CONSTITUTIONAL COMPLIANCE: PASSED WITH WARNINGS — 46 law(s) reported warnings (not blocking)'
    );
    expect(shown.text).toContain('⚠️  46 law(s) reported warnings');
    expect(shown.art).toBe(false);
  });

  it('waivers (and warnings): the waivers line unchanged, no art', () => {
    const shown = display({
      warningLaws: 2,
      scope: scope({
        executedLaws: 9,
        applicableLaws: 9,
        waivedLaws: [waiver('W')],
      }),
    });
    expect(shown.text).toContain(
      '✅ CONSTITUTIONAL COMPLIANCE: PASSED WITH WAIVERS — 9 of 9 applicable laws ran (1 waived)'
    );
    expect(shown.text).toContain('⚠️  2 law(s) reported warnings');
    expect(shown.art).toBe(false);
  });
});

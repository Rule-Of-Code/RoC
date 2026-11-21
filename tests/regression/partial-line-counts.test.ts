/**
 * 8.0.0 — a PARTIAL line said the other (or the selected) laws "passed" while
 * 43 of them reported warnings (stats.passedLaws 40, stats.warningLaws 43).
 * A law with warnings did not pass. When any law warned, the line gives the
 * counts from stats; when none did, "passed" is true and the text is as before.
 */
import chalk from 'chalk';

import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import type {
  AuditResult,
  AuditScope,
} from '../../src/core/auditing/audit-types';

const scope = (over: Partial<AuditScope>): AuditScope =>
  ({
    executedLaws: 83,
    selectedLaws: 83,
    applicableLaws: 83,
    applicableBeforeWaivers: 83,
    waivedLaws: [],
    warningLaws: [],
    judgedNothingLaws: [],
    narrowedBy: undefined,
    partial: true,
    ...over,
  }) as AuditScope;

const partialLine = (result: Partial<AuditResult>): string => {
  const lines: string[] = [];
  const log = jest
    .spyOn(console, 'log')
    .mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(' '));
    });
  try {
    const self = Object.create(RuleOfCodeAuditor.prototype);
    const fn = Reflect.get(
      RuleOfCodeAuditor.prototype,
      'displayPartialVerdict'
    ) as (r: AuditResult, c: chalk.Chalk) => void;
    fn.call(self, result as AuditResult, new chalk.Instance({ level: 0 }));
  } finally {
    log.mockRestore();
  }
  return lines.find(line => line.includes('PARTIAL')) ?? '';
};

const judgedNothing = [{ law: 'Error Handling Standards', lawId: 'eh' }];

describe('a PARTIAL line never calls a law with warnings "passed"', () => {
  it('judged nothing, 43 warned: the counts from stats', () => {
    const line = partialLine({
      passedLaws: 40,
      warningLaws: 43,
      scope: scope({ judgedNothingLaws: judgedNothing }),
    });
    expect(line).toContain(
      '(Error Handling Standards). 40 passed, 43 reported warnings (not blocking); no compliance verdict.'
    );
    expect(line).not.toContain('The other laws passed');
  });

  it('judged nothing, none warned: "The other laws passed", as before', () => {
    const line = partialLine({
      passedLaws: 82,
      warningLaws: 0,
      scope: scope({ judgedNothingLaws: judgedNothing }),
    });
    expect(line).toContain('The other laws passed; no compliance verdict.');
  });

  it('narrowed, one warned: "Of the selected laws" with the counts', () => {
    const line = partialLine({
      passedLaws: 5,
      warningLaws: 1,
      scope: scope({
        executedLaws: 6,
        applicableLaws: 75,
        narrowedBy: 'laws.enabled',
      }),
    });
    expect(line).toContain(
      '(narrowed by laws.enabled). Of the selected laws 5 passed, 1 reported warnings (not blocking); no compliance verdict.'
    );
    expect(line).not.toContain('The selected laws passed');
  });

  it('narrowed, none warned: "The selected laws passed", as before', () => {
    const line = partialLine({
      passedLaws: 6,
      warningLaws: 0,
      scope: scope({
        executedLaws: 6,
        applicableLaws: 75,
        narrowedBy: 'laws.enabled',
      }),
    });
    expect(line).toContain(
      '⚠️  PARTIAL SCAN — 6 of 75 applicable laws ran (narrowed by laws.enabled). The selected laws passed; no compliance verdict.'
    );
  });
});

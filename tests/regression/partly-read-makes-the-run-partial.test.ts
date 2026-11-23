/**
 * #453 — what a law did not read has its own place in the result, and the
 * engine treats it as what it is: not a finding, not a pass.
 *
 * A law result with `notRead` notes and no violations found nothing wrong in
 * what it read, and did not read all of it. At a non-blocking severity it is
 * its own outcome ('partly-read'): counted in `stats.partlyReadLaws`, named
 * in `scope.partlyReadLaws`, never among the warnings, and the run is
 * partial — no compliance verdict. At error severity it fails, as a law that
 * judged nothing does. A law with notes AND findings is judged by its
 * findings.
 */
import { AuditResultProcessor } from '../../src/core/auditing/result-processor';
import { FileUtils } from '../../src/utils';
import { normalizeJudgedNothing } from '../../src/utils/judged-nothing';

const NOTE =
  'tsconfig.json extends "./base.json", which could not be read — the inherited compiler options were NOT read';

const law = (fields: Record<string, unknown>): Record<string, unknown> =>
  normalizeJudgedNothing({
    lawId: 'x',
    lawTitle: 'Some Law',
    passed: true,
    score: 100,
    message: 'ok',
    violations: [],
    ...fields,
  });

describe('#453 a partly-read law is its own outcome', () => {
  it('notes and no findings, at warning severity: partly-read, not passed, score kept', () => {
    const result = law({ notRead: [NOTE], severity: 'warning' });
    expect(result.passed).toBe(false);
    expect(result.score).toBe(100);
    expect(AuditResultProcessor.outcomeOf(result)).toBe('partly-read');
  });

  it('at error severity it fails, like a law that judged nothing', () => {
    expect(
      AuditResultProcessor.outcomeOf(
        law({ notRead: [NOTE], severity: 'error' })
      )
    ).toBe('failed');
  });

  it('notes beside a finding: judged by the finding (a warning)', () => {
    const result = law({
      passed: false,
      notRead: [NOTE],
      violations: ['TypeScript strict mode must be enabled'],
      severity: 'warning',
    });
    expect(AuditResultProcessor.outcomeOf(result)).toBe('warning');
  });

  it('the run counts it apart and names it; the counts still add up', () => {
    const results = new Map<string, unknown>([
      [
        'a',
        law({
          lawId: 'a',
          lawTitle: 'Read Part',
          notRead: [NOTE],
          severity: 'warning',
        }),
      ],
      ['b', law({ lawId: 'b', lawTitle: 'Clean', severity: 'warning' })],
      [
        'c',
        law({
          lawId: 'c',
          lawTitle: 'Warns',
          passed: false,
          violations: ['x'],
          severity: 'warning',
        }),
      ],
    ]);
    const processed = new AuditResultProcessor().processResults(
      results,
      {},
      FileUtils.getMinimalDefaultConfig()
    );
    expect(processed.partlyReadLaws).toBe(1);
    expect(processed.warningLaws).toBe(1);
    expect(processed.passedLaws).toBe(1);
    expect(processed.failedLaws).toBe(0);
    expect(processed.passed).toBe(true);
    const stats = AuditResultProcessor.generateStats(processed);
    expect(
      stats.passedLaws +
        stats.failedLaws +
        (stats.warningLaws ?? 0) +
        (stats.judgedNothingLaws ?? 0) +
        (stats.partlyReadLaws ?? 0)
    ).toBe(stats.executedLaws);

    const scoped = AuditResultProcessor.scopedLaws(results);
    expect(scoped.partlyReadLaws).toEqual([{ law: 'Read Part', lawId: 'a' }]);
    expect(scoped.warningLaws).toEqual([{ law: 'Warns', lawId: 'c' }]);
  });

  it('a partial scope gives no compliance verdict', () => {
    expect(
      AuditResultProcessor.verdictOf({
        passed: true,
        scope: { partial: true } as never,
      })
    ).toBe('partial');
  });
});

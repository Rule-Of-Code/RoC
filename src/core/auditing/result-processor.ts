/**
 * Audit result processor
 */

import type { RuleOfCodeConfig } from '../../types';
import {
  normalizeJudgedNothing,
  readsPartly,
} from '../../utils/judged-nothing';
import type {
  AuditRefusal,
  AuditResult,
  AuditStats,
  AuditVerdict,
  ScopedLaw,
} from './audit-types';

/** Where one law's result counts: the four buckets of a run. */
export type LawOutcome =
  'passed' | 'warning' | 'judged-nothing' | 'partly-read' | 'failed';

interface ClassifiableResult {
  passed?: boolean;
  severity?: string;
  judgedNothing?: boolean;
  notRead?: string[] | undefined;
  violations?: unknown;
  lawId?: string;
  lawTitle?: string;
  lawName?: string;
}

export class AuditResultProcessor {
  /**
   * A law result with violations only fails the audit at error severity.
   * Warning/info severity is reported without blocking (the warn-first
   * rollout contract) unless options.failOnWarnings escalates it.
   */
  static isWarningResult(
    lawResult: { passed?: boolean; severity?: string },
    failOnWarnings = false
  ): boolean {
    return (
      !lawResult.passed &&
      !failOnWarnings &&
      (lawResult.severity === 'warning' || lawResult.severity === 'info')
    );
  }

  /**
   * Where a law's result counts. A law that judged nothing, or that read
   * part of its input and found nothing wrong in it (#453), is its own bucket
   * at a non-blocking severity — never a warning — and a failure at error
   * severity (or under failOnWarnings), like any other failing law.
   */
  static outcomeOf(
    lawResult: ClassifiableResult,
    failOnWarnings = false
  ): LawOutcome {
    if (lawResult.passed) return 'passed';
    if (!AuditResultProcessor.isWarningResult(lawResult, failOnWarnings))
      return 'failed';
    if (lawResult.judgedNothing === true) return 'judged-nothing';
    return readsPartly(lawResult) ? 'partly-read' : 'warning';
  }

  /**
   * The laws of a run that reported warnings, and those that judged nothing
   * (whatever their severity), by canonical title, sorted — the lists
   * `scope.warningLaws` and `scope.judgedNothingLaws` (8.0.0).
   */
  static scopedLaws(
    results: Map<string, unknown>,
    failOnWarnings = false
  ): {
    warningLaws: ScopedLaw[];
    judgedNothingLaws: ScopedLaw[];
    partlyReadLaws: ScopedLaw[];
  } {
    const warningLaws: ScopedLaw[] = [];
    const judgedNothingLaws: ScopedLaw[] = [];
    const partlyReadLaws: ScopedLaw[] = [];
    for (const [id, result] of results) {
      const lawResult = result as ClassifiableResult;
      const named: ScopedLaw = {
        law: lawResult.lawTitle ?? lawResult.lawName ?? id,
        lawId: lawResult.lawId ?? id,
      };
      if (lawResult.judgedNothing === true) judgedNothingLaws.push(named);
      else if (readsPartly(lawResult)) partlyReadLaws.push(named);
      else if (
        AuditResultProcessor.outcomeOf(lawResult, failOnWarnings) === 'warning'
      )
        warningLaws.push(named);
    }
    const byLaw = (a: ScopedLaw, b: ScopedLaw): number =>
      a.law.localeCompare(b.law);
    return {
      warningLaws: warningLaws.sort(byLaw),
      judgedNothingLaws: judgedNothingLaws.sort(byLaw),
      partlyReadLaws: partlyReadLaws.sort(byLaw),
    };
  }

  /**
   * The verdict of a run (#350), the first that holds: refused, failed,
   * partial (narrowed, or a law that judged nothing), a pass with
   * `laws.notApplicable` waivers, a pass with laws reporting warnings, or the
   * clean pass. A result that carries no `verdict` (cached by a build that
   * predates the field) gets the same answer here.
   */
  static verdictOf(
    result: Pick<AuditResult, 'passed' | 'refused' | 'scope' | 'warningLaws'>
  ): AuditVerdict {
    if (result.refused) return 'refused';
    if (!result.passed) return 'failed';
    if (result.scope?.partial) return 'partial';
    if ((result.scope?.waivedLaws?.length ?? 0) > 0)
      return 'compliance-with-waivers';
    const warnings =
      result.scope?.warningLaws?.length ?? result.warningLaws ?? 0;
    return warnings > 0 ? 'compliance-with-warnings' : 'compliance';
  }

  /**
   * A law that judged nothing is a failure scored 0, whatever it computed —
   * see utils/judged-nothing (#302).
   */
  static normalizeJudgedNothing<T>(lawResult: T): T {
    return normalizeJudgedNothing(lawResult);
  }

  /**
   * Process audit results
   */
  processResults(
    results: Map<string, unknown>,
    options: unknown,
    config: RuleOfCodeConfig
  ): AuditResult {
    const failOnWarnings =
      (options as { failOnWarnings?: boolean })?.failOnWarnings ?? false;
    const totalLaws = results.size;
    const count: Record<LawOutcome, number> = {
      passed: 0,
      warning: 0,
      'judged-nothing': 0,
      'partly-read': 0,
      failed: 0,
    };
    let score = 0;

    for (const [, result] of results) {
      const lawResult = result as ClassifiableResult & { score?: number };
      // Trust the law's own determination of passed status
      count[AuditResultProcessor.outcomeOf(lawResult, failOnWarnings)]++;
      score += lawResult.score ?? 0;
    }

    const passedLaws = count.passed;
    const warningLaws = count.warning;
    // a judged-nothing law at a non-blocking severity neither passed nor
    // failed; the run is partial (the engine marks the scope)
    const failedLaws = count.failed;

    return {
      // FAIL-CLOSED: an empty result set is never compliance — zero executed
      // laws means zero evidence, not a pass.
      passed: totalLaws > 0 && failedLaws === 0,
      score: totalLaws > 0 ? Math.round(score / totalLaws) : 0,
      totalLaws,
      passedLaws,
      failedLaws,
      warningLaws,
      judgedNothingLaws: count['judged-nothing'],
      partlyReadLaws: count['partly-read'],
      results,
      duration: 0,
      paretoMode: false,
      config,
    } as AuditResult;
  }

  /**
   * Generate audit statistics
   */
  static generateStats(result: AuditResult): AuditStats {
    return {
      executedLaws: result.results.size,
      totalLaws: result.totalLaws,
      passedLaws: result.passedLaws,
      failedLaws: result.failedLaws,
      warningLaws: result.warningLaws ?? 0,
      // the outcome, apart from failedLaws: the four counts sum to executedLaws
      // (8.0.1); scope.judgedNothingLaws names every law that judged nothing
      judgedNothingLaws: result.judgedNothingLaws ?? 0,
      // read part of their input, found nothing wrong in it (#453): the five
      // counts sum to executedLaws
      partlyReadLaws: result.partlyReadLaws ?? 0,
      score: result.score,
      duration: result.duration,
    };
  }

  /**
   * Export results to different formats (instance method)
   */
  exportResults(result: AuditResult, format: 'csv' | 'html' | 'json'): string {
    return AuditResultProcessor.exportResults(result, format);
  }

  /**
   * Export results to different formats
   */
  static exportResults(
    result: AuditResult,
    format: 'csv' | 'html' | 'json'
  ): string {
    switch (format) {
      case 'json':
        return this.exportToJson(result);
      case 'html':
        return this.exportToHtml(result);
      case 'csv':
        return this.exportToCsv(result);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /** One sentence for a refused run, shared by the CSV and HTML exports. */
  private static describeRefusal(refused: AuditRefusal): string {
    return refused.reason === 'no-laws'
      ? 'Audit refused: no laws selected — no law ran'
      : `Audit refused: ${refused.selectedLaws} laws selected — below the liveness floor (laws.minLawsChecked: ${refused.floor}) — no law ran`;
  }

  private static exportToJson(result: AuditResult): string {
    const exportData = {
      passed: result.passed,
      // compliance | compliance-with-waivers | partial | failed | refused (#350).
      verdict: result.verdict ?? this.verdictOf(result),
      score: result.score,
      // The type that selected the laws, and its source (#320).
      ...(result.project ? { project: result.project } : {}),
      // N of M: what ran, what applies, and whether that is partial (#348).
      ...(result.scope ? { scope: result.scope } : {}),
      // Present only when the engine refused to run: no law was judged.
      ...(result.refused ? { refused: result.refused } : {}),
      stats: this.generateStats(result),
      results: Array.from(result.results.entries()).map(([id, resUnknown]) => {
        const res = resUnknown as {
          passed?: boolean;
          message?: string;
          details?: string[];
        };
        return {
          id,
          ...res,
        };
      }),
    };

    return JSON.stringify(exportData, null, 2);
  }

  private static exportToHtml(result: AuditResult): string {
    const stats = this.generateStats(result);
    const results = Array.from(result.results.entries());

    return `
<!DOCTYPE html>
<html>
<head>
  <title>RuleOfCode Audit Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .passed { color: green; }
    .failed { color: red; }
    .stats { background: #f5f5f5; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>RuleOfCode Audit Report</h1>
  <div class="stats">
    <h2>Statistics</h2>
    <p>Score: ${stats.score}%</p>
    <p>Passed: ${stats.passedLaws}/${stats.totalLaws}</p>
    <p>Duration: ${stats.duration}ms</p>
  </div>${
    result.refused
      ? `
  <p class="failed">${this.describeRefusal(result.refused)}</p>`
      : ''
  }
  <h2>Results</h2>
  ${results
    .map(([id, resUnknown]) => {
      const res = resUnknown as {
        passed?: boolean;
        message?: string;
      };
      return `
    <p class="${res.passed ? 'passed' : 'failed'}">
      ${res.passed ? '✅' : '❌'} ${id}: ${res.message}
    </p>
  `;
    })
    .join('')}
</body>
</html>`;
  }

  private static exportToCsv(result: AuditResult): string {
    const results = Array.from(result.results.entries());
    const lines = ['Law ID,Status,Message,Details'];

    // A refused run has no law rows. A header alone reads as "nothing to
    // report"; say instead that the audit did not run.
    if (result.refused) {
      lines.push(
        `audit,REFUSED,${this.describeRefusal(result.refused).replace(/,/g, ';')},`
      );
    }

    for (const [id, resUnknown] of results) {
      const res = resUnknown as {
        passed?: boolean;
        message?: string;
        details?: string;
      };
      const status = res.passed ? 'PASSED' : 'FAILED';
      const message = res.message?.replace(/,/g, ';') ?? '';
      const details = res.details?.replace(/,/g, ';') ?? '';
      lines.push(`${id},${status},${message},${details}`);
    }

    return lines.join('\n');
  }
}

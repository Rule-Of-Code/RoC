/**
 * Audit result processor
 */

import chalk from 'chalk';
import type { RuleOfCodeConfig } from '../../types';
import type { AuditResult, AuditStats } from './audit-types';

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
    let passedLaws = 0;
    let warningLaws = 0;
    let score = 0;

    for (const [, result] of results) {
      const lawResult = result as {
        passed?: boolean;
        score?: number;
        severity?: string;
      };

      // Trust the law's own determination of passed status
      if (lawResult.passed) {
        passedLaws++;
      } else if (
        AuditResultProcessor.isWarningResult(lawResult, failOnWarnings)
      ) {
        warningLaws++;
      }

      score += lawResult.score ?? 0;
    }

    const failedLaws = totalLaws - passedLaws - warningLaws;

    return {
      // FAIL-CLOSED: an empty result set is never compliance — zero executed
      // laws means zero evidence, not a pass.
      passed: totalLaws > 0 && failedLaws === 0,
      score: totalLaws > 0 ? Math.round(score / totalLaws) : 0,
      totalLaws,
      passedLaws,
      failedLaws,
      warningLaws,
      results,
      duration: 0,
      paretoMode: false,
      config,
    } as AuditResult;
  }

  /**
   * Process and display audit results
   */
  static displayResults(
    result: AuditResult,
    options: { verbose?: boolean; onlyFailures?: boolean }
  ): void {
    const { verbose, onlyFailures } = options;

    if (result.passed) {
      process.stdout.write(
        `${chalk.greenBright('✅ All constitutional laws passed!')}\n`
      );
    } else {
      process.stdout.write(
        `${chalk.redBright('❌ Some constitutional laws failed')}\n`
      );
    }

    const scorePercent = Math.round(result.score);
    const scoreColor =
      scorePercent >= 80
        ? chalk.greenBright
        : scorePercent >= 60
          ? chalk.yellowBright
          : chalk.redBright;
    process.stdout.write(
      `${scoreColor(
        `📈 Score: ${result.score}% (${result.passedLaws}/${result.totalLaws} laws)`
      )}\n`
    );
    process.stdout.write(
      `${chalk.cyanBright(`⏱️  Duration: ${result.duration}ms`)}\n`
    );

    // Show detailed results when verbose or when there are failures
    if (verbose || !result.passed) {
      process.stdout.write(`\n${chalk.cyanBright('━'.repeat(60))}\n`);
      this.displayDetailedResults(result, onlyFailures ?? false);
    }
  }

  /**
   * Display detailed law results
   */
  private static displayDetailedResults(
    result: AuditResult,
    onlyFailures: boolean
  ): void {
    const results = Array.from(result.results.entries());

    for (const [lawId, lawResultUnknown] of results) {
      const lawResult = lawResultUnknown as {
        passed: boolean;
        lawName?: string;
        message?: string;
        details?: string[];
      };

      if (onlyFailures && lawResult.passed) continue;
      this.displayLawResult(lawId, lawResult);
    }
  }

  /**
   * Display a single law result
   */
  private static displayLawResult(
    lawId: string,
    lawResult: {
      passed: boolean;
      lawName?: string;
      message?: string;
      details?: string[];
    }
  ): void {
    const status = lawResult.passed
      ? chalk.greenBright('✅')
      : chalk.redBright('❌');

    const displayName = lawResult.lawName ?? lawId;
    process.stdout.write(`${status} ${displayName}\n`);

    if (!lawResult.passed) {
      this.displayViolations(lawResult);
    }
  }

  /**
   * Display law violations
   */
  private static displayViolations(lawResult: {
    message?: string;
    details?: string[];
  }): void {
    const violationCount = lawResult.details?.length ?? 1;

    if (violationCount > 1) {
      process.stdout.write(
        `${chalk.redBright(`   ${violationCount} violations found`)}\n`
      );
    }

    if (lawResult.message) {
      process.stdout.write(`${chalk.redBright(`   ${lawResult.message}`)}\n`);
    }

    if (lawResult.details?.length) {
      this.displayViolationDetails(lawResult.details);
    }
  }

  /**
   * Display violation details with truncation
   */
  private static displayViolationDetails(details: string[]): void {
    details.slice(0, 3).forEach((detail: string) => {
      process.stdout.write(`${chalk.yellowBright(`   • ${detail}`)}\n`);
    });

    if (details.length > 3) {
      process.stdout.write(
        `${chalk.gray(`   ... and ${details.length - 3} more`)}\n`
      );
    }
  }

  /**
   * Display only failures summary (no duplication)
   */
  private static displayFailuresSummary(result: AuditResult): void {
    process.stdout.write(
      `\n${chalk.yellowBright(`ℹ️  ${result.failedLaws} law(s) failed. Run with --verbose for details.`)}\n`
    );
  }

  /**
   * Generate audit statistics
   */
  static generateStats(result: AuditResult): AuditStats {
    return {
      totalLaws: result.totalLaws,
      passedLaws: result.passedLaws,
      failedLaws: result.failedLaws,
      warningLaws: result.warningLaws ?? 0,
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

  private static exportToJson(result: AuditResult): string {
    const exportData = {
      passed: result.passed,
      score: result.score,
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
  </div>
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

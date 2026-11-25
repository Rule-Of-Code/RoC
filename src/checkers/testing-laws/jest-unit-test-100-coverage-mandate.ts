/**
 * Jest Unit Test 100 Coverage Mandate Law Implementation
 *
 * Streamlined law that delegates to specialized Jest coverage utilities.
 * Follows Single Responsibility Principle by orchestrating specialized components.
 *
 * Enforces 100% code coverage mandate for all production code
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils';
import { PathOperations } from '../../utils/path-operations';
import {
  type CoverageReport,
  CoverageReportReader,
} from '../../utils/testing/coverage-report-reader';
import { CoverageThresholdReader } from '../../utils/testing/coverage-threshold-reader';
import { TestConfigurationInspector } from '../../utils/testing/test-configuration-inspector';
import { TestFilesExistenceChecker } from '../../utils/testing/test-files-existence-checker';
import { CoverageByReport } from './coverage-by-report';

/** Points of the score of 100 each coverage violation costs. */
const POINTS_PER_VIOLATION = 20;
/** A ratio times this, floored and divided by 100, is a percentage with two decimals. */
const PERCENT_DECIMALS = 10000;

export class JestUnitTest100CoverageMandateLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check Jest configuration - reuse existing inspector
    const jestConfig = this.checkJestConfigurationSimple(context.projectRoot);
    if (!jestConfig.hasJest) {
      violations.push('Jest not configured or installed');
      suggestions.push('Install and configure Jest testing framework');
    }

    // Check 100% coverage configuration - specialized check
    const coverageConfig = this.check100CoverageConfigurationSimple(
      context.projectRoot
    );
    if (!coverageConfig.has100Coverage) {
      violations.push('100% coverage thresholds not configured');
      suggestions.push('Set Jest coverage thresholds to 100% for all metrics');
    }

    // Check actual coverage, from a report that can be used (#605)
    const actualCoverage = this.checkActualCoverageSimple(context);
    if (!actualCoverage.hasReports) {
      suggestions.push('Run tests with coverage to generate coverage reports');
    } else {
      const lowCoverage = actualCoverage.lowCoverageAreas;
      if (lowCoverage.length > 0) {
        violations.push(
          `Coverage below 100% in: ${lowCoverage.slice(0, 3).join(', ')}`
        );
        suggestions.push(
          'Improve test coverage to achieve 100% for all metrics'
        );
      }
    }

    // (A "source files lack unit tests" check was here but was a no-op stub that
    // always returned 0 — code pretending to check. Removed rather than left to
    // imply coverage it never provided; Test Coverage Constitutional Standard
    // already checks the source-to-test ratio.)

    return this.createResult(
      violations,
      suggestions,
      context,
      actualCoverage.notRead
    );
  }

  /**
   * Simple Jest configuration check
   */
  private static checkJestConfigurationSimple(projectRoot: string): {
    hasJest: boolean;
  } {
    const testConfig =
      TestConfigurationInspector.checkTestConfiguration(projectRoot);
    const hasJestFramework = testConfig.violations.length === 0;
    return { hasJest: hasJestFramework };
  }

  private static readonly REQUIRED_THRESHOLD = 100;

  /**
   * Does the project actually mandate 100% coverage?
   *
   * This used to accept ANY coverage config — `coverageThreshold.global.lines: 50`
   * satisfied a law named "100% Coverage Mandate". A law that lies in its own name
   * is worse than no law. So it verifies the thresholds ARE 100 for every metric.
   *
   * Reading them is delegated to CoverageThresholdReader, which reads each config
   * on its own and follows a named constant. The scan that lived here joined every
   * config into one blob and read 800 characters after the first `coverageThreshold`
   * — in an Nx workspace the per-project configs sit between the root config and
   * `jest.preset.js`, so the file holding the numbers fell outside the window and
   * this law reported "not configured" against a workspace pinned to 100.
   */
  private static check100CoverageConfigurationSimple(projectRoot: string): {
    has100Coverage: boolean;
  } {
    return {
      has100Coverage: CoverageThresholdReader.mandatesAll(
        projectRoot,
        this.REQUIRED_THRESHOLD
      ),
    };
  }

  /**
   * The coverage the last test run measured, read through the reader Test
   * Coverage Constitutional Standard uses (#605), with the same rules: a
   * report older than the code, naming none of the source files, or not a
   * coverage report is not read — said in `notRead`, so the law cannot pass
   * on it. It used to read `coverage/coverage-summary.json` whenever it
   * existed: numbers from an older tree decided the verdict, and a file
   * that did not parse passed in silence.
   *
   * The measure is the run's total, as Jest's `coverageThreshold.global`
   * judges it: every metric of a coverage-summary.json `total`; for an
   * lcov.info, which this reader reads for lines only, the lines.
   */
  private static checkActualCoverageSimple(context: LawCheckContext): {
    hasReports: boolean;
    lowCoverageAreas: string[];
    notRead: string[];
  } {
    const { projectRoot, config } = context;
    const hasReports = FileUtils.exists(
      PathOperations.join(projectRoot, 'coverage')
    );
    const lookup = CoverageReportReader.find(
      projectRoot,
      config.thresholds?.testing?.coverageReportPath
    );
    if (lookup.kind === 'none') {
      return { hasReports, lowCoverageAreas: [], notRead: [] };
    }
    if (lookup.kind === 'unread') {
      return { hasReports: true, lowCoverageAreas: [], notRead: [lookup.note] };
    }
    const report = lookup.report;
    const sources = TestFilesExistenceChecker.findTestableSources(
      projectRoot,
      config,
      context.lawId
    );
    const why = CoverageByReport.whyNotUsable(projectRoot, report, sources);
    if (why) {
      return {
        hasReports: true,
        lowCoverageAreas: [],
        notRead: [`${why} — the coverage it gives was not judged`],
      };
    }
    return {
      hasReports: true,
      lowCoverageAreas: this.lowCoverageAreas(projectRoot, report),
      notRead: [],
    };
  }

  /** The metrics of the report's total that are below 100%. */
  private static lowCoverageAreas(
    projectRoot: string,
    report: CoverageReport
  ): string[] {
    const lowCoverageAreas: string[] = [];
    if (report.path.toLowerCase().endsWith('.json')) {
      const summaryContent = FileUtils.readFile(
        PathOperations.resolve(projectRoot, report.path)
      );
      this.checkCoverageMetrics(JSON.parse(summaryContent), lowCoverageAreas);
      return lowCoverageAreas;
    }
    let covered = 0;
    let total = 0;
    for (const lines of report.lines.values()) {
      covered += lines.covered;
      total += lines.total;
    }
    if (covered < total) {
      // Floored, so a total short of every line never reads as 100%.
      const pct = Math.floor((covered / total) * PERCENT_DECIMALS) / 100;
      lowCoverageAreas.push(`lines (${pct}%)`);
    }
    return lowCoverageAreas;
  }

  private static checkCoverageMetrics(
    summary: unknown,
    lowCoverageAreas: string[]
  ): void {
    const typedSummary = summary as { total?: Record<string, { pct: number }> };
    if (typedSummary.total) {
      const metrics = ['lines', 'functions', 'branches', 'statements'];
      for (const metric of metrics) {
        if (
          typedSummary.total[metric] &&
          typedSummary.total[metric].pct < 100
        ) {
          lowCoverageAreas.push(
            `${metric} (${typedSummary.total[metric].pct}%)`
          );
        }
      }
    }
  }

  /**
   * Create standardized law result
   */
  private static createResult(
    violations: string[],
    suggestions: string[],
    context: LawCheckContext,
    notRead: string[]
  ): LawResult {
    const score = Math.max(0, 100 - violations.length * POINTS_PER_VIOLATION);

    return {
      // A report that was not read is not a pass (#453): the coverage it
      // would have shown was not judged.
      passed: violations.length === 0 && notRead.length === 0,
      score,
      message:
        violations.length === 0
          ? 'Jest Unit Test 100% Coverage Mandate properly implemented'
          : `Jest coverage issues found: ${violations.slice(0, 2).join(', ')}${violations.length > 2 ? '...' : ''}`,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      fixable: true,
      config: context.config,
      ...(notRead.length > 0 ? { notRead } : {}),
    };
  }
}

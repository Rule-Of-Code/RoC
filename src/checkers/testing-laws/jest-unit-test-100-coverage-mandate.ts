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
import { CoverageThresholdReader } from '../../utils/testing/coverage-threshold-reader';
import { TestConfigurationInspector } from '../../utils/testing/test-configuration-inspector';

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

    // Check actual coverage - simplified check
    const actualCoverage = this.checkActualCoverageSimple(context.projectRoot);
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

    return this.createResult(violations, suggestions, context);
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
   * Simple actual coverage check
   */
  private static checkActualCoverageSimple(projectRoot: string): {
    hasReports: boolean;
    lowCoverageAreas: string[];
  } {
    const _path = require('path');

    // Check for coverage reports
    const coverageDir = PathOperations.join(projectRoot, 'coverage');
    const hasReports = FileUtils.exists(coverageDir);

    const lowCoverageAreas: string[] = [];

    // Simple check for coverage summary
    const coverageSummaryPath = PathOperations.join(
      coverageDir,
      'coverage-summary.json'
    );
    if (FileUtils.exists(coverageSummaryPath)) {
      try {
        const summaryContent = FileUtils.readFile(coverageSummaryPath);
        const summary = JSON.parse(summaryContent);

        this.checkCoverageMetrics(summary, lowCoverageAreas);
      } catch (_error) {
        // Ignore parsing errors
      }
    }

    return { hasReports, lowCoverageAreas };
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
    context: LawCheckContext
  ): LawResult {
    const score = Math.max(0, 100 - violations.length * 20);

    return {
      passed: violations.length === 0,
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
    };
  }
}

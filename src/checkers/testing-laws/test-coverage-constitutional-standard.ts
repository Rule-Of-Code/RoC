/**
 * Test Coverage Constitutional Standard Law Implementation
 *
 * Streamlined law that delegates to specialized test coverage utilities.
 * Follows Single Responsibility Principle by orchestrating specialized components.
 *
 * Enforces mandatory test coverage standards for all code
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { CoverageConfigurationInspector } from '../../utils/testing/coverage-configuration-inspector';
import { TestConfigurationInspector } from '../../utils/testing/test-configuration-inspector';
import { CoverageByReport, type CoverageVerdict } from './coverage-by-report';

/** Points of the score of 100 each coverage violation costs. */
const POINTS_PER_VIOLATION = 15;

export class TestCoverageConstitutionalStandardLaw {
  static check(context: LawCheckContext): LawResult {
    // The inspectors below only know how to see Jest: a jest config, a
    // package.json test script, `.test.ts` files. A Python project enforces the
    // very same concern with `pytest --cov` / `fail_under` / `[tool.coverage]`,
    // so their findings there report the absence of a toolchain the project
    // does not use. That is not a violation — the concern is satisfied.
    if (this.isCoverageSatisfiedByPython(context.projectRoot)) {
      return this.createResult([], [], context, null);
    }

    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for test configuration - delegated to specialized inspector
    const testConfigAnalysis =
      TestConfigurationInspector.checkTestConfiguration(context.projectRoot);
    violations.push(...testConfigAnalysis.violations);
    suggestions.push(...testConfigAnalysis.suggestions);

    // Check for coverage configuration - delegated to coverage inspector
    const coverageAnalysis =
      CoverageConfigurationInspector.checkCoverageConfiguration(
        context.projectRoot
      );
    violations.push(...coverageAnalysis.violations);
    suggestions.push(...coverageAnalysis.suggestions);

    // Which files are tested: by the line coverage of a coverage report when
    // there is one that can be used, otherwise by the presence of a test
    // (#599). Pass the law id so `ignores.byRule` / `includes.byRule` keyed by
    // the hashed id resolve as well as the readable slug the registry publishes.
    const verdict = CoverageByReport.judge(context);
    violations.push(...verdict.violations);
    suggestions.push(...verdict.suggestions);

    return this.createResult(violations, suggestions, context, verdict);
  }

  /**
   * Is test coverage enforced the Python way?
   * (pytest `--cov`, `fail_under`, `[tool.coverage]`, `.coveragerc`)
   */
  private static isCoverageSatisfiedByPython(projectRoot: string): boolean {
    return (
      PythonSatisfaction.isPython(projectRoot) &&
      PythonSatisfaction.hasCoverageConfigured(projectRoot)
    );
  }

  /**
   * Create standardized law result
   */
  private static createResult(
    violations: string[],
    suggestions: string[],
    context: LawCheckContext,
    verdict: CoverageVerdict | null
  ): LawResult {
    const score = Math.max(0, 100 - violations.length * POINTS_PER_VIOLATION);
    const notRead = verdict?.notRead ?? [];
    // Which way the files were judged is said only when a report was read:
    // without one the result reads exactly as it did before #599.
    const byReport = verdict?.report
      ? ` — files judged by their line coverage in ${verdict.report}`
      : '';

    return {
      passed: violations.length === 0 && notRead.length === 0,
      score,
      message:
        violations.length === 0
          ? `Test Coverage Constitutional Standard properly implemented${byReport}`
          : `Test coverage issues found: ${violations.slice(0, 2).join(', ')}${violations.length > 2 ? '...' : ''}`,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      config: context.config,
      fixable: true,
      ...(notRead.length > 0 ? { notRead } : {}),
    };
  }
}

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
import { TestFilesExistenceChecker } from '../../utils/testing/test-files-existence-checker';

export class TestCoverageConstitutionalStandardLaw {
  static check(context: LawCheckContext): LawResult {
    // The inspectors below only know how to see Jest: a jest config, a
    // package.json test script, `.test.ts` files. A Python project enforces the
    // very same concern with `pytest --cov` / `fail_under` / `[tool.coverage]`,
    // so their findings there report the absence of a toolchain the project
    // does not use. That is not a violation — the concern is satisfied.
    if (this.isCoverageSatisfiedByPython(context.projectRoot)) {
      return this.createResult([], [], context);
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

    // Check for test files existence - delegated to test files checker
    const testFilesAnalysis = TestFilesExistenceChecker.checkTestFilesExistence(
      context.projectRoot,
      context.config
    );
    violations.push(...testFilesAnalysis.violations);
    suggestions.push(...testFilesAnalysis.suggestions);

    return this.createResult(violations, suggestions, context);
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
    context: LawCheckContext
  ): LawResult {
    const score = Math.max(0, 100 - violations.length * 15);

    return {
      passed: violations.length === 0,
      score,
      message:
        violations.length === 0
          ? 'Test Coverage Constitutional Standard properly implemented'
          : `Test coverage issues found: ${violations.slice(0, 2).join(', ')}${violations.length > 2 ? '...' : ''}`,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      config: context.config,
      fixable: true,
    };
  }
}

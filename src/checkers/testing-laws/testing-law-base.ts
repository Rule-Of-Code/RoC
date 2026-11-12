/**
 * Testing Law Base Class
 * Base functionality for all testing-related laws
 */

import type { RuleOfCodeConfig } from '../../types/law.types';
import { LawBase } from '../law-base';
import { TestFileDiscovery } from '../../laws/testing/test-file-discovery';
import { PathOperations } from '../../utils/path-operations';

/** A Cypress spec, which the test-name pattern does not cover. */
const CYPRESS_SPEC_NAME = /\.cy\.ts$/;

export class TestingLawBase extends LawBase {
  // Inherits createResult() from LawBase

  /**
   * Checks if a file is a test file
   */
  static isTestFile(filePath: string): boolean {
    return (
      filePath.includes('.spec.') ||
      filePath.includes('.test.') ||
      filePath.includes('__tests__') ||
      filePath.includes('/test/')
    );
  }

  /**
   * The project's test files (absolute paths), read through the same
   * discovery as the isolation twins: the project's `ignores` and
   * `includes` apply, matched against the path from the project root.
   *
   * This used to be a glob with five fixed ignores and no config at all, so
   * an `ignores.global` entry such as `src/vendor/**` hid nothing from the
   * laws built on it (#304). The whole project is the search root here —
   * unlike the twins, these laws never limited themselves to src/apps/libs —
   * and Cypress `*.cy.ts` specs stay in, as they were.
   */
  protected static getTestFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    return TestFileDiscovery.findTestFiles(
      projectRoot,
      config,
      [projectRoot],
      name => TestFileDiscovery.isTestFile(name) || CYPRESS_SPEC_NAME.test(name)
    );
  }

  /** A path for findings: from the project root, with forward slashes. */
  protected static displayPath(projectRoot: string, file: string): string {
    return PathOperations.getRelative(projectRoot, file);
  }

  /**
   * Calculates test coverage percentage estimation
   */
  static estimateTestCoverage(
    sourceFiles: string[],
    testFiles: string[]
  ): number {
    if (sourceFiles.length === 0) return 0;

    const testedFiles = testFiles.filter(testFile => {
      const testBaseName = testFile.replace(/\.(spec|test)\.(ts|js)$/, '');
      return sourceFiles.some(
        sourceFile =>
          sourceFile.includes(testBaseName) || testBaseName.includes(sourceFile)
      );
    });

    return Math.round((testedFiles.length / sourceFiles.length) * 100);
  }

  /**
   * Generic error result builder for test analysis
   * Consolidates duplicate error handling pattern
   * Parameters are specifically for testing laws (not for general law context)
   */
  static createTestingErrorResult(
    errorTitle: string,
    error: unknown,
    config: RuleOfCodeConfig
  ) {
    return {
      passed: false,
      message: `❌ ${errorTitle}: Error during analysis`,
      details: [
        `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
      violations: [],
      suggestions: ['Check project structure and test files'],
      score: 0,
      fixable: false,
      config,
    };
  }
}

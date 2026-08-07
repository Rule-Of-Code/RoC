/**
 * Testing Law Base Class
 * Base functionality for all testing-related laws
 */

import type { RuleOfCodeConfig } from '../../types/law.types';
import { LawBase } from '../law-base';

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
   * Get test files from project
   * RULE 2: Consolidated test file detection pattern used by multiple testing laws
   * Note: Uses glob directly to find test files, bypassing normal ignore patterns
   */
  protected static getTestFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    // Use glob directly to find test files (*.spec.ts, *.test.ts, *.cy.ts)
    const { glob } = require('glob');
    const testPatterns = [
      '**/*.spec.ts',
      '**/*.spec.js',
      '**/*.test.ts',
      '**/*.test.js',
      '**/*.cy.ts',
    ];

    const testFiles: string[] = [];
    for (const pattern of testPatterns) {
      const files = glob.sync(pattern, {
        cwd: projectRoot,
        absolute: true,
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/.nx/**',
          '**/.angular/**',
          '**/coverage/**',
        ],
      });
      testFiles.push(...files);
    }

    return testFiles;
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

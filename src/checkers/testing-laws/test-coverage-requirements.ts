/**
 * Test Coverage Requirements Law
 * Ensures adequate test coverage across the codebase
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { ConfigHelper } from '../../utils/config-helper';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { TestingLawBase } from './testing-law-base';

export class TestCoverageRequirementsLaw extends TestingLawBase {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Get all source files
    const config = ConfigHelper.getConfigFromContext(context);
    const sourceFiles = this.getSourceFiles(context.projectRoot, config);
    const testFiles = this.getTestFiles(context.projectRoot, config);

    if (sourceFiles.length === 0) {
      violations.push('No source files found');
      suggestions.push('Ensure source files exist in src directory');
      return TestingLawBase.createResult(
        violations,
        'Test Coverage Requirements',
        'TESTING',
        suggestions,
        context
      );
    }

    // Validate test coverage
    this.validateCoverage(
      sourceFiles,
      testFiles,
      violations,
      suggestions,
      context
    );

    // Check for untested files
    this.checkUntestedFiles(
      sourceFiles,
      testFiles,
      violations,
      suggestions,
      context
    );

    // Check test configuration
    this.checkTestConfig(context.projectRoot, violations, suggestions);

    // Check critical files
    this.checkCriticalFiles(sourceFiles, testFiles, violations, suggestions);

    // Check test quality
    this.checkTestQuality(testFiles, violations, suggestions);

    return TestingLawBase.createResult(
      violations,
      'Test Coverage Requirements',
      'TESTING',
      suggestions,
      context
    );
  }

  private static getSourceFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    // Use CheckerUtils to find TypeScript source files with proper ignore handling
    const allTsFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().TYPESCRIPT,
      config
    );

    // Filter out test files for coverage calculation
    return allTsFiles.filter(file => {
      const fileName = PathOperations.getBasename(file);
      return (
        !TestingLawBase.isTestFile(fileName) && !fileName.endsWith('.d.ts')
      );
    });
  }

  private static validateCoverage(
    sourceFiles: string[],
    testFiles: string[],
    violations: string[],
    suggestions: string[],
    context: LawCheckContext
  ): void {
    const testCoveragePercentage = TestingLawBase.estimateTestCoverage(
      sourceFiles,
      testFiles
    );
    const minCoverageThreshold =
      context.config.thresholds?.testing?.minCoveragePercent ?? 100;

    if (testCoveragePercentage < minCoverageThreshold) {
      violations.push(
        `Test coverage is ${testCoveragePercentage}%, below minimum ${minCoverageThreshold}%`
      );
      suggestions.push(
        `Add tests to reach at least ${minCoverageThreshold}% coverage`
      );
      suggestions.push('Focus on testing core business logic and components');
    }
  }

  private static checkUntestedFiles(
    sourceFiles: string[],
    testFiles: string[],
    violations: string[],
    suggestions: string[],
    context: LawCheckContext
  ): void {
    const untestedFiles = this.getUntestedFiles(sourceFiles, testFiles);

    if (untestedFiles.length > 0) {
      violations.push(
        `${untestedFiles.length} source files have no corresponding tests`
      );
      const maxShow =
        context.config.thresholds?.testing?.maxUntestedFilesToShow ?? 5;
      suggestions.push(
        `Create test files for: ${untestedFiles.slice(0, maxShow).join(', ')}`
      );

      if (untestedFiles.length > maxShow) {
        suggestions.push(`...and ${untestedFiles.length - maxShow} more files`);
      }
    }
  }

  private static checkTestConfig(
    projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const hasTestConfig = this.checkTestConfiguration(projectRoot);
    if (!hasTestConfig.hasConfig) {
      violations.push('No test configuration found');
      suggestions.push('Configure Jest or Karma for testing');
      suggestions.push('Add jest.config.js or karma.conf.js');
    }

    if (!hasTestConfig.hasCoverageConfig) {
      violations.push('No test coverage reporting configured');
      suggestions.push('Enable code coverage in test configuration');
      suggestions.push('Add coverage reporters (lcov, html, text)');
    }
  }

  private static checkCriticalFiles(
    sourceFiles: string[],
    testFiles: string[],
    violations: string[],
    suggestions: string[]
  ): void {
    const criticalFiles = this.getCriticalFiles(sourceFiles);
    const untestedCriticalFiles = criticalFiles.filter(
      file => !testFiles.some(testFile => this.isTestForFile(testFile, file))
    );

    if (untestedCriticalFiles.length > 0) {
      violations.push(
        `Critical files without tests: ${untestedCriticalFiles
          .map(f => PathOperations.getBasename(f))
          .join(', ')}`
      );
      suggestions.push(
        'Prioritize testing for services, guards, and interceptors'
      );
    }
  }

  private static checkTestQuality(
    testFiles: string[],
    violations: string[],
    suggestions: string[]
  ): void {
    const testQualityIssues = this.analyzeTestQuality(testFiles);

    if (testQualityIssues.emptyTests > 0) {
      violations.push(
        `${testQualityIssues.emptyTests} test files appear to be empty or minimal`
      );
      suggestions.push('Add meaningful test cases to empty test files');
    }

    if (testQualityIssues.noAssertions > 0) {
      violations.push(
        `${testQualityIssues.noAssertions} test files have no assertions`
      );
      suggestions.push('Add expect() assertions to verify behavior');
    }
  }

  private static getUntestedFiles(
    sourceFiles: string[],
    testFiles: string[]
  ): string[] {
    return sourceFiles.filter(sourceFile => {
      return !testFiles.some(testFile =>
        this.isTestForFile(testFile, sourceFile)
      );
    });
  }

  private static isTestForFile(testFile: string, sourceFile: string): boolean {
    const testBaseName = PathOperations.getBasename(testFile).replace(
      /\.(spec|test)$/,
      ''
    );
    const sourceBaseName = PathOperations.getBasename(sourceFile);

    return testBaseName === sourceBaseName;
  }

  private static checkTestConfiguration(projectRoot: string): {
    hasConfig: boolean;
    hasCoverageConfig: boolean;
  } {
    const configFiles = [
      'jest.config.js',
      'jest.config.ts',
      'karma.conf.js',
      'angular.json',
    ];

    let hasConfig = false;
    let hasCoverageConfig = false;

    for (const configFile of configFiles) {
      const configPath = PathOperations.join(projectRoot, configFile);

      if (FileUtils.exists(configPath)) {
        hasConfig = true;

        try {
          const content = FileUtils.readFile(configPath);

          if (
            content.includes('coverage') ||
            content.includes('collectCoverage') ||
            content.includes('codeCoverage')
          ) {
            hasCoverageConfig = true;
          }
        } catch (_error) {
          continue;
        }
      }
    }

    return { hasConfig, hasCoverageConfig };
  }

  private static getCriticalFiles(sourceFiles: string[]): string[] {
    return sourceFiles.filter(file => {
      const fileName = PathOperations.getBasename(file);
      return (
        fileName.includes('.service.') ||
        fileName.includes('.guard.') ||
        fileName.includes('.interceptor.') ||
        fileName.includes('.resolver.') ||
        fileName.includes('.pipe.')
      );
    });
  }

  private static analyzeTestQuality(testFiles: string[]): {
    emptyTests: number;
    noAssertions: number;
  } {
    let emptyTests = 0;
    let noAssertions = 0;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile);
        const lines = content.split('\n').filter(line => line.trim() !== '');

        // Check if test file is too small (likely empty or minimal)
        if (lines.length < 10) {
          emptyTests++;
        }

        // Check for assertions
        if (
          !content.includes('expect(') &&
          !content.includes('assert') &&
          !content.includes('should')
        ) {
          noAssertions++;
        }
      } catch (_error) {
        continue;
      }
    }

    return { emptyTests, noAssertions };
  }
}

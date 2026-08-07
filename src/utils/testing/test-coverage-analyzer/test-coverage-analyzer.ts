import { TestCoverageAnalyzerValidationPatterns } from './test-coverage-analyzer-validation-patterns';

/**
 * Test Coverage Analyzer
 * Facade for analyzing test coverage and edge cases
 * Delegates all logic to utility classes (RULE 2: Centralized validation)
 */
export class TestCoverageAnalyzer {
  static analyzeCoverage(
    content: string,
    file: string
  ): {
    violations: string[];
    suggestions: string[];
    coverageScore: number;
  } {
    return TestCoverageAnalyzerValidationPatterns.analyzeCoverage(
      content,
      file
    );
  }

  static analyzeCoverageAndEdgeCases(content: string): {
    testsEdgeCases: boolean;
    hasDependencies: boolean;
    usesMocks: boolean;
    mockingIssues: string[];
    edgeCaseRecommendations: string[];
  } {
    return TestCoverageAnalyzerValidationPatterns.analyzeCoverageAndEdgeCases(
      content
    );
  }

  static calculateOverallQuality(testFiles: string[]): {
    totalTests: number;
    averageTestsPerFile: number;
    filesWithoutTests: number;
    qualityScore: number;
  } {
    return TestCoverageAnalyzerValidationPatterns.calculateOverallQuality(
      testFiles
    );
  }

  static getTestCoverageRecommendations(): string[] {
    return Array.from(
      TestCoverageAnalyzerValidationPatterns.getTestCoverageRecommendations()
    );
  }

  static getMockingBestPractices(): {
    good: string[];
    bad: string[];
  } {
    const practices =
      TestCoverageAnalyzerValidationPatterns.getMockingBestPractices();
    return {
      good: Array.from(practices.good),
      bad: Array.from(practices.bad),
    };
  }
}

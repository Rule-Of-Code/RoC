import { FileUtils } from '../../file-utils';
import { TestCoverageAnalyzerConfiguration } from './test-coverage-analyzer-configuration';

/**
 * Test Coverage Analyzer Validation Patterns
 * Orchestrates coverage validation using centralized Configuration (RULE 2: Optimize internals)
 * Replaces duplicated detection logic with configuration-driven analysis
 */
export class TestCoverageAnalyzerValidationPatterns {
  /**
   * Detect mocking issues in content using centralized patterns
   * RULE 2: Configuration-driven iteration replaces duplicate if-checks
   * Eliminates 4 separate if-blocks with single unified loop
   */
  static detectMockingIssues(content: string): string[] {
    const issues: string[] = [];

    for (const config of TestCoverageAnalyzerConfiguration.MOCKING_ISSUE_DETECTION_CONFIGS) {
      if (config.checker(content)) {
        issues.push(config.message);
      }
    }

    return issues;
  }

  /**
   * Generate edge case recommendations using centralized patterns
   * RULE 2: Configuration-driven iteration replaces duplicate if-checks
   * Eliminates 5 separate if-blocks with single unified loop
   */
  static generateEdgeCaseRecommendations(content: string): string[] {
    const recommendations: string[] = [];

    for (const config of TestCoverageAnalyzerConfiguration.EDGE_CASE_RECOMMENDATION_CONFIGS) {
      if (config.checker(content)) {
        recommendations.push(config.message);
      }
    }

    return recommendations;
  }

  /**
   * Analyze coverage and edge cases using centralized Configuration
   * RULE 2: Unified analysis method replaces multiple boolean checks
   */
  static analyzeCoverageAndEdgeCases(content: string): {
    testsEdgeCases: boolean;
    hasDependencies: boolean;
    usesMocks: boolean;
    mockingIssues: string[];
    edgeCaseRecommendations: string[];
  } {
    const testsEdgeCases =
      TestCoverageAnalyzerConfiguration.testsEdgeCases(content);
    const hasDependencies =
      TestCoverageAnalyzerConfiguration.hasDependencies(content);
    const usesMocks = TestCoverageAnalyzerConfiguration.usesMocks(content);
    const mockingIssues = this.detectMockingIssues(content);
    const edgeCaseRecommendations =
      this.generateEdgeCaseRecommendations(content);

    return {
      testsEdgeCases,
      hasDependencies,
      usesMocks,
      mockingIssues,
      edgeCaseRecommendations,
    };
  }

  /**
   * Analyze coverage for a single file
   */
  static analyzeCoverage(
    content: string,
    file: string
  ): {
    violations: string[];
    suggestions: string[];
    coverageScore: number;
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const coverageAndEdges = this.analyzeCoverageAndEdgeCases(content);

    violations.push(...coverageAndEdges.mockingIssues);
    suggestions.push(...coverageAndEdges.edgeCaseRecommendations);

    if (!coverageAndEdges.testsEdgeCases) {
      TestCoverageAnalyzerConfiguration.addViolationSuggestionPair(
        violations,
        suggestions,
        TestCoverageAnalyzerConfiguration.COVERAGE_MESSAGES.NO_EDGE_CASES_VIOLATION.replace(
          '{fileName}',
          file
        ),
        TestCoverageAnalyzerConfiguration.COVERAGE_MESSAGES
          .NO_EDGE_CASES_SUGGESTION
      );
    }

    if (coverageAndEdges.hasDependencies && !coverageAndEdges.usesMocks) {
      TestCoverageAnalyzerConfiguration.addViolationSuggestionPair(
        violations,
        suggestions,
        TestCoverageAnalyzerConfiguration.COVERAGE_MESSAGES.DEPENDENCIES_WITHOUT_MOCKS_VIOLATION.replace(
          '{fileName}',
          file
        ),
        TestCoverageAnalyzerConfiguration.COVERAGE_MESSAGES
          .DEPENDENCIES_WITHOUT_MOCKS_SUGGESTION
      );
    }

    const coverageScore = Math.max(
      0,
      100 -
        violations.length *
          TestCoverageAnalyzerConfiguration.COVERAGE_SCORE_MULTIPLIER
    );

    return {
      violations,
      suggestions,
      coverageScore,
    };
  }

  /**
   * Calculate overall quality metrics for test files
   */
  static calculateOverallQuality(testFiles: string[]): {
    totalTests: number;
    averageTestsPerFile: number;
    filesWithoutTests: number;
    qualityScore: number;
  } {
    let totalTests = 0;
    let filesWithoutTests = 0;
    const qualityMetrics =
      TestCoverageAnalyzerConfiguration.getDefaultQualityMetrics();

    testFiles.forEach(file => {
      try {
        const content = FileUtils.readFile(file, { encoding: 'utf8' });
        const testCount =
          TestCoverageAnalyzerConfiguration.countTestBlocks(content);

        if (testCount === 0) {
          filesWithoutTests++;
        } else {
          totalTests += testCount;

          // Quality metrics using centralized patterns
          TestCoverageAnalyzerConfiguration.updateQualityMetrics(
            content,
            qualityMetrics
          );
        }
      } catch (_error) {
        filesWithoutTests++;
      }
    });

    const validFiles = testFiles.length - filesWithoutTests;
    const averageTestsPerFile = validFiles > 0 ? totalTests / validFiles : 0;

    // Calculate quality score (0-100) using centralized weights
    const qualityScore =
      validFiles > 0
        ? (qualityMetrics.hasDescribeBlocks / validFiles) *
            TestCoverageAnalyzerConfiguration.QUALITY_SCORE_WEIGHTS
              .DESCRIBE_BLOCKS +
          (qualityMetrics.hasAssertion / validFiles) *
            TestCoverageAnalyzerConfiguration.QUALITY_SCORE_WEIGHTS.ASSERTIONS +
          (qualityMetrics.hasEdgeCases / validFiles) *
            TestCoverageAnalyzerConfiguration.QUALITY_SCORE_WEIGHTS.EDGE_CASES +
          (qualityMetrics.usesMocks / validFiles) *
            TestCoverageAnalyzerConfiguration.QUALITY_SCORE_WEIGHTS.MOCKING
        : 0;

    return {
      totalTests,
      averageTestsPerFile,
      filesWithoutTests,
      qualityScore: Math.round(qualityScore),
    };
  }

  /**
   * Get test coverage recommendations from centralized configuration
   * RULE 1: Single source of truth for recommendations
   */
  static getTestCoverageRecommendations(): readonly string[] {
    return TestCoverageAnalyzerConfiguration.TEST_COVERAGE_RECOMMENDATIONS;
  }

  /**
   * Get mocking best practices from centralized configuration
   * RULE 1: Single source of truth for best practices
   */
  static getMockingBestPractices(): {
    good: readonly string[];
    bad: readonly string[];
  } {
    return TestCoverageAnalyzerConfiguration.MOCKING_BEST_PRACTICES;
  }
}

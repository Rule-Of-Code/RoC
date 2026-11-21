import { CodeText } from '../../code-text';
import { FileUtils } from '../../file-utils';
import { loadTypeScript } from '../../react/tsx-source';
import { TestCoverageAnalyzerConfiguration } from './test-coverage-analyzer-configuration';

/** A test file's code (comments and literals blanked) and the clients it loads. */
export interface CodeReading {
  code: string;
  networkClients: string[];
}

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
  static detectMockingIssues(
    content: string,
    code: string | null = TestCoverageAnalyzerValidationPatterns.read(content)
      ?.code ?? null
  ): string[] {
    const issues: string[] = [];

    for (const config of TestCoverageAnalyzerConfiguration.MOCKING_ISSUE_DETECTION_CONFIGS) {
      // A check that reads code is not run on text when there is no code
      // to read (no parser): the caller says the file was not read (#427).
      const subject = config.readsCode ? code : content;
      if (subject !== null && config.checker(subject)) {
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
  static analyzeCoverageAndEdgeCases(
    content: string,
    reading: CodeReading | null = TestCoverageAnalyzerValidationPatterns.read(
      content
    )
  ): {
    testsEdgeCases: boolean;
    /** The network and service clients the test loads with no double in its code. */
    unmockedClients: string[];
    usesMocks: boolean;
    mockingIssues: string[];
    edgeCaseRecommendations: string[];
  } {
    const testsEdgeCases =
      TestCoverageAnalyzerConfiguration.testsEdgeCases(content);
    const unmockedClients =
      reading && !TestCoverageAnalyzerConfiguration.hasTestDouble(reading.code)
        ? reading.networkClients
        : [];
    const usesMocks = TestCoverageAnalyzerConfiguration.usesMocks(content);
    const mockingIssues = this.detectMockingIssues(
      content,
      reading?.code ?? null
    );
    const edgeCaseRecommendations =
      this.generateEdgeCaseRecommendations(content);

    return {
      testsEdgeCases,
      unmockedClients,
      usesMocks,
      mockingIssues,
      edgeCaseRecommendations,
    };
  }

  /**
   * What the mocking checks read of a file, with this machine's parser —
   * for a direct caller; the law builds it once per file, with the
   * project's parser, or passes null when there is none.
   */
  static read(content: string, fileName = 'file.ts'): CodeReading | null {
    const ts = loadTypeScript(process.cwd());
    if (!ts) return null;
    return {
      code: CodeText.codeOnly(content, fileName),
      networkClients: TestCoverageAnalyzerConfiguration.networkClientsImported(
        ts,
        content,
        fileName
      ),
    };
  }

  /**
   * Analyze coverage for a single file
   */
  static analyzeCoverage(
    content: string,
    file: string,
    reading: CodeReading | null = TestCoverageAnalyzerValidationPatterns.read(
      content,
      file
    )
  ): {
    violations: string[];
    suggestions: string[];
    coverageScore: number;
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const coverageAndEdges = this.analyzeCoverageAndEdgeCases(content, reading);

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

    // A network or service client loaded with no double (#429). The module
    // under test, the filesystem and a child process are not such a
    // dependency; the finding names the clients.
    if (coverageAndEdges.unmockedClients.length > 0) {
      TestCoverageAnalyzerConfiguration.addViolationSuggestionPair(
        violations,
        suggestions,
        TestCoverageAnalyzerConfiguration.COVERAGE_MESSAGES.DEPENDENCIES_WITHOUT_MOCKS_VIOLATION.replace(
          '{fileName}',
          file
        ).replace('{clients}', coverageAndEdges.unmockedClients.join(', ')),
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

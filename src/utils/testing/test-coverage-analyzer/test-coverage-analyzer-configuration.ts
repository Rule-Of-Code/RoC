/**
 * Test Coverage Analyzer Configuration
 * Centralized configuration for coverage patterns and validation (RULE 1: Single source of truth)
 * Eliminates hardcoded patterns and messages scattered across methods
 */

/**
 * Configuration for mocking issue detection (RULE 1: Single source of truth)
 * Maps detection logic to issue messages for configuration-driven iteration
 */
interface MockingIssueDetectionConfig {
  checker: (content: string) => boolean;
  message: string;
}

/**
 * Configuration for edge case recommendation detection
 * Maps detection logic to recommendation messages for configuration-driven iteration
 */
interface EdgeCaseRecommendationConfig {
  checker: (content: string) => boolean;
  message: string;
}

export class TestCoverageAnalyzerConfiguration {
  /**
   * Quality metric thresholds (RULE 1: Eliminate hardcoded magic numbers)
   */
  static readonly MOCKING_TO_TEST_RATIO_THRESHOLD = 2; // Excessive if mocks > tests * 2
  static readonly INTERNAL_MOCKS_THRESHOLD = 3; // Max internal mocks before flagging as excessive
  static readonly MOCK_PATTERN_MULTIPLIER =
    /jest\.fn\(|mockImplementation|mockReturnValue/g;
  static readonly INTERNAL_MOCK_PATTERN = /jest\.mock\s*\(['"]\.\.\/.*?['"]\)/g;

  /**
   * Edge case detection patterns (RULE 1: Centralized pattern definitions)
   * Note: Using /i flag only (not /gi) since these are used with .test()
   * which has issues with global regex state
   */
  static readonly EDGE_CASE_PATTERNS = {
    NULL_CHECK: /null/i,
    UNDEFINED_CHECK: /undefined/i,
    EMPTY_VALUE: /empty/i,
    ZERO_VALUE: /zero/i,
    NEGATIVE_VALUE: /negative/i,
    BOUNDARY_VALUE: /boundary/i,
    LIMIT_VALUE: /limit/i,
    MAX_VALUE: /max/i,
    MIN_VALUE: /min/i,
    EDGE_CASE: /edge\s*case/i,
    INVALID_VALUE: /invalid/i,
    ERROR_CASE: /error/i,
    EXCEPTION_CASE: /exception/i,
  } as const;

  /**
   * Edge-case signals in the test BODY — the assertions and inputs a real
   * edge-case test uses. The old check read only it()/describe() TITLES, so a
   * spec full of `.toThrow()`, null/undefined inputs and empty-collection
   * assertions was scored as testing NO edge cases — punishing exactly the
   * tests it should reward (a consumer's violations rose as they added genuine
   * edge-case specs). These are matched against the whole file.
   */
  static readonly EDGE_CASE_BODY_PATTERNS = {
    TO_THROW: /\.toThrow/,
    REJECTS: /\.rejects\b/,
    TO_BE_NULL: /\.toBeNull\b/,
    TO_BE_UNDEFINED: /\.toBeUndefined\b/,
    TO_BE_NAN: /\.toBeNaN\b/,
    NULL_LITERAL: /\bnull\b/,
    UNDEFINED_LITERAL: /\bundefined\b/,
    NAN_LITERAL: /\bNaN\b/,
    INFINITY_LITERAL: /\bInfinity\b/,
  } as const;

  /**
   * Dependency detection patterns
   * Note: Not using /g flag since these are used with .test()
   */
  static readonly DEPENDENCY_PATTERNS = {
    IMPORT_STATEMENT: /import\s+.*from/,
    REQUIRE_CALL: /require\s*\(/,
    INJECT_FUNCTION: /inject\(/,
    TEST_BED: /TestBed/,
  } as const;

  /**
   * Mock detection patterns
   * Note: Not using /g flag since these are used with .test()
   */
  static readonly MOCK_PATTERNS = {
    JEST_FN: /jest\.fn\(/,
    JEST_MOCK: /jest\.mock\(/,
    MOCK_IMPLEMENTATION: /mockImplementation/,
    MOCK_RETURN_VALUE: /mockReturnValue/,
    SPY: /spy/i,
    STUB: /stub/i,
    FAKE: /fake/i,
    SINON: /sinon/i,
  } as const;

  /**
   * Test pattern detection
   */
  static readonly TEST_PATTERNS = {
    IT_BLOCK: /it\s*\(/g,
    IT_BLOCK_DESCRIPTION: /it\s*\(['"].*?['"]\)/g,
    DESCRIBE_BLOCK: /describe\(/,
    DESCRIBE_BLOCK_DESCRIPTION: /describe\s*\(['"].*?['"]\)/g,
    EXPECT_STATEMENT: /expect\(/,
    TO_THROW: /toThrow/,
  } as const;

  /**
   * Centralized mocking issue messages (RULE 1: Single source of truth)
   */
  /**
   * A request actually being MADE: `fetch(…)`, an axios/http client method, or
   * Angular's `HttpClient` being used. A URL is not a call — the text
   * `https://example.com` in a comment says nothing about what the test does.
   */
  static readonly HTTP_CALL_PATTERN =
    /\bfetch\s*\(|\bXMLHttpRequest\b|\baxios\s*\(|\b(?:axios|got|superagent|https?|httpClient|HttpClient|apiClient)\s*\.\s*(?:get|post|put|patch|delete|del|request|head|options)\s*(?:<[^>]*>\s*)?\(/;

  static readonly MOCKING_ISSUE_MESSAGES = {
    MOCKS_WITHOUT_CLEANUP:
      'Mock functions without cleanup may cause test interference',
    EXCESSIVE_MOCKING:
      'Excessive mocking detected - consider integration testing approach',
    UNMOCKED_HTTP_CALLS: 'HTTP calls should be mocked in unit tests',
    EXCESSIVE_INTERNAL_MOCKING:
      'Excessive mocking of internal modules may indicate tight coupling',
  } as const;

  /**
   * Centralized edge case recommendation messages (RULE 1: Single source of truth)
   */
  static readonly EDGE_CASE_RECOMMENDATION_MESSAGES = {
    NULL_UNDEFINED_TESTS: 'Consider testing null and undefined input scenarios',
    ERROR_HANDLING_TESTS:
      'Consider testing error conditions and exception handling',
    BOUNDARY_VALUE_TESTS: 'Consider testing boundary values and limits',
    EMPTY_ARRAY_TESTS: 'Consider testing empty array scenarios',
    EMPTY_STRING_TESTS:
      'Consider testing empty strings and whitespace scenarios',
  } as const;

  /**
   * Mocking issue detection configuration (RULE 1: Eliminate duplicate checks)
   * Maps detection logic to issue messages for configuration-driven iteration
   */
  static readonly MOCKING_ISSUE_DETECTION_CONFIGS: MockingIssueDetectionConfig[] =
    [
      {
        // A suite that resets mocks the standard afterEach way — clearAllMocks /
        // resetAllMocks / restoreAllMocks — is doing cleanup; the old check only
        // recognised the per-mock `mockClear` and flagged the common global form.
        checker: (content: string) =>
          content.includes('jest.fn()') &&
          !/mockClear|clearAllMocks|resetAllMocks|restoreAllMocks|mockReset|mockRestore/.test(
            content
          ),
        message:
          TestCoverageAnalyzerConfiguration.MOCKING_ISSUE_MESSAGES
            .MOCKS_WITHOUT_CLEANUP,
      },
      {
        checker: (content: string): boolean => {
          const mockCount =
            TestCoverageAnalyzerConfiguration.countMockPatterns(content);
          const testCount =
            TestCoverageAnalyzerConfiguration.countTestBlocks(content);
          return (
            mockCount >
            testCount *
              TestCoverageAnalyzerConfiguration.MOCKING_TO_TEST_RATIO_THRESHOLD
          );
        },
        message:
          TestCoverageAnalyzerConfiguration.MOCKING_ISSUE_MESSAGES
            .EXCESSIVE_MOCKING,
      },
      {
        // A CALL, not the substring "http" anywhere in the file. `includes('http')`
        // matched a URL in a comment, a JSDoc link and an import path, so a spec
        // that makes no network request at all was told to mock its HTTP calls —
        // a message that sends the reader looking for code that is not there.
        checker: (content: string) =>
          TestCoverageAnalyzerConfiguration.HTTP_CALL_PATTERN.test(content) &&
          !content.includes('mock') &&
          !content.includes('stub'),
        message:
          TestCoverageAnalyzerConfiguration.MOCKING_ISSUE_MESSAGES
            .UNMOCKED_HTTP_CALLS,
      },
      {
        checker: (content: string): boolean => {
          const internalMocks = content.match(
            TestCoverageAnalyzerConfiguration.INTERNAL_MOCK_PATTERN
          );
          return (
            internalMocks != null &&
            internalMocks.length >
              TestCoverageAnalyzerConfiguration.INTERNAL_MOCKS_THRESHOLD
          );
        },
        message:
          TestCoverageAnalyzerConfiguration.MOCKING_ISSUE_MESSAGES
            .EXCESSIVE_INTERNAL_MOCKING,
      },
    ];

  /**
   * Edge case recommendation detection configuration (RULE 1: Eliminate duplicate checks)
   * Maps detection logic to recommendation messages for configuration-driven iteration
   */
  static readonly EDGE_CASE_RECOMMENDATION_CONFIGS: EdgeCaseRecommendationConfig[] =
    [
      {
        checker: (content: string) =>
          !content.includes('null') && !content.includes('undefined'),
        message:
          TestCoverageAnalyzerConfiguration.EDGE_CASE_RECOMMENDATION_MESSAGES
            .NULL_UNDEFINED_TESTS,
      },
      {
        checker: (content: string) =>
          !content.includes('toThrow') && !content.includes('error'),
        message:
          TestCoverageAnalyzerConfiguration.EDGE_CASE_RECOMMENDATION_MESSAGES
            .ERROR_HANDLING_TESTS,
      },
      {
        checker: (content: string) =>
          !content.includes('boundary') && !content.includes('limit'),
        message:
          TestCoverageAnalyzerConfiguration.EDGE_CASE_RECOMMENDATION_MESSAGES
            .BOUNDARY_VALUE_TESTS,
      },
      {
        checker: (content: string) =>
          (content.includes('array') || content.includes('Array')) &&
          !content.includes('empty'),
        message:
          TestCoverageAnalyzerConfiguration.EDGE_CASE_RECOMMENDATION_MESSAGES
            .EMPTY_ARRAY_TESTS,
      },
      {
        checker: (content: string) =>
          (content.includes('string') || content.includes('String')) &&
          !content.includes('empty') &&
          !content.includes('whitespace'),
        message:
          TestCoverageAnalyzerConfiguration.EDGE_CASE_RECOMMENDATION_MESSAGES
            .EMPTY_STRING_TESTS,
      },
    ];

  /**
   * Test coverage recommendations (RULE 1: Centralized)
   */
  static readonly TEST_COVERAGE_RECOMMENDATIONS = [
    'Test edge cases including null, undefined, and empty values',
    'Test error conditions and exception handling',
    'Test boundary values and limits',
    'Mock external dependencies but avoid over-mocking',
    'Clean up mocks between tests to prevent interference',
    'Use integration tests for complex inter-module interactions',
    'Aim for meaningful test coverage, not just high percentage',
    'Include both positive and negative test scenarios',
  ] as const;

  /**
   * Mocking best practices (RULE 1: Centralized)
   */
  static readonly MOCKING_BEST_PRACTICES = {
    good: [
      'Mock external dependencies (HTTP, database, file system)',
      'Use jest.clearAllMocks() in beforeEach for clean state',
      'Mock at the module boundary, not internal implementation',
      'Verify mock calls with toHaveBeenCalledWith()',
      'Use spies to verify behavior without changing implementation',
    ] as const,
    bad: [
      'Mocking every dependency regardless of necessity',
      'Not cleaning up mocks between tests',
      'Mocking internal implementation details',
      'Over-mocking that makes tests brittle',
      'Forgetting to assert on mock calls when behavior matters',
    ] as const,
  } as const;

  /**
   * Quality scoring weights for test coverage analysis
   */
  static readonly QUALITY_SCORE_WEIGHTS = {
    DESCRIBE_BLOCKS: 25,
    ASSERTIONS: 30,
    EDGE_CASES: 25,
    MOCKING: 20,
  } as const;

  /**
   * Coverage violation and suggestion messages (RULE 1: Single source of truth)
   */
  static readonly COVERAGE_MESSAGES = {
    NO_EDGE_CASES_VIOLATION: 'No edge case testing found in {fileName}',
    NO_EDGE_CASES_SUGGESTION:
      'Add tests for edge cases like null, undefined, empty values',
    DEPENDENCIES_WITHOUT_MOCKS_VIOLATION:
      'Dependencies found but no mocking detected in {fileName}',
    DEPENDENCIES_WITHOUT_MOCKS_SUGGESTION:
      'Consider using mocks for external dependencies',
  } as const;

  /**
   * Analyze if content tests edge cases using centralized patterns
   */
  static testsEdgeCases(content: string): boolean {
    // Titles first — but capture the CANONICAL multiline form `it('title', () =>`.
    // The old regex required the quoted title to be immediately followed by `)`,
    // so it never matched a real test and always fell through to false.
    //
    // `test` is read as well as `it`. Playwright — and Jest, for anyone who
    // prefers it — declares tests with `test(...)`, and only `test.describe(...)`
    // survived a scan for `describe(`. A Playwright suite was therefore judged
    // on its describe titles alone and every test name inside it was invisible:
    // one consumer could read 24 titles out of 106, and a file written for
    // nothing but empty states was reported as testing no edge cases.
    //
    // Modifiers are allowed (`it.only`, `test.skip`, `test.describe`) because
    // the title follows them directly. The leading word boundary matters:
    // without it, `submit(` matched on its final `it`.
    const titles = [
      ...content.matchAll(
        /\b(?:it|test|describe)(?:\.\w+)*\s*\(\s*['"`]([^'"`]+)['"`]/g
      ),
    ]
      .map(match => match[1])
      .join(' ');
    if (
      Object.values(this.EDGE_CASE_PATTERNS).some(pattern =>
        pattern.test(titles)
      )
    ) {
      return true;
    }

    // ...then the body: a file that asserts throwing, or exercises
    // null/undefined/NaN, is testing edge cases whatever its titles say.
    return Object.values(this.EDGE_CASE_BODY_PATTERNS).some(pattern =>
      pattern.test(content)
    );
  }

  /**
   * Check if content has dependencies
   */
  static hasDependencies(content: string): boolean {
    return Object.values(this.DEPENDENCY_PATTERNS).some(pattern =>
      pattern.test(content)
    );
  }

  /**
   * Check if content uses mocks
   */
  static usesMocks(content: string): boolean {
    return Object.values(this.MOCK_PATTERNS).some(pattern =>
      pattern.test(content)
    );
  }

  /**
   * Count test blocks in content (RULE 1: Centralized)
   */
  static countTestBlocks(content: string): number {
    return (content.match(this.TEST_PATTERNS.IT_BLOCK) ?? []).length;
  }

  /**
   * Count mock patterns in content (RULE 1: Centralized helper)
   */
  static countMockPatterns(content: string): number {
    return (content.match(this.MOCK_PATTERN_MULTIPLIER) ?? []).length;
  }

  /**
   * Create default quality metrics object (RULE 1: Centralized)
   */
  static getDefaultQualityMetrics(): {
    hasDescribeBlocks: number;
    hasAssertion: number;
    hasEdgeCases: number;
    usesMocks: number;
  } {
    return {
      hasDescribeBlocks: 0,
      hasAssertion: 0,
      hasEdgeCases: 0,
      usesMocks: 0,
    };
  }

  /**
   * Update quality metrics for a test file (RULE 2: Centralized logic)
   */
  static updateQualityMetrics(
    content: string,
    metrics: {
      hasDescribeBlocks: number;
      hasAssertion: number;
      hasEdgeCases: number;
      usesMocks: number;
    }
  ): void {
    if (this.TEST_PATTERNS.DESCRIBE_BLOCK.test(content)) {
      metrics.hasDescribeBlocks++;
    }
    if (this.TEST_PATTERNS.EXPECT_STATEMENT.test(content)) {
      metrics.hasAssertion++;
    }
    if (this.testsEdgeCases(content)) {
      metrics.hasEdgeCases++;
    }
    if (this.usesMocks(content)) {
      metrics.usesMocks++;
    }
  }

  /**
   * Add violation-suggestion pair to arrays (RULE 2: Centralized)
   */
  static addViolationSuggestionPair(
    violations: string[],
    suggestions: string[],
    violationMessage: string,
    suggestionMessage: string
  ): void {
    violations.push(violationMessage);
    suggestions.push(suggestionMessage);
  }

  /**
   * Coverage score calculation constant (RULE 1: Centralized)
   */
  static readonly COVERAGE_SCORE_MULTIPLIER = 10;
}

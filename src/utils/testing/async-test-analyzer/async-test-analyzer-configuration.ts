/**
 * Async Test Analyzer Configuration
 * Centralized configuration for async test patterns and validation (RULE 1: Single source of truth)
 * Eliminates hardcoded patterns and messages scattered across methods
 */

/**
 * Configuration for issue detection (RULE 1: Single source of truth)
 * Maps detection logic to issue messages for configuration-driven iteration
 */
interface IssueDetectionConfig {
  checker: (content: string) => boolean;
  message: string;
}

/**
 * Configuration for recommendation detection (RULE 1: Single source of truth)
 * Maps detection logic to recommendation messages for configuration-driven iteration
 */
interface RecommendationDetectionConfig {
  checker: (content: string, hasProperAsyncHandling: boolean) => boolean;
  message: string;
}

export class AsyncTestAnalyzerConfiguration {
  /**
   * Core async detection patterns (RULE 1: Centralized pattern definitions)
   */
  static readonly ASYNC_TEST_PATTERNS = {
    ASYNC_FUNCTION_IN_IT: /it\s*\([^,]*,\s*async\s*\(/g,
    ASYNC_FUNCTION_IN_TEST: /test\s*\([^,]*,\s*async\s*\(/g,
    DONE_CALLBACK: /done\s*\)\s*=>/g,
    PROMISE_THEN: /\.then\(/g,
    AWAIT_KEYWORD: /await\s+/g,
    PROMISE_CONSTRUCTOR: /Promise\./g,
    SET_TIMEOUT: /setTimeout\(/g,
    SET_INTERVAL: /setInterval\(/g,
  } as const;

  /**
   * Async handling detection patterns
   */
  static readonly ASYNC_HANDLING_PATTERNS = {
    TEST_BLOCK: /it\s*\([^{]*{[^}]*}/g,
    ASYNC_TEST: /async\s*\(/,
    AWAIT_USAGE: /await\s+/,
    DONE_CALLBACK_USAGE: /done\s*\(\s*\)/,
    PROMISE_RETURN: /return\s+.*\.then\(/,
  } as const;

  /**
   * Centralized issue message constants (RULE 1: Single source of truth)
   * All issue messages defined here, used across configuration
   */
  static readonly ISSUE_MESSAGES = {
    PROMISE_CHAINS_WITHOUT_AWAIT:
      'Promise chains found that could use async/await syntax',
    SETTIMEOUT_WITHOUT_FAKE_TIMERS:
      'setTimeout usage without fake timers may cause test flakiness',
    PROMISE_WITHOUT_CATCH:
      'Promise chains without .catch() may cause unhandled rejections',
    MIXING_ASYNC_PATTERNS:
      'Mixing async/await with done() callback can cause issues',
    AWAITING_NON_PROMISE: 'Awaiting non-promise values detected',
  } as const;

  /**
   * Issue detection configuration (RULE 1: Eliminate duplicate checks)
   * Maps detection logic to issue messages for configuration-driven iteration
   */
  static readonly ISSUE_DETECTION_CONFIGS: IssueDetectionConfig[] = [
    {
      checker: (content: string) =>
        !!content.match(/(?<!await\s+)\w+\.[\w.]*\(.*\)\.then\(/g),
      message:
        AsyncTestAnalyzerConfiguration.ISSUE_MESSAGES
          .PROMISE_CHAINS_WITHOUT_AWAIT,
    },
    {
      checker: (content: string) =>
        content.includes('setTimeout') &&
        !content.includes('jest.useFakeTimers'),
      message:
        AsyncTestAnalyzerConfiguration.ISSUE_MESSAGES
          .SETTIMEOUT_WITHOUT_FAKE_TIMERS,
    },
    {
      checker: (content: string) =>
        !!content.match(/\.then\([^)]*\)(?!\.catch)/g),
      message:
        AsyncTestAnalyzerConfiguration.ISSUE_MESSAGES.PROMISE_WITHOUT_CATCH,
    },
    {
      checker: (content: string) =>
        content.includes('async') && content.includes('done()'),
      message:
        AsyncTestAnalyzerConfiguration.ISSUE_MESSAGES.MIXING_ASYNC_PATTERNS,
    },
    {
      checker: (content: string) =>
        !!content.match(
          /await\s+(?!\w+\(|\w+\.\w+\(|new\s+Promise)[\w.]+(?!\()/g
        ),
      message:
        AsyncTestAnalyzerConfiguration.ISSUE_MESSAGES.AWAITING_NON_PROMISE,
    },
  ];

  /**
   * Recommendations configuration (RULE 1: Eliminate hardcoded strings)
   * Maps condition keys to recommendation messages
   */
  static readonly RECOMMENDATION_CONFIG = {
    NO_ASYNC_HANDLING: 'Use async/await or done() callback for async tests',
    NO_FAKE_TIMERS: 'Consider using jest.useFakeTimers() for timer-based tests',
    PROMISE_WITHOUT_AWAIT: 'Use await with Promise-based operations',
  } as const;

  /**
   * Recommendation detection configuration (RULE 1: Eliminate duplicate checks)
   * Maps detection logic to recommendation messages for configuration-driven iteration
   */
  static readonly RECOMMENDATION_DETECTION_CONFIGS: RecommendationDetectionConfig[] =
    [
      {
        checker: (content: string, hasProperAsyncHandling: boolean) =>
          !hasProperAsyncHandling,
        message:
          AsyncTestAnalyzerConfiguration.RECOMMENDATION_CONFIG
            .NO_ASYNC_HANDLING,
      },
      {
        checker: (content: string) =>
          content.includes('setTimeout') &&
          !content.includes('jest.useFakeTimers'),
        message:
          AsyncTestAnalyzerConfiguration.RECOMMENDATION_CONFIG.NO_FAKE_TIMERS,
      },
      {
        checker: (content: string) =>
          content.includes('Promise.resolve') && !content.includes('await'),
        message:
          AsyncTestAnalyzerConfiguration.RECOMMENDATION_CONFIG
            .PROMISE_WITHOUT_AWAIT,
      },
    ];

  /**
   * Recommendations for async testing best practices (RULE 1: Centralized)
   */
  static readonly RECOMMENDATIONS = [
    'Use async/await instead of .then() chains for better readability',
    'Always handle promise rejections with try/catch or .catch()',
    'Use jest.useFakeTimers() for testing time-dependent code',
    'Avoid mixing async/await with done() callbacks',
    'Return promises from test functions when not using async/await',
    'Use waitFor() or similar utilities for async DOM updates',
    'Mock async dependencies to make tests deterministic',
  ] as const;

  /**
   * Code patterns examples (RULE 1: Centralized pattern library)
   * Single source of truth for all code pattern examples
   */
  static readonly CODE_PATTERNS = {
    good: [
      {
        code: 'it("should handle async operation", async () => { await asyncFunction(); expect(...).toBe(...); });',
        description: 'Proper async/await in test',
      },
      {
        code: 'it("should handle promise", () => { return asyncFunction().then(result => expect(result).toBe(...)); });',
        description: 'Promise-based test with proper return',
      },
      {
        code: 'it("should handle callback", (done) => { asyncFunction(result => { expect(result).toBe(...); done(); }); });',
        description: 'Done callback pattern',
      },
      {
        code: 'jest.useFakeTimers(); // for setTimeout/setInterval tests',
        description: 'Using fake timers for deterministic tests',
      },
    ] as const,
    bad: [
      {
        code: 'it("should handle async", () => { asyncFunction(); });',
        description: 'Missing await or return',
      },
      {
        code: 'it("should handle async", async (done) => { await asyncFunction(); done(); });',
        description: 'Mixing async/await with done() callback',
      },
      {
        code: 'asyncFunction().then(result => expect(result).toBe(expected));',
        description: 'Missing return statement',
      },
      {
        code: 'setTimeout(() => expect(...).toBe(...), 100);',
        description: 'Without fake timers - may cause flakiness',
      },
    ] as const,
  } as const;

  /**
   * Analyze if content has async tests using centralized patterns
   */
  static hasAsyncTests(content: string): boolean {
    return Object.values(this.ASYNC_TEST_PATTERNS).some(pattern =>
      pattern.test(content)
    );
  }

  /**
   * Detect if async handling is proper in test block
   */
  static hasProperAsyncHandling(testBlock: string): boolean {
    const hasAsync = this.ASYNC_HANDLING_PATTERNS.ASYNC_TEST.test(testBlock);
    const hasAwait = this.ASYNC_HANDLING_PATTERNS.AWAIT_USAGE.test(testBlock);
    const hasDone =
      this.ASYNC_HANDLING_PATTERNS.DONE_CALLBACK_USAGE.test(testBlock);
    const hasPromiseReturn =
      this.ASYNC_HANDLING_PATTERNS.PROMISE_RETURN.test(testBlock);

    return (hasAsync && hasAwait) || hasDone || hasPromiseReturn;
  }
}

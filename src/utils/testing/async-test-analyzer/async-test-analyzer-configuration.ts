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
        AsyncTestAnalyzerConfiguration.waitsOnRealTimer(content),
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
        AsyncTestAnalyzerConfiguration.AWAITED_LITERAL.test(content),
      message:
        AsyncTestAnalyzerConfiguration.ISSUE_MESSAGES.AWAITING_NON_PROMISE,
    },
  ];

  /**
   * Recommendations configuration (RULE 1: Eliminate hardcoded strings)
   * Maps condition keys to recommendation messages
   */
  /**
   * `await` applied to something that CANNOT be a promise — a number, a string,
   * a boolean, `null`/`undefined`, or an array (where `Promise.all` was meant).
   *
   * Narrowed to literals because that is the whole set this analyzer can be
   * right about. It used to flag `await <anything that is not a one- or
   * two-level call>`, which reported:
   *
   * - `await page.keyboard.press('Escape')` — a three-level call, and any
   *   fluent API produces them;
   * - `await expect` at the end of a line, because the formatter wrapped
   *   `.poll(…)` onto the next one, making the finding depend on line width
   *   rather than on the code;
   * - `await promiseVariable`, which is correct code and indistinguishable from
   *   the mistake without type information.
   *
   * A test could satisfy it only by abandoning fluent APIs or fighting the
   * formatter, so it reported test-quality debt that could not be paid.
   *
   * Object literals are deliberately absent: `await { then() {} }` awaits a
   * thenable and is legitimate.
   */
  /**
   * A `setTimeout(` call, with the name its handle is kept in, if any.
   * `jest.setTimeout(n)` is not one: it sets how long a test may run.
   */
  static readonly TIMER_CALL =
    /(?:\b([A-Za-z_$][\w$]*)\s*=\s*)?(?<!\bjest\.)\bsetTimeout\s*\(/g;

  /**
   * Whether a test waits on a real timer (#429). Not a wait: `jest.setTimeout`
   * (the test's time limit), a watchdog whose handle the file clears with
   * `clearTimeout(handle)` (a guard on a real process, not a sleep), or any
   * timer under fake timers (`jest.`, `vi.` or `sinon.useFakeTimers`). Read
   * on the code of the file, so a timer in a fixture string is not one.
   *
   * Nor is a yield (#548): `setTimeout(resolve)` or `setTimeout(resolve, 0)`
   * waits for one macrotask, not for wall-clock time. A non-zero literal
   * delay and a delay the law cannot read (a name, an expression) count.
   */
  static waitsOnRealTimer(code: string): boolean {
    if (/\buseFakeTimers\s*\(/.test(code)) return false;
    for (const match of code.matchAll(this.TIMER_CALL)) {
      const handle = match[1];
      const cleared =
        handle !== undefined &&
        new RegExp(`\\bclearTimeout\\s*\\(\\s*${handle}\\s*\\)`).test(code);
      const delay = this.argumentAt(
        code,
        (match.index ?? 0) + match[0].length,
        1
      );
      const yields = delay === undefined || /^0+$/.test(delay);
      if (!cleared && !yields) return true;
    }
    return false;
  }

  /**
   * The text of the `index`-th top-level argument of the call whose argument
   * list starts at `start` (just after its `(`), trimmed; undefined when the
   * call has fewer arguments.
   */
  private static argumentAt(
    code: string,
    start: number,
    index: number
  ): string | undefined {
    const end = this.closingParen(code, start);
    const args: string[] = [];
    let depth = 0;
    let from = start;
    for (let at = start; at < end; at++) {
      depth += this.nesting(code.charAt(at));
      if (depth === 0 && code.charAt(at) === ',') {
        args.push(code.slice(from, at));
        from = at + 1;
      }
    }
    args.push(code.slice(from, end));
    const value = args[index]?.trim();
    return value ? value : undefined;
  }

  /** +1 for an opening bracket, -1 for a closing one, 0 otherwise. */
  private static nesting(char: string): number {
    if ('([{'.includes(char)) return 1;
    return ')]}'.includes(char) ? -1 : 0;
  }

  /** The index of the `)` that closes the argument list starting at `start`. */
  private static closingParen(code: string, start: number): number {
    let depth = 1;
    for (let at = start; at < code.length; at++) {
      depth += this.nesting(code.charAt(at));
      if (depth === 0) return at;
    }
    return code.length;
  }

  static readonly AWAITED_LITERAL =
    /\bawait\s+(?:-?\d[\d_.]*\b|'[^']*'|"[^"]*"|true\b|false\b|null\b|undefined\b|\[)/;

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
        checker: (_content: string, hasProperAsyncHandling: boolean) =>
          !hasProperAsyncHandling,
        message:
          AsyncTestAnalyzerConfiguration.RECOMMENDATION_CONFIG
            .NO_ASYNC_HANDLING,
      },
      {
        checker: (content: string) =>
          AsyncTestAnalyzerConfiguration.waitsOnRealTimer(content),
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

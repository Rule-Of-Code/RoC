/**
 * Tests for AsyncTestAnalyzerConfiguration
 *
 * Tests the async test analyzer configuration patterns and methods.
 */
import { AsyncTestAnalyzerConfiguration } from '../../src/utils/testing/async-test-analyzer/async-test-analyzer-configuration';

describe('AsyncTestAnalyzerConfiguration', () => {
  describe('ASYNC_TEST_PATTERNS', () => {
    it('should have ASYNC_FUNCTION_IN_IT pattern', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ASYNC_TEST_PATTERNS.ASYNC_FUNCTION_IN_IT
      ).toBeDefined();
    });

    it('should have ASYNC_FUNCTION_IN_TEST pattern', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ASYNC_TEST_PATTERNS
          .ASYNC_FUNCTION_IN_TEST
      ).toBeDefined();
    });

    it('should have DONE_CALLBACK pattern', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ASYNC_TEST_PATTERNS.DONE_CALLBACK
      ).toBeDefined();
    });

    it('should have PROMISE_THEN pattern', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ASYNC_TEST_PATTERNS.PROMISE_THEN
      ).toBeDefined();
    });

    it('should have AWAIT_KEYWORD pattern', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ASYNC_TEST_PATTERNS.AWAIT_KEYWORD
      ).toBeDefined();
    });

    it('should have PROMISE_CONSTRUCTOR pattern', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ASYNC_TEST_PATTERNS.PROMISE_CONSTRUCTOR
      ).toBeDefined();
    });

    it('should have SET_TIMEOUT pattern', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ASYNC_TEST_PATTERNS.SET_TIMEOUT
      ).toBeDefined();
    });

    it('should have SET_INTERVAL pattern', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ASYNC_TEST_PATTERNS.SET_INTERVAL
      ).toBeDefined();
    });

    it('should match async function in it block', () => {
      const code = 'it("test", async () => {})';
      expect(
        code.match(
          AsyncTestAnalyzerConfiguration.ASYNC_TEST_PATTERNS
            .ASYNC_FUNCTION_IN_IT
        )
      ).toBeTruthy();
    });

    it('should match async function in test block', () => {
      const code = 'test("test", async () => {})';
      expect(
        code.match(
          AsyncTestAnalyzerConfiguration.ASYNC_TEST_PATTERNS
            .ASYNC_FUNCTION_IN_TEST
        )
      ).toBeTruthy();
    });

    it('should match await keyword', () => {
      const code = 'await someFunction()';
      expect(
        code.match(
          AsyncTestAnalyzerConfiguration.ASYNC_TEST_PATTERNS.AWAIT_KEYWORD
        )
      ).toBeTruthy();
    });

    it('should match .then() call', () => {
      const code = 'promise.then(result => {})';
      expect(
        code.match(
          AsyncTestAnalyzerConfiguration.ASYNC_TEST_PATTERNS.PROMISE_THEN
        )
      ).toBeTruthy();
    });

    it('should match Promise constructor', () => {
      const code = 'Promise.resolve()';
      expect(
        code.match(
          AsyncTestAnalyzerConfiguration.ASYNC_TEST_PATTERNS.PROMISE_CONSTRUCTOR
        )
      ).toBeTruthy();
    });

    it('should match setTimeout', () => {
      const code = 'setTimeout(() => {}, 100)';
      expect(
        code.match(
          AsyncTestAnalyzerConfiguration.ASYNC_TEST_PATTERNS.SET_TIMEOUT
        )
      ).toBeTruthy();
    });

    it('should match setInterval', () => {
      const code = 'setInterval(() => {}, 100)';
      expect(
        code.match(
          AsyncTestAnalyzerConfiguration.ASYNC_TEST_PATTERNS.SET_INTERVAL
        )
      ).toBeTruthy();
    });
  });

  describe('ASYNC_HANDLING_PATTERNS', () => {
    it('should have TEST_BLOCK pattern', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ASYNC_HANDLING_PATTERNS.TEST_BLOCK
      ).toBeDefined();
    });

    it('should have ASYNC_TEST pattern', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ASYNC_HANDLING_PATTERNS.ASYNC_TEST
      ).toBeDefined();
    });

    it('should have AWAIT_USAGE pattern', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ASYNC_HANDLING_PATTERNS.AWAIT_USAGE
      ).toBeDefined();
    });

    it('should have DONE_CALLBACK_USAGE pattern', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ASYNC_HANDLING_PATTERNS
          .DONE_CALLBACK_USAGE
      ).toBeDefined();
    });

    it('should have PROMISE_RETURN pattern', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ASYNC_HANDLING_PATTERNS.PROMISE_RETURN
      ).toBeDefined();
    });
  });

  describe('ISSUE_MESSAGES', () => {
    it('should have PROMISE_CHAINS_WITHOUT_AWAIT message', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ISSUE_MESSAGES
          .PROMISE_CHAINS_WITHOUT_AWAIT
      ).toBe('Promise chains found that could use async/await syntax');
    });

    it('should have SETTIMEOUT_WITHOUT_FAKE_TIMERS message', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ISSUE_MESSAGES
          .SETTIMEOUT_WITHOUT_FAKE_TIMERS
      ).toBe('setTimeout usage without fake timers may cause test flakiness');
    });

    it('should have PROMISE_WITHOUT_CATCH message', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ISSUE_MESSAGES.PROMISE_WITHOUT_CATCH
      ).toBe('Promise chains without .catch() may cause unhandled rejections');
    });

    it('should have MIXING_ASYNC_PATTERNS message', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ISSUE_MESSAGES.MIXING_ASYNC_PATTERNS
      ).toBe('Mixing async/await with done() callback can cause issues');
    });

    it('should have AWAITING_NON_PROMISE message', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ISSUE_MESSAGES.AWAITING_NON_PROMISE
      ).toBe('Awaiting non-promise values detected');
    });
  });

  describe('ISSUE_DETECTION_CONFIGS', () => {
    it('should be an array', () => {
      expect(
        Array.isArray(AsyncTestAnalyzerConfiguration.ISSUE_DETECTION_CONFIGS)
      ).toBe(true);
    });

    it('should have 5 issue detection configs', () => {
      expect(
        AsyncTestAnalyzerConfiguration.ISSUE_DETECTION_CONFIGS.length
      ).toBe(5);
    });

    it('should detect setTimeout without fake timers', () => {
      const config = AsyncTestAnalyzerConfiguration.ISSUE_DETECTION_CONFIGS[1]!;
      expect(config.checker('setTimeout(() => {}, 100)')).toBe(true);
      expect(
        config.checker('jest.useFakeTimers(); setTimeout(() => {}, 100)')
      ).toBe(false);
    });

    it('should detect async with done callback', () => {
      const config = AsyncTestAnalyzerConfiguration.ISSUE_DETECTION_CONFIGS[3]!;
      expect(config.checker('async function test() { done() }')).toBe(true);
      expect(
        config.checker('async function test() { await something() }')
      ).toBe(false);
    });

    it('each config should have checker and message', () => {
      AsyncTestAnalyzerConfiguration.ISSUE_DETECTION_CONFIGS.forEach(config => {
        expect(typeof config.checker).toBe('function');
        expect(typeof config.message).toBe('string');
      });
    });
  });

  describe('RECOMMENDATION_CONFIG', () => {
    it('should have NO_ASYNC_HANDLING recommendation', () => {
      expect(
        AsyncTestAnalyzerConfiguration.RECOMMENDATION_CONFIG.NO_ASYNC_HANDLING
      ).toBe('Use async/await or done() callback for async tests');
    });

    it('should have NO_FAKE_TIMERS recommendation', () => {
      expect(
        AsyncTestAnalyzerConfiguration.RECOMMENDATION_CONFIG.NO_FAKE_TIMERS
      ).toBe('Consider using jest.useFakeTimers() for timer-based tests');
    });

    it('should have PROMISE_WITHOUT_AWAIT recommendation', () => {
      expect(
        AsyncTestAnalyzerConfiguration.RECOMMENDATION_CONFIG
          .PROMISE_WITHOUT_AWAIT
      ).toBe('Use await with Promise-based operations');
    });
  });

  describe('RECOMMENDATION_DETECTION_CONFIGS', () => {
    it('should be an array', () => {
      expect(
        Array.isArray(
          AsyncTestAnalyzerConfiguration.RECOMMENDATION_DETECTION_CONFIGS
        )
      ).toBe(true);
    });

    it('should have 3 recommendation configs', () => {
      expect(
        AsyncTestAnalyzerConfiguration.RECOMMENDATION_DETECTION_CONFIGS.length
      ).toBe(3);
    });

    it('should detect no proper async handling', () => {
      const config =
        AsyncTestAnalyzerConfiguration.RECOMMENDATION_DETECTION_CONFIGS[0]!;
      expect(config.checker('some code', false)).toBe(true);
      expect(config.checker('some code', true)).toBe(false);
    });

    it('should detect setTimeout without fake timers', () => {
      const config =
        AsyncTestAnalyzerConfiguration.RECOMMENDATION_DETECTION_CONFIGS[1]!;
      expect(config.checker('setTimeout(() => {})', false)).toBe(true);
      expect(config.checker('jest.useFakeTimers(); setTimeout()', false)).toBe(
        false
      );
    });

    it('should detect Promise.resolve without await', () => {
      const config =
        AsyncTestAnalyzerConfiguration.RECOMMENDATION_DETECTION_CONFIGS[2]!;
      expect(config.checker('Promise.resolve()', false)).toBe(true);
      expect(config.checker('await Promise.resolve()', false)).toBe(false);
    });
  });

  describe('RECOMMENDATIONS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(AsyncTestAnalyzerConfiguration.RECOMMENDATIONS)
      ).toBe(true);
      AsyncTestAnalyzerConfiguration.RECOMMENDATIONS.forEach(rec => {
        expect(typeof rec).toBe('string');
      });
    });

    it('should have 7 recommendations', () => {
      expect(AsyncTestAnalyzerConfiguration.RECOMMENDATIONS.length).toBe(7);
    });

    it('should include async/await recommendation', () => {
      expect(AsyncTestAnalyzerConfiguration.RECOMMENDATIONS).toContain(
        'Use async/await instead of .then() chains for better readability'
      );
    });

    it('should include fake timers recommendation', () => {
      expect(AsyncTestAnalyzerConfiguration.RECOMMENDATIONS).toContain(
        'Use jest.useFakeTimers() for testing time-dependent code'
      );
    });
  });

  describe('CODE_PATTERNS', () => {
    it('should have good patterns array', () => {
      expect(
        Array.isArray(AsyncTestAnalyzerConfiguration.CODE_PATTERNS.good)
      ).toBe(true);
    });

    it('should have bad patterns array', () => {
      expect(
        Array.isArray(AsyncTestAnalyzerConfiguration.CODE_PATTERNS.bad)
      ).toBe(true);
    });

    it('should have 4 good patterns', () => {
      expect(AsyncTestAnalyzerConfiguration.CODE_PATTERNS.good.length).toBe(4);
    });

    it('should have 4 bad patterns', () => {
      expect(AsyncTestAnalyzerConfiguration.CODE_PATTERNS.bad.length).toBe(4);
    });

    it('each good pattern should have code and description', () => {
      AsyncTestAnalyzerConfiguration.CODE_PATTERNS.good.forEach(pattern => {
        expect(typeof pattern.code).toBe('string');
        expect(typeof pattern.description).toBe('string');
      });
    });

    it('each bad pattern should have code and description', () => {
      AsyncTestAnalyzerConfiguration.CODE_PATTERNS.bad.forEach(pattern => {
        expect(typeof pattern.code).toBe('string');
        expect(typeof pattern.description).toBe('string');
      });
    });
  });

  describe('hasAsyncTests', () => {
    it('should return true for async function in it block', () => {
      const code = 'it("test", async () => { await something(); })';
      expect(AsyncTestAnalyzerConfiguration.hasAsyncTests(code)).toBe(true);
    });

    it('should return true for async function in test block', () => {
      const code = 'test("test", async () => { await something(); })';
      expect(AsyncTestAnalyzerConfiguration.hasAsyncTests(code)).toBe(true);
    });

    it('should return true for await keyword', () => {
      const code = 'await someAsyncFunction()';
      expect(AsyncTestAnalyzerConfiguration.hasAsyncTests(code)).toBe(true);
    });

    it('should return true for .then() usage', () => {
      const code = 'promise.then(result => {})';
      expect(AsyncTestAnalyzerConfiguration.hasAsyncTests(code)).toBe(true);
    });

    it('should return true for Promise usage', () => {
      const code = 'Promise.resolve(value)';
      expect(AsyncTestAnalyzerConfiguration.hasAsyncTests(code)).toBe(true);
    });

    it('should return true for setTimeout', () => {
      const code = 'setTimeout(() => {}, 1000)';
      expect(AsyncTestAnalyzerConfiguration.hasAsyncTests(code)).toBe(true);
    });

    it('should return true for setInterval', () => {
      const code = 'setInterval(() => {}, 1000)';
      expect(AsyncTestAnalyzerConfiguration.hasAsyncTests(code)).toBe(true);
    });

    it('should return false for sync code', () => {
      const code = 'const result = syncFunction();';
      expect(AsyncTestAnalyzerConfiguration.hasAsyncTests(code)).toBe(false);
    });
  });

  describe('hasProperAsyncHandling', () => {
    it('should return true for async with await', () => {
      const testBlock = 'async () => { await something(); }';
      expect(
        AsyncTestAnalyzerConfiguration.hasProperAsyncHandling(testBlock)
      ).toBe(true);
    });

    it('should return true for done callback', () => {
      const testBlock = '(done) => { something(); done() }';
      expect(
        AsyncTestAnalyzerConfiguration.hasProperAsyncHandling(testBlock)
      ).toBe(true);
    });

    it('should return true for promise return', () => {
      const testBlock = '() => { return promise.then(result => {}); }';
      expect(
        AsyncTestAnalyzerConfiguration.hasProperAsyncHandling(testBlock)
      ).toBe(true);
    });

    it('should return false for async without await', () => {
      const testBlock = 'async () => { something(); }';
      expect(
        AsyncTestAnalyzerConfiguration.hasProperAsyncHandling(testBlock)
      ).toBe(false);
    });

    it('should return false for no async handling', () => {
      const testBlock = '() => { something(); }';
      expect(
        AsyncTestAnalyzerConfiguration.hasProperAsyncHandling(testBlock)
      ).toBe(false);
    });
  });
});

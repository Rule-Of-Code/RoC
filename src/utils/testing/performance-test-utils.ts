/**
 * Centralized Performance Testing Utilities
 * Eliminates duplicate performance testing patterns across the test suite
 */

export interface PerformanceTestOptions {
  /** Maximum allowed execution time in milliseconds (default: 5000) */
  maxExecutionTime?: number;
  /** Test description for better error messages */
  testDescription?: string;
  /** Whether to log performance metrics */
  logMetrics?: boolean;
}

export interface PerformanceTestResult {
  executionTime: number;
  passed: boolean;
  message: string;
}

/**
 * Performance Testing Utilities for Law Compliance Tests
 * Provides standardized performance testing patterns to eliminate code duplication
 */
export class PerformanceTestUtils {
  /**
   * Test if a law execution completes within acceptable time limits
   * @param lawCheck - Function that executes the law check
   * @param options - Performance test configuration
   * @returns Performance test result
   */
  static async testLawPerformance<T>(
    lawCheck: () => Promise<T>,
    options: PerformanceTestOptions = {}
  ): Promise<PerformanceTestResult & { result: T }> {
    const {
      maxExecutionTime = 5000,
      testDescription = 'Law execution',
      logMetrics = false,
    } = options;

    const startTime = Date.now();

    try {
      const result = await lawCheck();
      const executionTime = Date.now() - startTime;
      const passed = executionTime < maxExecutionTime;

      if (logMetrics) {
         
        console.log(
          `Performance Test: ${testDescription} - ${executionTime}ms`
        );
      }

      return {
        executionTime,
        passed,
        message: passed
          ? `${testDescription} completed in ${executionTime}ms (within ${maxExecutionTime}ms limit)`
          : `${testDescription} took ${executionTime}ms (exceeds ${maxExecutionTime}ms limit)`,
        result,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      throw new Error(
        `Performance test failed after ${executionTime}ms: ${error}`
      );
    }
  }

  /**
   * Create a Jest test case for law performance validation
   * Standardized pattern for all law performance tests
   */
  static createPerformanceTest<T>(
    testName: string,
    lawCheck: () => Promise<T>,
    options: PerformanceTestOptions = {}
  ): void {
    it(`should execute within reasonable time limits`, async () => {
      const { maxExecutionTime = 5000 } = options;
      const startTime = Date.now();

      await lawCheck();

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(maxExecutionTime);
    });
  }

  /**
   * Batch performance testing for multiple laws
   * @param lawChecks - Array of law check functions with their names
   * @param options - Performance test configuration
   */
  static async testMultipleLawsPerformance<T = unknown>(
    lawChecks: Array<{ name: string; check: () => Promise<T> }>,
    options: PerformanceTestOptions = {}
  ): Promise<PerformanceTestResult[]> {
    const results: PerformanceTestResult[] = [];

    for (const { name, check } of lawChecks) {
      const testOptions = { ...options, testDescription: name };
      const { result: _, ...perfResult } = await this.testLawPerformance(
        check,
        testOptions
      );
      results.push(perfResult);
    }

    return results;
  }

  /**
   * Performance assertions for Jest tests
   */
  static expectPerformance(
    executionTime: number,
    maxTime = 5000,
    testName?: string
  ): void {
    const message = testName
      ? `${testName} performance`
      : 'Execution performance';
    expect(executionTime).toBeLessThan(maxTime);

    if (executionTime > maxTime * 0.8) {
       
      console.warn(
        `⚠️  ${message}: ${executionTime}ms is approaching the ${maxTime}ms limit`
      );
    }
  }
}

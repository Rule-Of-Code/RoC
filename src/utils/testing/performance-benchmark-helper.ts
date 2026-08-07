import type { LawCheckContext } from '../../types/law.types';

// Need to declare TestHelpers globally available in test environment
declare global {
  var TestHelpers: {
    createMockContext: () => LawCheckContext;
  };
}

/**
 * Performance Benchmark Helper
 * Utility for consistent performance testing across all law tests
 */
export class PerformanceBenchmarkHelper {
  /**
   * Standard performance test for law execution
   */
  static async measureLawExecution<T>(
    lawCheckFunction: (context: LawCheckContext) => Promise<T> | T,
    context: LawCheckContext,
    options: {
      maxExecutionTime?: number;
      logSlowExecution?: boolean;
      warningThreshold?: number;
    } = {}
  ): Promise<{ result: T; executionTime: number }> {
    const {
      maxExecutionTime = 5000, // 5 seconds default
      logSlowExecution = true,
      warningThreshold = 1000, // 1 second warning
    } = options;

    const startTime = Date.now();
    const result = await lawCheckFunction(context);
    const executionTime = Date.now() - startTime;

    // Performance assertions
    expect(executionTime).toBeLessThan(maxExecutionTime);

    // Optional performance warnings
    if (logSlowExecution && executionTime > warningThreshold) {
      console.warn(
        `⚠️ Law execution took ${executionTime}ms (threshold: ${warningThreshold}ms)`
      );
    }

    return { result, executionTime };
  }

  /**
   * Batch performance test for multiple law executions
   */
  static async measureMultipleLawExecutions<T>(
    lawCheckFunction: (context: LawCheckContext) => Promise<T> | T,
    contexts: LawCheckContext[],
    options: {
      maxExecutionTimePerTest?: number;
      maxTotalExecutionTime?: number;
      logIndividualTimes?: boolean;
    } = {}
  ): Promise<{ results: T[]; executionTimes: number[]; totalTime: number }> {
    const {
      maxExecutionTimePerTest = 5000,
      maxTotalExecutionTime = 10000,
      logIndividualTimes = false,
    } = options;

    const startTime = Date.now();
    const results: T[] = [];
    const executionTimes: number[] = [];

    for (const context of contexts) {
      const { result, executionTime } = await this.measureLawExecution(
        lawCheckFunction,
        context,
        {
          maxExecutionTime: maxExecutionTimePerTest,
          logSlowExecution: logIndividualTimes,
        }
      );

      results.push(result);
      executionTimes.push(executionTime);
    }

    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(maxTotalExecutionTime);

    return { results, executionTimes, totalTime };
  }

  /**
   * Standard performance considerations test block for law tests
   */
  static createPerformanceTestSuite<T>(
    lawCheckFunction: (context: LawCheckContext) => Promise<T> | T,
    lawName: string,
    customOptions?: {
      maxExecutionTime?: number;
      warningThreshold?: number;
    }
  ) {
    return {
      suite: () => {
        describe('Performance Considerations', () => {
          it('should execute within reasonable time limits', async () => {
            const mockContext = TestHelpers.createMockContext();

            const { result, executionTime } =
              await PerformanceBenchmarkHelper.measureLawExecution(
                lawCheckFunction,
                mockContext,
                customOptions
              );

            // Verify result structure
            expect(result).toBeDefined();

            // Log performance metrics for monitoring
            if (executionTime > (customOptions?.warningThreshold ?? 1000)) {
              console.warn(`⚠️ ${lawName} took ${executionTime}ms to execute`);
            }
          });
        });
      },
    };
  }
}

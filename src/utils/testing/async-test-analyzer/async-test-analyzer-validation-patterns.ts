import { AsyncTestAnalyzerConfiguration } from './async-test-analyzer-configuration';

/**
 * Async Test Analyzer Validation Patterns
 * Orchestrates async test validation using centralized Configuration (RULE 2: Optimize internals)
 * Replaces duplicated detection logic with configuration-driven analysis
 */
export class AsyncTestAnalyzerValidationPatterns {
  /**
   * Detect async issues in content using centralized patterns
   * RULE 2: Configuration-driven iteration replaces duplicate if-checks
   * Eliminates 5 separate if-blocks with single unified loop
   */
  static detectAsyncIssues(content: string): string[] {
    const issues: string[] = [];

    for (const config of AsyncTestAnalyzerConfiguration.ISSUE_DETECTION_CONFIGS) {
      if (config.checker(content)) {
        issues.push(config.message);
      }
    }

    return issues;
  }

  /**
   * Analyze async patterns in content using centralized Configuration
   * RULE 2: Unified analysis method replaces multiple boolean checks
   * Uses configuration constants to eliminate hardcoded strings
   */
  static analyzeAsyncPatterns(content: string): {
    hasAsyncTests: boolean;
    hasProperAsyncHandling: boolean;
    asyncIssues: string[];
    recommendations: string[];
  } {
    const hasAsyncTests = AsyncTestAnalyzerConfiguration.hasAsyncTests(content);
    const recommendations: string[] = [];
    const asyncIssues: string[] = [];

    // Extract and analyze test blocks for proper async handling
    const testBlocks =
      content.match(
        AsyncTestAnalyzerConfiguration.ASYNC_HANDLING_PATTERNS.TEST_BLOCK
      ) ?? [];

    const hasProperAsyncHandling = testBlocks.some(testBlock =>
      AsyncTestAnalyzerConfiguration.hasProperAsyncHandling(testBlock)
    );

    if (hasAsyncTests) {
      // Detect issues using configuration-driven approach
      const issues = this.detectAsyncIssues(content);
      asyncIssues.push(...issues);

      // RULE 2: Configuration-driven iteration replaces 3 separate if-blocks
      for (const config of AsyncTestAnalyzerConfiguration.RECOMMENDATION_DETECTION_CONFIGS) {
        if (config.checker(content, hasProperAsyncHandling)) {
          recommendations.push(config.message);
        }
      }
    }

    return {
      hasAsyncTests,
      hasProperAsyncHandling,
      asyncIssues,
      recommendations,
    };
  }

  /**
   * Get all async testing recommendations from centralized configuration
   * RULE 1: Single source of truth for recommendations
   */
  static getRecommendations(): readonly string[] {
    return AsyncTestAnalyzerConfiguration.RECOMMENDATIONS;
  }

  /**
   * Get code pattern examples from centralized configuration
   * RULE 1: Single source of truth for code patterns
   */
  static getCodePatterns(): {
    good: ReadonlyArray<{
      readonly code: string;
      readonly description: string;
    }>;
    bad: ReadonlyArray<{ readonly code: string; readonly description: string }>;
  } {
    return AsyncTestAnalyzerConfiguration.CODE_PATTERNS;
  }
}

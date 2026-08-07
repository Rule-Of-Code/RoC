import { AsyncTestAnalyzerValidationPatterns } from './async-test-analyzer-validation-patterns';

/**
 * Async Test Analyzer
 * Facade for analyzing asynchronous test patterns and best practices
 * Delegates all logic to utility classes (RULE 2: Centralized validation)
 */
export class AsyncTestAnalyzer {
  static analyzeAsyncPatterns(content: string): {
    hasAsyncTests: boolean;
    hasProperAsyncHandling: boolean;
    asyncIssues: string[];
    recommendations: string[];
  } {
    return AsyncTestAnalyzerValidationPatterns.analyzeAsyncPatterns(content);
  }

  static getAsyncTestRecommendations(): string[] {
    return Array.from(AsyncTestAnalyzerValidationPatterns.getRecommendations());
  }

  static getAsyncTestPatterns(): {
    good: Array<{ code: string; description: string }>;
    bad: Array<{ code: string; description: string }>;
  } {
    const patterns = AsyncTestAnalyzerValidationPatterns.getCodePatterns();
    return {
      good: Array.from(patterns.good),
      bad: Array.from(patterns.bad),
    };
  }
}

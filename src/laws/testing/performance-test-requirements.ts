import type { LawCheckContext, LawResult } from '../../types/law.types';
import { TestingLawUtilities } from './shared-testing-utilities';
import { UnitTestPerformanceTestingAnalyzerService } from './unit-test-performance-testing/services/performance-testing-analyzer.service';

/**
 * Performance Test Requirements Law
 *
 * Validates comprehensive performance testing implementation including:
 * - Performance test file coverage (perf, load, stress tests)
 * - Load testing configuration (Artillery, K6, Locust, JMeter)
 * - Bundle size testing (webpack-bundle-analyzer, size-limit)
 * - Core Web Vitals testing (web-vitals library, Lighthouse)
 * - Performance monitoring integration (New Relic, Datadog, Prometheus)
 * - Critical flow performance tests (login, checkout, user journeys)
 *
 * Delegates all analysis to the specialized analyzer service.
 * Pure coordinator - only aggregates results and returns LawResult.
 */
export class PerformanceTestRequirementsLaw {
  static check(context: LawCheckContext): LawResult {
    try {
      const violations: string[] = [];
      const suggestions: string[] = [];
      let score = 100;
      const { projectRoot } = context;

      // 1. Analyze performance test files
      const performanceTestAnalysis =
        UnitTestPerformanceTestingAnalyzerService.analyzePerformanceTestFiles(
          projectRoot,
          context.config
        );

      if (performanceTestAnalysis.testCount === 0) {
        violations.push('No performance test files found');
        suggestions.push('Create performance tests for critical user flows');
        score -= 25;
      }

      // 2. Analyze load testing setup
      const loadTestingAnalysis =
        UnitTestPerformanceTestingAnalyzerService.analyzeLoadTesting(
          projectRoot
        );

      if (!loadTestingAnalysis.hasLoadTesting) {
        suggestions.push(
          'Consider implementing load testing with tools like Artillery or K6'
        );
        score -= 15;
      }

      // 3. Analyze bundle size testing
      const bundleSizeAnalysis =
        UnitTestPerformanceTestingAnalyzerService.analyzeBundleSizeTesting(
          projectRoot
        );

      if (!bundleSizeAnalysis.hasBundleSizeTesting) {
        violations.push('Bundle size testing not implemented');
        suggestions.push(
          'Implement bundle size monitoring with webpack-bundle-analyzer or size-limit'
        );
        score -= 20;
      }

      // 4. Analyze Web Vitals testing
      const webVitalsAnalysis =
        UnitTestPerformanceTestingAnalyzerService.analyzeWebVitalsTesting(
          projectRoot
        );

      if (!webVitalsAnalysis.hasWebVitalsTesting) {
        violations.push('Core Web Vitals testing not implemented');
        suggestions.push(
          'Implement Core Web Vitals monitoring with web-vitals library or Lighthouse'
        );
        score -= 20;
      }

      // 5. Analyze performance monitoring
      const monitoringAnalysis =
        UnitTestPerformanceTestingAnalyzerService.analyzePerformanceMonitoring(
          projectRoot
        );

      if (!monitoringAnalysis.hasPerformanceMonitoring) {
        suggestions.push(
          'Consider integrating performance monitoring tools like New Relic or Datadog'
        );
        score -= 10;
      }

      // 6. Check for critical flow performance tests
      if (
        !performanceTestAnalysis.hasCriticalFlowTests &&
        performanceTestAnalysis.testCount > 0
      ) {
        violations.push('Critical user flow performance tests not implemented');
        suggestions.push(
          'Add performance tests for login, checkout, and core user journeys'
        );
        score -= 10;
      }

      return TestingLawUtilities.createTestResult({
        lawName: 'Performance Test Requirements',
        violations,
        suggestions,
        score,
        analysisData: performanceTestAnalysis,
        config: context.config,
        messageGenerator: this.generateMessage.bind(this),
      });
    } catch (error) {
      return TestingLawUtilities.createTestingErrorResult(
        'Performance Test Requirements',
        error,
        context.config
      );
    }
  }

  private static generateMessage(
    violations: string[],
    performanceTestAnalysis: { testCount: number }
  ): string {
    if (violations.length === 0) {
      return '✅ Performance Test Requirements: Comprehensive performance testing implemented';
    }

    if (performanceTestAnalysis.testCount === 0) {
      return '⚠️ Performance Testing: No performance test files found';
    }

    return `⚠️ Performance Testing: ${violations.length} issues found`;
  }
}

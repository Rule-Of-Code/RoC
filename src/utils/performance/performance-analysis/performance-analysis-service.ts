import { PerformanceAnalysisConfiguration } from './performance-analysis-configuration';
import { PerformanceAnalysisResultsService } from './performance-analysis-results-service';
import { PerformanceAnalysisRunnersService } from './performance-analysis-runners-service';

export interface PerformanceAnalysisResult {
  score: number;
  issues: Array<{
    type: string;
    severity: 'high' | 'low' | 'medium';
    message: string;
    line?: number;
    file?: string;
  }>;
  recommendations: string[];
  hasPerformanceIssues: boolean;
  summary: string;
}

/**
 * Unified Performance Analysis Service
 * Centralized performance analysis using specialized analyzers
 * RULE 1: Uses Configuration to eliminate hardcoded values
 */
export class PerformanceAnalysisService {
  private static readonly Config = PerformanceAnalysisConfiguration;
  /**
   * Perform comprehensive performance analysis on project files
   */
  static analyzePerformance(
    projectRoot: string,
    options: {
      includeDOM?: boolean;
      includeObservables?: boolean;
      includeTimers?: boolean;
      includeLifecycle?: boolean;
      includeEventListeners?: boolean;
    } = {}
  ): PerformanceAnalysisResult {
    const issues: PerformanceAnalysisResult['issues'] = [];
    const recommendations: string[] = [];

    // Default to analyzing all aspects
    const {
      includeDOM = true,
      includeObservables = true,
      includeTimers = true,
      includeLifecycle = true,
      includeEventListeners = true,
    } = options;

    try {
      // Run various performance analyses using specialized runners service
      PerformanceAnalysisRunnersService.runLifecycleAnalysis(
        includeLifecycle,
        issues,
        recommendations
      );
      PerformanceAnalysisRunnersService.runDOMAnalysis(
        includeDOM,
        issues,
        recommendations
      );
      PerformanceAnalysisRunnersService.runEventListenerAnalysis(
        includeEventListeners,
        issues,
        recommendations
      );
      PerformanceAnalysisRunnersService.runObservableAnalysis(
        includeObservables,
        issues,
        recommendations
      );
      PerformanceAnalysisRunnersService.runTimerAnalysis(
        includeTimers,
        issues,
        recommendations
      );

      // Calculate and return results using specialized results service
      return PerformanceAnalysisResultsService.calculateAnalysisResult(
        issues,
        recommendations
      );
    } catch (error) {
      return PerformanceAnalysisResultsService.createErrorResult(error);
    }
  }

  /**
   * Analyze performance for specific scenarios
   */
  static analyzePerformanceScenarios(
    projectRoot: string
  ): PerformanceAnalysisResult {
    return this.analyzePerformance(projectRoot, {
      includeDOM: true,
      includeObservables: true,
      includeTimers: false,
      includeLifecycle: true,
      includeEventListeners: true,
    });
  }

  /**
   * Analyze performance for testing scenarios
   */
  static analyzePerformanceTesting(
    projectRoot: string
  ): PerformanceAnalysisResult {
    return this.analyzePerformance(projectRoot, {
      includeDOM: false,
      includeObservables: false,
      includeTimers: true,
      includeLifecycle: false,
      includeEventListeners: false,
    });
  }

  /**
   * Analyze performance benchmarks
   */
  static analyzePerformanceBenchmarks(
    projectRoot: string
  ): PerformanceAnalysisResult {
    const result = this.analyzePerformance(projectRoot);

    // RULE 1: Use Configuration for recommendations
    result.recommendations.push(
      this.Config.RECOMMENDATIONS.BUDGETS,
      this.Config.RECOMMENDATIONS.MONITORING,
      this.Config.RECOMMENDATIONS.REGRESSION_TESTS
    );

    return result;
  }

  /**
   * Analyze performance gates for CI/CD
   */
  static analyzePerformanceGates(
    projectRoot: string
  ): PerformanceAnalysisResult {
    const result = this.analyzePerformance(projectRoot);

    // RULE 1: Use Configuration for CI/CD recommendations
    result.recommendations.push(
      this.Config.RECOMMENDATIONS.CI_CD_INTEGRATION,
      this.Config.RECOMMENDATIONS.AUTOMATED_ALERTS,
      this.Config.RECOMMENDATIONS.BASELINE_COMPARISON
    );

    return result;
  }
}

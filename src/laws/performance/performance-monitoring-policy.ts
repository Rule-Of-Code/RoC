import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PerformanceMonitoringPolicyAnalyzerService } from './performance-monitoring-policy/services';

/**
 * Performance Monitoring Policy Law
 * Ensures proper performance monitoring and alerting systems are in place
 */
export class PerformanceMonitoringPolicyLaw {
  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    const analysis =
      await PerformanceMonitoringPolicyAnalyzerService.analyzeMonitoringPolicy(
        context.projectRoot,
        context.config
      );

    // Check for Real User Monitoring (RUM) setup
    if (!analysis.realUserMonitoring.hasRUM) {
      violations.push('Real User Monitoring not configured');
      suggestions.push(
        'Implement RUM with tools like Google Analytics, New Relic, or DataDog'
      );
      score -= 25;
    }

    // Check for performance budget configuration
    if (!analysis.performanceBudget.configured) {
      violations.push('Performance budget not configured');
      suggestions.push('Set performance budgets in CI/CD and monitoring tools');
      score -= 20;
    }

    // Check for error tracking and performance monitoring
    if (!analysis.errorTracking.hasTracking) {
      violations.push('Performance error tracking not configured');
      suggestions.push(
        'Implement error tracking with Sentry, LogRocket, or similar tools'
      );
      score -= 20;
    }

    // Check for performance alerts and notifications
    if (!analysis.performanceAlerting.hasAlerts) {
      violations.push('Performance alerts not configured');
      suggestions.push(
        'Set up alerts for Core Web Vitals and performance regressions'
      );
      score -= 15;
    }

    // Check for Core Web Vitals monitoring
    if (!analysis.coreWebVitals.monitored) {
      violations.push('Core Web Vitals monitoring not implemented');
      suggestions.push('Monitor LCP, FID, CLS metrics in production');
      score -= 10;
    }

    // Check for performance dashboards
    if (!analysis.performanceDashboards.hasDashboards) {
      violations.push('Performance dashboards not configured');
      suggestions.push(
        'Create dashboards for monitoring key performance metrics'
      );
      score -= 10;
    }

    return {
      passed: violations.length === 0,
      score: Math.max(0, score),
      message:
        violations.length === 0
          ? 'Performance monitoring policy properly implemented'
          : `Performance monitoring issues found: ${violations.join(', ')}`,
      details: violations,
      violations,
      suggestions,
      fixable: true,
      config: context.config,
    };
  }
}

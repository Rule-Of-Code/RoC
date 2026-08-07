import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { PerformanceMonitoringAnalyzerService } from './performance-monitoring/services/performance-monitoring.analyzer';

interface MonitoringAnalysis {
  monitoringTools: { hasTools: boolean; tools: string[] };
  realUserMonitoring: { configured: boolean };
  performanceBudget: { configured: boolean };
  buildPerformance: { configured: boolean };
  errorTracking: { configured: boolean };
  performanceAlerts: { configured: boolean };
}

/**
 * Performance Monitoring Standards Law
 * Ensures comprehensive performance monitoring is in place
 */
export class PerformanceMonitoringStandardsLaw {
  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    const analysis =
      await PerformanceMonitoringAnalyzerService.analyzeMonitoring(
        context.projectRoot,
        context.config
      );

    const findings = this.collectFindings(context.projectRoot, analysis);
    violations.push(...findings.violations);
    suggestions.push(...findings.suggestions);
    score -= findings.penalty;

    return {
      passed: violations.length === 0,
      score: Math.max(0, score),
      message:
        violations.length === 0
          ? 'Performance monitoring standards implemented correctly'
          : `Performance monitoring issues found: ${violations.join(', ')}`,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      fixable: true,
      config: context.config,
    };
  }

  /**
   * Real User Monitoring, a Lighthouse budget and build-time (bundler) monitoring
   * are properties of a PAGE a human loads. A backend has no page: those three
   * cannot be satisfied there, only faked. The monitoring concern itself IS real
   * for a service — its evidence is Prometheus / OpenTelemetry / an APM, and its
   * alerting is Alertmanager, not a performance budget (a backend consumer).
   */
  private static collectFindings(
    projectRoot: string,
    analysis: MonitoringAnalysis
  ): { violations: string[]; suggestions: string[]; penalty: number } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let penalty = 0;

    const hasBrowser = PythonSatisfaction.hasBrowserSubstrate(projectRoot);
    const hasBackendApm =
      PythonSatisfaction.hasBackendPerformanceMonitoring(projectRoot);

    const checks: ReadonlyArray<{
      satisfied: boolean;
      applies: boolean;
      violation: string;
      suggestion: string;
      penalty: number;
    }> = [
      {
        satisfied: analysis.monitoringTools.hasTools || hasBackendApm,
        applies: true,
        violation: 'No performance monitoring tools configured',
        suggestion: hasBrowser
          ? 'Integrate performance monitoring (Firebase Performance, Sentry, etc.)'
          : 'Integrate service performance monitoring (Prometheus, OpenTelemetry, Sentry, Datadog)',
        penalty: 25,
      },
      {
        satisfied: analysis.realUserMonitoring.configured,
        applies: hasBrowser,
        violation: 'Real User Monitoring not configured',
        suggestion: 'Configure RUM for production performance tracking',
        penalty: 20,
      },
      {
        satisfied: analysis.performanceBudget.configured,
        applies: hasBrowser,
        violation: 'Performance budget not configured',
        suggestion: 'Define performance budgets in Lighthouse config or similar',
        penalty: 20,
      },
      {
        satisfied: analysis.buildPerformance.configured,
        applies: hasBrowser,
        violation: 'Build performance monitoring not configured',
        suggestion: 'Configure build time monitoring and alerts',
        penalty: 15,
      },
      {
        satisfied: analysis.errorTracking.configured || hasBackendApm,
        applies: true,
        violation: 'Performance error tracking not configured',
        suggestion: hasBrowser
          ? 'Configure error tracking for performance issues'
          : 'Configure error/latency tracking (Sentry, OpenTelemetry) for the service',
        penalty: 10,
      },
      {
        satisfied:
          analysis.performanceAlerts.configured ||
          PythonSatisfaction.hasBackendAlerting(projectRoot),
        applies: true,
        violation: 'Performance alerts not configured',
        suggestion: hasBrowser
          ? 'Configure alerts for performance degradation'
          : 'Define alerting rules (Prometheus rules / Alertmanager / Grafana) for latency and error-rate degradation',
        penalty: 10,
      },
    ];

    for (const check of checks) {
      if (check.applies && !check.satisfied) {
        violations.push(check.violation);
        suggestions.push(check.suggestion);
        penalty += check.penalty;
      }
    }

    return { violations, suggestions, penalty };
  }
}

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { unreadViolation } from '../../utils/react/react-performance-source';
import { PerformanceMonitoringAnalyzerService } from './performance-monitoring/services/performance-monitoring.analyzer';

/** What the tracing check asks for, said in its violation (#12, b4). */
export const PERFORMANCE_TRACING_NOT_CONFIGURED =
  'Performance tracing not configured: no Sentry.init with tracesSampleRate / tracesSampler / tracePropagationTargets, no datadogRum.init with allowedTracingUrls / traceSampleRate, and no backend APM or tracing dependency';

interface MonitoringAnalysis {
  monitoringTools: { hasTools: boolean; tools: string[] };
  realUserMonitoring: { configured: boolean };
  performanceBudget: { configured: boolean };
  buildPerformance: { configured: boolean };
  errorTracking: { configured: boolean; unread?: string[] };
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
        context.config,
        context.lawId
      );

    const findings = this.collectFindings(context.projectRoot, analysis);
    violations.push(...findings.violations);
    suggestions.push(...findings.suggestions);
    score -= findings.penalty;

    // A file that imports Sentry and could not be parsed was not read: when
    // tracing was not found, say so rather than imply it was inspected.
    const unread = analysis.errorTracking.unread ?? [];
    if (!analysis.errorTracking.configured && unread.length > 0) {
      violations.push(unreadViolation(unread));
    }

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
        suggestion:
          'Define performance budgets in Lighthouse config or similar',
        penalty: 20,
      },
      {
        satisfied: analysis.buildPerformance.configured,
        applies: hasBrowser,
        violation: 'Build performance monitoring not configured',
        suggestion: 'Configure build time monitoring and alerts',
        penalty: 15,
      },
      // Performance TRACING (#12, b4): a Sentry init with a tracing option, or
      // a backend's APM / tracing dependency. Error tracking without tracing
      // is Performance Monitoring Policy's to judge.
      {
        satisfied: analysis.errorTracking.configured || hasBackendApm,
        applies: true,
        violation: PERFORMANCE_TRACING_NOT_CONFIGURED,
        suggestion: hasBrowser
          ? 'Initialise Sentry with tracesSampleRate, tracesSampler or tracePropagationTargets (Sentry.init in your entry or instrument file, or Next.js instrumentation-client / sentry.server.config / sentry.edge.config), or Datadog RUM with allowedTracingUrls / traceSampleRate'
          : 'Declare an APM or tracing dependency (OpenTelemetry, sentry-sdk, ddtrace, prometheus-client …) for the service, or initialise Sentry with tracesSampleRate',
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

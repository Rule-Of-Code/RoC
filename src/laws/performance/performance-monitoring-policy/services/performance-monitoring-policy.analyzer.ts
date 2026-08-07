import type { RuleOfCodeConfig } from '../../../../config/types';
import { CoreWebVitalsPolicyAnalyzerService } from './core-web-vitals-policy.analyzer';
import { ErrorTrackingPolicyAnalyzerService } from './error-tracking-policy.analyzer';
import { PerformanceAlertingPolicyAnalyzerService } from './performance-alerting-policy.analyzer';
import { PerformanceBudgetPolicyAnalyzerService } from './performance-budget-policy.analyzer';
import { PerformanceDashboardsPolicyAnalyzerService } from './performance-dashboards-policy.analyzer';
import { RealUserMonitoringPolicyAnalyzerService } from './real-user-monitoring-policy.analyzer';

/**
 * Performance Monitoring Policy Analyzer Service
 *
 * Single Responsibility: Orchestrate all monitoring policy checks
 */
export class PerformanceMonitoringPolicyAnalyzerService {
  static async analyzeMonitoringPolicy(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<{
    realUserMonitoring: { hasRUM: boolean; tools: string[] };
    performanceBudget: { configured: boolean; budgetSources: string[] };
    errorTracking: { hasTracking: boolean; tools: string[] };
    performanceAlerting: { hasAlerts: boolean; alertSources: string[] };
    coreWebVitals: { monitored: boolean; implementations: string[] };
    performanceDashboards: { hasDashboards: boolean; dashboardTypes: string[] };
  }> {
    return {
      realUserMonitoring:
        RealUserMonitoringPolicyAnalyzerService.checkRealUserMonitoring(
          projectRoot
        ),
      performanceBudget:
        PerformanceBudgetPolicyAnalyzerService.checkPerformanceBudget(
          projectRoot
        ),
      errorTracking:
        await ErrorTrackingPolicyAnalyzerService.checkErrorAndPerformanceTracking(
          projectRoot,
          config
        ),
      performanceAlerting:
        PerformanceAlertingPolicyAnalyzerService.checkPerformanceAlerting(
          projectRoot
        ),
      coreWebVitals:
        await CoreWebVitalsPolicyAnalyzerService.checkCoreWebVitalsMonitoring(
          projectRoot,
          config
        ),
      performanceDashboards:
        PerformanceDashboardsPolicyAnalyzerService.checkPerformanceDashboards(
          projectRoot
        ),
    };
  }
}

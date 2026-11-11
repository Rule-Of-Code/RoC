import type { RuleOfCodeConfig } from '../../../../config/types';
import { ReactPerformanceSource } from '../../../../utils/react/react-performance-source';
import { ErrorTrackingPolicyConstants } from '../constants/error-tracking-policy.constants';
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
    config?: RuleOfCodeConfig,
    lawId?: string
  ): Promise<{
    realUserMonitoring: { hasRUM: boolean; tools: string[] };
    performanceBudget: { configured: boolean; budgetSources: string[] };
    errorTracking: { hasTracking: boolean; tools: string[] };
    performanceAlerting: { hasAlerts: boolean; alertSources: string[] };
    coreWebVitals: { monitored: boolean; implementations: string[] };
    performanceDashboards: { hasDashboards: boolean; dashboardTypes: string[] };
    unread: string[];
  }> {
    // React/Next source, read once: Web Vitals reporting (`useReportWebVitals`,
    // web-vitals calls) and imports of an error-tracking SDK - in the root
    // layout, `instrumentation*.ts` or anywhere else. Does not run on a project
    // that declares neither react nor next.
    const react = ReactPerformanceSource.scan(
      { projectRoot, config: config as RuleOfCodeConfig, lawId },
      ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS
    );
    return {
      realUserMonitoring:
        RealUserMonitoringPolicyAnalyzerService.checkRealUserMonitoring(
          projectRoot,
          react
        ),
      performanceBudget:
        PerformanceBudgetPolicyAnalyzerService.checkPerformanceBudget(
          projectRoot,
          config
        ),
      errorTracking:
        await ErrorTrackingPolicyAnalyzerService.checkErrorAndPerformanceTracking(
          projectRoot,
          config,
          react
        ),
      performanceAlerting:
        PerformanceAlertingPolicyAnalyzerService.checkPerformanceAlerting(
          projectRoot
        ),
      coreWebVitals:
        await CoreWebVitalsPolicyAnalyzerService.checkCoreWebVitalsMonitoring(
          projectRoot,
          config,
          react
        ),
      performanceDashboards:
        PerformanceDashboardsPolicyAnalyzerService.checkPerformanceDashboards(
          projectRoot
        ),
      unread: react.unread,
    };
  }
}

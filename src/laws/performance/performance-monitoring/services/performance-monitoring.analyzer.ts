import type { RuleOfCodeConfig } from '../../../../config/types';
import { BuildPerformanceAnalyzerService } from './build-performance.analyzer';
import { ErrorTrackingAnalyzerService } from './error-tracking.analyzer';
import { MonitoringToolsAnalyzerService } from './monitoring-tools.analyzer';
import { PerformanceAlertsAnalyzerService } from './performance-alerts.analyzer';
import { PerformanceBudgetAnalyzerService } from './performance-budget.analyzer';
import { RealUserMonitoringAnalyzerService } from './real-user-monitoring.analyzer';

/**
 * Performance Monitoring Analyzer Service
 *
 * Single Responsibility: Orchestrate all performance monitoring checks
 */
export class PerformanceMonitoringAnalyzerService {
  static async analyzeMonitoring(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<{
    monitoringTools: { hasTools: boolean; tools: string[] };
    realUserMonitoring: { configured: boolean };
    performanceBudget: { configured: boolean };
    buildPerformance: { configured: boolean };
    errorTracking: { configured: boolean };
    performanceAlerts: { configured: boolean };
  }> {
    return {
      monitoringTools:
        MonitoringToolsAnalyzerService.checkMonitoringToolsIntegration(
          projectRoot
        ),
      realUserMonitoring:
        await RealUserMonitoringAnalyzerService.checkRealUserMonitoring(
          projectRoot,
          config
        ),
      performanceBudget:
        PerformanceBudgetAnalyzerService.checkPerformanceBudget(projectRoot),
      buildPerformance:
        BuildPerformanceAnalyzerService.checkBuildPerformanceMonitoring(
          projectRoot
        ),
      errorTracking:
        await ErrorTrackingAnalyzerService.checkPerformanceErrorTracking(
          projectRoot,
          config
        ),
      performanceAlerts:
        PerformanceAlertsAnalyzerService.checkPerformanceAlerts(projectRoot),
    };
  }
}

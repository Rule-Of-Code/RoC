import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { PerformanceAlertingConstants } from '../constants/performance-alerting.constants';

/**
 * Performance Alerting Policy Analyzer Service
 *
 * Single Responsibility: Analyze performance alerting configuration
 */
export class PerformanceAlertingPolicyAnalyzerService {
  static checkPerformanceAlerting(projectRoot: string): {
    hasAlerts: boolean;
    alertSources: string[];
  } {
    const alertSources: string[] = [];

    // Check monitoring service alerts
    for (const configFile of PerformanceAlertingConstants.MONITORING_CONFIG_FILES) {
      this.checkConfigFileForAlerts(projectRoot, configFile, alertSources);
    }

    return {
      hasAlerts: alertSources.length > 0,
      alertSources,
    };
  }

  private static checkConfigFileForAlerts(
    projectRoot: string,
    configFile: string,
    alertSources: string[]
  ): void {
    const fullPath = PathOperations.join(projectRoot, configFile);
    if (!FileUtils.exists(fullPath)) return;

    try {
      const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });
      if (PerformanceAlertingConstants.hasAlertConfiguration(content)) {
        const serviceName = configFile.split('.')[0];
        if (!serviceName) return;

        alertSources.push(
          `${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} alerts`
        );
      }
    } catch {
      // Ignore read errors
    }
  }
}

import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { PerformanceAlertsConstants } from '../constants/performance-alerts.constants';

/**
 * Performance Alerts Analyzer Service
 *
 * Single Responsibility: Analyze performance alerts configuration
 */
export class PerformanceAlertsAnalyzerService {
  static checkPerformanceAlerts(projectRoot: string): {
    configured: boolean;
  } {
    for (const configFile of PerformanceAlertsConstants.ALERT_CONFIG_FILE_PATTERNS) {
      const fullPath = PathOperations.join(projectRoot, configFile);
      if (FileUtils.exists(fullPath)) {
        try {
          const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });
          if (PerformanceAlertsConstants.hasAlertConfiguration(content)) {
            return { configured: true };
          }
        } catch {
          // Ignore file read errors
        }
      }
    }

    return { configured: false };
  }
}

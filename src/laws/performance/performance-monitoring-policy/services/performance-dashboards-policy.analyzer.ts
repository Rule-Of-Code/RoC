import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { PerformanceDashboardsConstants } from '../constants/performance-dashboards.constants';

/**
 * Performance Dashboards Policy Analyzer Service
 *
 * Single Responsibility: Analyze performance dashboards configuration
 */
export class PerformanceDashboardsPolicyAnalyzerService {
  static checkPerformanceDashboards(projectRoot: string): {
    hasDashboards: boolean;
    dashboardTypes: string[];
  } {
    const dashboardTypes: string[] = [];

    // Check for dashboard configuration files
    for (const configFile of PerformanceDashboardsConstants.DASHBOARD_CONFIG_FILES) {
      if (FileUtils.exists(PathOperations.join(projectRoot, configFile))) {
        const dashboardName = configFile.split('.')[0];
        if (dashboardName) {
          dashboardTypes.push(
            dashboardName.charAt(0).toUpperCase() + dashboardName.slice(1)
          );
        }
      }
    }

    // Check for Lighthouse CI integration (provides dashboard)
    for (const lighthouseFile of PerformanceDashboardsConstants.LIGHTHOUSE_CONFIG_FILES) {
      if (FileUtils.exists(PathOperations.join(projectRoot, lighthouseFile))) {
        dashboardTypes.push('Lighthouse CI Dashboard');
        break;
      }
    }

    return {
      hasDashboards: dashboardTypes.length > 0,
      dashboardTypes,
    };
  }
}

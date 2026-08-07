/**
 * Performance Dashboards Policy Constants
 *
 * Single Responsibility: Performance dashboard configuration detection
 */
export class PerformanceDashboardsConstants {
  static readonly DASHBOARD_CONFIG_FILES: string[] = [
    'grafana.json',
    'dashboard.json',
    'kibana.json',
    'newrelic-dashboard.json',
  ];

  static readonly LIGHTHOUSE_CONFIG_FILES: string[] = [
    '.lighthouserc.js',
    '.lighthouserc.json',
  ];

  static readonly GITHUB_WORKFLOWS_PATTERN = '.github/workflows/*.{yml,yaml}';

  static readonly CI_REPORT_PATTERNS: string[] = ['lighthouse', 'report'];

  static isDashboardConfigFile(filename: string): boolean {
    return this.DASHBOARD_CONFIG_FILES.some(file => filename.includes(file));
  }

  static isLighthouseDashboard(filename: string): boolean {
    return this.LIGHTHOUSE_CONFIG_FILES.some(file => filename.includes(file));
  }

  static hasCIReporting(content: string): boolean {
    return this.CI_REPORT_PATTERNS.every(pattern => content.includes(pattern));
  }
}

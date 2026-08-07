/**
 * Monitoring Tools Constants
 *
 * Single Responsibility: Performance monitoring tools and integration validation
 */
export class MonitoringToolsConstants {
  static readonly MONITORING_TOOL_PACKAGES: Record<string, string> = {
    '@sentry/browser': 'Sentry',
    '@sentry/angular': 'Sentry Angular',
    '@firebase/performance': 'Firebase Performance',
    firebase: 'Firebase',
    newrelic: 'New Relic',
    '@newrelic/browser-agent': 'New Relic Browser',
    'web-vitals': 'Web Vitals',
    'perfume.js': 'Perfume.js',
    cls: 'Cumulative Layout Shift',
    '@google-analytics/gtag': 'Google Analytics 4',
  };

  static readonly CUSTOM_MONITORING_FILE_PATTERNS: string[] = [
    'src/utils/performance.ts',
    'src/services/performance.service.ts',
    'src/monitoring/performance.ts',
  ];

  static getMonitoringToolName(packageName: string): string | undefined {
    return this.MONITORING_TOOL_PACKAGES[packageName];
  }

  static isMonitoringTool(packageName: string): boolean {
    return packageName in this.MONITORING_TOOL_PACKAGES;
  }
}

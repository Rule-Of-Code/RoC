/**
 * Real User Monitoring Policy Constants
 *
 * Single Responsibility: RUM tool detection and configuration
 */
export class RealUserMonitoringPolicyConstants {
  static readonly RUM_TOOLS: Record<string, string> = {
    'web-vitals': 'Web Vitals',
    '@google-analytics/gtag': 'Google Analytics',
    gtag: 'Google Analytics',
    newrelic: 'New Relic',
    '@newrelic/browser': 'New Relic Browser',
    'datadog-browser-rum': 'DataDog RUM',
    '@datadog/browser-rum': 'DataDog RUM',
    dynatrace: 'Dynatrace',
    pingdom: 'Pingdom',
    speedcurve: 'SpeedCurve',
  };

  static readonly GOOGLE_ANALYTICS_PATTERNS: string[] = [
    'gtag',
    'google-analytics',
  ];

  static readonly RUM_CONFIG_FILES: string[] = [
    'newrelic.js',
    'datadog.json',
    'dynatrace.config.js',
  ];

  static readonly INDEX_HTML_FILE = 'src/index.html';

  static isRumTool(packageName: string): boolean {
    return packageName in this.RUM_TOOLS;
  }

  static getRumToolName(packageName: string): string | undefined {
    return this.RUM_TOOLS[packageName];
  }
}

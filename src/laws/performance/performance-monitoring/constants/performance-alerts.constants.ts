/**
 * Performance Alerts Constants
 *
 * Single Responsibility: Performance alert configuration validation
 */
export class PerformanceAlertsConstants {
  static readonly ALERT_CONFIG_FILE_PATTERNS: string[] = [
    'lighthouse.config.js',
    'config/performance-alerts.json',
    'performance-monitoring.config.js',
    '.github/workflows/performance.yml',
    'bitbucket-pipelines.yml',
  ];

  static readonly ALERT_CONFIGURATION_PATTERNS: string[] = [
    'alert',
    'notification',
    'webhook',
    'slack',
    'threshold',
  ];

  static isAlertConfigFile(filename: string): boolean {
    return this.ALERT_CONFIG_FILE_PATTERNS.some(pattern =>
      filename.includes(pattern)
    );
  }

  static hasAlertConfiguration(content: string): boolean {
    return this.ALERT_CONFIGURATION_PATTERNS.some(pattern =>
      content.includes(pattern)
    );
  }
}

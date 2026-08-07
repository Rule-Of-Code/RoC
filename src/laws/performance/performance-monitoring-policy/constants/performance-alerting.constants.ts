/**
 * Performance Alerting Policy Constants
 *
 * Single Responsibility: Performance alerting configuration detection
 */
export class PerformanceAlertingConstants {
  static readonly GITHUB_WORKFLOWS_PATTERN = '.github/workflows/*.{yml,yaml}';

  static readonly MONITORING_CONFIG_FILES: string[] = [
    'newrelic.js',
    'datadog.json',
    '.lighthouserc.js',
  ];

  static readonly ALERT_CONFIG_PATTERNS: string[] = [
    'alert',
    'notification',
    'webhook',
  ];

  static readonly GITHUB_ALERT_PATTERNS: string[] = [
    'lighthouse',
    'performance',
  ];

  static readonly NOTIFICATION_PATTERNS: string[] = [
    'slack',
    'email',
    'notification',
  ];

  static hasAlertConfiguration(content: string): boolean {
    return this.ALERT_CONFIG_PATTERNS.some(pattern =>
      content.includes(pattern)
    );
  }

  static hasGithubAlerts(content: string): boolean {
    const hasPerf = this.GITHUB_ALERT_PATTERNS.some(pattern =>
      content.includes(pattern)
    );
    const hasNotif = this.NOTIFICATION_PATTERNS.some(pattern =>
      content.includes(pattern)
    );
    return hasPerf && hasNotif;
  }
}

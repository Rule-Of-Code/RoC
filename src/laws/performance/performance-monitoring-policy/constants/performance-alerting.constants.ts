/**
 * Performance Alerting Policy Constants
 *
 * Single Responsibility: Performance alerting configuration detection
 */
export class PerformanceAlertingConstants {
  static readonly WORKFLOWS_DIR = '.github/workflows';

  static readonly MONITORING_CONFIG_FILES: string[] = ['newrelic.js', 'datadog.json'];

  /** Lighthouse CI's config names; with `assert` in it, a regression fails CI. */
  static readonly LIGHTHOUSE_CI_FILES: string[] = [
    '.lighthouserc.js',
    '.lighthouserc.cjs',
    '.lighthouserc.json',
    '.lighthouserc.yml',
    '.lighthouserc.yaml',
    'lighthouserc.js',
    'lighthouserc.cjs',
    'lighthouserc.json',
    'lighthouserc.yml',
    'lighthouserc.yaml',
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

  static hasLighthouseAssertions(content: string): boolean {
    return /\bassert(?:ions)?\b/.test(content);
  }

  /** A workflow that runs a performance check AND notifies someone. */
  static hasGithubAlerts(content: string): boolean {
    const text = content.toLowerCase();
    const hasPerf = this.GITHUB_ALERT_PATTERNS.some(pattern =>
      text.includes(pattern)
    );
    const hasNotif = this.NOTIFICATION_PATTERNS.some(pattern =>
      text.includes(pattern)
    );
    return hasPerf && hasNotif;
  }
}

/**
 * Tests for PerformanceAlertingConstants
 *
 * Tests performance alerting configuration detection.
 */
import { PerformanceAlertingConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/performance-alerting.constants';

describe('PerformanceAlertingConstants', () => {
  describe('GITHUB_WORKFLOWS_PATTERN', () => {
    it('should be the correct pattern', () => {
      expect(PerformanceAlertingConstants.GITHUB_WORKFLOWS_PATTERN).toBe(
        '.github/workflows/*.{yml,yaml}'
      );
    });
  });

  describe('MONITORING_CONFIG_FILES', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(PerformanceAlertingConstants.MONITORING_CONFIG_FILES)
      ).toBe(true);
    });

    it('should contain newrelic.js', () => {
      expect(PerformanceAlertingConstants.MONITORING_CONFIG_FILES).toContain(
        'newrelic.js'
      );
    });

    it('should contain datadog.json', () => {
      expect(PerformanceAlertingConstants.MONITORING_CONFIG_FILES).toContain(
        'datadog.json'
      );
    });

    it('should contain .lighthouserc.js', () => {
      expect(PerformanceAlertingConstants.MONITORING_CONFIG_FILES).toContain(
        '.lighthouserc.js'
      );
    });
  });

  describe('ALERT_CONFIG_PATTERNS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(PerformanceAlertingConstants.ALERT_CONFIG_PATTERNS)
      ).toBe(true);
    });

    it('should contain alert patterns', () => {
      expect(PerformanceAlertingConstants.ALERT_CONFIG_PATTERNS).toContain(
        'alert'
      );
      expect(PerformanceAlertingConstants.ALERT_CONFIG_PATTERNS).toContain(
        'notification'
      );
      expect(PerformanceAlertingConstants.ALERT_CONFIG_PATTERNS).toContain(
        'webhook'
      );
    });
  });

  describe('GITHUB_ALERT_PATTERNS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(PerformanceAlertingConstants.GITHUB_ALERT_PATTERNS)
      ).toBe(true);
    });

    it('should contain lighthouse', () => {
      expect(PerformanceAlertingConstants.GITHUB_ALERT_PATTERNS).toContain(
        'lighthouse'
      );
    });

    it('should contain performance', () => {
      expect(PerformanceAlertingConstants.GITHUB_ALERT_PATTERNS).toContain(
        'performance'
      );
    });
  });

  describe('NOTIFICATION_PATTERNS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(PerformanceAlertingConstants.NOTIFICATION_PATTERNS)
      ).toBe(true);
    });

    it('should contain notification methods', () => {
      expect(PerformanceAlertingConstants.NOTIFICATION_PATTERNS).toContain(
        'slack'
      );
      expect(PerformanceAlertingConstants.NOTIFICATION_PATTERNS).toContain(
        'email'
      );
      expect(PerformanceAlertingConstants.NOTIFICATION_PATTERNS).toContain(
        'notification'
      );
    });
  });

  describe('hasAlertConfiguration', () => {
    it('should return true when alert is present', () => {
      expect(
        PerformanceAlertingConstants.hasAlertConfiguration(
          'send alert on failure'
        )
      ).toBe(true);
    });

    it('should return true when notification is present', () => {
      expect(
        PerformanceAlertingConstants.hasAlertConfiguration(
          'notification config'
        )
      ).toBe(true);
    });

    it('should return true when webhook is present', () => {
      expect(
        PerformanceAlertingConstants.hasAlertConfiguration('webhook url')
      ).toBe(true);
    });

    it('should return false when no alert config is present', () => {
      expect(
        PerformanceAlertingConstants.hasAlertConfiguration('regular config')
      ).toBe(false);
    });
  });

  describe('hasGithubAlerts', () => {
    it('should return true when lighthouse and slack are present', () => {
      const content = 'run lighthouse and notify slack';
      expect(PerformanceAlertingConstants.hasGithubAlerts(content)).toBe(true);
    });

    it('should return true when performance and email are present', () => {
      const content = 'check performance and send email';
      expect(PerformanceAlertingConstants.hasGithubAlerts(content)).toBe(true);
    });

    it('should return true when lighthouse and notification are present', () => {
      const content = 'lighthouse with notification';
      expect(PerformanceAlertingConstants.hasGithubAlerts(content)).toBe(true);
    });

    it('should return false when only performance is present', () => {
      const content = 'check performance';
      expect(PerformanceAlertingConstants.hasGithubAlerts(content)).toBe(false);
    });

    it('should return false when only notification is present', () => {
      const content = 'send notification';
      expect(PerformanceAlertingConstants.hasGithubAlerts(content)).toBe(false);
    });

    it('should return false when neither is present', () => {
      expect(
        PerformanceAlertingConstants.hasGithubAlerts('regular workflow')
      ).toBe(false);
    });
  });
});

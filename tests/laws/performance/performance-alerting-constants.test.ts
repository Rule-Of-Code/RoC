/**
 * Tests for PerformanceAlertingConstants
 */
import { PerformanceAlertingConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/performance-alerting.constants';

describe('PerformanceAlertingConstants', () => {
  describe('GITHUB_WORKFLOWS_PATTERN', () => {
    it('should match github workflows path', () => {
      expect(PerformanceAlertingConstants.GITHUB_WORKFLOWS_PATTERN).toBe(
        '.github/workflows/*.{yml,yaml}'
      );
    });
  });

  describe('MONITORING_CONFIG_FILES', () => {
    it('should be a non-empty array', () => {
      expect(
        Array.isArray(PerformanceAlertingConstants.MONITORING_CONFIG_FILES)
      ).toBe(true);
      expect(
        PerformanceAlertingConstants.MONITORING_CONFIG_FILES.length
      ).toBeGreaterThan(0);
    });

    it('should include newrelic.js', () => {
      expect(PerformanceAlertingConstants.MONITORING_CONFIG_FILES).toContain(
        'newrelic.js'
      );
    });

    it('should include datadog.json', () => {
      expect(PerformanceAlertingConstants.MONITORING_CONFIG_FILES).toContain(
        'datadog.json'
      );
    });

    it('should include .lighthouserc.js', () => {
      expect(PerformanceAlertingConstants.MONITORING_CONFIG_FILES).toContain(
        '.lighthouserc.js'
      );
    });
  });

  describe('ALERT_CONFIG_PATTERNS', () => {
    it('should include alert', () => {
      expect(PerformanceAlertingConstants.ALERT_CONFIG_PATTERNS).toContain(
        'alert'
      );
    });

    it('should include notification', () => {
      expect(PerformanceAlertingConstants.ALERT_CONFIG_PATTERNS).toContain(
        'notification'
      );
    });

    it('should include webhook', () => {
      expect(PerformanceAlertingConstants.ALERT_CONFIG_PATTERNS).toContain(
        'webhook'
      );
    });
  });

  describe('GITHUB_ALERT_PATTERNS', () => {
    it('should include lighthouse', () => {
      expect(PerformanceAlertingConstants.GITHUB_ALERT_PATTERNS).toContain(
        'lighthouse'
      );
    });

    it('should include performance', () => {
      expect(PerformanceAlertingConstants.GITHUB_ALERT_PATTERNS).toContain(
        'performance'
      );
    });
  });

  describe('NOTIFICATION_PATTERNS', () => {
    it('should include slack', () => {
      expect(PerformanceAlertingConstants.NOTIFICATION_PATTERNS).toContain(
        'slack'
      );
    });

    it('should include email', () => {
      expect(PerformanceAlertingConstants.NOTIFICATION_PATTERNS).toContain(
        'email'
      );
    });

    it('should include notification', () => {
      expect(PerformanceAlertingConstants.NOTIFICATION_PATTERNS).toContain(
        'notification'
      );
    });
  });

  describe('hasAlertConfiguration()', () => {
    it('should return true for content with alert', () => {
      expect(
        PerformanceAlertingConstants.hasAlertConfiguration('alert: true')
      ).toBe(true);
    });

    it('should return true for content with notification', () => {
      expect(
        PerformanceAlertingConstants.hasAlertConfiguration(
          'notification: enabled'
        )
      ).toBe(true);
    });

    it('should return true for content with webhook', () => {
      expect(
        PerformanceAlertingConstants.hasAlertConfiguration(
          'webhook: "https://example.com"'
        )
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        PerformanceAlertingConstants.hasAlertConfiguration('config: {}')
      ).toBe(false);
    });
  });

  describe('hasGithubAlerts()', () => {
    it('should return true for content with performance and slack', () => {
      const content = 'performance: true\nslack: "#channel"';
      expect(PerformanceAlertingConstants.hasGithubAlerts(content)).toBe(true);
    });

    it('should return true for content with lighthouse and email', () => {
      const content = 'lighthouse: enabled\nemail: "test@example.com"';
      expect(PerformanceAlertingConstants.hasGithubAlerts(content)).toBe(true);
    });

    it('should return false for content with only performance', () => {
      expect(
        PerformanceAlertingConstants.hasGithubAlerts('performance: true')
      ).toBe(false);
    });

    it('should return false for content with only notification', () => {
      expect(
        PerformanceAlertingConstants.hasGithubAlerts('slack: "#channel"')
      ).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(PerformanceAlertingConstants.hasGithubAlerts('')).toBe(false);
    });
  });
});

/**
 * Tests for PerformanceAlertsConstants
 *
 * Covers:
 * - ALERT_CONFIG_FILE_PATTERNS
 * - ALERT_CONFIGURATION_PATTERNS
 * - isAlertConfigFile()
 * - hasAlertConfiguration()
 */
import { PerformanceAlertsConstants } from '../../../src/laws/performance/performance-monitoring/constants/performance-alerts.constants';

describe('PerformanceAlertsConstants', () => {
  describe('ALERT_CONFIG_FILE_PATTERNS', () => {
    it('should be a non-empty array', () => {
      expect(
        Array.isArray(PerformanceAlertsConstants.ALERT_CONFIG_FILE_PATTERNS)
      ).toBe(true);
      expect(
        PerformanceAlertsConstants.ALERT_CONFIG_FILE_PATTERNS.length
      ).toBeGreaterThan(0);
    });

    it('should include lighthouse.config.js', () => {
      expect(PerformanceAlertsConstants.ALERT_CONFIG_FILE_PATTERNS).toContain(
        'lighthouse.config.js'
      );
    });

    it('should include config/performance-alerts.json', () => {
      expect(PerformanceAlertsConstants.ALERT_CONFIG_FILE_PATTERNS).toContain(
        'config/performance-alerts.json'
      );
    });

    it('should include performance-monitoring.config.js', () => {
      expect(PerformanceAlertsConstants.ALERT_CONFIG_FILE_PATTERNS).toContain(
        'performance-monitoring.config.js'
      );
    });

    it('should include .github/workflows/performance.yml', () => {
      expect(PerformanceAlertsConstants.ALERT_CONFIG_FILE_PATTERNS).toContain(
        '.github/workflows/performance.yml'
      );
    });

    it('should include bitbucket-pipelines.yml', () => {
      expect(PerformanceAlertsConstants.ALERT_CONFIG_FILE_PATTERNS).toContain(
        'bitbucket-pipelines.yml'
      );
    });

    it('should have exactly 5 patterns', () => {
      expect(PerformanceAlertsConstants.ALERT_CONFIG_FILE_PATTERNS.length).toBe(
        5
      );
    });
  });

  describe('ALERT_CONFIGURATION_PATTERNS', () => {
    it('should be a non-empty array', () => {
      expect(
        Array.isArray(PerformanceAlertsConstants.ALERT_CONFIGURATION_PATTERNS)
      ).toBe(true);
      expect(
        PerformanceAlertsConstants.ALERT_CONFIGURATION_PATTERNS.length
      ).toBeGreaterThan(0);
    });

    it('should include alert', () => {
      expect(PerformanceAlertsConstants.ALERT_CONFIGURATION_PATTERNS).toContain(
        'alert'
      );
    });

    it('should include notification', () => {
      expect(PerformanceAlertsConstants.ALERT_CONFIGURATION_PATTERNS).toContain(
        'notification'
      );
    });

    it('should include webhook', () => {
      expect(PerformanceAlertsConstants.ALERT_CONFIGURATION_PATTERNS).toContain(
        'webhook'
      );
    });

    it('should include slack', () => {
      expect(PerformanceAlertsConstants.ALERT_CONFIGURATION_PATTERNS).toContain(
        'slack'
      );
    });

    it('should include threshold', () => {
      expect(PerformanceAlertsConstants.ALERT_CONFIGURATION_PATTERNS).toContain(
        'threshold'
      );
    });

    it('should have exactly 5 patterns', () => {
      expect(
        PerformanceAlertsConstants.ALERT_CONFIGURATION_PATTERNS.length
      ).toBe(5);
    });
  });

  describe('isAlertConfigFile()', () => {
    it('should return true for lighthouse.config.js', () => {
      expect(
        PerformanceAlertsConstants.isAlertConfigFile('lighthouse.config.js')
      ).toBe(true);
    });

    it('should return true for config/performance-alerts.json', () => {
      expect(
        PerformanceAlertsConstants.isAlertConfigFile(
          'config/performance-alerts.json'
        )
      ).toBe(true);
    });

    it('should return true for performance-monitoring.config.js', () => {
      expect(
        PerformanceAlertsConstants.isAlertConfigFile(
          'performance-monitoring.config.js'
        )
      ).toBe(true);
    });

    it('should return true for .github/workflows/performance.yml', () => {
      expect(
        PerformanceAlertsConstants.isAlertConfigFile(
          '.github/workflows/performance.yml'
        )
      ).toBe(true);
    });

    it('should return true for bitbucket-pipelines.yml', () => {
      expect(
        PerformanceAlertsConstants.isAlertConfigFile('bitbucket-pipelines.yml')
      ).toBe(true);
    });

    it('should return true for path containing pattern', () => {
      expect(
        PerformanceAlertsConstants.isAlertConfigFile(
          'src/config/lighthouse.config.js'
        )
      ).toBe(true);
    });

    it('should return false for unrelated files', () => {
      expect(PerformanceAlertsConstants.isAlertConfigFile('package.json')).toBe(
        false
      );
    });

    it('should return false for empty string', () => {
      expect(PerformanceAlertsConstants.isAlertConfigFile('')).toBe(false);
    });
  });

  describe('hasAlertConfiguration()', () => {
    it('should return true for content with alert', () => {
      expect(
        PerformanceAlertsConstants.hasAlertConfiguration('const alert = true;')
      ).toBe(true);
    });

    it('should return true for content with notification', () => {
      expect(
        PerformanceAlertsConstants.hasAlertConfiguration('notification.send();')
      ).toBe(true);
    });

    it('should return true for content with webhook', () => {
      expect(
        PerformanceAlertsConstants.hasAlertConfiguration(
          'webhook: "https://example.com"'
        )
      ).toBe(true);
    });

    it('should return true for content with slack', () => {
      expect(
        PerformanceAlertsConstants.hasAlertConfiguration('slack: "#channel"')
      ).toBe(true);
    });

    it('should return true for content with threshold', () => {
      expect(
        PerformanceAlertsConstants.hasAlertConfiguration('threshold: 100')
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        PerformanceAlertsConstants.hasAlertConfiguration('const x = 1;')
      ).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(PerformanceAlertsConstants.hasAlertConfiguration('')).toBe(false);
    });

    it('should handle multiline content', () => {
      const content = `
        const config = {
          alert: true,
          notification: "email"
        };
      `;
      expect(PerformanceAlertsConstants.hasAlertConfiguration(content)).toBe(
        true
      );
    });
  });
});

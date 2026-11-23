/**
 * Tests for Performance Monitoring Policy Constants
 *
 * Tests the performance monitoring policy configuration and utilities.
 */
import { ErrorTrackingPolicyConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/error-tracking-policy.constants';
import { PerformanceAlertingConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/performance-alerting.constants';

describe('ErrorTrackingPolicyConstants', () => {
  describe('ERROR_TRACKING_TOOLS', () => {
    it('should include @sentry/browser', () => {
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        '@sentry/browser'
      );
    });

    it('should include @sentry/angular', () => {
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        '@sentry/angular'
      );
    });

    it('should include logrocket', () => {
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        'logrocket'
      );
    });

    it('should include bugsnag', () => {
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        'bugsnag'
      );
    });
  });

  describe('ERROR_TRACKING_CONFIG_FILES', () => {
    it('should include sentry.config.js', () => {
      expect(
        ErrorTrackingPolicyConstants.ERROR_TRACKING_CONFIG_FILES
      ).toContain('sentry.config.js');
    });

    it('should include .sentryclirc', () => {
      expect(
        ErrorTrackingPolicyConstants.ERROR_TRACKING_CONFIG_FILES
      ).toContain('.sentryclirc');
    });
  });

  describe('isErrorTrackingTool', () => {
    it('should return true for @sentry/browser', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingTool('@sentry/browser')
      ).toBe(true);
    });

    it('should return true for logrocket', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingTool('logrocket')
      ).toBe(true);
    });

    it('should return false for unknown tool', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingTool('unknown-tool')
      ).toBe(false);
    });
  });

  describe('isErrorTrackingConfigFile', () => {
    it('should return true for sentry.config.js', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingConfigFile(
          'sentry.config.js'
        )
      ).toBe(true);
    });

    it('should return true for path containing sentry.config.js', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingConfigFile(
          '/project/sentry.config.js'
        )
      ).toBe(true);
    });

    it('should return false for regular file', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingConfigFile('app.config.js')
      ).toBe(false);
    });
  });

  describe('hasPerformanceTracking', () => {
    it('should return true for tracesSampleRate', () => {
      expect(
        ErrorTrackingPolicyConstants.hasPerformanceTracking(
          'tracesSampleRate: 1.0'
        )
      ).toBe(true);
    });

    it('should return true for performance', () => {
      expect(
        ErrorTrackingPolicyConstants.hasPerformanceTracking('performance: true')
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        ErrorTrackingPolicyConstants.hasPerformanceTracking('debug: true')
      ).toBe(false);
    });
  });
});

describe('PerformanceAlertingConstants', () => {
  describe('WORKFLOWS_DIR', () => {
    it('should match GitHub workflows', () => {
      expect(PerformanceAlertingConstants.WORKFLOWS_DIR).toContain(
        '.github/workflows'
      );
    });
  });

  describe('MONITORING_CONFIG_FILES', () => {
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
      expect(PerformanceAlertingConstants.LIGHTHOUSE_CI_FILES).toContain(
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

  describe('hasAlertConfiguration', () => {
    it('should return true for content with alert', () => {
      expect(
        PerformanceAlertingConstants.hasAlertConfiguration(
          'alertThreshold: 0.8'
        )
      ).toBe(true);
    });

    it('should return true for content with notification', () => {
      expect(
        PerformanceAlertingConstants.hasAlertConfiguration('notification: true')
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        PerformanceAlertingConstants.hasAlertConfiguration('config: true')
      ).toBe(false);
    });
  });

  describe('hasGithubAlerts', () => {
    it('should return true for performance with notification', () => {
      expect(
        PerformanceAlertingConstants.hasGithubAlerts(
          'performance slack notification'
        )
      ).toBe(true);
    });

    it('should return true for lighthouse with email', () => {
      expect(
        PerformanceAlertingConstants.hasGithubAlerts('lighthouse email alert')
      ).toBe(true);
    });

    it('should return false for only performance without notification', () => {
      expect(
        PerformanceAlertingConstants.hasGithubAlerts('performance test')
      ).toBe(false);
    });

    it('should return false for only notification without performance', () => {
      expect(
        PerformanceAlertingConstants.hasGithubAlerts('slack notification')
      ).toBe(false);
    });
  });
});

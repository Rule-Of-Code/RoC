/**
 * Tests for Performance Monitoring Policy Constants
 *
 * Tests the performance monitoring policy configuration and utilities.
 */
import { CoreWebVitalsPolicyConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/core-web-vitals-policy.constants';
import { ErrorTrackingPolicyConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/error-tracking-policy.constants';
import { PerformanceAlertingConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/performance-alerting.constants';

describe('CoreWebVitalsPolicyConstants', () => {
  describe('WEB_VITALS_PACKAGE', () => {
    it('should be web-vitals', () => {
      expect(CoreWebVitalsPolicyConstants.WEB_VITALS_PACKAGE).toBe(
        'web-vitals'
      );
    });
  });

  describe('CWV_KEYWORDS', () => {
    it('should include getCLS', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('getCLS');
    });

    it('should include getFID', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('getFID');
    });

    it('should include getLCP', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('getLCP');
    });

    it('should include getTTFB', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('getTTFB');
    });

    it('should include web-vitals', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('web-vitals');
    });
  });

  describe('Patterns', () => {
    it('should have LCP_PATTERN', () => {
      expect(CoreWebVitalsPolicyConstants.LCP_PATTERN).toBe('getLCP');
    });

    it('should have FID_PATTERN', () => {
      expect(CoreWebVitalsPolicyConstants.FID_PATTERN).toBe('getFID');
    });

    it('should have CLS_PATTERN', () => {
      expect(CoreWebVitalsPolicyConstants.CLS_PATTERN).toBe('getCLS');
    });
  });

  describe('hasCoreWebVitalsTracking', () => {
    it('should return true when content has getCLS', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsTracking(
          'import { getCLS } from "web-vitals";'
        )
      ).toBe(true);
    });

    it('should return true when content has getLCP', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsTracking(
          'getLCP(console.log);'
        )
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsTracking('const x = 1;')
      ).toBe(false);
    });
  });

  describe('hasWebVitalsLibrary', () => {
    it('should return true when web-vitals is in dependencies', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasWebVitalsLibrary({
          'web-vitals': '^3.0.0',
        })
      ).toBe(true);
    });

    it('should return false when web-vitals is not present', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasWebVitalsLibrary({ lodash: '^4.0.0' })
      ).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(CoreWebVitalsPolicyConstants.hasWebVitalsLibrary({})).toBe(false);
    });
  });

  describe('hasCoreWebVitalsMetrics', () => {
    it('should return true for getLCP', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsMetrics('getLCP(callback)')
      ).toBe(true);
    });

    it('should return true for getFID', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsMetrics('getFID(callback)')
      ).toBe(true);
    });

    it('should return true for getCLS', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsMetrics('getCLS(callback)')
      ).toBe(true);
    });

    it('should return false for other content', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsMetrics(
          'getTTFB(callback)'
        )
      ).toBe(false);
    });
  });
});

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

  describe('APP_MODULE_PATTERNS', () => {
    it('should include Sentry', () => {
      expect(ErrorTrackingPolicyConstants.APP_MODULE_PATTERNS).toContain(
        'Sentry'
      );
    });

    it('should include LogRocket', () => {
      expect(ErrorTrackingPolicyConstants.APP_MODULE_PATTERNS).toContain(
        'LogRocket'
      );
    });

    it('should include ErrorHandler', () => {
      expect(ErrorTrackingPolicyConstants.APP_MODULE_PATTERNS).toContain(
        'ErrorHandler'
      );
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

  describe('hasErrorTrackingImplementation', () => {
    it('should return true for content with Sentry', () => {
      expect(
        ErrorTrackingPolicyConstants.hasErrorTrackingImplementation(
          'Sentry.init({})'
        )
      ).toBe(true);
    });

    it('should return true for content with LogRocket', () => {
      expect(
        ErrorTrackingPolicyConstants.hasErrorTrackingImplementation(
          'LogRocket.init()'
        )
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        ErrorTrackingPolicyConstants.hasErrorTrackingImplementation(
          'const x = 1;'
        )
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
  describe('GITHUB_WORKFLOWS_PATTERN', () => {
    it('should match GitHub workflows', () => {
      expect(PerformanceAlertingConstants.GITHUB_WORKFLOWS_PATTERN).toContain(
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

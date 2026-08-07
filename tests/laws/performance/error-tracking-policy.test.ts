/**
 * Tests for ErrorTrackingPolicyConstants
 *
 * Tests error tracking tools and configuration detection.
 */
import { ErrorTrackingPolicyConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/error-tracking-policy.constants';

describe('ErrorTrackingPolicyConstants', () => {
  describe('ERROR_TRACKING_TOOLS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS)
      ).toBe(true);
    });

    it('should contain Sentry packages', () => {
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        '@sentry/browser'
      );
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        '@sentry/angular'
      );
    });

    it('should contain LogRocket packages', () => {
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        'logrocket'
      );
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        'logrocket-react'
      );
    });

    it('should contain Bugsnag packages', () => {
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        'bugsnag'
      );
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        '@bugsnag/browser'
      );
    });

    it('should contain other error tracking tools', () => {
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        'rollbar'
      );
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        'raygun4js'
      );
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        'trackjs'
      );
    });
  });

  describe('ERROR_TRACKING_CONFIG_FILES', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(ErrorTrackingPolicyConstants.ERROR_TRACKING_CONFIG_FILES)
      ).toBe(true);
    });

    it('should contain Sentry config files', () => {
      expect(
        ErrorTrackingPolicyConstants.ERROR_TRACKING_CONFIG_FILES
      ).toContain('sentry.config.js');
      expect(
        ErrorTrackingPolicyConstants.ERROR_TRACKING_CONFIG_FILES
      ).toContain('.sentryclirc');
    });

    it('should contain other config files', () => {
      expect(
        ErrorTrackingPolicyConstants.ERROR_TRACKING_CONFIG_FILES
      ).toContain('logrocket.config.js');
      expect(
        ErrorTrackingPolicyConstants.ERROR_TRACKING_CONFIG_FILES
      ).toContain('bugsnag.config.js');
    });
  });

  describe('APP_MODULE_PATTERNS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(ErrorTrackingPolicyConstants.APP_MODULE_PATTERNS)
      ).toBe(true);
    });

    it('should contain error tracking tool names', () => {
      expect(ErrorTrackingPolicyConstants.APP_MODULE_PATTERNS).toContain(
        'Sentry'
      );
      expect(ErrorTrackingPolicyConstants.APP_MODULE_PATTERNS).toContain(
        'LogRocket'
      );
      expect(ErrorTrackingPolicyConstants.APP_MODULE_PATTERNS).toContain(
        'Bugsnag'
      );
    });

    it('should contain ErrorHandler', () => {
      expect(ErrorTrackingPolicyConstants.APP_MODULE_PATTERNS).toContain(
        'ErrorHandler'
      );
    });
  });

  describe('PERFORMANCE_TRACKING_PATTERNS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(
          ErrorTrackingPolicyConstants.PERFORMANCE_TRACKING_PATTERNS
        )
      ).toBe(true);
    });

    it('should contain performance patterns', () => {
      expect(
        ErrorTrackingPolicyConstants.PERFORMANCE_TRACKING_PATTERNS
      ).toContain('tracesSampleRate');
      expect(
        ErrorTrackingPolicyConstants.PERFORMANCE_TRACKING_PATTERNS
      ).toContain('performance');
      expect(
        ErrorTrackingPolicyConstants.PERFORMANCE_TRACKING_PATTERNS
      ).toContain('tracingOrigins');
    });
  });

  describe('isErrorTrackingTool', () => {
    it('should return true for @sentry/browser', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingTool('@sentry/browser')
      ).toBe(true);
    });

    it('should return true for @sentry/angular', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingTool('@sentry/angular')
      ).toBe(true);
    });

    it('should return true for logrocket', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingTool('logrocket')
      ).toBe(true);
    });

    it('should return true for bugsnag', () => {
      expect(ErrorTrackingPolicyConstants.isErrorTrackingTool('bugsnag')).toBe(
        true
      );
    });

    it('should return true for rollbar', () => {
      expect(ErrorTrackingPolicyConstants.isErrorTrackingTool('rollbar')).toBe(
        true
      );
    });

    it('should return false for non-error-tracking packages', () => {
      expect(ErrorTrackingPolicyConstants.isErrorTrackingTool('lodash')).toBe(
        false
      );
      expect(ErrorTrackingPolicyConstants.isErrorTrackingTool('express')).toBe(
        false
      );
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

    it('should return true for .sentryclirc', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingConfigFile('.sentryclirc')
      ).toBe(true);
    });

    it('should return true for logrocket.config.js', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingConfigFile(
          'logrocket.config.js'
        )
      ).toBe(true);
    });

    it('should return true for bugsnag.config.js', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingConfigFile(
          'bugsnag.config.js'
        )
      ).toBe(true);
    });

    it('should return true for full paths', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingConfigFile(
          'config/sentry.config.js'
        )
      ).toBe(true);
    });

    it('should return false for non-config files', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingConfigFile('package.json')
      ).toBe(false);
    });
  });

  describe('hasErrorTrackingImplementation', () => {
    it('should return true when Sentry is present', () => {
      expect(
        ErrorTrackingPolicyConstants.hasErrorTrackingImplementation(
          'import * as Sentry from "@sentry/browser"'
        )
      ).toBe(true);
    });

    it('should return true when LogRocket is present', () => {
      expect(
        ErrorTrackingPolicyConstants.hasErrorTrackingImplementation(
          'LogRocket.init()'
        )
      ).toBe(true);
    });

    it('should return true when Bugsnag is present', () => {
      expect(
        ErrorTrackingPolicyConstants.hasErrorTrackingImplementation(
          'Bugsnag.start()'
        )
      ).toBe(true);
    });

    it('should return true when ErrorHandler is present', () => {
      expect(
        ErrorTrackingPolicyConstants.hasErrorTrackingImplementation(
          'class CustomErrorHandler extends ErrorHandler'
        )
      ).toBe(true);
    });

    it('should return false when no error tracking is present', () => {
      expect(
        ErrorTrackingPolicyConstants.hasErrorTrackingImplementation(
          'regular code'
        )
      ).toBe(false);
    });
  });

  describe('hasPerformanceTracking', () => {
    it('should return true when tracesSampleRate is present', () => {
      expect(
        ErrorTrackingPolicyConstants.hasPerformanceTracking(
          'tracesSampleRate: 1.0'
        )
      ).toBe(true);
    });

    it('should return true when performance is present', () => {
      expect(
        ErrorTrackingPolicyConstants.hasPerformanceTracking('performance: true')
      ).toBe(true);
    });

    it('should return true when tracingOrigins is present', () => {
      expect(
        ErrorTrackingPolicyConstants.hasPerformanceTracking(
          'tracingOrigins: ["localhost"]'
        )
      ).toBe(true);
    });

    it('should return false when no performance tracking is present', () => {
      expect(
        ErrorTrackingPolicyConstants.hasPerformanceTracking(
          'dsn: "https://example.com"'
        )
      ).toBe(false);
    });
  });
});

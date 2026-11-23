/**
 * Tests for ErrorTrackingPolicyConstants
 */
import { ErrorTrackingPolicyConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/error-tracking-policy.constants';

describe('ErrorTrackingPolicyConstants', () => {
  describe('ERROR_TRACKING_TOOLS', () => {
    it('should be a non-empty array', () => {
      expect(
        Array.isArray(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS)
      ).toBe(true);
      expect(
        ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS.length
      ).toBeGreaterThan(0);
    });

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

    it('should include logrocket-react', () => {
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        'logrocket-react'
      );
    });

    it('should include bugsnag', () => {
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        'bugsnag'
      );
    });

    it('should include @bugsnag/browser', () => {
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        '@bugsnag/browser'
      );
    });

    it('should include rollbar', () => {
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        'rollbar'
      );
    });

    it('should include raygun4js', () => {
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        'raygun4js'
      );
    });

    it('should include trackjs', () => {
      expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toContain(
        'trackjs'
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

    it('should include logrocket.config.js', () => {
      expect(
        ErrorTrackingPolicyConstants.ERROR_TRACKING_CONFIG_FILES
      ).toContain('logrocket.config.js');
    });

    it('should include bugsnag.config.js', () => {
      expect(
        ErrorTrackingPolicyConstants.ERROR_TRACKING_CONFIG_FILES
      ).toContain('bugsnag.config.js');
    });
  });

  describe('PERFORMANCE_TRACKING_PATTERNS', () => {
    it('should include tracesSampleRate', () => {
      expect(
        ErrorTrackingPolicyConstants.PERFORMANCE_TRACKING_PATTERNS
      ).toContain('tracesSampleRate');
    });

    it('should include performance', () => {
      expect(
        ErrorTrackingPolicyConstants.PERFORMANCE_TRACKING_PATTERNS
      ).toContain('performance');
    });

    it('should include tracingOrigins', () => {
      expect(
        ErrorTrackingPolicyConstants.PERFORMANCE_TRACKING_PATTERNS
      ).toContain('tracingOrigins');
    });
  });

  describe('isErrorTrackingTool()', () => {
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

    it('should return false for unknown package', () => {
      expect(ErrorTrackingPolicyConstants.isErrorTrackingTool('unknown')).toBe(
        false
      );
    });
  });

  describe('isErrorTrackingConfigFile()', () => {
    it('should return true for sentry.config.js', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingConfigFile(
          'sentry.config.js'
        )
      ).toBe(true);
    });

    it('should return true for path with config file', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingConfigFile(
          'config/sentry.config.js'
        )
      ).toBe(true);
    });

    it('should return false for unrelated file', () => {
      expect(
        ErrorTrackingPolicyConstants.isErrorTrackingConfigFile('package.json')
      ).toBe(false);
    });
  });

  describe('hasPerformanceTracking()', () => {
    it('should return true for content with tracesSampleRate', () => {
      expect(
        ErrorTrackingPolicyConstants.hasPerformanceTracking(
          'tracesSampleRate: 1.0'
        )
      ).toBe(true);
    });

    it('should return true for content with performance', () => {
      expect(
        ErrorTrackingPolicyConstants.hasPerformanceTracking('performance: true')
      ).toBe(true);
    });

    it('should return true for content with tracingOrigins', () => {
      expect(
        ErrorTrackingPolicyConstants.hasPerformanceTracking(
          'tracingOrigins: []'
        )
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        ErrorTrackingPolicyConstants.hasPerformanceTracking(
          'console.log("test")'
        )
      ).toBe(false);
    });
  });
});

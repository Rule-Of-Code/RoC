/**
 * Tests for ErrorTrackingConstants
 *
 * Covers:
 * - ERROR_TRACKING_TOOLS
 * - isErrorTrackingTool()
 *
 * The tracing check's substring patterns and fixed config paths were removed
 * in #12 (b4); their tests went with them (see performance-tracing-12).
 */
import { ErrorTrackingConstants } from '../../../src/laws/performance/performance-monitoring/constants/error-tracking.constants';

describe('ErrorTrackingConstants', () => {
  describe('ERROR_TRACKING_TOOLS', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(ErrorTrackingConstants.ERROR_TRACKING_TOOLS)).toBe(
        true
      );
      expect(
        ErrorTrackingConstants.ERROR_TRACKING_TOOLS.length
      ).toBeGreaterThan(0);
    });

    it('should include @sentry/browser', () => {
      expect(ErrorTrackingConstants.ERROR_TRACKING_TOOLS).toContain(
        '@sentry/browser'
      );
    });

    it('should include @sentry/angular', () => {
      expect(ErrorTrackingConstants.ERROR_TRACKING_TOOLS).toContain(
        '@sentry/angular'
      );
    });

    it('should include bugsnag', () => {
      expect(ErrorTrackingConstants.ERROR_TRACKING_TOOLS).toContain('bugsnag');
    });

    it('should include @bugsnag/browser', () => {
      expect(ErrorTrackingConstants.ERROR_TRACKING_TOOLS).toContain(
        '@bugsnag/browser'
      );
    });

    it('should include rollbar', () => {
      expect(ErrorTrackingConstants.ERROR_TRACKING_TOOLS).toContain('rollbar');
    });

    // The five Sentry browser SDKs from the shared list (#12), then three more.
    it('should have exactly 8 tools', () => {
      expect(ErrorTrackingConstants.ERROR_TRACKING_TOOLS.length).toBe(8);
    });
  });

  describe('isErrorTrackingTool()', () => {
    it('should return true for @sentry/browser', () => {
      expect(
        ErrorTrackingConstants.isErrorTrackingTool('@sentry/browser')
      ).toBe(true);
    });

    it('should return true for @sentry/angular', () => {
      expect(
        ErrorTrackingConstants.isErrorTrackingTool('@sentry/angular')
      ).toBe(true);
    });

    it('should return true for bugsnag', () => {
      expect(ErrorTrackingConstants.isErrorTrackingTool('bugsnag')).toBe(true);
    });

    it('should return true for @bugsnag/browser', () => {
      expect(
        ErrorTrackingConstants.isErrorTrackingTool('@bugsnag/browser')
      ).toBe(true);
    });

    it('should return true for rollbar', () => {
      expect(ErrorTrackingConstants.isErrorTrackingTool('rollbar')).toBe(true);
    });

    it('should return false for unknown package', () => {
      expect(
        ErrorTrackingConstants.isErrorTrackingTool('unknown-package')
      ).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(ErrorTrackingConstants.isErrorTrackingTool('')).toBe(false);
    });

    it('should return false for partial match', () => {
      expect(ErrorTrackingConstants.isErrorTrackingTool('sentry')).toBe(false);
    });
  });
});

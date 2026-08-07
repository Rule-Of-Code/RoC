/**
 * Tests for ErrorTrackingConstants
 *
 * Covers:
 * - ERROR_TRACKING_TOOLS
 * - ERROR_TRACKING_CONFIG_FILE_PATTERNS
 * - PERFORMANCE_ERROR_TRACKING_PATTERNS
 * - isErrorTrackingTool()
 * - hasErrorTrackingConfig()
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

    it('should have exactly 5 tools', () => {
      expect(ErrorTrackingConstants.ERROR_TRACKING_TOOLS.length).toBe(5);
    });
  });

  describe('getErrorTrackingConfigFilePaths', () => {
    const projectRoot = '/test/project';

    it('should be a non-empty array', async () => {
      const paths =
        await ErrorTrackingConstants.getErrorTrackingConfigFilePaths(
          projectRoot
        );
      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should include src/app/app.module.ts', async () => {
      expect(
        await ErrorTrackingConstants.getErrorTrackingConfigFilePaths(
          projectRoot
        )
      ).toContain(`${projectRoot}/src/app/app.module.ts`);
    });

    it('should include src/main.ts', async () => {
      expect(
        await ErrorTrackingConstants.getErrorTrackingConfigFilePaths(
          projectRoot
        )
      ).toContain(`${projectRoot}/src/main.ts`);
    });

    it('should include sentry.config.js', async () => {
      expect(
        await ErrorTrackingConstants.getErrorTrackingConfigFilePaths(
          projectRoot
        )
      ).toContain(`${projectRoot}/sentry.config.js`);
    });

    it('should have exactly 3 patterns', async () => {
      expect(
        (
          await ErrorTrackingConstants.getErrorTrackingConfigFilePaths(
            projectRoot
          )
        ).length
      ).toBe(3);
    });
  });

  describe('PERFORMANCE_ERROR_TRACKING_PATTERNS', () => {
    it('should be a non-empty array', () => {
      expect(
        Array.isArray(
          ErrorTrackingConstants.PERFORMANCE_ERROR_TRACKING_PATTERNS
        )
      ).toBe(true);
      expect(
        ErrorTrackingConstants.PERFORMANCE_ERROR_TRACKING_PATTERNS.length
      ).toBeGreaterThan(0);
    });

    it('should include tracesSampleRate', () => {
      expect(
        ErrorTrackingConstants.PERFORMANCE_ERROR_TRACKING_PATTERNS
      ).toContain('tracesSampleRate');
    });

    it('should include performance', () => {
      expect(
        ErrorTrackingConstants.PERFORMANCE_ERROR_TRACKING_PATTERNS
      ).toContain('performance');
    });

    it('should include tracingOrigins', () => {
      expect(
        ErrorTrackingConstants.PERFORMANCE_ERROR_TRACKING_PATTERNS
      ).toContain('tracingOrigins');
    });

    it('should have exactly 3 patterns', () => {
      expect(
        ErrorTrackingConstants.PERFORMANCE_ERROR_TRACKING_PATTERNS.length
      ).toBe(3);
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

  describe('hasErrorTrackingConfig()', () => {
    it('should return true for content with tracesSampleRate', () => {
      expect(
        ErrorTrackingConstants.hasErrorTrackingConfig('tracesSampleRate: 1.0')
      ).toBe(true);
    });

    it('should return true for content with performance', () => {
      expect(
        ErrorTrackingConstants.hasErrorTrackingConfig('performance: true')
      ).toBe(true);
    });

    it('should return true for content with tracingOrigins', () => {
      expect(
        ErrorTrackingConstants.hasErrorTrackingConfig(
          'tracingOrigins: ["localhost"]'
        )
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        ErrorTrackingConstants.hasErrorTrackingConfig('const x = 1;')
      ).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(ErrorTrackingConstants.hasErrorTrackingConfig('')).toBe(false);
    });

    it('should handle multiline content', () => {
      const content = `
        Sentry.init({
          tracesSampleRate: 1.0,
          tracingOrigins: ['localhost']
        });
      `;
      expect(ErrorTrackingConstants.hasErrorTrackingConfig(content)).toBe(true);
    });
  });
});

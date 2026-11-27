import { SENTRY_BROWSER_SDKS } from '../../../../utils/sentry-browser-sdks';

/**
 * Error Tracking Policy Constants
 *
 * Single Responsibility: Error tracking tools and configuration
 */
export class ErrorTrackingPolicyConstants {
  static readonly ERROR_TRACKING_TOOLS: string[] = [
    ...SENTRY_BROWSER_SDKS,
    'logrocket',
    'logrocket-react',
    'bugsnag',
    '@bugsnag/browser',
    'rollbar',
    'raygun4js',
    'trackjs',
  ];

  static readonly ERROR_TRACKING_CONFIG_FILES: string[] = [
    'sentry.config.js',
    '.sentryclirc',
    'logrocket.config.js',
    'bugsnag.config.js',
  ];

  static readonly PERFORMANCE_TRACKING_PATTERNS: string[] = [
    'tracesSampleRate',
    'performance',
    'tracingOrigins',
  ];

  static isErrorTrackingTool(packageName: string): boolean {
    return this.ERROR_TRACKING_TOOLS.includes(packageName);
  }

  static isErrorTrackingConfigFile(filename: string): boolean {
    return this.ERROR_TRACKING_CONFIG_FILES.some(file =>
      filename.includes(file)
    );
  }

  static hasPerformanceTracking(content: string): boolean {
    return this.PERFORMANCE_TRACKING_PATTERNS.some(pattern =>
      content.includes(pattern)
    );
  }
}

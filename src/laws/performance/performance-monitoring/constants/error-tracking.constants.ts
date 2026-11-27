import { SENTRY_BROWSER_SDKS } from '../../../../utils/sentry-browser-sdks';

/**
 * Error Tracking Constants
 *
 * The error-tracking SDKs Performance Monitoring Standards lists. Its
 * tracing check no longer reads this list or fixed config files: since #12
 * (b4) it reads a Sentry SDK's init with a tracing option from the sources
 * (services/performance-tracing.ts). The substring patterns and the three
 * config paths that check used are gone with it.
 */
export class ErrorTrackingConstants {
  static readonly ERROR_TRACKING_TOOLS: string[] = [
    ...SENTRY_BROWSER_SDKS,
    'bugsnag',
    '@bugsnag/browser',
    'rollbar',
  ];

  static isErrorTrackingTool(packageName: string): boolean {
    return this.ERROR_TRACKING_TOOLS.includes(packageName);
  }
}

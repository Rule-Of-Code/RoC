/**
 * #12 (b) — the Sentry browser SDKs the performance laws recognise, from one
 * source (src/utils/sentry-browser-sdks.ts). Each law spreads the shared list
 * where its own list had these entries, so the lists — and the order in which
 * Performance Monitoring Policy names the tools it found — are pinned here.
 */
import { PerformanceBudgetComplianceCheckConstants } from '../../src/laws/performance/performance-budget-compliance/constants/checks';
import { ErrorTrackingPolicyConstants } from '../../src/laws/performance/performance-monitoring-policy/constants/error-tracking-policy.constants';
import { SENTRY_BROWSER_SDKS } from '../../src/utils/sentry-browser-sdks';

describe('#12 (b): one source for the Sentry browser SDKs', () => {
  it('the shared list', () => {
    expect(SENTRY_BROWSER_SDKS).toEqual([
      '@sentry/browser',
      '@sentry/angular',
      '@sentry/nextjs',
      '@sentry/react',
    ]);
  });

  it('Performance Monitoring Policy: the same tools, in the same order', () => {
    expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toEqual([
      '@sentry/browser',
      '@sentry/angular',
      '@sentry/nextjs',
      '@sentry/react',
      'logrocket',
      'logrocket-react',
      'bugsnag',
      '@bugsnag/browser',
      'rollbar',
      'raygun4js',
      'trackjs',
    ]);
  });

  it('Performance Budget Compliance: the same monitoring services, in the same order', () => {
    expect(
      PerformanceBudgetComplianceCheckConstants.MONITORING_SERVICES
    ).toEqual([
      'web-vitals',
      '@sentry/browser',
      '@sentry/angular',
      '@sentry/nextjs',
      '@sentry/react',
      '@newrelic/browser',
      'firebase',
    ]);
  });
});

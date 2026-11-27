/**
 * #12 (b) — the Sentry browser SDKs the performance laws recognise, from one
 * source (src/utils/sentry-browser-sdks.ts). Each law spreads the shared list
 * where its own list had these entries, so the lists — and the order in which
 * Performance Monitoring Policy names the tools it found — are pinned here.
 *
 * b1 moved the four SDKs the laws already shared into the list, unchanged.
 * b2 added @sentry/vue, and Performance Monitoring Standards, which listed
 * only @sentry/browser and @sentry/angular, took the whole list.
 */
import { ErrorTrackingConstants } from '../../src/laws/performance/performance-monitoring/constants/error-tracking.constants';
import { MonitoringToolsConstants } from '../../src/laws/performance/performance-monitoring/constants/monitoring-tools.constants';
import { PerformanceBudgetComplianceCheckConstants } from '../../src/laws/performance/performance-budget-compliance/constants/checks';
import { ErrorTrackingPolicyConstants } from '../../src/laws/performance/performance-monitoring-policy/constants/error-tracking-policy.constants';
import { SENTRY_BROWSER_SDKS } from '../../src/utils/sentry-browser-sdks';

const SDKS = [
  '@sentry/browser',
  '@sentry/angular',
  '@sentry/nextjs',
  '@sentry/react',
  '@sentry/vue',
];

describe('#12 (b): one source for the Sentry browser SDKs', () => {
  it('the shared list', () => {
    expect(SENTRY_BROWSER_SDKS).toEqual(SDKS);
  });

  it('Performance Monitoring Policy: the SDKs first, then the other tools, in order', () => {
    expect(ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS).toEqual([
      ...SDKS,
      'logrocket',
      'logrocket-react',
      'bugsnag',
      '@bugsnag/browser',
      'rollbar',
      'raygun4js',
      'trackjs',
    ]);
  });

  it('Performance Budget Compliance: web-vitals, the SDKs, then the other services, in order', () => {
    expect(
      PerformanceBudgetComplianceCheckConstants.MONITORING_SERVICES
    ).toEqual(['web-vitals', ...SDKS, '@newrelic/browser', 'firebase']);
  });

  it('Performance Monitoring Standards, monitoring tools (b4): every SDK, named, before the other tools', () => {
    expect(
      Object.entries(MonitoringToolsConstants.MONITORING_TOOL_PACKAGES).slice(
        0,
        6
      )
    ).toEqual([
      ['@sentry/browser', 'Sentry'],
      ['@sentry/angular', 'Sentry Angular'],
      ['@sentry/nextjs', 'Sentry Next.js'],
      ['@sentry/react', 'Sentry React'],
      ['@sentry/vue', 'Sentry Vue'],
      ['@firebase/performance', 'Firebase Performance'],
    ]);
  });

  it('Performance Monitoring Standards: the SDKs, then bugsnag and rollbar', () => {
    expect(ErrorTrackingConstants.ERROR_TRACKING_TOOLS).toEqual([
      ...SDKS,
      'bugsnag',
      '@bugsnag/browser',
      'rollbar',
    ]);
  });
});

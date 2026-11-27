import { SENTRY_BROWSER_SDKS } from '../../../../utils/sentry-browser-sdks';

/** How each Sentry browser SDK is named in the law's output. */
const SENTRY_LABELS: Record<string, string> = {
  '@sentry/browser': 'Sentry',
  '@sentry/angular': 'Sentry Angular',
  '@sentry/nextjs': 'Sentry Next.js',
  '@sentry/react': 'Sentry React',
  '@sentry/vue': 'Sentry Vue',
  '@sentry/nuxt': 'Sentry Nuxt',
  '@sentry/capacitor': 'Sentry Capacitor',
};

/**
 * Monitoring Tools Constants
 *
 * Single Responsibility: Performance monitoring tools and integration validation
 */
export class MonitoringToolsConstants {
  static readonly MONITORING_TOOL_PACKAGES: Record<string, string> = {
    // The shared Sentry list (#12, b4): it listed browser and angular only.
    ...Object.fromEntries(
      SENTRY_BROWSER_SDKS.map(sdk => [sdk, SENTRY_LABELS[sdk] ?? 'Sentry'])
    ),
    // Datadog RUM (#12, b4): "Add @datadog/browser-rum to your package.json"
    // (https://docs.datadoghq.com/real_user_monitoring/browser/setup/client/).
    '@datadog/browser-rum': 'Datadog RUM',
    '@firebase/performance': 'Firebase Performance',
    firebase: 'Firebase',
    newrelic: 'New Relic',
    '@newrelic/browser-agent': 'New Relic Browser',
    'web-vitals': 'Web Vitals',
    'perfume.js': 'Perfume.js',
    cls: 'Cumulative Layout Shift',
    '@google-analytics/gtag': 'Google Analytics 4',
  };

  static readonly CUSTOM_MONITORING_FILE_PATTERNS: string[] = [
    'src/utils/performance.ts',
    'src/services/performance.service.ts',
    'src/monitoring/performance.ts',
  ];

  static getMonitoringToolName(packageName: string): string | undefined {
    return this.MONITORING_TOOL_PACKAGES[packageName];
  }

  static isMonitoringTool(packageName: string): boolean {
    return packageName in this.MONITORING_TOOL_PACKAGES;
  }
}

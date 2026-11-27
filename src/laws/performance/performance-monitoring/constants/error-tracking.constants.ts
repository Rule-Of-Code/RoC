import type { RuleOfCodeConfig } from '../../../../config/types';
import { PathResolver } from '../../../../utils/path-resolver';
import { SENTRY_BROWSER_SDKS } from '../../../../utils/sentry-browser-sdks';

/**
 * Error Tracking Constants
 *
 * Single Responsibility: Error tracking tools and performance error tracking validation
 */
export class ErrorTrackingConstants {
  static readonly ERROR_TRACKING_TOOLS: string[] = [
    ...SENTRY_BROWSER_SDKS,
    'bugsnag',
    '@bugsnag/browser',
    'rollbar',
  ];

  static readonly PERFORMANCE_ERROR_TRACKING_PATTERNS: string[] = [
    'tracesSampleRate',
    'performance',
    'tracingOrigins',
  ];

  static async getErrorTrackingConfigFilePaths(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<string[]> {
    if (config?.pathMappings) {
      const resolver = PathResolver.create(config, projectRoot);
      const [appModulePaths, mainTsPaths] = await Promise.all([
        resolver.getAppModulePaths(),
        resolver.getMainTsPaths(),
      ]);
      return [
        ...appModulePaths,
        ...mainTsPaths,
        `${projectRoot}/sentry.config.js`,
      ];
    }
    return [
      `${projectRoot}/src/app/app.module.ts`,
      `${projectRoot}/src/main.ts`,
      `${projectRoot}/sentry.config.js`,
    ];
  }

  static isErrorTrackingTool(packageName: string): boolean {
    return this.ERROR_TRACKING_TOOLS.includes(packageName);
  }

  static hasErrorTrackingConfig(content: string): boolean {
    return this.PERFORMANCE_ERROR_TRACKING_PATTERNS.some(pattern =>
      content.includes(pattern)
    );
  }
}

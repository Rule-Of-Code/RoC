import type { RuleOfCodeConfig } from '../../../../config/types';
import { PathResolver } from '../../../../utils/path-resolver';

/**
 * Real User Monitoring Constants
 *
 * Single Responsibility: RUM configuration and setup validation
 */
export class RealUserMonitoringConstants {
  static readonly RUM_DEPENDENCY_PATTERNS: string[] = [
    'web-vitals',
    'getCLS',
    'getFID',
    'getLCP',
  ];

  static readonly RUM_CONFIG_FILE_PATTERNS: string[] = [
    'src/utils/rum.ts',
    'src/monitoring/rum.ts',
    'rum.config.js',
  ];

  static readonly PERFORMANCE_MONITORING_PATTERNS: string[] = [
    'web-vitals',
    'getCLS',
    'getFID',
    'getLCP',
    'performance.mark',
    'PerformanceObserver',
  ];

  static async getRumConfigLocations(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<string[]> {
    if (config?.pathMappings) {
      const resolver = PathResolver.create(config, projectRoot);
      const [mainTsPaths, appComponentPaths] = await Promise.all([
        resolver.getMainTsPaths(),
        resolver.getAppComponentPaths(),
      ]);
      return [
        ...mainTsPaths,
        ...appComponentPaths,
        `${projectRoot}/src/index.ts`,
      ];
    }
    return [
      `${projectRoot}/src/main.ts`,
      `${projectRoot}/src/app/app.component.ts`,
      `${projectRoot}/src/index.ts`,
    ];
  }

  static hasRumIndicators(content: string): boolean {
    return this.PERFORMANCE_MONITORING_PATTERNS.some(pattern =>
      content.includes(pattern)
    );
  }
}

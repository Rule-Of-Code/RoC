/**
 * Build Performance Monitoring Constants
 *
 * Single Responsibility: Build performance monitoring tools and configuration
 */
export class BuildPerformanceConstants {
  static readonly BUILD_MONITORING_TOOLS: string[] = [
    'speed-measure-webpack-plugin',
    'webpack-bundle-analyzer',
    '@angular/build-tools',
    'build-time-analyzer',
  ];

  static readonly BUILD_PERF_SCRIPT_PATTERNS: string[] = [
    'analyze',
    'perf',
    'measure',
  ];

  static isBuildMonitoringTool(packageName: string): boolean {
    return this.BUILD_MONITORING_TOOLS.includes(packageName);
  }

  static isBuildPerfScript(scriptName: string): boolean {
    return this.BUILD_PERF_SCRIPT_PATTERNS.some(pattern =>
      scriptName.includes(pattern)
    );
  }
}

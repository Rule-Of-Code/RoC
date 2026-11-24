import { ProjectTypeDetectorValidation } from '../config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';
import { ciConfigContent } from '../project-discovery';
/**
 * Performance Monitoring Integration Inspector (Streamlined)
 * Simplified utility for analyzing performance monitoring setup and integration
 */
export class PerformanceMonitoringInspector {
  /**
   * Check for performance monitoring integration
   */
  static checkPerformanceMonitoringIntegration(projectRoot: string): {
    hasPerformanceMonitoring: boolean;
    tools: string[];
    integrationFiles: string[];
    configFiles: string[];
    ciIntegration: boolean;
  } {
    const monitoringTools = this.checkMonitoringToolsSimple(projectRoot);
    const integrationFiles = this.findIntegrationFilesSimple(projectRoot);
    const configFiles = this.findMonitoringConfigFilesSimple(projectRoot);
    const ciIntegration = this.checkCICDIntegrationSimple(projectRoot);

    return {
      hasPerformanceMonitoring:
        monitoringTools.length > 0 || integrationFiles.length > 0,
      tools: monitoringTools,
      integrationFiles,
      configFiles,
      ciIntegration: ciIntegration.length > 0,
    };
  }

  // Simplified implementations
  private static checkMonitoringToolsSimple(projectRoot: string): string[] {
    const tools: string[] = [];

    try {
      const allDeps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
      const monitoringLibs = [
        'new-relic',
        'datadog-browser-rum',
        'sentry',
        'bugsnag',
      ];

      tools.push(...monitoringLibs.filter(lib => allDeps[lib]));
    } catch (_error) {
      // Ignore errors
    }

    return tools;
  }

  private static findIntegrationFilesSimple(projectRoot: string): string[] {
    const integrationFiles: string[] = [];
    const patterns = ['monitoring.ts', 'analytics.ts', 'tracking.ts'];

    for (const pattern of patterns) {
      const filePath = PathOperations.join(projectRoot, 'src', pattern);
      if (FileUtils.exists(filePath)) {
        integrationFiles.push(pattern);
      }
    }

    return integrationFiles;
  }

  private static findMonitoringConfigFilesSimple(
    projectRoot: string
  ): string[] {
    const configFiles: string[] = [];
    const configs = ['newrelic.js', 'sentry.config.js', 'monitoring.config.js'];

    for (const config of configs) {
      if (FileUtils.exists(PathOperations.join(projectRoot, config))) {
        configFiles.push(config);
      }
    }

    return configFiles;
  }

  /**
   * Performance monitoring wired into CI — read from every pipeline the shared
   * discovery finds, rather than from two filenames on two providers.
   */
  private static checkCICDIntegrationSimple(projectRoot: string): string[] {
    const pipelineText = ciConfigContent(projectRoot);

    return /performance|monitoring/i.test(pipelineText)
      ? ['Performance monitoring in CI pipeline']
      : [];
  }
}

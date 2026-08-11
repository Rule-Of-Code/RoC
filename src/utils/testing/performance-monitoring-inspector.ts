import { ProjectTypeDetectorValidation } from '../config/project-type-detector/project-type-detector-validation';
import { DirectoryScanner } from '../directory-scanner';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';
import { PerformanceAnalysisService } from '../performance';
import { ciConfigContent } from '../project-discovery';
/**
 * Performance Monitoring Integration Inspector (Streamlined)
 * Simplified utility for analyzing performance monitoring setup and integration
 */
export class PerformanceMonitoringInspector {
  /**
   * Shared default config for DirectoryScanner to avoid duplication
   */
  private static readonly DEFAULT_SCANNER_CONFIG = {
    project: {
      name: 'temp',
      componentPrefix: 'temp',
      type: 'generic' as const,
    },
    ignores: { global: [], tests: [], build: [], design: [] },
    laws: { paretoMode: false, severity: {} },
    hooks: { preCommit: false, prePush: false, commitMsg: false },
    reporting: {
      format: 'console' as const,
      verbose: false,
      onlyFailures: false,
      scoring: false,
    },
    performance: {
      parallel: false,
      maxConcurrent: 1,
      cache: false,
      incremental: false,
    },
    cli: { autofix: false },
    severity: 'error' as const,
  };
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

  /**
   * Check for critical flow performance tests
   */
  static checkCriticalFlowPerformanceTests(projectRoot: string): {
    hasCriticalFlowTests: boolean;
    testFiles: string[];
    scenarios: string[];
  } {
    const criticalFlowTests = this.findCriticalFlowTestsSimple(projectRoot);
    const performanceAnalysis =
      PerformanceAnalysisService.analyzePerformanceScenarios(projectRoot);

    return {
      hasCriticalFlowTests: criticalFlowTests.length > 0,
      testFiles: criticalFlowTests,
      scenarios: performanceAnalysis.recommendations,
    };
  }

  /**
   * Check for performance CI/CD integration
   */
  static checkPerformanceCICDIntegration(projectRoot: string): {
    hasPerformanceCI: boolean;
    configs: string[];
    steps: string[];
  } {
    const ciConfigs = this.findPerformanceCIConfigsSimple(projectRoot);
    const performanceAnalysis =
      PerformanceAnalysisService.analyzePerformanceTesting(projectRoot);

    return {
      hasPerformanceCI:
        ciConfigs.length > 0 || !performanceAnalysis.hasPerformanceIssues,
      configs: ciConfigs,
      steps: performanceAnalysis.recommendations,
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

  private static findCriticalFlowTestsSimple(projectRoot: string): string[] {
    const testFiles: string[] = [];
    const testDirs = ['test', 'tests', 'cypress/e2e'];

    for (const dir of testDirs) {
      const dirPath = PathOperations.join(projectRoot, dir);
      if (FileUtils.exists(dirPath)) {
        try {
          const files = DirectoryScanner.safeReadDirectory(
            dirPath,
            PerformanceMonitoringInspector.DEFAULT_SCANNER_CONFIG
          ).map(entry => entry.name);
          const perfFiles = files.filter(
            file => file.includes('performance') || file.includes('critical')
          );
          testFiles.push(
            ...perfFiles.map(file => PathOperations.join(dir, file))
          );
        } catch (_error) {
          // Ignore errors
        }
      }
    }

    return testFiles;
  }

  private static analyzePerformanceScenariosSimple(
    projectRoot: string
  ): string[] {
    const scenarios: string[] = [];
    const testDir = PathOperations.join(projectRoot, 'test');

    if (FileUtils.exists(testDir)) {
      try {
        const files = DirectoryScanner.safeReadDirectory(
          testDir,
          PerformanceMonitoringInspector.DEFAULT_SCANNER_CONFIG
        ).map(entry => entry.name);
        if (files.some(file => file.includes('performance'))) {
          scenarios.push('Performance tests detected');
        }
      } catch (_error) {
        // Ignore errors
      }
    }

    return scenarios;
  }

  /**
   * A performance job in CI, named by what it DOES rather than by the file it
   * lives in. Two GitHub workflow filenames were the whole search, so the same
   * Lighthouse step in a differently-named workflow, or on another provider,
   * counted for nothing.
   */
  private static findPerformanceCIConfigsSimple(projectRoot: string): string[] {
    const pipelineText = ciConfigContent(projectRoot);

    return /lighthouse|web-vitals|performance/i.test(pipelineText)
      ? ['Performance job in CI pipeline']
      : [];
  }

  private static analyzePerformanceStepsSimple(projectRoot: string): string[] {
    // One named workflow file was the entire search — `.github/workflows/ci.yml`
    // and nothing else, on GitHub and nowhere else.
    const pipelineText = ciConfigContent(projectRoot);

    return /lighthouse|performance/i.test(pipelineText)
      ? ['Performance tests in CI/CD pipeline detected']
      : [];
  }
}

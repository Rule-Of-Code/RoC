import { ProjectTypeDetectorValidation } from '../config/project-type-detector/project-type-detector-validation';
import { DirectoryScanner } from '../directory-scanner';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';
import { PerformanceAnalysisService } from '../performance';
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

  private static checkCICDIntegrationSimple(projectRoot: string): string[] {
    const integration: string[] = [];
    const ciFiles = ['.github/workflows/ci.yml', '.gitlab-ci.yml'];

    for (const ciFile of ciFiles) {
      const ciPath = PathOperations.join(projectRoot, ciFile);
      if (FileUtils.exists(ciPath)) {
        try {
          const content = FileUtils.readFile(ciPath, { encoding: 'utf8' });
          if (
            content.includes('performance') ||
            content.includes('monitoring')
          ) {
            integration.push(`Performance monitoring in ${ciFile}`);
          }
        } catch (_error) {
          // Ignore errors
        }
      }
    }

    return integration;
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

  private static findPerformanceCIConfigsSimple(projectRoot: string): string[] {
    const configs: string[] = [];
    const ciFiles = [
      '.github/workflows/performance.yml',
      '.github/workflows/lighthouse.yml',
    ];

    for (const ciFile of ciFiles) {
      if (FileUtils.exists(PathOperations.join(projectRoot, ciFile))) {
        configs.push(ciFile);
      }
    }

    return configs;
  }

  private static analyzePerformanceStepsSimple(projectRoot: string): string[] {
    const steps: string[] = [];
    const ciPath = PathOperations.join(projectRoot, '.github/workflows/ci.yml');

    if (FileUtils.exists(ciPath)) {
      try {
        const content = FileUtils.readFile(ciPath);
        if (content.includes('lighthouse') || content.includes('performance')) {
          steps.push('Performance tests in CI/CD pipeline detected');
        }
      } catch (_error) {
        // Ignore errors
      }
    }

    return steps;
  }
}

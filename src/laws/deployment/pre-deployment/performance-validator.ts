import type { RuleOfCodeConfig } from '../../../config/types';
import type { LawCheckContext } from '../../../types/law.types';
import { FileSystemOperations, FileUtils } from '../../../utils';
import { CheckerUtils } from '../../../utils/checker-utils';
import { PathOperations } from '../../../utils/path-operations';

/** A file named for a health check: `health.ts`, `healthz.py`, `health.controller.ts`, `healthcheck.js`. */
const HEALTH_FILE_NAME = /^(?:health(?:z|[-_]?check)?|liveness|readiness)\b/i;

/**
 * A route that answers a health probe, in the router's own call or
 * decorator: `app.get('/healthz', …)`, `router.get('/api/status', …)`,
 * `@Get('health')`, `@app.get("/ping")`.
 */
const HEALTH_ROUTE =
  /\b(?:get|head|all|route|use)\s*\(\s*['"`]\/?(?:api\/)?(?:health|healthz|healthcheck|ready|readyz|live|livez|ping|status)['"`/?]/i;

/** Whether the file declares a health route; false when it cannot be read. */
function servesHealthRoute(filePath: string): boolean {
  try {
    return HEALTH_ROUTE.test(
      FileUtils.readFile(filePath, { encoding: 'utf8' })
    );
  } catch {
    return false;
  }
}

/**
 * Performance Validation Checker
 * Validates performance benchmarks and monitoring setup
 */
export class PerformanceValidationChecker {
  validate(context: LawCheckContext): {
    isValid: boolean;
    benchmarkingConfigured: boolean;
    performanceScripts: string[];
    lighthouseConfigured: boolean;
    budgetConfigured: boolean;
    errors?: string[];
    warnings?: string[];
  } {
    const result = this.checkPerformanceBenchmarking(context.projectRoot);
    return {
      isValid: result.benchmarkingConfigured,
      errors: result.benchmarkingConfigured
        ? []
        : ['Performance validation failed'],
      warnings: [],
      ...result,
    };
  }

  checkPerformanceBenchmarking(projectRoot: string): {
    benchmarkingConfigured: boolean;
    performanceScripts: string[];
    lighthouseConfigured: boolean;
    budgetConfigured: boolean;
  } {
    const scriptResult = this.extractPerformanceScripts(projectRoot);
    const lighthouseConfigured =
      this.checkLighthouseConfig(projectRoot) ||
      scriptResult.hasLighthouseScript;
    const budgetConfigured =
      this.checkBudgetConfig(projectRoot) ||
      this.checkAngularBudgets(projectRoot);

    return {
      benchmarkingConfigured: scriptResult.performanceScripts.length > 0,
      performanceScripts: scriptResult.performanceScripts,
      lighthouseConfigured,
      budgetConfigured,
    };
  }

  private extractPerformanceScripts(projectRoot: string): {
    performanceScripts: string[];
    hasLighthouseScript: boolean;
  } {
    const performanceScripts: string[] = [];
    let hasLighthouseScript = false;

    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (FileUtils.exists(packageJsonPath)) {
      try {
        const packageJson = FileSystemOperations.readJsonFile<{
          scripts?: Record<string, string>;
        }>(packageJsonPath, {});

        if (packageJson.scripts) {
          const performanceRelatedScripts = [
            'performance',
            'perf',
            'lighthouse',
            'benchmark',
            'webvitals',
            'bundle-analyzer',
          ];

          hasLighthouseScript = this.processPerformanceScripts(
            packageJson.scripts,
            performanceRelatedScripts,
            performanceScripts,
            hasLighthouseScript
          );
        }
      } catch (_error) {
        // Ignore JSON parsing errors
      }
    }

    return { performanceScripts, hasLighthouseScript };
  }

  private processPerformanceScripts(
    scripts: Record<string, string>,
    performanceRelatedScripts: string[],
    performanceScripts: string[],
    hasLighthouseScript: boolean
  ): boolean {
    let updatedLighthouseScript = hasLighthouseScript;

    for (const script of performanceRelatedScripts) {
      if (scripts[script]) {
        performanceScripts.push(script);
        if (script.includes('lighthouse')) {
          updatedLighthouseScript = true;
        }
      }
    }

    return updatedLighthouseScript;
  }

  private checkLighthouseConfig(projectRoot: string): boolean {
    const lighthouseConfigFiles = [
      'lighthouse.config.js',
      'lighthouserc.js',
      '.lighthouserc.json',
    ];

    return lighthouseConfigFiles.some(configFile =>
      FileUtils.exists(PathOperations.join(projectRoot, configFile))
    );
  }

  private checkBudgetConfig(projectRoot: string): boolean {
    const budgetConfigFiles = [
      'webpack-bundle-analyzer.config.js',
      'bundle-analyzer.config.js',
      'performance-budget.config.js',
    ];

    return budgetConfigFiles.some(configFile =>
      FileUtils.exists(PathOperations.join(projectRoot, configFile))
    );
  }

  private checkAngularBudgets(projectRoot: string): boolean {
    const angularJsonPath = PathOperations.join(projectRoot, 'angular.json');
    if (!FileUtils.exists(angularJsonPath)) {
      return false;
    }

    try {
      const angularJson = FileSystemOperations.readJsonFile<{
        projects?: Record<string, Record<string, unknown>>;
      }>(angularJsonPath, {});
      const projects = angularJson.projects ?? {};

      return Object.values(projects).some((project: unknown) =>
        this.hasProjectBudgets(project as Record<string, unknown>)
      );
    } catch (_error) {
      return false;
    }
  }

  private hasProjectBudgets(project: Record<string, unknown>): boolean {
    const architect = project.architect as Record<string, unknown> | undefined;
    const build = architect?.build as Record<string, unknown> | undefined;
    const configurations = build?.configurations as
      Record<string, unknown> | undefined;
    const options = build?.options as Record<string, unknown> | undefined;
    const production = configurations?.production as
      Record<string, unknown> | undefined;

    return !!(production?.budgets ?? options?.budgets);
  }

  checkMonitoringSetup(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    healthChecksConfigured: boolean;
    loggingConfigured: boolean;
    metricsConfigured: boolean;
    alertingConfigured: boolean;
  } {
    let healthChecksConfigured = false;
    let loggingConfigured = false;
    let metricsConfigured = false;
    let alertingConfigured = false;

    // Check for health check endpoints

    const findHealthCheckFiles = (dir: string): boolean => {
      if (!FileUtils.exists(dir)) return false;

      try {
        const allFiles = CheckerUtils.findFilesByExtension(
          dir,
          CheckerUtils.getCommonExtensions().ALL_CODE,
          config
        );

        // A file named for a health check, or a route that answers one
        // (#439). A name that merely contains "status" or "ping"
        // (order-status.ts, shopping-cart.ts) is not one.
        return allFiles.some(
          filePath =>
            HEALTH_FILE_NAME.test(PathOperations.getBasename(filePath)) ||
            servesHealthRoute(filePath)
        );
      } catch (_error) {
        return false;
      }
    };

    healthChecksConfigured = findHealthCheckFiles(projectRoot);

    // Check for logging configuration
    const loggingConfigFiles = [
      'winston.config.js',
      'logging.config.js',
      'log4js.json',
      'pino.config.js',
    ];

    for (const configFile of loggingConfigFiles) {
      if (FileUtils.exists(PathOperations.join(projectRoot, configFile))) {
        loggingConfigured = true;
        break;
      }
    }

    // Check for metrics configuration (Prometheus, DataDog, etc.)
    const metricsConfigFiles = [
      'metrics.config.js',
      'prometheus.config.js',
      'datadog.config.js',
      'newrelic.js',
    ];

    for (const configFile of metricsConfigFiles) {
      if (FileUtils.exists(PathOperations.join(projectRoot, configFile))) {
        metricsConfigured = true;
        break;
      }
    }

    // Check for alerting configuration
    const alertingConfigFiles = [
      'alerts.config.js',
      'alertmanager.yml',
      'pagerduty.config.js',
    ];

    for (const configFile of alertingConfigFiles) {
      if (FileUtils.exists(PathOperations.join(projectRoot, configFile))) {
        alertingConfigured = true;
        break;
      }
    }

    return {
      healthChecksConfigured,
      loggingConfigured,
      metricsConfigured,
      alertingConfigured,
    };
  }
}

export const performanceValidator = new PerformanceValidationChecker();

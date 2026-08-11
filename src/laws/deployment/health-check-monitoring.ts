import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PathOperations } from '../../utils';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { FileUtils } from '../../utils/file-utils';
import { PathResolver } from '../../utils/path-resolver';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { DeploymentValidationUtilities } from './shared-deployment-utilities';
/**
 * Health Check Monitoring Law
 *
 * Validates comprehensive health checks for all deployed services:
 * - Application health endpoints
 * - Database connectivity checks
 * - External service dependency checks
 * - Health check response validation
 * - Monitoring and alerting configuration
 * - Load balancer health check integration
 * - Kubernetes liveness and readiness probes
 *
 * Professional implementation following health monitoring best practices
 */
export class HealthCheckMonitoringLaw {
  private static readonly HEALTH_TS_FILE = 'src/health.ts';
  private static readonly HEALTH_CHECK_TS_FILE = 'src/health-check.ts';
  private static readonly SERVICES_HEALTH_TS_FILE = 'src/services/health.ts';
  private static readonly DATABASE_HEALTH_TS_FILE = 'src/database/health.ts';
  private static readonly EXTERNAL_HEALTH_CHECK_TS_FILE =
    'src/external/health-check.ts';
  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot } = context;

    // This law is server-shaped: endpoints to expose, a database to reach,
    // dependencies to probe. A browser client has none of those — its API lives
    // in another repository — so demanding `/health` from it asks for something
    // that cannot exist. Like a linter reporting nothing for a language absent
    // from the repo, the law reports nothing when the project is not a service.
    if (!this.projectIsAService(projectRoot)) {
      return {
        passed: true,
        message:
          '⚕️ Health Check Monitoring: not a service — no endpoints to probe',
        violations: [],
        suggestions: [],
        score: 100,
        fixable: false,
        config: context.config,
      } as LawResult;
    }

    // 1. Check for health check endpoints
    const healthEndpoints = await this.analyzeHealthEndpoints(
      projectRoot,
      context.config
    );
    if (!healthEndpoints.hasHealthEndpoints) {
      violations.push('Missing health check endpoints');
      suggestions.push('Implement /health or /status endpoints');
      score -= 30;
    }

    // Checks 2 and 3 read `src/health.ts` & friends — substrate a Python
    // backend cannot have. Absent substrate is N/A, never a violation.
    const tsProbesApply = this.tsHealthProbesApply(projectRoot);

    // 2. Check for database health checks
    const databaseHealth = this.analyzeDatabaseHealthChecks(projectRoot);
    if (tsProbesApply && !databaseHealth.hasDatabaseHealthChecks) {
      violations.push('Missing database connectivity health checks');
      suggestions.push('Add database connectivity validation to health checks');
      score -= 25;
    }

    // 3. Check for external service health checks
    const externalServiceHealth =
      this.analyzeExternalServiceHealthChecks(projectRoot);
    if (tsProbesApply && !externalServiceHealth.hasExternalServiceHealthChecks) {
      violations.push('Missing external service dependency health checks');
      suggestions.push('Add health checks for external service dependencies');
      score -= 20;
    }

    // 4. Check for Kubernetes health probes
    const kubernetesProbes = this.analyzeKubernetesHealthProbes(projectRoot);
    if (!kubernetesProbes.hasKubernetesProbes) {
      suggestions.push('Configure Kubernetes liveness and readiness probes');
      score -= 15;
    }

    // 5. Check for monitoring integration
    const monitoringIntegration =
      this.analyzeMonitoringIntegration(projectRoot);
    if (!monitoringIntegration.hasMonitoringIntegration) {
      suggestions.push('Integrate health checks with monitoring systems');
      score -= 10;
    }

    return {
      passed: violations.length === 0,
      message: this.generateMessage(violations.length, healthEndpoints),
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score: Math.max(0, score),
      fixable: true,
      config: context.config,
    };
  }

  private static async analyzeHealthEndpoints(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<{
    hasHealthEndpoints: boolean;
    endpointQuality: string;
  }> {
    // Check for health check endpoint implementations
    let hasHealthEndpoints = false;
    let endpointQuality = 'none';

    // Search for health check files
    const healthCheckFiles = [
      this.HEALTH_TS_FILE,
      this.HEALTH_CHECK_TS_FILE,
      'src/controllers/health.ts',
      'src/routes/health.ts',
      'src/api/health.ts',
      'health/index.ts',
      'src/endpoints/health.ts',
      'lib/health.ts',
    ];

    for (const healthFile of healthCheckFiles) {
      const filePath = PathOperations.join(projectRoot, healthFile);
      if (FileUtils.exists(filePath)) {
        hasHealthEndpoints = true;
        try {
          const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
          endpointQuality = this.assessHealthEndpointQuality(content);
        } catch (_error) {
          endpointQuality = 'basic';
        }
        break;
      }
    }

    // Search for health endpoints in route files
    if (!hasHealthEndpoints) {
      const routeCheckResult = await this.checkRouteFilesForHealthEndpoints(
        projectRoot,
        config
      );
      if (routeCheckResult.found) {
        hasHealthEndpoints = true;
        endpointQuality = 'integrated';
      }
    }

    // A Python service declares the route with a decorator, not a health.ts:
    // `@app.route("/health")` IS a health endpoint
    if (!hasHealthEndpoints && this.hasPythonHealthEndpoint(projectRoot)) {
      hasHealthEndpoints = true;
      endpointQuality = 'python-native';
    }

    return {
      hasHealthEndpoints,
      endpointQuality,
    };
  }

  /**
   * The Python-native answer to "is there a health endpoint?" — asked only for
   * Python projects, so JS/TS detection is untouched.
   */
  private static hasPythonHealthEndpoint(projectRoot: string): boolean {
    return (
      PythonSatisfaction.isPython(projectRoot) &&
      PythonSatisfaction.hasHealthEndpoint(projectRoot)
    );
  }

  /**
   * Do the TypeScript-only probes (database/external-service health) apply?
   * They only ever read `src/health.ts`, `src/database/health.ts` and friends,
   * so on a Python project with no JS/TS sources they can never be satisfied —
   * their substrate is absent, which is N/A rather than a violation.
   */
  private static tsHealthProbesApply(projectRoot: string): boolean {
    return (
      !PythonSatisfaction.isPython(projectRoot) ||
      PythonSatisfaction.hasJsTsSources(projectRoot)
    );
  }

  /**
   * Does this project SERVE anything?
   *
   * Health endpoints, database probes and dependency checks are properties of a
   * service. A browser client — Angular, React, an Ionic app — exposes no
   * endpoint and connects to no database, so every sub-check here was a demand
   * it could not meet. The evidence for "service" is a server framework in the
   * dependencies, a Python web stack, a container that exposes a port, or a
   * deployment manifest.
   */
  private static projectIsAService(projectRoot: string): boolean {
    // NOT a signal: a file named `health.ts`.
    //
    // This check used to return true the moment one existed, on the reasoning
    // that a project carrying health-check substrate had answered the question
    // itself. It had not. A browser client that calls `GET /api/health` and
    // interprets the response keeps its readiness probe in exactly such a file —
    // and was then told to expose an endpoint, own a database connection and
    // declare Kubernetes probes, none of which a browser can do. The shortcut
    // traded one false positive for another and wrote down the reasoning as if
    // it were a safeguard.
    //
    // Every genuine service is still caught below, by evidence of serving: a web
    // framework, a process declaration, a container that opens a port, or a
    // deployment manifest.
    if (this.hasPythonWebStack(projectRoot)) return true;

    const SERVER_DEPS = [
      'express',
      'fastify',
      '@nestjs/core',
      'koa',
      'hapi',
      '@hapi/hapi',
      'restify',
      'apollo-server',
      '@apollo/server',
      'next',
      'nuxt',
      'http-server',
    ];
    const pkg = ProjectTypeDetector.getPackageJson(projectRoot) as {
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
    } | null;
    if (pkg) {
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (SERVER_DEPS.some(d => deps[d])) return true;
    }

    // A container that opens a port, or a deployment manifest, is a service too.
    const dockerfile = PathOperations.join(projectRoot, 'Dockerfile');
    if (
      FileUtils.exists(dockerfile) &&
      /^\s*EXPOSE\s+\d+/im.test(FileUtils.readFile(dockerfile))
    ) {
      return true;
    }

    // A Procfile declares long-running processes by name; a `web:` entry is a
    // server by definition.
    const procfile = PathOperations.join(projectRoot, 'Procfile');
    if (
      FileUtils.exists(procfile) &&
      /^\s*web\s*:/im.test(FileUtils.readFile(procfile))
    ) {
      return true;
    }

    return ['k8s', 'kubernetes', 'helm', 'deploy'].some(dir =>
      FileUtils.exists(PathOperations.join(projectRoot, dir))
    );
  }

  /**
   * A Python project that actually serves HTTP.
   *
   * `isPython()` alone used to stand in for this, which made every Python
   * project a service — a CLI, a library, a batch job. The manifest names the
   * web stack when there is one.
   */
  private static hasPythonWebStack(projectRoot: string): boolean {
    if (!PythonSatisfaction.isPython(projectRoot)) return false;

    // Read the manifests' CONTENT. `projectManifest()` returns the file name,
    // not what is in it.
    const manifests = [
      'pyproject.toml',
      'requirements.txt',
      'requirements/base.txt',
      'setup.py',
      'setup.cfg',
      'Pipfile',
      'poetry.lock',
    ];
    const declared = manifests
      .map(name => {
        const path = PathOperations.join(projectRoot, name);
        return FileUtils.exists(path) ? FileUtils.readFile(path) : '';
      })
      .join('\n');

    return /\b(?:fastapi|flask|django|starlette|uvicorn|gunicorn|aiohttp|tornado|sanic|bottle|falcon|quart)\b/i.test(
      declared
    );
  }

  private static analyzeDatabaseHealthChecks(projectRoot: string): {
    hasDatabaseHealthChecks: boolean;
  } {
    // Check for database connectivity health checks
    // Search for database health check implementations
    const dbHealthPatterns = [
      /database.*health/i,
      /db.*connectivity/i,
      /connection.*check/i,
      /database.*status/i,
      /db.*ping/i,
      /database.*alive/i,
    ];

    const searchFiles = [
      this.HEALTH_TS_FILE,
      this.HEALTH_CHECK_TS_FILE,
      this.DATABASE_HEALTH_TS_FILE,
      'src/db/health-check.ts',
      'src/services/database-health.ts',
    ];

    const dbHealthResult =
      DeploymentValidationUtilities.searchFilesWithPatterns(
        projectRoot,
        searchFiles,
        dbHealthPatterns
      );

    const hasDatabaseHealthChecks = dbHealthResult.found;

    return { hasDatabaseHealthChecks };
  }

  private static analyzeExternalServiceHealthChecks(projectRoot: string): {
    hasExternalServiceHealthChecks: boolean;
  } {
    // Check for external service dependency health checks

    const externalServicePatterns = [
      /external.*service.*health/i,
      /dependency.*check/i,
      /service.*connectivity/i,
      /third.*party.*health/i,
      /api.*dependency/i,
      /upstream.*health/i,
    ];

    const searchFiles = [
      this.HEALTH_TS_FILE,
      this.HEALTH_CHECK_TS_FILE,
      this.SERVICES_HEALTH_TS_FILE,
      this.EXTERNAL_HEALTH_CHECK_TS_FILE,
    ];

    const externalServiceResult =
      DeploymentValidationUtilities.searchFilesWithPatterns(
        projectRoot,
        searchFiles,
        externalServicePatterns
      );

    const hasExternalServiceHealthChecks = externalServiceResult.found;

    return { hasExternalServiceHealthChecks };
  }

  private static analyzeKubernetesHealthProbes(projectRoot: string): {
    hasKubernetesProbes: boolean;
  } {
    // Check for Kubernetes health probes configuration
    let hasKubernetesProbes = false;

    const kubernetesFiles = [
      'k8s/deployment.yml',
      'k8s/deployment.yaml',
      'kubernetes/deployment.yml',
      'deployment.yml',
      'deployment.yaml',
    ];

    for (const kubernetesFile of kubernetesFiles) {
      const filePath = PathOperations.join(projectRoot, kubernetesFile);
      if (FileUtils.exists(filePath)) {
        try {
          const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
          if (this.hasKubernetesHealthProbes(content)) {
            hasKubernetesProbes = true;
            break;
          }
        } catch (_error) {
          // Skip files that can't be read
        }
      }
    }

    return { hasKubernetesProbes };
  }

  private static analyzeMonitoringIntegration(projectRoot: string): {
    hasMonitoringIntegration: boolean;
  } {
    // Check for monitoring system integration
    let hasMonitoringIntegration = false;

    // Check for monitoring configuration files
    const monitoringFiles = [
      'monitoring/prometheus.yml',
      'config/monitoring.yml',
      'docker-compose.monitoring.yml',
      'monitoring/grafana/dashboards.json',
    ];

    for (const monitoringFile of monitoringFiles) {
      const filePath = PathOperations.join(projectRoot, monitoringFile);
      if (FileUtils.exists(filePath)) {
        hasMonitoringIntegration = true;
        break;
      }
    }

    // Check for monitoring integration in health check implementations
    if (!hasMonitoringIntegration) {
      hasMonitoringIntegration =
        this.checkHealthFilesForMonitoringIntegration(projectRoot);
    }

    return { hasMonitoringIntegration };
  }

  private static hasHealthEndpointConfiguration(content: string): boolean {
    const healthEndpointPatterns = [
      /\/health/i,
      /\/status/i,
      /\/ping/i,
      /\/alive/i,
      /\/ready/i,
      /health.*endpoint/i,
      /status.*endpoint/i,
    ];

    return healthEndpointPatterns.some(pattern => pattern.test(content));
  }

  private static assessHealthEndpointQuality(content: string): string {
    const qualityIndicators = [
      /database.*health/i,
      /external.*service/i,
      /dependency.*check/i,
      /detailed.*status/i,
      /response.*time/i,
      /health.*metrics/i,
    ];

    const matches = qualityIndicators.filter(pattern =>
      pattern.test(content)
    ).length;

    if (matches >= 4) return 'comprehensive';
    if (matches >= 2) return 'good';
    return 'basic';
  }

  private static hasKubernetesHealthProbes(content: string): boolean {
    const k8sProbePatterns = [
      /livenessProbe/i,
      /readinessProbe/i,
      /startupProbe/i,
      /healthz/i,
      /livez/i,
      /readyz/i,
    ];

    return k8sProbePatterns.some(pattern => pattern.test(content));
  }

  private static hasMonitoringIntegration(content: string): boolean {
    const monitoringPatterns = [
      /prometheus/i,
      /grafana/i,
      /metrics/i,
      /monitoring/i,
      /alerting/i,
      /observability/i,
    ];

    return monitoringPatterns.some(pattern => pattern.test(content));
  }

  private static generateMessage(
    violationCount: number,
    healthEndpoints: { hasHealthEndpoints: boolean; endpointQuality: string }
  ): string {
    if (violationCount === 0) {
      return `✅ Health Check Monitoring: ${healthEndpoints.endpointQuality} implementation`;
    }

    return `⚠️ Health Check Monitoring: Missing health check endpoints`;
  }

  private static checkHealthFilesForMonitoringIntegration(
    projectRoot: string
  ): boolean {
    const healthFiles = [this.HEALTH_TS_FILE, this.HEALTH_CHECK_TS_FILE];

    for (const healthFile of healthFiles) {
      const filePath = PathOperations.join(projectRoot, healthFile);
      if (FileUtils.exists(filePath)) {
        try {
          const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
          if (this.hasMonitoringIntegration(content)) {
            return true;
          }
        } catch (_error) {
          // Skip files that can't be read
        }
      }
    }

    return false;
  }

  private static async checkRouteFilesForHealthEndpoints(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<{
    found: boolean;
  }> {
    let routeFiles: string[];
    if (config?.pathMappings) {
      const resolver = PathResolver.create(config, projectRoot);
      const [mainTsPaths, appModulePaths] = await Promise.all([
        resolver.getMainTsPaths(),
        resolver.getAppModulePaths(),
      ]);
      routeFiles = [
        PathOperations.join(projectRoot, 'src/app.ts'),
        ...mainTsPaths,
        PathOperations.join(projectRoot, 'src/server.ts'),
        PathOperations.join(projectRoot, 'src/routes/index.ts'),
        ...appModulePaths,
      ];
    } else {
      routeFiles = [
        PathOperations.join(projectRoot, 'src/app.ts'),
        PathOperations.join(projectRoot, 'src/main.ts'),
        PathOperations.join(projectRoot, 'src/server.ts'),
        PathOperations.join(projectRoot, 'src/routes/index.ts'),
        PathOperations.join(projectRoot, 'src/app/app.module.ts'),
      ];
    }

    for (const filePath of routeFiles) {
      if (FileUtils.exists(filePath)) {
        try {
          const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
          if (this.hasHealthEndpointConfiguration(content)) {
            return { found: true };
          }
        } catch (_error) {
          // Skip files that can't be read
        }
      }
    }

    return { found: false };
  }
}

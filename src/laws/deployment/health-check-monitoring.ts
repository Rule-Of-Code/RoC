import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PathOperations } from '../../utils';
import { FileUtils } from '../../utils/file-utils';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { DeploymentValidationUtilities } from './shared-deployment-utilities';
import { HEALTH_CHECK_PENALTY as PENALTY } from './deployment-penalties';
import {
  assessHealthEndpointQuality,
  checkRouteFilesForHealthEndpoints,
  hasKubernetesHealthProbes,
  hasMonitoringIntegration,
  projectIsAService,
} from './health-evidence';
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
    if (!projectIsAService(projectRoot)) {
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
      score -= PENALTY.endpoints;
    }

    // Checks 2 and 3 read `src/health.ts` & friends — substrate a Python
    // backend cannot have. Absent substrate is N/A, never a violation.
    const tsProbesApply = this.tsHealthProbesApply(projectRoot);

    // 2. Check for database health checks
    const databaseHealth = this.analyzeDatabaseHealthChecks(projectRoot);
    if (tsProbesApply && !databaseHealth.hasDatabaseHealthChecks) {
      violations.push('Missing database connectivity health checks');
      suggestions.push('Add database connectivity validation to health checks');
      score -= PENALTY.database;
    }

    // 3. Check for external service health checks
    const externalServiceHealth =
      this.analyzeExternalServiceHealthChecks(projectRoot);
    if (
      tsProbesApply &&
      !externalServiceHealth.hasExternalServiceHealthChecks
    ) {
      violations.push('Missing external service dependency health checks');
      suggestions.push('Add health checks for external service dependencies');
      score -= PENALTY.externalServices;
    }

    // 4. Check for Kubernetes health probes
    const kubernetesProbes = this.analyzeKubernetesHealthProbes(projectRoot);
    if (!kubernetesProbes.hasKubernetesProbes) {
      suggestions.push('Configure Kubernetes liveness and readiness probes');
      score -= PENALTY.kubernetesProbes;
    }

    // 5. Check for monitoring integration
    const monitoringIntegration =
      this.analyzeMonitoringIntegration(projectRoot);
    if (!monitoringIntegration.hasMonitoringIntegration) {
      suggestions.push('Integrate health checks with monitoring systems');
      score -= PENALTY.monitoring;
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
          endpointQuality = assessHealthEndpointQuality(content);
        } catch (_error) {
          endpointQuality = 'basic';
        }
        break;
      }
    }

    // Search for health endpoints in route files
    if (!hasHealthEndpoints) {
      const routeCheckResult = await checkRouteFilesForHealthEndpoints(
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
          if (hasKubernetesHealthProbes(content)) {
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
          if (hasMonitoringIntegration(content)) {
            return true;
          }
        } catch (_error) {
          // Skip files that can't be read
        }
      }
    }

    return false;
  }
}

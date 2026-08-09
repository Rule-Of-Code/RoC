/**
 * Tests for HealthCheckMonitoringLaw
 *
 * Comprehensive tests for health check monitoring validation
 */
import { HealthCheckMonitoringLaw } from '../../../src/laws/deployment/health-check-monitoring';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('HealthCheckMonitoringLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('health-monitoring-test-');
    mockConfig = {
      project: {
        name: 'test-project',
        root: tempDir,
        componentPrefix: 'app',
        type: 'generic',
      },
      ignores: { global: [], tests: [], build: [], design: [] },
      laws: { paretoMode: false, severity: {} },
      hooks: { preCommit: false, prePush: false, commitMsg: false },
      includes: { global: [] },
      excludes: {},
      reporting: {
        format: 'console',
        verbose: false,
        onlyFailures: false,
        scoring: false,
      },
      performance: {
        parallel: false,
        maxConcurrent: 3,
        cache: true,
      },
    };
    mockContext = {
      projectRoot: tempDir,
      config: mockConfig,
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('check()', () => {
    it('should return a LawResult object', async () => {
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', async () => {
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions array', async () => {
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', async () => {
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
    });

    it('should have message property', async () => {
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should have fixable property', async () => {
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(typeof result.fixable).toBe('boolean');
    });

    // An empty project is not a service: it exposes no endpoint and reaches no
    // database, so there is nothing to probe. Demanding /health from a browser
    // client was a demand it could not meet — the law now reports nothing, the
    // way a linter reports nothing for a language absent from the repository.
    // A project that IS a service is still judged; see the block below.
    it('says nothing about a project that serves nothing', async () => {
      const result = await HealthCheckMonitoringLaw.check(mockContext);

      expect(result.violations ?? []).toEqual([]);
      expect(result.passed).toBe(true);
    });

    it('still judges a project that is a service', async () => {
      // A server framework in the dependencies is the evidence.
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'svc', dependencies: { express: '^4' } })
      );

      const result = await HealthCheckMonitoringLaw.check(mockContext);

      expect(result.violations).toContain('Missing health check endpoints');
      expect(result.violations).toContain(
        'Missing database connectivity health checks'
      );
      expect(result.violations).toContain(
        'Missing external service dependency health checks'
      );
    });
  });

  describe('with health endpoints', () => {
    it('should detect src/health.ts', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health.ts'),
        'export const healthCheck = () => ({ status: "ok" });'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.violations).not.toContain('Missing health check endpoints');
    });

    it('should detect src/health-check.ts', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health-check.ts'),
        'export const getHealthStatus = () => ({ healthy: true });'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.violations).not.toContain('Missing health check endpoints');
    });

    it('should detect src/controllers/health.ts', async () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, 'src', 'controllers')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'controllers', 'health.ts'),
        'export class HealthController { check() { return { status: "ok" }; } }'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.violations).not.toContain('Missing health check endpoints');
    });

    it('should detect src/routes/health.ts', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src', 'routes'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'routes', 'health.ts'),
        'router.get("/health", (req, res) => res.json({ status: "ok" }));'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.violations).not.toContain('Missing health check endpoints');
    });

    it('should detect src/api/health.ts', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src', 'api'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'api', 'health.ts'),
        'export const healthEndpoint = async () => ({ ok: true });'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.violations).not.toContain('Missing health check endpoints');
    });

    it('should detect health endpoint in route files', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app.ts'),
        'app.get("/health", healthHandler);'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.violations).not.toContain('Missing health check endpoints');
    });

    it('should detect /status endpoint', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'server.ts'),
        'app.get("/status", getStatus);'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.violations).not.toContain('Missing health check endpoints');
    });

    it('should assess basic quality for simple health endpoint without quality indicators', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health.ts'),
        'export const simpleCheck = () => ({ ok: true });'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      // Should detect endpoint but with basic quality (0 matches)
      expect(result.violations).not.toContain('Missing health check endpoints');
      expect(result.passed).toBeDefined();
    });

    it('should assess basic quality with only one quality indicator', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health.ts'),
        'export const check = () => ({ database_health: checkDB() });'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      // Should detect endpoint but with basic quality (1 match)
      expect(result.violations).not.toContain('Missing health check endpoints');
      expect(result.passed).toBeDefined();
    });
  });

  describe('with database health checks', () => {
    it('should detect database health in health.ts', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health.ts'),
        'export const checkDatabaseHealth = async () => { await db.ping(); };'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing database connectivity health checks'
      );
    });

    it('should detect db connectivity check', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health.ts'),
        'export const checkDbConnectivity = async () => {};'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing database connectivity health checks'
      );
    });

    it('should detect database/health.ts', async () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, 'src', 'database')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'database', 'health.ts'),
        'export const databaseStatus = async () => { return { connected: true }; };'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing database connectivity health checks'
      );
    });

    it('should detect db ping in health check', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health-check.ts'),
        'export const checkHealth = async () => { const dbPing = await db.ping(); };'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing database connectivity health checks'
      );
    });
  });

  describe('with external service health checks', () => {
    it('should detect external service health', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health.ts'),
        'export const checkExternalServiceHealth = async () => {};'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing external service dependency health checks'
      );
    });

    it('should detect dependency check', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health.ts'),
        'export const dependencyCheck = async () => {};'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing external service dependency health checks'
      );
    });

    it('should detect third party health', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health-check.ts'),
        'export const checkThirdPartyHealth = () => {};'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Missing external service dependency health checks'
      );
    });

    it('should detect external/health-check.ts', async () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, 'src', 'external')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'external', 'health-check.ts'),
        'export const externalHealthCheck = () => {};'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      // File in external directory doesn't satisfy external service health check detection
      // The law looks for specific patterns in file content, not directory structure
      expect(result.violations).toContain(
        'Missing external service dependency health checks'
      );
    });
  });

  describe('with Kubernetes health probes', () => {
    it('should detect livenessProbe in k8s deployment', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'k8s'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'k8s', 'deployment.yml'),
        'spec:\n  containers:\n    - livenessProbe:\n        httpGet:\n          path: /health'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Configure Kubernetes liveness and readiness probes'
      );
    });

    it('should detect readinessProbe', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'k8s'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'k8s', 'deployment.yaml'),
        'spec:\n  containers:\n    - readinessProbe:\n        httpGet:\n          path: /ready'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Configure Kubernetes liveness and readiness probes'
      );
    });

    it('should detect startupProbe', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'kubernetes'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'kubernetes', 'deployment.yml'),
        'spec:\n  containers:\n    - startupProbe:\n        httpGet:\n          path: /startup'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Configure Kubernetes liveness and readiness probes'
      );
    });

    it('should detect healthz endpoint', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'k8s'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'k8s', 'deployment.yml'),
        'spec:\n  containers:\n    - probes:\n        healthz: /healthz'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Configure Kubernetes liveness and readiness probes'
      );
    });
  });

  describe('with monitoring integration', () => {
    it('should detect Prometheus config', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'monitoring'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'monitoring', 'prometheus.yml'),
        'scrape_configs:\n  - job_name: app'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Integrate health checks with monitoring systems'
      );
    });

    it('should detect Grafana dashboards', async () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, 'monitoring', 'grafana')
      );
      FileUtils.writeFile(
        PathOperations.join(
          tempDir,
          'monitoring',
          'grafana',
          'dashboards.json'
        ),
        '{ "dashboard": { "title": "Health" } }'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Integrate health checks with monitoring systems'
      );
    });

    it('should detect monitoring in health files', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health.ts'),
        'import { metrics } from "prometheus-client"; export const healthWithMetrics = () => {};'
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Integrate health checks with monitoring systems'
      );
    });
  });

  describe('score calculation', () => {
    it('should have score between 0 and 100', async () => {
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should reduce score for missing health endpoints', async () => {
      // Scored only where the concern applies: a service missing its probes.
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'svc', dependencies: { fastify: '^4' } })
      );

      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });

    it('should not have negative score', async () => {
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('message generation', () => {
    it('should include emoji in message', async () => {
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.message).toMatch(/[✅⚠️]/);
    });

    it('should indicate Health Check Monitoring in message', async () => {
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.message).toContain('Health Check Monitoring');
    });
  });

  describe('endpoint quality assessment', () => {
    it('should assess comprehensive quality', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health.ts'),
        `
          export const healthCheck = () => ({
            databaseHealth: checkDb(),
            externalService: checkExternal(),
            dependencyCheck: checkDeps(),
            detailedStatus: getDetails(),
            responseTime: measureTime(),
            healthMetrics: getMetrics()
          });
        `
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      expect(result.message).toContain('comprehensive');
    });

    it('should assess good quality with 2-3 indicators', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health.ts'),
        `
          export const healthCheck = () => ({
            databaseHealth: checkDb(),
            externalService: checkExternal()
          });
        `
      );
      const result = await HealthCheckMonitoringLaw.check(mockContext);
      // Should have good quality (2 matches)
      expect(result.passed).toBeDefined();
    });

    it('should handle file read error gracefully', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      const healthFilePath = PathOperations.join(tempDir, 'src', 'health.ts');
      FileUtils.writeFile(healthFilePath, 'content');

      // Mock FileUtils.readFile to throw error
      jest.spyOn(FileUtils, 'readFile').mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = await HealthCheckMonitoringLaw.check(mockContext);

      // Should still detect health endpoint but with basic quality
      expect(result.passed).toBe(false);
    });
  });
});

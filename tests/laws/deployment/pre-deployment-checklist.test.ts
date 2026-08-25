/**
 * Tests for PreDeploymentChecklistLaw
 *
 * Comprehensive tests for pre-deployment checklist validation
 */
import { PreDeploymentChecklistLaw } from '../../../src/laws/deployment/pre-deployment-checklist';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('PreDeploymentChecklistLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('pre-deployment-test-');
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
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions array', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
    });

    it('should have message property', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should report missing checklist for empty project', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).toContain(
        'PRE_DEPLOYMENT_CHECKLIST.md missing - CRITICAL violation'
      );
    });

    it('should fail for empty project', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.passed).toBe(false);
    });
  });

  describe('with PRE_DEPLOYMENT_CHECKLIST.md', () => {
    it('should detect PRE_DEPLOYMENT_CHECKLIST.md', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'PRE_DEPLOYMENT_CHECKLIST.md'),
        '# Pre-Deployment Checklist\n- [x] All tests pass\n- [x] Build verified'
      );
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'PRE_DEPLOYMENT_CHECKLIST.md missing - CRITICAL violation'
      );
    });

    it('should report which CONCERNS the checklist is missing, not which boxes are unticked', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'PRE_DEPLOYMENT_CHECKLIST.md'),
        '# Pre-Deployment Checklist\n- [x] Item 1\n- [ ] Item 2\n- [ ] Item 3\n- [ ] Item 4\n- [ ] Item 5'
      );
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      // Never "you have not ticked the boxes": the boxes belong to a
      // deployment, not to the repository (a backend consumer).
      expect((result.violations ?? []).join(' ')).toContain('has no steps for');
      expect((result.violations ?? []).join(' ')).not.toMatch(/not checked/i);
    });
  });

  describe('with build validation', () => {
    it('should report missing build validation', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).toContain(
        'Build validation not properly configured'
      );
    });

    it('should detect build scripts in package.json', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: {
            build: 'tsc',
            'build:prod': 'ng build --prod',
          },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } })
      );
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Build validation not properly configured'
      );
    });

    it('should detect angular.json', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'angular.json'),
        JSON.stringify({ projects: { app: {} } })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ scripts: { build: 'ng build' } })
      );
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      // Should detect angular config
      expect(result).toBeDefined();
    });

    it('should detect nx.json', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'nx.json'),
        JSON.stringify({ npmScope: 'myorg' })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ scripts: { build: 'nx build' } })
      );
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result).toBeDefined();
    });
  });

  describe('with testing setup', () => {
    it('should report missing testing setup', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).toContain(
        'Testing setup incomplete or no test files found'
      );
    });

    it('should detect test scripts', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: {
            test: 'jest',
            'test:unit': 'jest --coverage',
          },
        })
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app.spec.ts'),
        'describe("App", () => { it("works", async () => {}); });'
      );
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      // Law correctly suppresses the violation when valid test scripts and test files exist
      expect(result.violations).not.toContain(
        'Testing setup incomplete or no test files found'
      );
    });
  });

  describe('with security scanning', () => {
    it('should report missing security scanning', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).toContain(
        'Security vulnerability scanning not configured'
      );
    });

    it('should detect npm audit script', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: {
            audit: 'npm audit',
            security: 'npm audit --production',
          },
        })
      );
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Security vulnerability scanning not configured'
      );
    });

    it('should detect .snyk config', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.snyk'),
        'version: v1.21.0'
      );
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      // Snyk config should contribute to security
      expect(result).toBeDefined();
    });
  });

  describe('with authentication setup', () => {
    it('should report missing authentication', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).toContain(
        'Authentication/authorization setup not detected'
      );
    });

    it('should detect auth files', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'auth.service.ts'),
        'export class AuthService { login() {} logout() {} }'
      );
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Authentication/authorization setup not detected'
      );
    });

    it('should detect jwt files', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'jwt.guard.ts'),
        'export class JwtGuard { canActivate() {} }'
      );
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Authentication/authorization setup not detected'
      );
    });

    it('should detect security files', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'security.middleware.ts'),
        'export const securityMiddleware = (req, res, next) => {};'
      );
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Authentication/authorization setup not detected'
      );
    });
  });

  describe('with performance benchmarking', () => {
    it('should report missing performance benchmarking', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).toContain(
        'Performance benchmarking not configured'
      );
    });

    it('should detect performance scripts', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: {
            performance: 'lighthouse http://localhost:3000',
            lighthouse: 'lhci autorun',
          },
        })
      );
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Performance benchmarking not configured'
      );
    });

    it('should detect lighthouse config', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'lighthouse.config.js'),
        'module.exports = { extends: "lighthouse:default" };'
      );
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      // Lighthouse config file alone doesn't satisfy performance benchmarking requirement
      // Performance scripts in package.json are also needed
      expect(result.violations).toContain(
        'Performance benchmarking not configured'
      );
    });
  });

  describe('with monitoring setup', () => {
    /**
     * These two clauses defer to the law that owns the concern. On a bare
     * fixture those laws PASS — Health Check Monitoring is not applicable to a
     * project that runs no service, and Centralized Logging has nothing
     * ungated to find — so the checklist correctly says nothing.
     *
     * Both tests used to assert the opposite, from before that deferral
     * existed. They fail the owning law now, which is what makes the clause
     * the thing under test rather than the fixture.
     */
    it('reports missing health checks when the owning law does not pass', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'svc',
          dependencies: { express: '^4.18.0' },
        })
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'server.ts'),
        "import express from 'express';\nconst app = express();\napp.listen(3000);\n"
      );

      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).toContain('Health checks not configured');
    });

    it('reports missing logging when the owning law does not pass', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'thing.ts'),
        'export function thing(): void {\n  console.log("ungated");\n}\n'
      );

      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).toContain('Logging not properly configured');
    });

    it('says nothing about either when the owning laws pass', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);

      expect(result.violations).not.toContain('Health checks not configured');
      expect(result.violations).not.toContain(
        'Logging not properly configured'
      );
    });

    it('should detect health check files', async () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health.ts'),
        'export const healthCheck = () => ({ status: "ok" });'
      );
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain('Health checks not configured');
    });

    it('should detect logging config', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'logging.config.js'),
        'module.exports = { level: "info" };'
      );
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Logging not properly configured'
      );
    });

    it('should detect winston config', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'winston.config.js'),
        'module.exports = { transports: [] };'
      );
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Logging not properly configured'
      );
    });
  });

  describe('generateChecklistTemplate()', () => {
    it('should return a string template', async () => {
      const template = PreDeploymentChecklistLaw.generateChecklistTemplate();
      expect(typeof template).toBe('string');
    });

    it('should include Build & Testing section', async () => {
      const template = PreDeploymentChecklistLaw.generateChecklistTemplate();
      expect(template).toContain('Build');
    });

    it('should include Security section', async () => {
      const template = PreDeploymentChecklistLaw.generateChecklistTemplate();
      expect(template).toContain('Security');
    });

    it('should include Performance section', async () => {
      const template = PreDeploymentChecklistLaw.generateChecklistTemplate();
      expect(template).toContain('Performance');
    });

    it('should include checklist items', async () => {
      const template = PreDeploymentChecklistLaw.generateChecklistTemplate();
      expect(template).toContain('- [ ]');
    });
  });

  describe('getDetailedStatus()', () => {
    it('should return checklist status', async () => {
      const status = PreDeploymentChecklistLaw.getDetailedStatus(
        tempDir,
        mockConfig
      );
      expect(status.checklist).toBeDefined();
    });

    it('should return build status', async () => {
      const status = PreDeploymentChecklistLaw.getDetailedStatus(
        tempDir,
        mockConfig
      );
      expect(status.build).toBeDefined();
    });

    it('should return testing status', async () => {
      const status = PreDeploymentChecklistLaw.getDetailedStatus(
        tempDir,
        mockConfig
      );
      expect(status.testing).toBeDefined();
    });

    it('should return security status', async () => {
      const status = PreDeploymentChecklistLaw.getDetailedStatus(
        tempDir,
        mockConfig
      );
      expect(status.security).toBeDefined();
    });

    it('should return authentication status', async () => {
      const status = PreDeploymentChecklistLaw.getDetailedStatus(
        tempDir,
        mockConfig
      );
      expect(status.authentication).toBeDefined();
    });

    it('should return performance status', async () => {
      const status = PreDeploymentChecklistLaw.getDetailedStatus(
        tempDir,
        mockConfig
      );
      expect(status.performance).toBeDefined();
    });

    it('should return monitoring status', async () => {
      const status = PreDeploymentChecklistLaw.getDetailedStatus(
        tempDir,
        mockConfig
      );
      expect(status.monitoring).toBeDefined();
    });
  });

  describe('score calculation', () => {
    it('should have score between 0 and 100', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should reduce score for missing checklist', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });

    it('should not have negative score', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('message generation', () => {
    it('should include emoji in message', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.message).toMatch(/[✅❌]/);
    });

    it('should indicate failure for empty project', async () => {
      const result = await PreDeploymentChecklistLaw.check(mockContext);
      expect(result.message).toContain('failed');
    });
  });
});

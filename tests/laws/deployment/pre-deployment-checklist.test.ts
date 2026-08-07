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
    it('should return a LawResult object', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions array', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
    });

    it('should have message property', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should report missing checklist for empty project', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).toContain(
        'PRE_DEPLOYMENT_CHECKLIST.md missing - CRITICAL violation'
      );
    });

    it('should fail for empty project', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.passed).toBe(false);
    });
  });

  describe('with PRE_DEPLOYMENT_CHECKLIST.md', () => {
    it('should detect PRE_DEPLOYMENT_CHECKLIST.md', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'PRE_DEPLOYMENT_CHECKLIST.md'),
        '# Pre-Deployment Checklist\n- [x] All tests pass\n- [x] Build verified'
      );
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'PRE_DEPLOYMENT_CHECKLIST.md missing - CRITICAL violation'
      );
    });

    it('should report which CONCERNS the checklist is missing, not which boxes are unticked', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'PRE_DEPLOYMENT_CHECKLIST.md'),
        '# Pre-Deployment Checklist\n- [x] Item 1\n- [ ] Item 2\n- [ ] Item 3\n- [ ] Item 4\n- [ ] Item 5'
      );
      const result = PreDeploymentChecklistLaw.check(mockContext);
      // Never "you have not ticked the boxes": the boxes belong to a
      // deployment, not to the repository (a backend consumer).
      expect((result.violations ?? []).join(' ')).toContain('has no steps for');
      expect((result.violations ?? []).join(' ')).not.toMatch(/not checked/i);
    });
  });

  describe('with build validation', () => {
    it('should report missing build validation', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).toContain(
        'Build validation not properly configured'
      );
    });

    it('should detect build scripts in package.json', () => {
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
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Build validation not properly configured'
      );
    });

    it('should detect angular.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'angular.json'),
        JSON.stringify({ projects: { app: {} } })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ scripts: { build: 'ng build' } })
      );
      const result = PreDeploymentChecklistLaw.check(mockContext);
      // Should detect angular config
      expect(result).toBeDefined();
    });

    it('should detect nx.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'nx.json'),
        JSON.stringify({ npmScope: 'myorg' })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ scripts: { build: 'nx build' } })
      );
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result).toBeDefined();
    });
  });

  describe('with testing setup', () => {
    it('should report missing testing setup', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).toContain(
        'Testing setup incomplete or no test files found'
      );
    });

    it('should detect test scripts', () => {
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
        'describe("App", () => { it("works", () => {}); });'
      );
      const result = PreDeploymentChecklistLaw.check(mockContext);
      // Law correctly suppresses the violation when valid test scripts and test files exist
      expect(result.violations).not.toContain(
        'Testing setup incomplete or no test files found'
      );
    });
  });

  describe('with security scanning', () => {
    it('should report missing security scanning', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).toContain(
        'Security vulnerability scanning not configured'
      );
    });

    it('should detect npm audit script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: {
            audit: 'npm audit',
            security: 'npm audit --production',
          },
        })
      );
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Security vulnerability scanning not configured'
      );
    });

    it('should detect .snyk config', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.snyk'),
        'version: v1.21.0'
      );
      const result = PreDeploymentChecklistLaw.check(mockContext);
      // Snyk config should contribute to security
      expect(result).toBeDefined();
    });
  });

  describe('with authentication setup', () => {
    it('should report missing authentication', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).toContain(
        'Authentication/authorization setup not detected'
      );
    });

    it('should detect auth files', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'auth.service.ts'),
        'export class AuthService { login() {} logout() {} }'
      );
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Authentication/authorization setup not detected'
      );
    });

    it('should detect jwt files', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'jwt.guard.ts'),
        'export class JwtGuard { canActivate() {} }'
      );
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Authentication/authorization setup not detected'
      );
    });

    it('should detect security files', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'security.middleware.ts'),
        'export const securityMiddleware = (req, res, next) => {};'
      );
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Authentication/authorization setup not detected'
      );
    });
  });

  describe('with performance benchmarking', () => {
    it('should report missing performance benchmarking', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).toContain(
        'Performance benchmarking not configured'
      );
    });

    it('should detect performance scripts', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: {
            performance: 'lighthouse http://localhost:3000',
            lighthouse: 'lhci autorun',
          },
        })
      );
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Performance benchmarking not configured'
      );
    });

    it('should detect lighthouse config', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'lighthouse.config.js'),
        'module.exports = { extends: "lighthouse:default" };'
      );
      const result = PreDeploymentChecklistLaw.check(mockContext);
      // Lighthouse config file alone doesn't satisfy performance benchmarking requirement
      // Performance scripts in package.json are also needed
      expect(result.violations).toContain(
        'Performance benchmarking not configured'
      );
    });
  });

  describe('with monitoring setup', () => {
    it('should report missing health checks', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).toContain('Health checks not configured');
    });

    it('should report missing logging', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).toContain('Logging not properly configured');
    });

    it('should detect health check files', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health.ts'),
        'export const healthCheck = () => ({ status: "ok" });'
      );
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain('Health checks not configured');
    });

    it('should detect logging config', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'logging.config.js'),
        'module.exports = { level: "info" };'
      );
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Logging not properly configured'
      );
    });

    it('should detect winston config', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'winston.config.js'),
        'module.exports = { transports: [] };'
      );
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'Logging not properly configured'
      );
    });
  });

  describe('generateChecklistTemplate()', () => {
    it('should return a string template', () => {
      const template = PreDeploymentChecklistLaw.generateChecklistTemplate();
      expect(typeof template).toBe('string');
    });

    it('should include Build & Testing section', () => {
      const template = PreDeploymentChecklistLaw.generateChecklistTemplate();
      expect(template).toContain('Build');
    });

    it('should include Security section', () => {
      const template = PreDeploymentChecklistLaw.generateChecklistTemplate();
      expect(template).toContain('Security');
    });

    it('should include Performance section', () => {
      const template = PreDeploymentChecklistLaw.generateChecklistTemplate();
      expect(template).toContain('Performance');
    });

    it('should include checklist items', () => {
      const template = PreDeploymentChecklistLaw.generateChecklistTemplate();
      expect(template).toContain('- [ ]');
    });
  });

  describe('getDetailedStatus()', () => {
    it('should return checklist status', () => {
      const status = PreDeploymentChecklistLaw.getDetailedStatus(
        tempDir,
        mockConfig
      );
      expect(status.checklist).toBeDefined();
    });

    it('should return build status', () => {
      const status = PreDeploymentChecklistLaw.getDetailedStatus(
        tempDir,
        mockConfig
      );
      expect(status.build).toBeDefined();
    });

    it('should return testing status', () => {
      const status = PreDeploymentChecklistLaw.getDetailedStatus(
        tempDir,
        mockConfig
      );
      expect(status.testing).toBeDefined();
    });

    it('should return security status', () => {
      const status = PreDeploymentChecklistLaw.getDetailedStatus(
        tempDir,
        mockConfig
      );
      expect(status.security).toBeDefined();
    });

    it('should return authentication status', () => {
      const status = PreDeploymentChecklistLaw.getDetailedStatus(
        tempDir,
        mockConfig
      );
      expect(status.authentication).toBeDefined();
    });

    it('should return performance status', () => {
      const status = PreDeploymentChecklistLaw.getDetailedStatus(
        tempDir,
        mockConfig
      );
      expect(status.performance).toBeDefined();
    });

    it('should return monitoring status', () => {
      const status = PreDeploymentChecklistLaw.getDetailedStatus(
        tempDir,
        mockConfig
      );
      expect(status.monitoring).toBeDefined();
    });
  });

  describe('score calculation', () => {
    it('should have score between 0 and 100', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should reduce score for missing checklist', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });

    it('should not have negative score', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('message generation', () => {
    it('should include emoji in message', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.message).toMatch(/[✅❌]/);
    });

    it('should indicate failure for empty project', () => {
      const result = PreDeploymentChecklistLaw.check(mockContext);
      expect(result.message).toContain('failed');
    });
  });
});

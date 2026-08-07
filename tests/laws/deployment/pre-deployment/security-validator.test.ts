/**
 * Tests for SecurityValidationChecker
 *
 * Comprehensive tests for security validation
 */
import {
  SecurityValidationChecker,
  securityValidator,
} from '../../../../src/laws/deployment/pre-deployment/security-validator';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../../src/types';
import { FileUtils } from '../../../../src/utils/file-utils';
import { PathOperations } from '../../../../src/utils/path-operations';

describe('SecurityValidationChecker', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;
  let validator: SecurityValidationChecker;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('security-validator-test-');
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
    validator = new SecurityValidationChecker();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('validate()', () => {
    it('should return isValid false for empty project', () => {
      const result = validator.validate(mockContext);
      expect(result.isValid).toBe(false);
    });

    it('should return npmAuditConfigured false for empty project', () => {
      const result = validator.validate(mockContext);
      expect(result.npmAuditConfigured).toBe(false);
    });

    it('should return dependabotConfigured false for empty project', () => {
      const result = validator.validate(mockContext);
      expect(result.dependabotConfigured).toBe(false);
    });

    it('should return snykConfigured false for empty project', () => {
      const result = validator.validate(mockContext);
      expect(result.snykConfigured).toBe(false);
    });

    it('should return secretScanningConfigured false for empty project', () => {
      const result = validator.validate(mockContext);
      expect(result.secretScanningConfigured).toBe(false);
    });

    it('should have error when validation fails', () => {
      const result = validator.validate(mockContext);
      expect(result.errors).toContain('Security validation failed');
    });

    it('should have empty errors when audit configured', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: { audit: 'npm audit' },
        })
      );
      const result = validator.validate(mockContext);
      expect(result.errors).toEqual([]);
    });
  });

  describe('checkSecurityScanning()', () => {
    it('should return npmAuditConfigured false when no audit script', () => {
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.npmAuditConfigured).toBe(false);
    });

    it('should return dependabotConfigured false when no dependabot config', () => {
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.dependabotConfigured).toBe(false);
    });

    it('should return snykConfigured false when no snyk config', () => {
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.snykConfigured).toBe(false);
    });

    it('should return secretScanningConfigured false when no secret scanning', () => {
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.secretScanningConfigured).toBe(false);
    });

    it('should return empty securityScripts when no package.json', () => {
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.securityScripts).toEqual([]);
    });

    it('should return vulnerabilityScanResults false when no scan results', () => {
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.vulnerabilityScanResults).toBe(false);
    });

    it('should detect audit script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: { audit: 'npm audit' },
        })
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.securityScripts).toContain('audit');
      expect(result.npmAuditConfigured).toBe(true);
    });

    it('should detect security script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: { security: 'npm audit && snyk test' },
        })
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.securityScripts).toContain('security');
    });

    it('should detect security:check script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: { 'security:check': 'snyk test' },
        })
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.securityScripts).toContain('security:check');
    });

    it('should detect vulnerability script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: { vulnerability: 'npm audit' },
        })
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.securityScripts).toContain('vulnerability');
    });

    it('should detect snyk script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: { snyk: 'snyk test' },
        })
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.securityScripts).toContain('snyk');
      expect(result.snykConfigured).toBe(true);
    });

    it('should detect .snyk config file', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.snyk'),
        'version: v1.0.0'
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.snykConfigured).toBe(true);
    });

    it('should detect snyk.json config file', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'snyk.json'),
        JSON.stringify({})
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.snykConfigured).toBe(true);
    });

    it('should detect .gitleaks.toml', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.gitleaks.toml'),
        '[allowlist]'
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.secretScanningConfigured).toBe(true);
    });

    it('should detect .secrets.baseline', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.secrets.baseline'),
        JSON.stringify({})
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.secretScanningConfigured).toBe(true);
    });

    it('should detect secrets-scan.yml workflow', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(
          tempDir,
          '.github',
          'workflows',
          'secrets-scan.yml'
        ),
        'name: Secrets Scan'
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.secretScanningConfigured).toBe(true);
    });

    it('should detect security.yml workflow', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'security.yml'),
        'name: Security'
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.secretScanningConfigured).toBe(true);
    });

    it('should detect dependabot.yml', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'dependabot.yml'),
        'version: 2'
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.dependabotConfigured).toBe(true);
    });

    it('should detect dependabot.yaml', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.github'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'dependabot.yaml'),
        'version: 2'
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.dependabotConfigured).toBe(true);
    });

    it('should detect security-audit.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'security-audit.json'),
        JSON.stringify({ vulnerabilities: [] })
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.vulnerabilityScanResults).toBe(true);
    });

    it('should detect vulnerability-report.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'vulnerability-report.json'),
        JSON.stringify({ status: 'ok' })
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.vulnerabilityScanResults).toBe(true);
    });

    it('should detect .security/audit-results.json', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.security'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.security', 'audit-results.json'),
        JSON.stringify({ results: [] })
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.vulnerabilityScanResults).toBe(true);
    });

    it('should detect reports/security.json', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'reports'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'reports', 'security.json'),
        JSON.stringify({ security: 'passed' })
      );
      const result = validator.checkSecurityScanning(tempDir);
      expect(result.vulnerabilityScanResults).toBe(true);
    });
  });

  describe('checkAuthenticationSetup()', () => {
    it('should return authConfigured false for empty project', () => {
      const result = validator.checkAuthenticationSetup(tempDir, mockConfig);
      expect(result.authConfigured).toBe(false);
    });

    it('should return empty authFiles for empty project', () => {
      const result = validator.checkAuthenticationSetup(tempDir, mockConfig);
      expect(result.authFiles).toEqual([]);
    });

    it('should return securityHeaders false for empty project', () => {
      const result = validator.checkAuthenticationSetup(tempDir, mockConfig);
      expect(result.securityHeaders).toBe(false);
    });

    it('should detect auth files', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'auth.service.ts'),
        'export class AuthService {}'
      );
      const result = validator.checkAuthenticationSetup(tempDir, mockConfig);
      expect(result.authConfigured).toBe(true);
      expect(result.authFiles.length).toBeGreaterThan(0);
    });

    it('should detect jwt files', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'jwt.util.ts'),
        'export function signJWT() {}'
      );
      const result = validator.checkAuthenticationSetup(tempDir, mockConfig);
      expect(result.authConfigured).toBe(true);
    });

    it('should detect security files', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'security.ts'),
        'export function validateToken() {}'
      );
      const result = validator.checkAuthenticationSetup(tempDir, mockConfig);
      expect(result.authConfigured).toBe(true);
    });

    it('should detect security-headers.conf', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'security-headers.conf'),
        'add_header X-Content-Type-Options nosniff;'
      );
      const result = validator.checkAuthenticationSetup(tempDir, mockConfig);
      expect(result.securityHeaders).toBe(true);
    });

    it('should detect helmet.config.js', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'helmet.config.js'),
        'module.exports = {};'
      );
      const result = validator.checkAuthenticationSetup(tempDir, mockConfig);
      expect(result.securityHeaders).toBe(true);
    });

    it('should detect security.config.js', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'security.config.js'),
        'module.exports = {};'
      );
      const result = validator.checkAuthenticationSetup(tempDir, mockConfig);
      expect(result.securityHeaders).toBe(true);
    });

    it('should handle non-existent project root gracefully', () => {
      const nonExistentPath = PathOperations.join(tempDir, 'does-not-exist');
      const result = validator.checkAuthenticationSetup(
        nonExistentPath,
        mockConfig
      );
      expect(result.authConfigured).toBe(false);
      expect(result.authFiles).toEqual([]);
      expect(result.securityHeaders).toBe(false);
    });
  });

  describe('securityValidator export', () => {
    it('should be an instance of SecurityValidationChecker', () => {
      expect(securityValidator).toBeInstanceOf(SecurityValidationChecker);
    });

    it('should have validate method', () => {
      expect(typeof securityValidator.validate).toBe('function');
    });

    it('should have checkSecurityScanning method', () => {
      expect(typeof securityValidator.checkSecurityScanning).toBe('function');
    });

    it('should have checkAuthenticationSetup method', () => {
      expect(typeof securityValidator.checkAuthenticationSetup).toBe(
        'function'
      );
    });
  });
});

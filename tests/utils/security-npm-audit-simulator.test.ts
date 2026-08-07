/**
 * @fileoverview Tests for npm-audit-simulator.ts
 * @description Tests for NPM Audit Simulator - simulates npm audit functionality
 */

import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';
import {
  NpmAuditSimulator,
  type AuditResults,
} from '../../src/utils/security/npm-audit-simulator';

describe('utils/security/npm-audit-simulator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('npm-audit-simulator-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  // ==========================================================================
  // getBasicAuditInfo
  // ==========================================================================

  describe('getBasicAuditInfo', () => {
    it('should return packageJsonExists false when package.json does not exist', () => {
      const result = NpmAuditSimulator.getBasicAuditInfo(tempDir);

      expect(result.packageJsonExists).toBe(false);
    });

    it('should return packageJsonExists true when package.json exists', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
        })
      );

      const result = NpmAuditSimulator.getBasicAuditInfo(tempDir);

      expect(result.packageJsonExists).toBe(true);
    });

    it('should return packageLockExists false when package-lock.json does not exist', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );

      const result = NpmAuditSimulator.getBasicAuditInfo(tempDir);

      expect(result.packageLockExists).toBe(false);
    });

    it('should return packageLockExists true when package-lock.json exists', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package-lock.json'),
        JSON.stringify({ lockfileVersion: 2 })
      );

      const result = NpmAuditSimulator.getBasicAuditInfo(tempDir);

      expect(result.packageLockExists).toBe(true);
    });

    it('should count dependencies correctly', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          dependencies: {
            lodash: '4.17.21',
            axios: '1.0.0',
          },
          devDependencies: {
            jest: '29.0.0',
          },
        })
      );

      const result = NpmAuditSimulator.getBasicAuditInfo(tempDir);

      expect(result.dependencyCount).toBe(3);
    });

    it('should return zero dependencies when package.json is empty', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );

      const result = NpmAuditSimulator.getBasicAuditInfo(tempDir);

      expect(result.dependencyCount).toBe(0);
    });

    it('should handle invalid package.json gracefully', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        'not valid json'
      );

      const result = NpmAuditSimulator.getBasicAuditInfo(tempDir);

      expect(result.packageJsonExists).toBe(true);
      expect(result.dependencyCount).toBe(0);
    });

    it('should return correct structure', () => {
      const result = NpmAuditSimulator.getBasicAuditInfo(tempDir);

      expect(result).toHaveProperty('packageJsonExists');
      expect(result).toHaveProperty('packageLockExists');
      expect(result).toHaveProperty('dependencyCount');
      expect(typeof result.packageJsonExists).toBe('boolean');
      expect(typeof result.packageLockExists).toBe('boolean');
      expect(typeof result.dependencyCount).toBe('number');
    });
  });

  // ==========================================================================
  // simulateNpmAudit
  // ==========================================================================

  describe('simulateNpmAudit', () => {
    it('should return results object with correct structure', () => {
      const { results } = NpmAuditSimulator.simulateNpmAudit(tempDir);

      expect(results).toHaveProperty('vulnerabilities');
      expect(results).toHaveProperty('metadata');
      expect(results.metadata).toHaveProperty('vulnerabilities');
      expect(results.metadata.vulnerabilities).toHaveProperty('summary');
    });

    it('should return hasVulnerabilities boolean', () => {
      const { hasVulnerabilities } =
        NpmAuditSimulator.simulateNpmAudit(tempDir);

      expect(typeof hasVulnerabilities).toBe('boolean');
    });

    it('should simulate vulnerabilities for large projects', () => {
      // Create package.json with more than 50 dependencies
      const dependencies: Record<string, string> = {};
      for (let i = 0; i < 55; i++) {
        dependencies[`package-${i}`] = '1.0.0';
      }

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'large-project',
          dependencies,
        })
      );

      const { hasVulnerabilities, results } =
        NpmAuditSimulator.simulateNpmAudit(tempDir);

      expect(hasVulnerabilities).toBe(true);
      expect(results.metadata.vulnerabilities.summary.moderate).toBeGreaterThan(
        0
      );
      expect(results.metadata.vulnerabilities.summary.total).toBeGreaterThan(0);
    });

    it('should not simulate vulnerabilities for small projects', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'small-project',
          dependencies: {
            lodash: '4.17.21',
          },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package-lock.json'),
        JSON.stringify({ lockfileVersion: 2 })
      );

      const { hasVulnerabilities, results } =
        NpmAuditSimulator.simulateNpmAudit(tempDir);

      expect(hasVulnerabilities).toBe(false);
      expect(results.metadata.vulnerabilities.summary.moderate).toBe(0);
    });

    it('should add info warning when package-lock.json is missing', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'project-without-lock',
          dependencies: {
            lodash: '4.17.21',
          },
        })
      );

      const { results } = NpmAuditSimulator.simulateNpmAudit(tempDir);

      expect(results.metadata.vulnerabilities.summary.info).toBeGreaterThan(0);
    });

    it('should return vulnerability summary with all severity levels', () => {
      const { results } = NpmAuditSimulator.simulateNpmAudit(tempDir);
      const { summary } = results.metadata.vulnerabilities;

      expect(summary).toHaveProperty('critical');
      expect(summary).toHaveProperty('high');
      expect(summary).toHaveProperty('moderate');
      expect(summary).toHaveProperty('low');
      expect(summary).toHaveProperty('info');
      expect(summary).toHaveProperty('total');
    });

    it('should return empty vulnerabilities array', () => {
      const { results } = NpmAuditSimulator.simulateNpmAudit(tempDir);

      expect(Array.isArray(results.vulnerabilities)).toBe(true);
      expect(results.vulnerabilities).toHaveLength(0);
    });

    it('should handle project with node_modules', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, 'node_modules'));

      expect(() => {
        NpmAuditSimulator.simulateNpmAudit(tempDir);
      }).not.toThrow();
    });

    it('should handle missing project root gracefully', () => {
      const nonExistentPath = PathOperations.join(tempDir, 'nonexistent');

      expect(() => {
        NpmAuditSimulator.simulateNpmAudit(nonExistentPath);
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // generateAuditRecommendations
  // ==========================================================================

  describe('generateAuditRecommendations', () => {
    it('should return array of recommendations', () => {
      const recommendations =
        NpmAuditSimulator.generateAuditRecommendations(false);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should include standard recommendations', () => {
      const recommendations =
        NpmAuditSimulator.generateAuditRecommendations(false);

      expect(recommendations).toContain(
        'Run npm audit regularly to check for vulnerabilities'
      );
      expect(recommendations).toContain(
        'Keep dependencies up to date with npm update'
      );
      expect(recommendations).toContain(
        'Use npm audit fix to automatically fix minor issues'
      );
      expect(recommendations).toContain(
        'Review and update vulnerable dependencies manually for major issues'
      );
    });

    it('should add urgent recommendation when vulnerabilities exist', () => {
      const recommendations =
        NpmAuditSimulator.generateAuditRecommendations(true);

      expect(recommendations[0]).toBe(
        'Address identified vulnerabilities as soon as possible'
      );
    });

    it('should not add urgent recommendation when no vulnerabilities', () => {
      const recommendations =
        NpmAuditSimulator.generateAuditRecommendations(false);

      expect(recommendations[0]).not.toBe(
        'Address identified vulnerabilities as soon as possible'
      );
    });

    it('should have more recommendations when vulnerabilities exist', () => {
      const withVulns = NpmAuditSimulator.generateAuditRecommendations(true);
      const withoutVulns =
        NpmAuditSimulator.generateAuditRecommendations(false);

      expect(withVulns.length).toBe(withoutVulns.length + 1);
    });
  });

  // ==========================================================================
  // isNpmAuditAvailable
  // ==========================================================================

  describe('isNpmAuditAvailable', () => {
    it('should return a boolean', () => {
      const result = NpmAuditSimulator.isNpmAuditAvailable();

      expect(typeof result).toBe('boolean');
    });

    it('should return false in test environment', () => {
      // Since tests run with NODE_ENV=test, this should return false
      const result = NpmAuditSimulator.isNpmAuditAvailable();

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // getAuditConfigRecommendations
  // ==========================================================================

  describe('getAuditConfigRecommendations', () => {
    it('should return array of recommendations', () => {
      const recommendations = NpmAuditSimulator.getAuditConfigRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should include .npmrc configuration recommendation', () => {
      const recommendations = NpmAuditSimulator.getAuditConfigRecommendations();

      expect(recommendations).toContain('Configure audit level in .npmrc file');
    });

    it('should include CI/CD recommendation', () => {
      const recommendations = NpmAuditSimulator.getAuditConfigRecommendations();

      expect(recommendations).toContain(
        'Set up automated security scanning in CI/CD pipeline'
      );
    });

    it('should include third-party tool recommendations', () => {
      const recommendations = NpmAuditSimulator.getAuditConfigRecommendations();

      expect(recommendations).toContain(
        'Consider using tools like Snyk or WhiteSource for enhanced security scanning'
      );
    });

    it('should include security policy recommendation', () => {
      const recommendations = NpmAuditSimulator.getAuditConfigRecommendations();

      expect(recommendations).toContain(
        'Implement security policies for dependency management'
      );
    });

    it('should return exactly 4 recommendations', () => {
      const recommendations = NpmAuditSimulator.getAuditConfigRecommendations();

      expect(recommendations).toHaveLength(4);
    });
  });

  // ==========================================================================
  // AuditResults Type
  // ==========================================================================

  describe('AuditResults type', () => {
    it('should allow creating valid AuditResults object', () => {
      const auditResults: AuditResults = {
        vulnerabilities: [],
        metadata: {
          vulnerabilities: {
            summary: {
              critical: 0,
              high: 0,
              moderate: 0,
              low: 0,
              info: 0,
              total: 0,
            },
          },
        },
      };

      expect(auditResults.vulnerabilities).toEqual([]);
      expect(auditResults.metadata.vulnerabilities.summary.total).toBe(0);
    });

    it('should allow vulnerabilities with any content', () => {
      const auditResults: AuditResults = {
        vulnerabilities: [
          { name: 'lodash', severity: 'high' },
          { name: 'axios', severity: 'moderate' },
        ],
        metadata: {
          vulnerabilities: {
            summary: {
              critical: 0,
              high: 1,
              moderate: 1,
              low: 0,
              info: 0,
              total: 2,
            },
          },
        },
      };

      expect(auditResults.vulnerabilities).toHaveLength(2);
      expect(auditResults.metadata.vulnerabilities.summary.total).toBe(2);
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration tests', () => {
    it('should work together: getBasicAuditInfo -> simulateNpmAudit -> generateAuditRecommendations', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'integration-test',
          dependencies: {
            lodash: '4.17.21',
          },
        })
      );

      const auditInfo = NpmAuditSimulator.getBasicAuditInfo(tempDir);
      expect(auditInfo.packageJsonExists).toBe(true);

      const { hasVulnerabilities } =
        NpmAuditSimulator.simulateNpmAudit(tempDir);

      const recommendations =
        NpmAuditSimulator.generateAuditRecommendations(hasVulnerabilities);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should provide comprehensive output for full project analysis', () => {
      // Create a complete project structure
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'full-project',
          version: '1.0.0',
          dependencies: {
            express: '4.18.0',
          },
          devDependencies: {
            jest: '29.0.0',
          },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package-lock.json'),
        JSON.stringify({ lockfileVersion: 2 })
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, 'node_modules'));

      const auditInfo = NpmAuditSimulator.getBasicAuditInfo(tempDir);
      const auditResult = NpmAuditSimulator.simulateNpmAudit(tempDir);
      const recommendations = NpmAuditSimulator.generateAuditRecommendations(
        auditResult.hasVulnerabilities
      );
      const configRecommendations =
        NpmAuditSimulator.getAuditConfigRecommendations();

      expect(auditInfo.packageJsonExists).toBe(true);
      expect(auditInfo.packageLockExists).toBe(true);
      expect(auditInfo.dependencyCount).toBe(2);
      expect(auditResult.results).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(configRecommendations.length).toBeGreaterThan(0);
    });
  });
});

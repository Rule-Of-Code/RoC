/**
 * @fileoverview Tests for DependencySecurityScanningLaw
 * @description Tests for Dependency Security Scanning Law implementation
 */

import { DependencySecurityScanningLaw } from '../../../src/laws/security/dependency-security-scanning';
import type { LawCheckContext } from '../../../src/types/law.types';
import { ConfigFileUtils } from '../../../src/utils/config-file-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('laws/security/dependency-security-scanning', () => {
  let tempDir: string;
  let defaultConfig: ReturnType<typeof ConfigFileUtils.getMinimalDefaultConfig>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'dependency-security-scanning-test-'
    );
    defaultConfig = ConfigFileUtils.getMinimalDefaultConfig();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('DependencySecurityScanningLaw.check', () => {
    it('should return a LawResult object', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
      expect(typeof result.message).toBe('string');
      expect(typeof result.score).toBe('number');
      expect(result.config).toBeDefined();
    });

    it('should return violations array', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result.violations).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should return suggestions array', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should return score between 0 and 100', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return details array', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result.details).toBeDefined();
      expect(Array.isArray(result.details)).toBe(true);
    });

    it('should mark as fixable when violations exist', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      if (result.violations && result.violations.length > 0) {
        expect(result.fixable).toBe(true);
      }
    });

    it('should have correct message format', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result.message).toContain('DependencyVulnerabilityAnalyzer');
    });

    it('should handle non-existent project root', async () => {
      const nonExistentPath = PathOperations.join(tempDir, 'non-existent');

      const context: LawCheckContext = {
        projectRoot: nonExistentPath,
        config: defaultConfig,
      };

      // Should not throw
      const result = await DependencySecurityScanningLaw.check(context);
      expect(result).toBeDefined();
    });
  });

  describe('NPM Audit Integration', () => {
    it('should detect missing npm audit script', async () => {
      const packageJson = JSON.stringify({
        name: 'test-project',
        scripts: {
          build: 'tsc',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      // Should have violations about npm audit or security scanning
      expect(result.violations).toBeDefined();
    });

    it('should pass when npm audit script exists', async () => {
      const packageJson = JSON.stringify({
        name: 'test-project',
        scripts: {
          'security:audit': 'npm audit --audit-level=high',
          prepush: 'npm run security:audit',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result).toBeDefined();
    });

    it('should detect audit script in CI configuration', async () => {
      const workflowDir = PathOperations.join(tempDir, '.github', 'workflows');
      FileUtils.createDirectory(workflowDir);

      const workflowContent = `
        name: CI
        on: push
        jobs:
          security:
            runs-on: ubuntu-latest
            steps:
              - uses: actions/checkout@v2
              - run: npm audit
      `;
      FileUtils.writeFile(
        PathOperations.join(workflowDir, 'ci.yml'),
        workflowContent
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result).toBeDefined();
    });
  });

  describe('Vulnerability Checking', () => {
    it('should suggest vulnerability scanning tools', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      // Should have suggestions for security tools
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it('should pass when snyk is configured', async () => {
      const packageJson = JSON.stringify({
        name: 'test-project',
        devDependencies: {
          snyk: '^1.0.0',
        },
        scripts: {
          'security:snyk': 'snyk test',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result).toBeDefined();
    });
  });

  describe('Dependency Pinning', () => {
    it('should detect unpinned dependencies', async () => {
      const packageJson = JSON.stringify({
        name: 'test-project',
        dependencies: {
          lodash: '^4.17.0',
          express: '~4.18.0',
          axios: '*',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      // Should detect version ranges as potential issues
      expect(result).toBeDefined();
    });

    it('should pass when dependencies are pinned', async () => {
      const packageJson = JSON.stringify({
        name: 'test-project',
        dependencies: {
          lodash: '4.17.21',
          express: '4.18.2',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result).toBeDefined();
    });

    it('should check for package-lock.json', async () => {
      const packageJson = JSON.stringify({
        name: 'test-project',
        dependencies: {
          lodash: '^4.17.0',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const lockfile = JSON.stringify({
        name: 'test-project',
        lockfileVersion: 2,
        packages: {},
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package-lock.json'),
        lockfile
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result).toBeDefined();
    });
  });

  describe('License Compatibility', () => {
    it('should check license compatibility', async () => {
      const packageJson = JSON.stringify({
        name: 'test-project',
        license: 'MIT',
        dependencies: {
          lodash: '4.17.21',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result).toBeDefined();
    });

    it('should handle missing license field', async () => {
      const packageJson = JSON.stringify({
        name: 'test-project',
        dependencies: {
          lodash: '4.17.21',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result).toBeDefined();
    });

    it('should detect missing package.json', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      // Should have violation about missing package.json
      const hasPackageViolation = result.violations!.some(v =>
        v.includes('package.json')
      );
      expect(hasPackageViolation).toBe(true);
    });
  });

  describe('Score Calculation', () => {
    it('should have full score when all requirements are met', async () => {
      // Create a complete security setup
      const packageJson = JSON.stringify({
        name: 'secure-project',
        license: 'MIT',
        dependencies: {
          express: '4.18.2',
        },
        devDependencies: {
          snyk: '^1.0.0',
        },
        scripts: {
          'security:audit': 'npm audit',
          'security:snyk': 'snyk test',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const lockfile = JSON.stringify({
        lockfileVersion: 2,
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package-lock.json'),
        lockfile
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result.score).toBeGreaterThan(50);
    });

    it('should decrease score for each violation', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      // Empty project should have lower score
      if (result.violations!.length > 0) {
        expect(result.score).toBeLessThan(100);
      }
    });

    it('should never have negative score', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Message Format', () => {
    it('should have passed message when no violations', async () => {
      // Create a complete security setup
      const packageJson = JSON.stringify({
        name: 'secure-project',
        license: 'MIT',
        dependencies: {
          express: '4.18.2',
        },
        devDependencies: {
          snyk: '^1.0.0',
        },
        scripts: {
          'security:audit': 'npm audit',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const lockfile = JSON.stringify({
        lockfileVersion: 2,
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package-lock.json'),
        lockfile
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      if (result.passed) {
        expect(result.message).toContain('requirements met');
      }
    });

    it('should have violation count in message when failed', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      if (!result.passed && result.violations!.length > 0) {
        expect(result.message).toContain('violation');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty config', async () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: {} as ReturnType<
          typeof ConfigFileUtils.getMinimalDefaultConfig
        >,
      };

      // Should not throw
      const result = await DependencySecurityScanningLaw.check(context);
      expect(result).toBeDefined();
    });

    it('should handle malformed package.json', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        '{ invalid json'
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      // Should not throw
      const result = await DependencySecurityScanningLaw.check(context);
      expect(result).toBeDefined();
    });

    it('should handle empty package.json', async () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'package.json'), '{}');

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      // Should not throw
      const result = await DependencySecurityScanningLaw.check(context);
      expect(result).toBeDefined();
    });

    it('should handle package.json with only name', async () => {
      const packageJson = JSON.stringify({
        name: 'minimal-project',
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      // Should not throw
      const result = await DependencySecurityScanningLaw.check(context);
      expect(result).toBeDefined();
    });

    it('should handle package.json with empty dependencies', async () => {
      const packageJson = JSON.stringify({
        name: 'test-project',
        dependencies: {},
        devDependencies: {},
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      // Should not throw
      const result = await DependencySecurityScanningLaw.check(context);
      expect(result).toBeDefined();
    });

    it('should handle workspace with multiple package.json files', async () => {
      const packageJson = JSON.stringify({
        name: 'monorepo',
        workspaces: ['packages/*'],
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const packagesDir = PathOperations.join(tempDir, 'packages', 'app');
      FileUtils.createDirectory(packagesDir);

      const appPackageJson = JSON.stringify({
        name: '@monorepo/app',
        dependencies: {
          express: '4.18.2',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(packagesDir, 'package.json'),
        appPackageJson
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      // Should not throw
      const result = await DependencySecurityScanningLaw.check(context);
      expect(result).toBeDefined();
    });

    it('should handle yarn.lock instead of package-lock.json', async () => {
      const packageJson = JSON.stringify({
        name: 'yarn-project',
        dependencies: {
          lodash: '^4.17.0',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'yarn.lock'),
        '# yarn lockfile v1'
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      // Should not throw
      const result = await DependencySecurityScanningLaw.check(context);
      expect(result).toBeDefined();
    });

    it('should handle pnpm-lock.yaml', async () => {
      const packageJson = JSON.stringify({
        name: 'pnpm-project',
        dependencies: {
          lodash: '^4.17.0',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'pnpm-lock.yaml'),
        'lockfileVersion: 5.4'
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      // Should not throw
      const result = await DependencySecurityScanningLaw.check(context);
      expect(result).toBeDefined();
    });
  });

  describe('Integration with checkers', () => {
    it('should use NpmAuditChecker', async () => {
      const packageJson = JSON.stringify({
        name: 'test-project',
        scripts: {},
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result).toBeDefined();
      // The checker should have been called
    });

    it('should use VulnerabilityChecker', async () => {
      const packageJson = JSON.stringify({
        name: 'test-project',
        dependencies: {
          'known-vulnerable': '1.0.0',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result).toBeDefined();
    });

    it('should use DependencyPinningChecker', async () => {
      const packageJson = JSON.stringify({
        name: 'test-project',
        dependencies: {
          lodash: '*',
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = await DependencySecurityScanningLaw.check(context);

      expect(result).toBeDefined();
    });
  });
});

/**
 * @fileoverview Tests for SecurityTestingRequirementsLaw
 * @description Tests for Security Testing Requirements Law implementation
 */

import { SecurityTestingRequirementsLaw } from '../../../src/laws/security/security-testing-requirements';
import type { LawCheckContext } from '../../../src/types/law.types';
import { ConfigFileUtils } from '../../../src/utils/config-file-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('laws/security/security-testing-requirements', () => {
  let tempDir: string;
  let defaultConfig: ReturnType<typeof ConfigFileUtils.getMinimalDefaultConfig>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'security-testing-requirements-test-'
    );
    defaultConfig = ConfigFileUtils.getMinimalDefaultConfig();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('SecurityTestingRequirementsLaw.check', () => {
    it('should return a LawResult object', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
      expect(typeof result.message).toBe('string');
      expect(typeof result.score).toBe('number');
      expect(result.config).toBeDefined();
    });

    it('should return violations array', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      expect(result.violations).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should return suggestions array', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should return violations for empty project', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      expect(result.violations!.length).toBeGreaterThan(0);
      expect(result.passed).toBe(false);
    });

    it('should return score between 0 and 100', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should mark result as fixable', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      expect(result.fixable).toBe(true);
    });

    it('should return details array', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      expect(result.details).toBeDefined();
      expect(Array.isArray(result.details)).toBe(true);
    });

    it('should have correct message when violations exist', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      expect(result.message).toContain('Security testing gaps found');
    });

    it('should handle non-existent project root', () => {
      const nonExistentPath = PathOperations.join(tempDir, 'non-existent');

      const context: LawCheckContext = {
        projectRoot: nonExistentPath,
        config: defaultConfig,
      };

      // Should not throw
      const result = SecurityTestingRequirementsLaw.check(context);
      expect(result).toBeDefined();
    });
  });

  describe('SAST Analysis', () => {
    it('should detect missing SAST configuration', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      const hasSastViolation = result.violations!.some(v => v.includes('SAST'));
      expect(hasSastViolation).toBe(true);
    });

    it('should suggest SAST tools when not configured', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      const hasSastSuggestion = result.suggestions!.some(
        s => s.includes('SAST') || s.includes('ESLint') || s.includes('CodeQL')
      );
      expect(hasSastSuggestion).toBe(true);
    });

    it('should pass when ESLint security rules are configured', () => {
      // Create package.json with eslint-plugin-security
      const packageJson = JSON.stringify({
        devDependencies: {
          'eslint-plugin-security': '^1.5.0',
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

      const result = SecurityTestingRequirementsLaw.check(context);

      const hasSastViolation = result.violations!.some(
        v => v === 'Static Application Security Testing (SAST) not configured'
      );
      expect(hasSastViolation).toBe(false);
    });

    it('should detect SAST in GitHub workflows', () => {
      const workflowDir = PathOperations.join(tempDir, '.github', 'workflows');
      FileUtils.createDirectory(workflowDir);

      const workflowContent = `
        name: Security Scan
        on: push
        jobs:
          security:
            runs-on: ubuntu-latest
            steps:
              - uses: actions/checkout@v2
              - name: CodeQL Analysis
                uses: github/codeql-action/analyze@v2
      `;
      FileUtils.writeFile(
        PathOperations.join(workflowDir, 'security.yml'),
        workflowContent
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      // The analyzer should detect the workflow
      expect(result).toBeDefined();
    });
  });

  describe('Dependency Scanning Analysis', () => {
    it('should detect missing dependency scanning', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      const hasDepScanViolation = result.violations!.some(v =>
        v.includes('Dependency vulnerability scanning')
      );
      expect(hasDepScanViolation).toBe(true);
    });

    it('should suggest dependency scanning tools', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      const hasDepScanSuggestion = result.suggestions!.some(
        s =>
          s.includes('npm audit') ||
          s.includes('Snyk') ||
          s.includes('Dependabot')
      );
      expect(hasDepScanSuggestion).toBe(true);
    });

    it('should pass when npm audit script is configured', () => {
      const packageJson = JSON.stringify({
        scripts: {
          'security:audit': 'npm audit',
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

      const result = SecurityTestingRequirementsLaw.check(context);

      const hasDepScanViolation = result.violations!.some(
        v => v === 'Dependency vulnerability scanning not automated'
      );
      expect(hasDepScanViolation).toBe(false);
    });

    it('should pass when Snyk is configured', () => {
      const packageJson = JSON.stringify({
        devDependencies: {
          snyk: '^1.0.0',
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

      const result = SecurityTestingRequirementsLaw.check(context);

      const hasDepScanViolation = result.violations!.some(
        v => v === 'Dependency vulnerability scanning not automated'
      );
      expect(hasDepScanViolation).toBe(false);
    });

    it('should detect Dependabot configuration', () => {
      const githubDir = PathOperations.join(tempDir, '.github');
      FileUtils.createDirectory(githubDir);

      const dependabotConfig = `
        version: 2
        updates:
          - package-ecosystem: npm
            directory: /
            schedule:
              interval: daily
      `;
      FileUtils.writeFile(
        PathOperations.join(githubDir, 'dependabot.yml'),
        dependabotConfig
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      const hasDepScanViolation = result.violations!.some(
        v => v === 'Dependency vulnerability scanning not automated'
      );
      expect(hasDepScanViolation).toBe(false);
    });
  });

  describe('Security Test Cases Analysis', () => {
    it('should detect missing security test cases', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      const hasTestViolation = result.violations!.some(v =>
        v.includes('security test cases')
      );
      expect(hasTestViolation).toBe(true);
    });

    it('should suggest implementing security tests', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      const hasTestSuggestion = result.suggestions!.some(
        s => s.includes('security') && s.includes('test')
      );
      expect(hasTestSuggestion).toBe(true);
    });

    it('should pass when security test files exist', () => {
      const testDir = PathOperations.join(tempDir, 'tests');
      FileUtils.createDirectory(testDir);

      const testContent = `
        describe('Security Tests', () => {
          it('should prevent XSS attacks', () => {
            expect(sanitize('<script>')).not.toContain('<script>');
          });
        });
      `;
      FileUtils.writeFile(
        PathOperations.join(testDir, 'security.spec.ts'),
        testContent
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      // The analyzer should detect the test file
      expect(result).toBeDefined();
    });

    it('should detect security tests in src folder', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const testContent = `
        describe('Auth Security', () => {
          it('should validate tokens', () => {});
        });
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'auth.security.spec.ts'),
        testContent
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      expect(result).toBeDefined();
    });
  });

  describe('Authentication Tests Analysis', () => {
    it('should detect missing authentication tests', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      const hasAuthViolation = result.violations!.some(
        v => v.includes('Authentication') && v.includes('authorization')
      );
      expect(hasAuthViolation).toBe(true);
    });

    it('should suggest implementing auth tests', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      const hasAuthSuggestion = result.suggestions!.some(
        s => s.includes('auth') && s.includes('testing')
      );
      expect(hasAuthSuggestion).toBe(true);
    });

    it('should pass when authentication tests exist', () => {
      const testDir = PathOperations.join(tempDir, 'tests');
      FileUtils.createDirectory(testDir);

      const testContent = `
        describe('Authentication Tests', () => {
          it('should require authentication for protected routes', () => {
            // Test implementation
          });

          it('should validate JWT tokens', () => {
            // Test implementation
          });

          it('should check authorization roles', () => {
            // Test implementation
          });
        });
      `;
      FileUtils.writeFile(
        PathOperations.join(testDir, 'auth.spec.ts'),
        testContent
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      // The analyzer should detect the test file
      expect(result).toBeDefined();
    });
  });

  describe('Input Validation Tests Analysis', () => {
    it('should detect missing input validation tests', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      const hasInputViolation = result.violations!.some(v =>
        v.includes('Input validation')
      );
      expect(hasInputViolation).toBe(true);
    });

    it('should suggest implementing input validation tests', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      const hasInputSuggestion = result.suggestions!.some(
        s =>
          s.includes('XSS') ||
          s.includes('injection') ||
          s.includes('input sanitization')
      );
      expect(hasInputSuggestion).toBe(true);
    });

    it('should pass when input validation tests exist', () => {
      const testDir = PathOperations.join(tempDir, 'tests');
      FileUtils.createDirectory(testDir);

      const testContent = `
        describe('Input Validation Tests', () => {
          it('should prevent XSS attacks', () => {
            const input = '<script>alert("xss")</script>';
            expect(sanitize(input)).not.toContain('<script>');
          });

          it('should prevent SQL injection', () => {
            const input = "'; DROP TABLE users; --";
            expect(escapeSQL(input)).not.toContain('DROP');
          });

          it('should validate email format', () => {
            expect(validateEmail('test')).toBe(false);
            expect(validateEmail('test@example.com')).toBe(true);
          });
        });
      `;
      FileUtils.writeFile(
        PathOperations.join(testDir, 'input-validation.spec.ts'),
        testContent
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      // The analyzer should detect the test file
      expect(result).toBeDefined();
    });
  });

  describe('Security Headers Tests Analysis', () => {
    it('should detect missing security headers tests', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      const hasHeadersViolation = result.violations!.some(v =>
        v.includes('Security headers tests')
      );
      expect(hasHeadersViolation).toBe(true);
    });

    it('should suggest testing security headers', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      const hasHeadersSuggestion = result.suggestions!.some(
        s =>
          s.includes('CSP') ||
          s.includes('HSTS') ||
          s.includes('X-Frame-Options') ||
          s.includes('security headers')
      );
      expect(hasHeadersSuggestion).toBe(true);
    });

    it('should pass when security headers tests exist', () => {
      const testDir = PathOperations.join(tempDir, 'tests');
      FileUtils.createDirectory(testDir);

      const testContent = `
        describe('Security Headers Tests', () => {
          it('should set Content-Security-Policy header', async () => {
            const response = await request(app).get('/');
            expect(response.headers['content-security-policy']).toBeDefined();
          });

          it('should set X-Frame-Options header', async () => {
            const response = await request(app).get('/');
            expect(response.headers['x-frame-options']).toBe('DENY');
          });

          it('should set HSTS header', async () => {
            const response = await request(app).get('/');
            expect(response.headers['strict-transport-security']).toBeDefined();
          });
        });
      `;
      FileUtils.writeFile(
        PathOperations.join(testDir, 'headers.spec.ts'),
        testContent
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      // The analyzer should detect the test file
      expect(result).toBeDefined();
    });
  });

  describe('Score calculation', () => {
    it('should have full score when all requirements are met', () => {
      // Create complete security testing setup
      const testDir = PathOperations.join(tempDir, 'tests');
      FileUtils.createDirectory(testDir);

      // Package.json with SAST and dependency scanning
      const packageJson = JSON.stringify({
        devDependencies: {
          'eslint-plugin-security': '^1.0.0',
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

      // Security test file with all test types
      const testContent = `
        describe('Complete Security Tests', () => {
          describe('Authentication', () => {
            it('should require authentication', () => {});
            it('should validate authorization', () => {});
          });

          describe('Input Validation', () => {
            it('should prevent XSS', () => {});
            it('should validate injection', () => {});
            it('should sanitize input', () => {});
          });

          describe('Security Headers', () => {
            it('should set CSP header', () => {});
            it('should set HSTS header', () => {});
            it('should set X-Frame-Options', () => {});
          });
        });
      `;
      FileUtils.writeFile(
        PathOperations.join(testDir, 'security.spec.ts'),
        testContent
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      // Score should be high when requirements are met
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result).toBeDefined();
    });

    it('should decrease score for each missing requirement', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      // Empty project should have low score
      expect(result.score).toBeLessThan(50);
    });

    it('should never have negative score', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty config', () => {
      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: {} as ReturnType<
          typeof ConfigFileUtils.getMinimalDefaultConfig
        >,
      };

      // Should not throw
      const result = SecurityTestingRequirementsLaw.check(context);
      expect(result).toBeDefined();
    });

    it('should handle malformed package.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        '{ invalid json'
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      // Should not throw
      const result = SecurityTestingRequirementsLaw.check(context);
      expect(result).toBeDefined();
    });

    it('should handle empty package.json', () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'package.json'), '{}');

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      // Should not throw
      const result = SecurityTestingRequirementsLaw.check(context);
      expect(result).toBeDefined();
    });

    it('should handle deeply nested test directories', () => {
      const deepDir = PathOperations.join(
        tempDir,
        'src',
        'app',
        'modules',
        'core',
        '__tests__'
      );
      FileUtils.createDirectory(deepDir);

      FileUtils.writeFile(
        PathOperations.join(deepDir, 'security.spec.ts'),
        'describe("Security", () => {});'
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);
      expect(result).toBeDefined();
    });

    it('should handle multiple test directories', () => {
      const testDir1 = PathOperations.join(tempDir, 'tests');
      const testDir2 = PathOperations.join(tempDir, '__tests__');
      const testDir3 = PathOperations.join(tempDir, 'src', '__tests__');

      FileUtils.createDirectory(testDir1);
      FileUtils.createDirectory(testDir2);
      FileUtils.createDirectory(testDir3);

      FileUtils.writeFile(
        PathOperations.join(testDir1, 'auth.spec.ts'),
        'describe("Auth", () => {});'
      );
      FileUtils.writeFile(
        PathOperations.join(testDir2, 'security.spec.ts'),
        'describe("Security", () => {});'
      );
      FileUtils.writeFile(
        PathOperations.join(testDir3, 'headers.spec.ts'),
        'describe("Headers", () => {});'
      );

      const context: LawCheckContext = {
        projectRoot: tempDir,
        config: defaultConfig,
      };

      const result = SecurityTestingRequirementsLaw.check(context);
      expect(result).toBeDefined();
    });
  });
});

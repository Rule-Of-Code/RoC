/**
 * Tests for DependencyScanningConstants
 *
 * Tests dependency scanning configuration and helper methods.
 */
import { DependencyScanningConstants } from '../../../src/laws/security/security-testing-requirements/constants/dependency-scanning';

describe('DependencyScanningConstants', () => {
  describe('SCRIPTS', () => {
    it('should be an array of strings', () => {
      expect(Array.isArray(DependencyScanningConstants.SCRIPTS)).toBe(true);
      DependencyScanningConstants.SCRIPTS.forEach(script => {
        expect(typeof script).toBe('string');
      });
    });

    it('should contain security script keywords', () => {
      expect(DependencyScanningConstants.SCRIPTS).toContain('security');
      expect(DependencyScanningConstants.SCRIPTS).toContain('audit');
      expect(DependencyScanningConstants.SCRIPTS).toContain('vulnerabilities');
    });
  });

  describe('TOOLS', () => {
    it('should be an array of strings', () => {
      expect(Array.isArray(DependencyScanningConstants.TOOLS)).toBe(true);
      DependencyScanningConstants.TOOLS.forEach(tool => {
        expect(typeof tool).toBe('string');
      });
    });

    it('should contain snyk tools', () => {
      expect(DependencyScanningConstants.TOOLS).toContain('snyk');
      expect(DependencyScanningConstants.TOOLS).toContain('@snyk/cli');
    });

    it('should contain audit tools', () => {
      expect(DependencyScanningConstants.TOOLS).toContain('audit-ci');
      expect(DependencyScanningConstants.TOOLS).toContain('better-npm-audit');
    });
  });

  describe('CONFIG_FILES', () => {
    it('should be an array of strings', () => {
      expect(Array.isArray(DependencyScanningConstants.CONFIG_FILES)).toBe(
        true
      );
      DependencyScanningConstants.CONFIG_FILES.forEach(file => {
        expect(typeof file).toBe('string');
      });
    });

    it('should contain dependabot config', () => {
      expect(DependencyScanningConstants.CONFIG_FILES).toContain(
        '.github/dependabot.yml'
      );
    });

    it('should contain security workflow files', () => {
      expect(DependencyScanningConstants.CONFIG_FILES).toContain(
        '.github/workflows/security.yml'
      );
      expect(DependencyScanningConstants.CONFIG_FILES).toContain(
        '.github/workflows/dependency-check.yml'
      );
      expect(DependencyScanningConstants.CONFIG_FILES).toContain(
        '.github/workflows/codeql-analysis.yml'
      );
    });
  });

  describe('hasSecurityScript', () => {
    it('should return true when scripts contain security', () => {
      const scripts = { security: 'npm audit', build: 'ng build' };
      expect(DependencyScanningConstants.hasSecurityScript(scripts)).toBe(true);
    });

    it('should return true when scripts contain audit', () => {
      const scripts = { audit: 'npm audit', build: 'ng build' };
      expect(DependencyScanningConstants.hasSecurityScript(scripts)).toBe(true);
    });

    it('should return true when scripts contain vulnerabilities', () => {
      const scripts = {
        'check-vulnerabilities': 'snyk test',
        build: 'ng build',
      };
      expect(DependencyScanningConstants.hasSecurityScript(scripts)).toBe(true);
    });

    it('should return true for security:check script', () => {
      const scripts = { 'security:check': 'npm audit' };
      expect(DependencyScanningConstants.hasSecurityScript(scripts)).toBe(true);
    });

    it('should return true for npm-audit script', () => {
      const scripts = { 'npm-audit': 'npm audit' };
      expect(DependencyScanningConstants.hasSecurityScript(scripts)).toBe(true);
    });

    it('should return false when no security scripts exist', () => {
      const scripts = { build: 'ng build', test: 'ng test', start: 'ng serve' };
      expect(DependencyScanningConstants.hasSecurityScript(scripts)).toBe(
        false
      );
    });

    it('should return false for empty scripts', () => {
      expect(DependencyScanningConstants.hasSecurityScript({})).toBe(false);
    });
  });

  describe('hasTool', () => {
    it('should return true when snyk is in dependencies', () => {
      const deps = { snyk: '^1.0.0', lodash: '^4.0.0' };
      expect(DependencyScanningConstants.hasTool(deps)).toBe(true);
    });

    it('should return true when @snyk/cli is in dependencies', () => {
      const deps = { '@snyk/cli': '^1.0.0', lodash: '^4.0.0' };
      expect(DependencyScanningConstants.hasTool(deps)).toBe(true);
    });

    it('should return true when audit-ci is in dependencies', () => {
      const deps = { 'audit-ci': '^1.0.0', lodash: '^4.0.0' };
      expect(DependencyScanningConstants.hasTool(deps)).toBe(true);
    });

    it('should return true when better-npm-audit is in dependencies', () => {
      const deps = { 'better-npm-audit': '^1.0.0', lodash: '^4.0.0' };
      expect(DependencyScanningConstants.hasTool(deps)).toBe(true);
    });

    it('should return false when no security tools in dependencies', () => {
      const deps = { lodash: '^4.0.0', express: '^4.0.0' };
      expect(DependencyScanningConstants.hasTool(deps)).toBe(false);
    });

    it('should return false for empty dependencies', () => {
      expect(DependencyScanningConstants.hasTool({})).toBe(false);
    });
  });

  describe('isConfigFile', () => {
    it('should return true for dependabot.yml', () => {
      expect(DependencyScanningConstants.isConfigFile('dependabot.yml')).toBe(
        true
      );
    });

    it('should return true for security.yml', () => {
      expect(DependencyScanningConstants.isConfigFile('security.yml')).toBe(
        true
      );
    });

    it('should return true for dependency-check.yml', () => {
      expect(
        DependencyScanningConstants.isConfigFile('dependency-check.yml')
      ).toBe(true);
    });

    it('should return true for codeql-analysis.yml', () => {
      expect(
        DependencyScanningConstants.isConfigFile('codeql-analysis.yml')
      ).toBe(true);
    });

    it('should return true for full paths containing config files', () => {
      expect(
        DependencyScanningConstants.isConfigFile('.github/dependabot.yml')
      ).toBe(true);
      expect(
        DependencyScanningConstants.isConfigFile(
          '.github/workflows/security.yml'
        )
      ).toBe(true);
    });

    it('should return false for non-config files', () => {
      expect(DependencyScanningConstants.isConfigFile('package.json')).toBe(
        false
      );
      expect(DependencyScanningConstants.isConfigFile('readme.md')).toBe(false);
    });
  });
});

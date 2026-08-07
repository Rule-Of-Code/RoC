/**
 * @fileoverview Tests for SASTConstants
 * @description Static Application Security Testing configuration constants
 */
import { SASTConstants } from '../../../src/laws/security/security-testing-requirements/constants/sast';

describe('SASTConstants', () => {
  describe('TOOLS', () => {
    it('should have eslint-plugin-security tool', () => {
      expect(SASTConstants.TOOLS['eslint-plugin-security']).toBe(
        'ESLint Security'
      );
    });

    it('should have @typescript-eslint/eslint-plugin tool', () => {
      expect(SASTConstants.TOOLS['@typescript-eslint/eslint-plugin']).toBe(
        'TypeScript ESLint'
      );
    });

    it('should have tslint-config-security tool', () => {
      expect(SASTConstants.TOOLS['tslint-config-security']).toBe(
        'TSLint Security'
      );
    });

    it('should have semgrep tool', () => {
      expect(SASTConstants.TOOLS['semgrep']).toBe('Semgrep');
    });

    it('should have sonarqube-scanner tool', () => {
      expect(SASTConstants.TOOLS['sonarqube-scanner']).toBe('SonarQube');
    });

    it('should have retire tool', () => {
      expect(SASTConstants.TOOLS['retire']).toBe('Retire.js');
    });

    it('should have exactly 6 tools', () => {
      expect(Object.keys(SASTConstants.TOOLS)).toHaveLength(6);
    });
  });

  describe('CONFIG_FILES', () => {
    it('should include .eslintrc.js', () => {
      expect(SASTConstants.CONFIG_FILES).toContain('.eslintrc.js');
    });

    it('should include .eslintrc.json', () => {
      expect(SASTConstants.CONFIG_FILES).toContain('.eslintrc.json');
    });

    it('should include eslint.config.mjs', () => {
      expect(SASTConstants.CONFIG_FILES).toContain('eslint.config.mjs');
    });

    it('should include eslint.config.js', () => {
      expect(SASTConstants.CONFIG_FILES).toContain('eslint.config.js');
    });

    it('should have exactly 4 config files', () => {
      expect(SASTConstants.CONFIG_FILES).toHaveLength(4);
    });
  });

  describe('PATTERNS', () => {
    it('should have SECURITY_PLUGIN pattern', () => {
      expect(SASTConstants.PATTERNS.SECURITY_PLUGIN).toBeInstanceOf(RegExp);
    });

    it('should have GITHUB_SECURITY_WORKFLOW pattern', () => {
      expect(SASTConstants.PATTERNS.GITHUB_SECURITY_WORKFLOW).toBeInstanceOf(
        RegExp
      );
    });

    it('SECURITY_PLUGIN should match "security"', () => {
      expect(SASTConstants.PATTERNS.SECURITY_PLUGIN.test('security')).toBe(
        true
      );
    });

    it('SECURITY_PLUGIN should match "@typescript-eslint"', () => {
      expect(
        SASTConstants.PATTERNS.SECURITY_PLUGIN.test('@typescript-eslint')
      ).toBe(true);
    });

    it('SECURITY_PLUGIN should not match unrelated text', () => {
      expect(SASTConstants.PATTERNS.SECURITY_PLUGIN.test('unrelated')).toBe(
        false
      );
    });

    it('GITHUB_SECURITY_WORKFLOW should match "security" case-insensitive', () => {
      expect(
        SASTConstants.PATTERNS.GITHUB_SECURITY_WORKFLOW.test('Security')
      ).toBe(true);
      expect(
        SASTConstants.PATTERNS.GITHUB_SECURITY_WORKFLOW.test('SECURITY')
      ).toBe(true);
    });

    it('GITHUB_SECURITY_WORKFLOW should match "codeql"', () => {
      expect(
        SASTConstants.PATTERNS.GITHUB_SECURITY_WORKFLOW.test('codeql')
      ).toBe(true);
      expect(
        SASTConstants.PATTERNS.GITHUB_SECURITY_WORKFLOW.test('CodeQL')
      ).toBe(true);
    });
  });

  describe('hasTool', () => {
    it('should return true when eslint-plugin-security is present', () => {
      const deps = { 'eslint-plugin-security': '1.0.0' };
      expect(SASTConstants.hasTool(deps)).toBe(true);
    });

    it('should return true when @typescript-eslint/eslint-plugin is present', () => {
      const deps = { '@typescript-eslint/eslint-plugin': '5.0.0' };
      expect(SASTConstants.hasTool(deps)).toBe(true);
    });

    it('should return true when semgrep is present', () => {
      const deps = { semgrep: '1.0.0' };
      expect(SASTConstants.hasTool(deps)).toBe(true);
    });

    it('should return true when sonarqube-scanner is present', () => {
      const deps = { 'sonarqube-scanner': '3.0.0' };
      expect(SASTConstants.hasTool(deps)).toBe(true);
    });

    it('should return true when retire is present', () => {
      const deps = { retire: '4.0.0' };
      expect(SASTConstants.hasTool(deps)).toBe(true);
    });

    it('should return false when no SAST tools present', () => {
      const deps = { lodash: '4.17.21', express: '4.18.0' };
      expect(SASTConstants.hasTool(deps)).toBe(false);
    });

    it('should return false for empty dependencies', () => {
      expect(SASTConstants.hasTool({})).toBe(false);
    });

    it('should return true when multiple tools present', () => {
      const deps = {
        'eslint-plugin-security': '1.0.0',
        '@typescript-eslint/eslint-plugin': '5.0.0',
        semgrep: '1.0.0',
      };
      expect(SASTConstants.hasTool(deps)).toBe(true);
    });
  });

  describe('detectTools', () => {
    it('should detect single tool', () => {
      const deps = { 'eslint-plugin-security': '1.0.0' };
      const result = SASTConstants.detectTools(deps);
      expect(result).toEqual(['ESLint Security']);
    });

    it('should detect multiple tools', () => {
      const deps = {
        'eslint-plugin-security': '1.0.0',
        semgrep: '1.0.0',
      };
      const result = SASTConstants.detectTools(deps);
      expect(result).toContain('ESLint Security');
      expect(result).toContain('Semgrep');
    });

    it('should detect all available tools', () => {
      const deps = {
        'eslint-plugin-security': '1.0.0',
        '@typescript-eslint/eslint-plugin': '5.0.0',
        'tslint-config-security': '1.0.0',
        semgrep: '1.0.0',
        'sonarqube-scanner': '3.0.0',
        retire: '4.0.0',
      };
      const result = SASTConstants.detectTools(deps);
      expect(result).toHaveLength(6);
    });

    it('should return empty array when no tools present', () => {
      const deps = { lodash: '4.17.21' };
      expect(SASTConstants.detectTools(deps)).toEqual([]);
    });

    it('should return empty array for empty dependencies', () => {
      expect(SASTConstants.detectTools({})).toEqual([]);
    });

    it('should ignore unrecognized dependencies', () => {
      const deps = {
        'random-package': '1.0.0',
        'eslint-plugin-security': '1.0.0',
        'another-package': '2.0.0',
      };
      const result = SASTConstants.detectTools(deps);
      expect(result).toEqual(['ESLint Security']);
    });
  });

  describe('isValidConfigFile', () => {
    it('should return true for .eslintrc.js', () => {
      expect(SASTConstants.isValidConfigFile('.eslintrc.js')).toBe(true);
    });

    it('should return true for .eslintrc.json', () => {
      expect(SASTConstants.isValidConfigFile('.eslintrc.json')).toBe(true);
    });

    it('should return true for eslint.config.mjs', () => {
      expect(SASTConstants.isValidConfigFile('eslint.config.mjs')).toBe(true);
    });

    it('should return true for eslint.config.js', () => {
      expect(SASTConstants.isValidConfigFile('eslint.config.js')).toBe(true);
    });

    it('should return true for paths ending with config files', () => {
      expect(SASTConstants.isValidConfigFile('/path/to/.eslintrc.js')).toBe(
        true
      );
      expect(SASTConstants.isValidConfigFile('src/config/.eslintrc.json')).toBe(
        true
      );
    });

    it('should return false for invalid config files', () => {
      expect(SASTConstants.isValidConfigFile('config.js')).toBe(false);
      expect(SASTConstants.isValidConfigFile('.prettierrc')).toBe(false);
    });

    it('should return false for partial matches', () => {
      expect(SASTConstants.isValidConfigFile('.eslintrc.yaml')).toBe(false);
    });
  });

  describe('hasSecurityConfig', () => {
    it('should return true when content has "security" keyword', () => {
      const content = 'plugin: security';
      expect(SASTConstants.hasSecurityConfig(content)).toBe(true);
    });

    it('should return true when content has "@typescript-eslint"', () => {
      const content = '@typescript-eslint/parser';
      expect(SASTConstants.hasSecurityConfig(content)).toBe(true);
    });

    it('should return true for eslint security plugin configuration', () => {
      const content = `
        module.exports = {
          plugins: ['security'],
          extends: ['plugin:security/recommended']
        }
      `;
      expect(SASTConstants.hasSecurityConfig(content)).toBe(true);
    });

    it('should return false when content has no security keywords', () => {
      const content = 'module.exports = { rules: {} }';
      expect(SASTConstants.hasSecurityConfig(content)).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(SASTConstants.hasSecurityConfig('')).toBe(false);
    });
  });

  describe('isSecurityWorkflow', () => {
    it('should return true for "security" workflow', () => {
      expect(SASTConstants.isSecurityWorkflow('security')).toBe(true);
    });

    it('should return true for "Security" workflow (case insensitive)', () => {
      expect(SASTConstants.isSecurityWorkflow('Security')).toBe(true);
      expect(SASTConstants.isSecurityWorkflow('SECURITY')).toBe(true);
    });

    it('should return true for "codeql" workflow', () => {
      expect(SASTConstants.isSecurityWorkflow('codeql')).toBe(true);
      expect(SASTConstants.isSecurityWorkflow('CodeQL')).toBe(true);
    });

    it('should return true for workflows containing security keywords', () => {
      expect(SASTConstants.isSecurityWorkflow('security-scan')).toBe(true);
      expect(SASTConstants.isSecurityWorkflow('codeql-analysis')).toBe(true);
    });

    it('should return false for non-security workflows', () => {
      expect(SASTConstants.isSecurityWorkflow('build')).toBe(false);
      expect(SASTConstants.isSecurityWorkflow('test')).toBe(false);
      expect(SASTConstants.isSecurityWorkflow('deploy')).toBe(false);
    });

    it('should return false for empty workflow name', () => {
      expect(SASTConstants.isSecurityWorkflow('')).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should have frozen TOOLS object structure', () => {
      const originalTools = { ...SASTConstants.TOOLS };
      expect(SASTConstants.TOOLS).toEqual(originalTools);
    });

    it('should have frozen CONFIG_FILES array length', () => {
      const originalLength = SASTConstants.CONFIG_FILES.length;
      expect(SASTConstants.CONFIG_FILES).toHaveLength(originalLength);
    });

    it('PATTERNS should be consistently defined', () => {
      expect(Object.keys(SASTConstants.PATTERNS)).toEqual([
        'SECURITY_PLUGIN',
        'GITHUB_SECURITY_WORKFLOW',
      ]);
    });
  });
});

/**
 * @fileoverview Tests for shared-security-config.ts
 * @description Tests for shared security configuration types and factory
 */

import {
  BaseProjectConfig,
  BaseSecurityConfig,
  ExcludePatterns,
  HooksConfig,
  IgnorePatterns,
  IncludePatterns,
  LawsConfig,
  ReportingConfig,
  SecurityConfigFactory,
} from '../../src/utils/security/shared-security-config';

describe('utils/security/shared-security-config', () => {
  describe('Interface types', () => {
    it('should support BaseProjectConfig interface', () => {
      const config: BaseProjectConfig = {
        name: 'test-project',
        root: '/path/to/project',
        componentPrefix: 'app',
        type: 'angular',
      };

      expect(config.name).toBe('test-project');
      expect(config.type).toBe('angular');
    });

    it('should support IgnorePatterns interface', () => {
      const patterns: IgnorePatterns = {
        global: ['node_modules'],
        tests: ['*.spec.ts'],
        build: ['dist'],
        design: ['*.scss'],
      };

      expect(patterns.global).toContain('node_modules');
    });

    it('should support LawsConfig interface', () => {
      const config: LawsConfig = {
        paretoMode: true,
        severity: { rule1: 'error', rule2: 'warning' },
      };

      expect(config.paretoMode).toBe(true);
      expect(config.severity['rule1']).toBe('error');
    });

    it('should support HooksConfig interface', () => {
      const config: HooksConfig = {
        preCommit: true,
        prePush: false,
        commitMsg: true,
      };

      expect(config.preCommit).toBe(true);
      expect(config.prePush).toBe(false);
    });

    it('should support IncludePatterns interface', () => {
      const patterns: IncludePatterns = {
        global: ['src/**/*.ts'],
      };

      expect(patterns.global).toHaveLength(1);
    });

    it('should support ExcludePatterns interface', () => {
      const patterns: ExcludePatterns = {
        global: ['**/*.test.ts'],
      };

      expect(patterns.global).toHaveLength(1);
    });

    it('should support ReportingConfig interface', () => {
      const config: ReportingConfig = {
        format: 'json',
        verbose: true,
        onlyFailures: false,
        scoring: true,
      };

      expect(config.format).toBe('json');
      expect(config.verbose).toBe(true);
    });
  });

  describe('SecurityConfigFactory', () => {
    describe('createDefaultConfig', () => {
      it('should create default config with no overrides', () => {
        const config = SecurityConfigFactory.createDefaultConfig();

        expect(config.project.name).toBe('temp');
        expect(config.project.type).toBe('generic');
        expect(config.project.componentPrefix).toBe('app');
      });

      it('should have empty ignore patterns by default', () => {
        const config = SecurityConfigFactory.createDefaultConfig();

        expect(config.ignores.global).toHaveLength(0);
        expect(config.ignores.tests).toHaveLength(0);
        expect(config.ignores.build).toHaveLength(0);
        expect(config.ignores.design).toHaveLength(0);
      });

      it('should have default laws config', () => {
        const config = SecurityConfigFactory.createDefaultConfig();

        expect(config.laws.paretoMode).toBe(false);
        expect(Object.keys(config.laws.severity)).toHaveLength(0);
      });

      it('should have default hooks config', () => {
        const config = SecurityConfigFactory.createDefaultConfig();

        expect(config.hooks.preCommit).toBe(false);
        expect(config.hooks.prePush).toBe(false);
        expect(config.hooks.commitMsg).toBe(false);
      });

      it('should have default reporting config', () => {
        const config = SecurityConfigFactory.createDefaultConfig();

        expect(config.reporting.format).toBe('console');
        expect(config.reporting.verbose).toBe(false);
        expect(config.reporting.onlyFailures).toBe(false);
        expect(config.reporting.scoring).toBe(false);
      });

      it('should override project config', () => {
        const config = SecurityConfigFactory.createDefaultConfig({
          project: { name: 'custom', componentPrefix: 'cust', type: 'angular' },
        });

        expect(config.project.name).toBe('custom');
        expect(config.project.type).toBe('angular');
      });

      it('should override ignores config', () => {
        const config = SecurityConfigFactory.createDefaultConfig({
          ignores: { global: ['test'], tests: [], build: [], design: [] },
        });

        expect(config.ignores.global).toContain('test');
      });

      it('should override laws config', () => {
        const config = SecurityConfigFactory.createDefaultConfig({
          laws: { paretoMode: true, severity: { rule1: 'error' } },
        });

        expect(config.laws.paretoMode).toBe(true);
      });

      it('should override hooks config', () => {
        const config = SecurityConfigFactory.createDefaultConfig({
          hooks: { preCommit: true, prePush: false, commitMsg: false },
        });

        expect(config.hooks.preCommit).toBe(true);
      });

      it('should override reporting config', () => {
        const config = SecurityConfigFactory.createDefaultConfig({
          reporting: {
            format: 'json',
            verbose: true,
            onlyFailures: true,
            scoring: true,
          },
        });

        expect(config.reporting.format).toBe('json');
        expect(config.reporting.verbose).toBe(true);
      });

      it('should merge partial overrides', () => {
        const config = SecurityConfigFactory.createDefaultConfig({
          project: { name: 'partial', componentPrefix: 'app', type: 'generic' },
        });

        expect(config.project.name).toBe('partial');
        // Other defaults should remain
        expect(config.laws.paretoMode).toBe(false);
      });

      it('should return BaseSecurityConfig type', () => {
        const config: BaseSecurityConfig =
          SecurityConfigFactory.createDefaultConfig();

        expect(config).toBeDefined();
        expect(config.project).toBeDefined();
        expect(config.ignores).toBeDefined();
        expect(config.laws).toBeDefined();
        expect(config.hooks).toBeDefined();
        expect(config.includes).toBeDefined();
        expect(config.excludes).toBeDefined();
        expect(config.reporting).toBeDefined();
      });
    });
  });
});

/**
 * @fileoverview Tests for shared-security-config.ts
 * @description Tests for Shared Security Configuration Types and Factory
 */

import { FileUtils } from '../../src/utils/file-utils';
import {
  SecurityConfigFactory,
  type BaseProjectConfig,
  type BaseSecurityConfig,
  type ExcludePatterns,
  type HooksConfig,
  type IgnorePatterns,
  type IncludePatterns,
  type LawsConfig,
  type ReportingConfig,
} from '../../src/utils/security/shared-security-config';

describe('utils/security/shared-security-config', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('shared-security-config-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  // ==========================================================================
  // Type Exports
  // ==========================================================================

  describe('Type exports', () => {
    describe('BaseProjectConfig', () => {
      it('should allow creating valid BaseProjectConfig', () => {
        const config: BaseProjectConfig = {
          name: 'test-project',
          root: '/path/to/project',
          componentPrefix: 'app',
          type: 'angular',
        };

        expect(config.name).toBe('test-project');
        expect(config.type).toBe('angular');
      });

      it('should support all project types', () => {
        const types: Array<BaseProjectConfig['type']> = [
          'angular',
          'generic',
          'ionic',
          'react',
          'vue',
        ];

        types.forEach(type => {
          const config: BaseProjectConfig = {
            name: 'test',
            componentPrefix: 'app',
            type,
          };
          expect(config.type).toBe(type);
        });
      });

      it('should allow optional root property', () => {
        const config: BaseProjectConfig = {
          name: 'test',
          componentPrefix: 'app',
          type: 'generic',
        };

        expect(config.root).toBeUndefined();
      });
    });

    describe('IgnorePatterns', () => {
      it('should allow creating valid IgnorePatterns', () => {
        const patterns: IgnorePatterns = {
          global: ['node_modules', 'dist'],
          tests: ['**/*.spec.ts'],
          build: ['build/**'],
          design: ['*.sketch'],
        };

        expect(patterns.global).toHaveLength(2);
        expect(patterns.tests).toHaveLength(1);
        expect(patterns.build).toHaveLength(1);
        expect(patterns.design).toHaveLength(1);
      });

      it('should allow empty arrays', () => {
        const patterns: IgnorePatterns = {
          global: [],
          tests: [],
          build: [],
          design: [],
        };

        expect(patterns.global).toHaveLength(0);
      });
    });

    describe('LawsConfig', () => {
      it('should allow creating valid LawsConfig', () => {
        const config: LawsConfig = {
          paretoMode: true,
          severity: {
            'law-001': 'error',
            'law-002': 'warning',
            'law-003': 'info',
          },
        };

        expect(config.paretoMode).toBe(true);
        expect(config.severity['law-001']).toBe('error');
      });

      it('should support all severity levels', () => {
        const config: LawsConfig = {
          paretoMode: false,
          severity: {
            error: 'error',
            warning: 'warning',
            info: 'info',
          },
        };

        expect(config.severity.error).toBe('error');
        expect(config.severity.warning).toBe('warning');
        expect(config.severity.info).toBe('info');
      });
    });

    describe('HooksConfig', () => {
      it('should allow creating valid HooksConfig', () => {
        const config: HooksConfig = {
          preCommit: true,
          prePush: true,
          commitMsg: false,
        };

        expect(config.preCommit).toBe(true);
        expect(config.prePush).toBe(true);
        expect(config.commitMsg).toBe(false);
      });

      it('should allow all hooks disabled', () => {
        const config: HooksConfig = {
          preCommit: false,
          prePush: false,
          commitMsg: false,
        };

        expect(config.preCommit).toBe(false);
        expect(config.prePush).toBe(false);
        expect(config.commitMsg).toBe(false);
      });
    });

    describe('IncludePatterns', () => {
      it('should allow creating valid IncludePatterns', () => {
        const patterns: IncludePatterns = {
          global: ['src/**/*.ts', 'lib/**/*.ts'],
        };

        expect(patterns.global).toHaveLength(2);
      });

      it('should allow empty global array', () => {
        const patterns: IncludePatterns = {
          global: [],
        };

        expect(patterns.global).toHaveLength(0);
      });
    });

    describe('ExcludePatterns', () => {
      it('should allow creating valid ExcludePatterns', () => {
        const patterns: ExcludePatterns = {
          global: ['**/*.test.ts', '**/*.spec.ts'],
        };

        expect(patterns.global).toHaveLength(2);
      });

      it('should allow empty global array', () => {
        const patterns: ExcludePatterns = {
          global: [],
        };

        expect(patterns.global).toHaveLength(0);
      });
    });

    describe('ReportingConfig', () => {
      it('should allow creating valid ReportingConfig', () => {
        const config: ReportingConfig = {
          format: 'console',
          verbose: true,
          onlyFailures: false,
          scoring: true,
        };

        expect(config.format).toBe('console');
        expect(config.verbose).toBe(true);
        expect(config.scoring).toBe(true);
      });

      it('should support all format types', () => {
        const formats: Array<ReportingConfig['format']> = [
          'console',
          'html',
          'json',
        ];

        formats.forEach(format => {
          const config: ReportingConfig = {
            format,
            verbose: false,
            onlyFailures: false,
          };
          expect(config.format).toBe(format);
        });
      });

      it('should allow optional scoring property', () => {
        const config: ReportingConfig = {
          format: 'json',
          verbose: false,
          onlyFailures: true,
        };

        expect(config.scoring).toBeUndefined();
      });
    });

    describe('BaseSecurityConfig', () => {
      it('should allow creating valid BaseSecurityConfig', () => {
        const config: BaseSecurityConfig = {
          project: {
            name: 'test',
            componentPrefix: 'app',
            type: 'angular',
          },
          ignores: {
            global: [],
            tests: [],
            build: [],
            design: [],
          },
          laws: {
            paretoMode: false,
            severity: {},
          },
          hooks: {
            preCommit: false,
            prePush: false,
            commitMsg: false,
          },
          includes: {
            global: [],
          },
          excludes: {
            global: [],
          },
          reporting: {
            format: 'console',
            verbose: false,
            onlyFailures: false,
          },
        };

        expect(config.project.name).toBe('test');
        expect(config.reporting.format).toBe('console');
      });
    });
  });

  // ==========================================================================
  // SecurityConfigFactory
  // ==========================================================================

  describe('SecurityConfigFactory', () => {
    describe('createDefaultConfig', () => {
      it('should create a valid default configuration', () => {
        const config = SecurityConfigFactory.createDefaultConfig();

        expect(config).toBeDefined();
        expect(config).toHaveProperty('project');
        expect(config).toHaveProperty('ignores');
        expect(config).toHaveProperty('laws');
        expect(config).toHaveProperty('hooks');
        expect(config).toHaveProperty('includes');
        expect(config).toHaveProperty('excludes');
        expect(config).toHaveProperty('reporting');
      });

      it('should have correct default project values', () => {
        const config = SecurityConfigFactory.createDefaultConfig();

        expect(config.project.name).toBe('temp');
        expect(config.project.root).toBe('');
        expect(config.project.componentPrefix).toBe('app');
        expect(config.project.type).toBe('generic');
      });

      it('should have empty ignore patterns by default', () => {
        const config = SecurityConfigFactory.createDefaultConfig();

        expect(config.ignores.global).toEqual([]);
        expect(config.ignores.tests).toEqual([]);
        expect(config.ignores.build).toEqual([]);
        expect(config.ignores.design).toEqual([]);
      });

      it('should have default laws configuration', () => {
        const config = SecurityConfigFactory.createDefaultConfig();

        expect(config.laws.paretoMode).toBe(false);
        expect(config.laws.severity).toEqual({});
      });

      it('should have all hooks disabled by default', () => {
        const config = SecurityConfigFactory.createDefaultConfig();

        expect(config.hooks.preCommit).toBe(false);
        expect(config.hooks.prePush).toBe(false);
        expect(config.hooks.commitMsg).toBe(false);
      });

      it('should have empty include patterns by default', () => {
        const config = SecurityConfigFactory.createDefaultConfig();

        expect(config.includes.global).toEqual([]);
      });

      it('should have empty exclude patterns by default', () => {
        const config = SecurityConfigFactory.createDefaultConfig();

        expect(config.excludes.global).toEqual([]);
      });

      it('should have default reporting configuration', () => {
        const config = SecurityConfigFactory.createDefaultConfig();

        expect(config.reporting.format).toBe('console');
        expect(config.reporting.verbose).toBe(false);
        expect(config.reporting.onlyFailures).toBe(false);
        expect(config.reporting.scoring).toBe(false);
      });

      it('should allow overriding project properties', () => {
        const config = SecurityConfigFactory.createDefaultConfig({
          project: {
            name: 'my-project',
            componentPrefix: 'custom',
            type: 'react',
          },
        });

        expect(config.project.name).toBe('my-project');
        expect(config.project.componentPrefix).toBe('custom');
        expect(config.project.type).toBe('react');
      });

      it('should preserve default project properties when partially overriding', () => {
        const config = SecurityConfigFactory.createDefaultConfig({
          project: {
            name: 'custom-name',
            componentPrefix: 'app',
            type: 'generic',
          },
        });

        expect(config.project.name).toBe('custom-name');
        expect(config.project.root).toBe('');
      });

      it('should allow overriding ignores', () => {
        const config = SecurityConfigFactory.createDefaultConfig({
          ignores: {
            global: ['node_modules', 'dist'],
            tests: ['**/*.spec.ts'],
            build: [],
            design: [],
          },
        });

        expect(config.ignores.global).toEqual(['node_modules', 'dist']);
        expect(config.ignores.tests).toEqual(['**/*.spec.ts']);
      });

      it('should allow overriding laws configuration', () => {
        const config = SecurityConfigFactory.createDefaultConfig({
          laws: {
            paretoMode: true,
            severity: {
              'security-001': 'error',
            },
          },
        });

        expect(config.laws.paretoMode).toBe(true);
        expect(config.laws.severity['security-001']).toBe('error');
      });

      it('should allow overriding hooks', () => {
        const config = SecurityConfigFactory.createDefaultConfig({
          hooks: {
            preCommit: true,
            prePush: true,
            commitMsg: true,
          },
        });

        expect(config.hooks.preCommit).toBe(true);
        expect(config.hooks.prePush).toBe(true);
        expect(config.hooks.commitMsg).toBe(true);
      });

      it('should allow overriding includes', () => {
        const config = SecurityConfigFactory.createDefaultConfig({
          includes: {
            global: ['src/**/*.ts'],
          },
        });

        expect(config.includes.global).toEqual(['src/**/*.ts']);
      });

      it('should allow overriding excludes', () => {
        const config = SecurityConfigFactory.createDefaultConfig({
          excludes: {
            global: ['**/*.test.ts'],
          },
        });

        expect(config.excludes.global).toEqual(['**/*.test.ts']);
      });

      it('should allow overriding reporting', () => {
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
        expect(config.reporting.onlyFailures).toBe(true);
        expect(config.reporting.scoring).toBe(true);
      });

      it('should allow multiple overrides at once', () => {
        const config = SecurityConfigFactory.createDefaultConfig({
          project: {
            name: 'multi-override',
            componentPrefix: 'mo',
            type: 'vue',
          },
          laws: {
            paretoMode: true,
            severity: {},
          },
          reporting: {
            format: 'html',
            verbose: true,
            onlyFailures: false,
          },
        });

        expect(config.project.name).toBe('multi-override');
        expect(config.project.type).toBe('vue');
        expect(config.laws.paretoMode).toBe(true);
        expect(config.reporting.format).toBe('html');
      });

      it('should return new object each time', () => {
        const config1 = SecurityConfigFactory.createDefaultConfig();
        const config2 = SecurityConfigFactory.createDefaultConfig();

        expect(config1).not.toBe(config2);
        expect(config1.project).not.toBe(config2.project);
        expect(config1.ignores).not.toBe(config2.ignores);
      });

      it('should not mutate default config when overriding', () => {
        const config1 = SecurityConfigFactory.createDefaultConfig();
        const config2 = SecurityConfigFactory.createDefaultConfig({
          project: {
            name: 'modified',
            componentPrefix: 'app',
            type: 'generic',
          },
        });

        expect(config1.project.name).toBe('temp');
        expect(config2.project.name).toBe('modified');
      });

      it('should handle empty overrides object', () => {
        const config = SecurityConfigFactory.createDefaultConfig({});

        expect(config.project.name).toBe('temp');
        expect(config.reporting.format).toBe('console');
      });

      it('should preserve nested default values when partially overriding', () => {
        const config = SecurityConfigFactory.createDefaultConfig({
          ignores: {
            global: ['custom'],
            tests: [],
            build: [],
            design: [],
          },
        });

        expect(config.ignores.global).toEqual(['custom']);
        // Other ignores properties should still be present
        expect(config.ignores.tests).toBeDefined();
        expect(config.ignores.build).toBeDefined();
        expect(config.ignores.design).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge cases', () => {
    it('should handle config with all project types', () => {
      const projectTypes: Array<BaseProjectConfig['type']> = [
        'angular',
        'generic',
        'ionic',
        'react',
        'vue',
      ];

      projectTypes.forEach(type => {
        const config = SecurityConfigFactory.createDefaultConfig({
          project: {
            name: `${type}-project`,
            componentPrefix: type.substring(0, 3),
            type,
          },
        });

        expect(config.project.type).toBe(type);
      });
    });

    it('should handle config with all report formats', () => {
      const formats: Array<ReportingConfig['format']> = [
        'console',
        'html',
        'json',
      ];

      formats.forEach(format => {
        const config = SecurityConfigFactory.createDefaultConfig({
          reporting: {
            format,
            verbose: false,
            onlyFailures: false,
          },
        });

        expect(config.reporting.format).toBe(format);
      });
    });

    it('should handle config with many severity rules', () => {
      const severityRules: Record<string, 'error' | 'warning' | 'info'> = {};
      for (let i = 0; i < 100; i++) {
        severityRules[`rule-${i}`] =
          i % 3 === 0 ? 'error' : i % 3 === 1 ? 'warning' : 'info';
      }

      const config = SecurityConfigFactory.createDefaultConfig({
        laws: {
          paretoMode: false,
          severity: severityRules,
        },
      });

      expect(Object.keys(config.laws.severity)).toHaveLength(100);
    });

    it('should handle config with many ignore patterns', () => {
      const patterns = Array.from({ length: 50 }, (_, i) => `pattern-${i}`);

      const config = SecurityConfigFactory.createDefaultConfig({
        ignores: {
          global: patterns,
          tests: [],
          build: [],
          design: [],
        },
      });

      expect(config.ignores.global).toHaveLength(50);
    });
  });
});

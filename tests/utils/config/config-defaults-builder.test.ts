/**
 * Config Defaults Builder - Tests
 * Tests for ConfigDefaultsBuilder class
 */
import { ConfigDefaultsBuilder } from '../../../src/utils/config/config-defaults-builder';

describe('ConfigDefaultsBuilder', () => {
  // ============================================
  // createDefaultConfig
  // ============================================
  describe('createDefaultConfig()', () => {
    it('should create config with default values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig();
      expect(config).toBeDefined();
      expect(config.project).toBeDefined();
      expect(config.ignores).toBeDefined();
      expect(config.laws).toBeDefined();
      expect(config.hooks).toBeDefined();
      expect(config.includes).toBeDefined();
      expect(config.excludes).toBeDefined();
      expect(config.reporting).toBeDefined();
      expect(config.performance).toBeDefined();
    });

    it('should have correct default project values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig();
      expect(config.project.name).toBe('temp');
      expect(config.project.root).toBe('');
      expect(config.project.componentPrefix).toBe('app');
      expect(config.project.type).toBe('generic');
    });

    it('should have correct default ignores values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig();
      expect(config.ignores.global).toEqual([]);
      expect(config.ignores.tests).toEqual([]);
      expect(config.ignores.build).toEqual([]);
      expect(config.ignores.design).toEqual([]);
    });

    it('should have correct default laws values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig();
      expect(config.laws.paretoMode).toBe(false);
      expect(config.laws.severity).toEqual({});
    });

    it('should have correct default hooks values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig();
      expect(config.hooks.preCommit).toBe(false);
      expect(config.hooks.prePush).toBe(false);
      expect(config.hooks.commitMsg).toBe(false);
    });

    it('should have correct default includes values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig();
      expect(config.includes?.global).toEqual([]);
    });

    it('should have correct default excludes values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig();
      const excludes = config.excludes as { global?: string[] };
      expect(excludes.global).toEqual([]);
    });

    it('should have correct default reporting values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig();
      expect(config.reporting.format).toBe('console');
      expect(config.reporting.verbose).toBe(false);
      expect(config.reporting.onlyFailures).toBe(false);
      expect(config.reporting.scoring).toBe(false);
    });

    it('should have correct default performance values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig();
      expect(config.performance.parallel).toBe(false);
      expect(config.performance.maxConcurrent).toBe(3);
      // Opt-in: caching a compliance gate risks reporting a stale PASSED
      expect(config.performance.cache).toBe(false);
      // `incremental` is set at runtime but not declared on the config type
      const performance = config.performance as { incremental?: boolean };
      expect(performance.incremental).toBe(true);
    });

    it('should override project values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig({
        project: { name: 'custom', componentPrefix: 'custom', type: 'angular' },
      });
      expect(config.project.name).toBe('custom');
      expect(config.project.componentPrefix).toBe('custom');
      expect(config.project.type).toBe('angular');
    });

    it('should override ignores values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig({
        ignores: {
          global: ['node_modules'],
          tests: ['*.spec.ts'],
          build: [],
          design: [],
        },
      });
      expect(config.ignores.global).toEqual(['node_modules']);
      expect(config.ignores.tests).toEqual(['*.spec.ts']);
    });

    it('should override laws values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig({
        laws: { paretoMode: true, severity: { 'law-1': 'error' } },
      });
      expect(config.laws.paretoMode).toBe(true);
      expect(config.laws.severity).toEqual({ 'law-1': 'error' });
    });

    it('should override hooks values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig({
        hooks: { preCommit: true, prePush: true, commitMsg: true },
      });
      expect(config.hooks.preCommit).toBe(true);
      expect(config.hooks.prePush).toBe(true);
      expect(config.hooks.commitMsg).toBe(true);
    });

    it('should override includes values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig({
        includes: { global: ['**/*.ts'] },
      });
      expect(config.includes?.global).toEqual(['**/*.ts']);
    });

    it('should override excludes values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig({
        excludes: { global: ['**/dist/**'] },
      });
      const excludes = config.excludes as { global?: string[] };
      expect(excludes.global).toEqual(['**/dist/**']);
    });

    it('should override reporting values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig({
        reporting: {
          format: 'json',
          verbose: true,
          onlyFailures: false,
          scoring: false,
        },
      });
      expect(config.reporting.format).toBe('json');
      expect(config.reporting.verbose).toBe(true);
    });

    it('should override performance values', () => {
      const config = ConfigDefaultsBuilder.createDefaultConfig({
        performance: {
          parallel: true,
          maxConcurrent: 5,
          cache: true,
        },
      });
      expect(config.performance.parallel).toBe(true);
      expect(config.performance.maxConcurrent).toBe(5);
    });
  });

  // ============================================
  // createSecurityScanConfig
  // ============================================
  describe('createSecurityScanConfig()', () => {
    it('should create security scan config with default name', () => {
      const config = ConfigDefaultsBuilder.createSecurityScanConfig();
      expect(config.project.name).toBe('scan');
    });

    it('should create security scan config with custom name', () => {
      const config =
        ConfigDefaultsBuilder.createSecurityScanConfig('security-audit');
      expect(config.project.name).toBe('security-audit');
    });

    it('should have generic project type', () => {
      const config = ConfigDefaultsBuilder.createSecurityScanConfig();
      expect(config.project.type).toBe('generic');
    });

    it('should have app component prefix', () => {
      const config = ConfigDefaultsBuilder.createSecurityScanConfig();
      expect(config.project.componentPrefix).toBe('app');
    });

    it('should set includes from extensions', () => {
      const config = ConfigDefaultsBuilder.createSecurityScanConfig('scan', [
        '.ts',
        '.js',
      ]);
      expect(config.includes?.global).toEqual(['**/*.ts', '**/*.js']);
    });

    it('should set empty includes when no extensions', () => {
      const config = ConfigDefaultsBuilder.createSecurityScanConfig('scan', []);
      expect(config.includes?.global).toEqual([]);
    });
  });

  // ============================================
  // createWithIncludes
  // ============================================
  describe('createWithIncludes()', () => {
    it('should create config with includes', () => {
      const config = ConfigDefaultsBuilder.createWithIncludes([
        '**/*.ts',
        '**/*.tsx',
      ]);
      expect(config.includes?.global).toEqual(['**/*.ts', '**/*.tsx']);
    });

    it('should create config with empty includes', () => {
      const config = ConfigDefaultsBuilder.createWithIncludes([]);
      expect(config.includes?.global).toEqual([]);
    });

    it('should merge additional config', () => {
      const config = ConfigDefaultsBuilder.createWithIncludes(['**/*.ts'], {
        project: { name: 'test-project', componentPrefix: 'app', type: 'node' },
      });
      expect(config.includes?.global).toEqual(['**/*.ts']);
      expect(config.project.name).toBe('test-project');
    });
  });

  // ============================================
  // createWithExcludes
  // ============================================
  describe('createWithExcludes()', () => {
    it('should create config with excludes', () => {
      const config = ConfigDefaultsBuilder.createWithExcludes([
        '**/dist/**',
        '**/node_modules/**',
      ]);
      const excludes = config.excludes as { global?: string[] };
      expect(excludes.global).toEqual(['**/dist/**', '**/node_modules/**']);
    });

    it('should create config with empty excludes', () => {
      const config = ConfigDefaultsBuilder.createWithExcludes([]);
      const excludes = config.excludes as { global?: string[] };
      expect(excludes.global).toEqual([]);
    });

    it('should merge additional config', () => {
      const config = ConfigDefaultsBuilder.createWithExcludes(['**/dist/**'], {
        project: {
          name: 'build-project',
          componentPrefix: 'app',
          type: 'node',
        },
      });
      const excludes = config.excludes as { global?: string[] };
      expect(excludes.global).toEqual(['**/dist/**']);
      expect(config.project.name).toBe('build-project');
    });
  });
});

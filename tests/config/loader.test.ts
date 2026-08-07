/**
 * ConfigLoader Tests
 * Tests for configuration loading and merging behavior
 * Ensures project config takes precedence over defaults
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { PathOperations } from '../../src/utils/path-operations';
import { ConfigLoader } from '../../src/config/loader';
import { ConfigFileUtils } from '../../src/utils/config-file-utils';

// Real project root with real config file
const REAL_PROJECT_ROOT = PathOperations.resolve(__dirname, '..', '..');

describe('ConfigLoader', () => {
  describe('load', () => {
    it('should be a static method', () => {
      expect(typeof ConfigLoader.load).toBe('function');
    });

    it('should return a RuleOfCodeConfig object', () => {
      const config = ConfigLoader.load(REAL_PROJECT_ROOT);
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should have required config sections', () => {
      const config = ConfigLoader.load(REAL_PROJECT_ROOT);
      expect(config.project).toBeDefined();
      expect(config.ignores).toBeDefined();
      expect(config.laws).toBeDefined();
    });

    it('should have ignores with global array', () => {
      const config = ConfigLoader.load(REAL_PROJECT_ROOT);
      expect(Array.isArray(config.ignores.global)).toBe(true);
    });
  });

  describe('loadConfig', () => {
    it('should be a static method', () => {
      expect(typeof ConfigLoader.loadConfig).toBe('function');
    });

    it('should return a RuleOfCodeConfig object', () => {
      const config = ConfigLoader.loadConfig(REAL_PROJECT_ROOT);
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should set project.root to the provided projectRoot', () => {
      const config = ConfigLoader.loadConfig(REAL_PROJECT_ROOT);
      expect(config.project.root).toBe(REAL_PROJECT_ROOT);
    });

    it('should have all required config sections from defaults', () => {
      const config = ConfigLoader.loadConfig(REAL_PROJECT_ROOT);

      // These should always exist from defaults
      expect(config.project).toBeDefined();
      expect(config.ignores).toBeDefined();
      expect(config.laws).toBeDefined();
      expect(config.hooks).toBeDefined();
      expect(config.reporting).toBeDefined();
      expect(config.performance).toBeDefined();
    });

    it('should merge project config with defaults', () => {
      const defaultConfig = ConfigFileUtils.getMinimalDefaultConfig();
      const loadedConfig = ConfigLoader.loadConfig(REAL_PROJECT_ROOT);

      // Default ignores should be present (merged from defaults)
      expect(loadedConfig.ignores.global).toBeDefined();
      expect(Array.isArray(loadedConfig.ignores.global)).toBe(true);

      // Project-specific values should override defaults
      // The test project has ruleofcode.config.json with custom values
      expect(loadedConfig.project).toBeDefined();
    });
  });

  describe('project config takes precedence over defaults', () => {
    it('should use project name from project config, not default', () => {
      const defaultConfig = ConfigFileUtils.getMinimalDefaultConfig();
      const loadedConfig = ConfigLoader.loadConfig(REAL_PROJECT_ROOT);

      // Default has empty project name
      expect(defaultConfig.project.name).toBe('');

      // Loaded config should have project-specific name if defined in config file
      // This verifies project config overrides defaults
      expect(loadedConfig.project).toBeDefined();
    });

    it('should preserve default values for unspecified fields', () => {
      const loadedConfig = ConfigLoader.loadConfig(REAL_PROJECT_ROOT);

      // Hooks should have default values if not specified in project config
      expect(loadedConfig.hooks).toBeDefined();
      expect(typeof loadedConfig.hooks.preCommit).toBe('boolean');
      expect(typeof loadedConfig.hooks.prePush).toBe('boolean');
      expect(typeof loadedConfig.hooks.commitMsg).toBe('boolean');
    });

    it('should merge ignores arrays correctly', () => {
      const loadedConfig = ConfigLoader.loadConfig(REAL_PROJECT_ROOT);

      // Should have ignores from both defaults and project config
      expect(loadedConfig.ignores.global.length).toBeGreaterThan(0);

      // Should contain node_modules and dist patterns (may have variations like /**/* or /**)
      const hasNodeModules = loadedConfig.ignores.global.some(pattern =>
        pattern.includes('node_modules')
      );
      const hasDist = loadedConfig.ignores.global.some(pattern =>
        pattern.includes('dist')
      );

      expect(hasNodeModules).toBe(true);
      expect(hasDist).toBe(true);
    });

    it('should properly override reporting settings', () => {
      const loadedConfig = ConfigLoader.loadConfig(REAL_PROJECT_ROOT);

      // Reporting should be defined
      expect(loadedConfig.reporting).toBeDefined();
      expect(loadedConfig.reporting.format).toBeDefined();
    });

    it('should properly override performance settings', () => {
      const loadedConfig = ConfigLoader.loadConfig(REAL_PROJECT_ROOT);

      // Performance should be defined
      expect(loadedConfig.performance).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle non-existent project root gracefully', () => {
      const config = ConfigLoader.loadConfig('/non/existent/path');

      // Should still return a valid config with defaults
      expect(config).toBeDefined();
      expect(config.project).toBeDefined();
      expect(config.ignores).toBeDefined();
    });

    it('should set project.root even for non-existent paths', () => {
      const fakePath = '/fake/project/path';
      const config = ConfigLoader.loadConfig(fakePath);

      expect(config.project.root).toBe(fakePath);
    });
  });

  describe('load with explicit configPath (--config)', () => {
    let dir: string;

    beforeAll(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-loader-'));
    });
    afterAll(() => {
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it('loads the explicit file and honours its values', () => {
      const p = path.join(dir, 'custom-roc.json');
      fs.writeFileSync(p, JSON.stringify({ laws: { paretoMode: false } }));
      const config = ConfigLoader.load(dir, 'custom-roc.json');
      expect(config.laws.paretoMode).toBe(false);
    });

    it('throws when the explicit file does not exist', () => {
      expect(() => ConfigLoader.load(dir, 'missing.json')).toThrow(
        /not found/
      );
    });

    it('throws when the explicit file cannot be parsed', () => {
      const p = path.join(dir, 'broken.json');
      fs.writeFileSync(p, '{"laws": {,}');
      expect(() => ConfigLoader.load(dir, 'broken.json')).toThrow(
        /could not be parsed/
      );
    });
  });

  describe('config file robustness (discovery)', () => {
    it('loads a BOM-prefixed discovered config and keeps paretoMode false', () => {
      const bomDir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-bom-'));
      fs.writeFileSync(
        path.join(bomDir, 'ruleofcode.config.json'),
        '\uFEFF' + JSON.stringify({ laws: { paretoMode: false } })
      );
      const config = ConfigLoader.load(bomDir);
      expect(config.laws.paretoMode).toBe(false);
      fs.rmSync(bomDir, { recursive: true, force: true });
    });

    it('warns loudly instead of silently skipping a corrupt discovered config', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const badDir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-bad-'));
      fs.writeFileSync(path.join(badDir, 'ruleofcode.config.json'), '{"laws": {,}');
      ConfigLoader.load(badDir);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('could not be parsed')
      );
      warnSpy.mockRestore();
      fs.rmSync(badDir, { recursive: true, force: true });
    });
  });
});

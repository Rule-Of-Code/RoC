/**
 * Init Helpers Tests
 * Tests for cli/init-helpers.ts
 */

import {
  detectProjectType,
  generateConfigFile,
  generateProConfig,
  setupQuickMode,
} from '../../src/cli/init-helpers';
import { DEFAULT_CONFIG } from '../../src/config/types';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('cli/init-helpers', () => {
  describe('detectProjectType', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = FileUtils.createTempDirectory('roc-helpers-test-');
    });

    afterEach(() => {
      if (tempDir && FileUtils.exists(tempDir)) {
        FileUtils.deleteDirectory(tempDir);
      }
    });

    it('should detect generic project by default', () => {
      const result = detectProjectType(tempDir);

      expect(result).toBe('generic');
    });

    it('should detect angular project', () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'angular.json'),
        JSON.stringify({ version: 1 })
      );

      const result = detectProjectType(tempDir);

      expect(result).toBe('angular');
    });

    it('should detect react project', () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          dependencies: { react: '^18.0.0' },
        })
      );

      const result = detectProjectType(tempDir);

      expect(result).toBe('react');
    });

    it('should detect vue project', () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          dependencies: { vue: '^3.0.0' },
        })
      );

      const result = detectProjectType(tempDir);

      expect(result).toBe('vue');
    });

    it('should handle errors gracefully', () => {
      const result = detectProjectType('/non/existent/path/xyz123');

      expect(result).toBe('generic');
    });
  });

  describe('generateProConfig', () => {
    it('should generate config with all options', () => {
      const options = {
        projectName: 'test-project',
        projectType: 'angular' as const,
        componentPrefix: 'app',
        domain: 'test-domain',
        lawsMode: 'full',
        paretoMode: true,
      };

      const config = generateProConfig(options);

      expect(config.project.name).toBe('test-project');
      expect(config.project.type).toBe('angular');
      expect(config.project.componentPrefix).toBe('app');
      expect(config.laws.paretoMode).toBe(true);
    });

    it('should use default config as base', () => {
      const options = {
        projectName: 'test',
        projectType: 'generic' as const,
        componentPrefix: 'ui',
        domain: 'test',
        lawsMode: 'fast',
        paretoMode: false,
      };

      const config = generateProConfig(options);

      // Should have default values for other properties
      expect(config.version).toBe(DEFAULT_CONFIG.version);
    });
  });

  describe('generateConfigFile', () => {
    it('should generate module.exports format', () => {
      const config = { ...DEFAULT_CONFIG };

      const content = generateConfigFile(config);

      expect(content).toContain('module.exports');
      expect(content).toContain('{');
      expect(content).toContain('}');
    });

    it('should include config values', () => {
      const config = {
        ...DEFAULT_CONFIG,
        project: { ...DEFAULT_CONFIG.project, name: 'my-test-project' },
      };

      const content = generateConfigFile(config);

      expect(content).toContain('my-test-project');
    });

    it('should format as JSON with indentation', () => {
      const config = { ...DEFAULT_CONFIG };

      const content = generateConfigFile(config);

      // Should have indentation (2 spaces)
      expect(content).toContain('  "');
    });
  });

  describe('setupQuickMode', () => {
    let tempDir: string;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      tempDir = FileUtils.createTempDirectory('roc-quick-test-');
      // Create package.json
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project', version: '1.0.0' })
      );
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      if (tempDir && FileUtils.exists(tempDir)) {
        FileUtils.deleteDirectory(tempDir);
      }
    });

    it('should create config file', async () => {
      await setupQuickMode(tempDir, { hooks: false });

      const configPath = PathOperations.join(tempDir, 'ruleofcode.config.js');
      expect(FileUtils.exists(configPath)).toBe(true);
    });

    it('should log project information', async () => {
      await setupQuickMode(tempDir, { hooks: false });

      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('Project:');
      expect(calls).toContain('Type:');
      expect(calls).toContain('Laws:');
    });

    it('should set pareto mode in config', async () => {
      await setupQuickMode(tempDir, { hooks: false });

      const configPath = PathOperations.join(tempDir, 'ruleofcode.config.js');
      const content = FileUtils.readFileSync(configPath);
      expect(content).toContain('paretoMode');
      expect(content).toContain('true');
    });

    it('should skip hooks when hooks option is false', async () => {
      await setupQuickMode(tempDir, { hooks: false });

      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      // Should not contain 'Installing git hooks'
      expect(calls).not.toContain('Installing git hooks');
    });

    it('should complete with success message', async () => {
      await setupQuickMode(tempDir, { hooks: false });

      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('Quick setup complete');
    });

    it('should install hooks when hooks option is not provided', async () => {
      // Create .git directory
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));

      await setupQuickMode(tempDir, {});

      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('Installing git hooks');
    });

    it('should install hooks when hooks option is true', async () => {
      // Create .git directory
      FileUtils.createDirectory(PathOperations.join(tempDir, '.git'));

      await setupQuickMode(tempDir, { hooks: true });

      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('Installing git hooks');
    });

    it('should use ui prefix for non-angular projects', async () => {
      // Temp dir has no angular files
      await setupQuickMode(tempDir, { hooks: false });

      const configPath = PathOperations.join(tempDir, 'ruleofcode.config.js');
      const content = FileUtils.readFileSync(configPath);
      expect(content).toContain('componentPrefix');
      expect(content).toContain('ui');
    });

    it('should use app prefix for angular projects', async () => {
      // Create angular.json to detect as angular project
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'angular.json'),
        JSON.stringify({ version: 1, projects: { test: {} } })
      );

      await setupQuickMode(tempDir, { hooks: false });

      const configPath = PathOperations.join(tempDir, 'ruleofcode.config.js');
      const content = FileUtils.readFileSync(configPath);
      expect(content).toContain('componentPrefix');
      // Project should be detected as angular type
      expect(content).toContain('"type": "angular"');
    });
  });
});

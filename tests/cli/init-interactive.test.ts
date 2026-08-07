/**
 * Init Interactive Tests
 * Tests for cli/init-interactive.ts
 */

import {
  ConfigData,
  saveConfigAndShowSuccess,
} from '../../src/cli/init-interactive';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('cli/init-interactive', () => {
  describe('saveConfigAndShowSuccess', () => {
    let tempDir: string;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      tempDir = FileUtils.createTempDirectory('roc-interactive-test-');
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      if (tempDir && FileUtils.exists(tempDir)) {
        FileUtils.deleteDirectory(tempDir);
      }
    });

    it('should save config file', () => {
      const configData: ConfigData = {
        projectName: 'test-project',
        projectType: 'angular',
        componentPrefix: 'app',
        domain: 'example.com',
        lawsMode: 'pareto',
        paretoMode: true,
      };

      saveConfigAndShowSuccess(tempDir, configData);

      const configPath = PathOperations.join(tempDir, 'ruleofcode.config.js');
      expect(FileUtils.exists(configPath)).toBe(true);
    });

    it('should display success messages', () => {
      const configData: ConfigData = {
        projectName: 'test-project',
        projectType: 'generic',
        componentPrefix: 'ui',
        domain: 'example.com',
        lawsMode: 'pareto',
        paretoMode: true,
      };

      saveConfigAndShowSuccess(tempDir, configData);

      const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('Configuration saved');
      expect(calls).toContain('Setup Complete');
    });

    it('should show full laws count when paretoMode is false', () => {
      const configData: ConfigData = {
        projectName: 'test-project',
        projectType: 'node',
        componentPrefix: 'api',
        domain: 'example.com',
        lawsMode: 'full',
        paretoMode: false,
      };

      saveConfigAndShowSuccess(tempDir, configData);

      const configPath = PathOperations.join(tempDir, 'ruleofcode.config.js');
      const content = FileUtils.readFileSync(configPath);
      expect(content).toContain('"paretoMode": false');
    });

    it('should include project configuration', () => {
      const configData: ConfigData = {
        projectName: 'my-library',
        projectType: 'library',
        componentPrefix: 'lib',
        domain: 'mylib.io',
        lawsMode: 'pareto',
        paretoMode: true,
      };

      saveConfigAndShowSuccess(tempDir, configData);

      const configPath = PathOperations.join(tempDir, 'ruleofcode.config.js');
      const content = FileUtils.readFileSync(configPath);
      expect(content).toContain('"name": "my-library"');
      expect(content).toContain('"type": "library"');
    });

    it('should work with react project type', () => {
      const configData: ConfigData = {
        projectName: 'react-app',
        projectType: 'react',
        componentPrefix: 'rc',
        domain: 'react.dev',
        lawsMode: 'custom',
        paretoMode: false,
      };

      saveConfigAndShowSuccess(tempDir, configData);

      const configPath = PathOperations.join(tempDir, 'ruleofcode.config.js');
      const content = FileUtils.readFileSync(configPath);
      expect(content).toContain('"type": "react"');
    });

    it('should work with vue project type', () => {
      const configData: ConfigData = {
        projectName: 'vue-app',
        projectType: 'vue',
        componentPrefix: 'v',
        domain: 'vue.io',
        lawsMode: 'pareto',
        paretoMode: true,
      };

      saveConfigAndShowSuccess(tempDir, configData);

      const configPath = PathOperations.join(tempDir, 'ruleofcode.config.js');
      const content = FileUtils.readFileSync(configPath);
      expect(content).toContain('"type": "vue"');
    });
  });
});

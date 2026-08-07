/**
 * Config Utils Tests
 * Tests for the config-utils utility class
 */
import { ConfigFileUtils } from '../../src/utils/config-utils';

describe('ConfigFileUtils', () => {
  describe('getDefaultConfig', () => {
    it('should return default config object', () => {
      const config = ConfigFileUtils.getDefaultConfig();

      expect(config).toBeDefined();
      expect(config.encoding).toBe('utf8');
    });

    it('should have maxFileSize in bytes', () => {
      const config = ConfigFileUtils.getDefaultConfig();

      expect(config.maxFileSize).toBe(5 * 1024 * 1024); // 5MB
    });

    it('should have timeout in milliseconds', () => {
      const config = ConfigFileUtils.getDefaultConfig();

      expect(config.timeout).toBe(5000);
    });

    it('should have skipBinary enabled', () => {
      const config = ConfigFileUtils.getDefaultConfig();

      expect(config.skipBinary).toBe(true);
    });

    it('should have followSymlinks disabled', () => {
      const config = ConfigFileUtils.getDefaultConfig();

      expect(config.followSymlinks).toBe(false);
    });

    it('should have exclude patterns', () => {
      const config = ConfigFileUtils.getDefaultConfig();

      expect(config.excludePatterns).toContain('node_modules');
      expect(config.excludePatterns).toContain('dist');
      expect(config.excludePatterns).toContain('.git');
      expect(config.excludePatterns).toContain('coverage');
    });
  });

  describe('getJestConfigFiles', () => {
    it('should return Jest config file names', () => {
      const jestFiles = ConfigFileUtils.getJestConfigFiles();

      expect(Array.isArray(jestFiles)).toBe(true);
      expect(jestFiles.length).toBeGreaterThan(0);
    });

    it('should include common Jest config formats', () => {
      const jestFiles = ConfigFileUtils.getJestConfigFiles();

      expect(jestFiles).toContain('jest.config.js');
    });
  });

  describe('getCommonConfigFiles', () => {
    it('should return common config file names', () => {
      const configFiles = ConfigFileUtils.getCommonConfigFiles();

      expect(Array.isArray(configFiles)).toBe(true);
      expect(configFiles.length).toBeGreaterThan(0);
    });

    it('should include package.json', () => {
      const configFiles = ConfigFileUtils.getCommonConfigFiles();

      expect(configFiles).toContain('package.json');
    });

    it('should include tsconfig.json', () => {
      const configFiles = ConfigFileUtils.getCommonConfigFiles();

      expect(configFiles).toContain('tsconfig.json');
    });

    it('should include Angular and Nx configs', () => {
      const configFiles = ConfigFileUtils.getCommonConfigFiles();

      expect(configFiles).toContain('angular.json');
      expect(configFiles).toContain('nx.json');
    });
  });

  describe('isConfigFile', () => {
    it('should return true for package.json', () => {
      expect(ConfigFileUtils.isConfigFile('package.json')).toBe(true);
    });

    it('should return true for tsconfig.json', () => {
      expect(ConfigFileUtils.isConfigFile('tsconfig.json')).toBe(true);
    });

    it('should return true for jest.config.js', () => {
      expect(ConfigFileUtils.isConfigFile('jest.config.js')).toBe(true);
    });

    it('should return true for ESLint configs', () => {
      expect(ConfigFileUtils.isConfigFile('.eslintrc.js')).toBe(true);
      expect(ConfigFileUtils.isConfigFile('.eslintrc.json')).toBe(true);
    });

    it('should return false for non-config files', () => {
      expect(ConfigFileUtils.isConfigFile('app.component.ts')).toBe(false);
      expect(ConfigFileUtils.isConfigFile('index.html')).toBe(false);
      expect(ConfigFileUtils.isConfigFile('styles.scss')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(ConfigFileUtils.isConfigFile('')).toBe(false);
    });
  });
});

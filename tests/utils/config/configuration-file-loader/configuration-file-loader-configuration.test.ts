/**
 * Configuration File Loader Configuration - Tests
 * Tests for ConfigurationFileLoaderConfiguration class
 */
import { ConfigurationFileLoaderConfiguration } from '../../../../src/utils/config/configuration-file-loader/configuration-file-loader-configuration';

describe('ConfigurationFileLoaderConfiguration', () => {
  // ============================================
  // Static Constants
  // ============================================
  describe('Static Constants', () => {
    describe('CONFIGURATION_FILES', () => {
      it('should have files array', () => {
        const config = ConfigurationFileLoaderConfiguration.CONFIGURATION_FILES;
        expect(Array.isArray(config.files)).toBe(true);
        expect(config.files.length).toBeGreaterThan(0);
      });

      it('should include ruleofcode config files', () => {
        const files =
          ConfigurationFileLoaderConfiguration.CONFIGURATION_FILES.files;
        expect(files.some(f => f.includes('ruleofcode'))).toBe(true);
      });
    });

    describe('CONFIGURATION_DIRECTORIES', () => {
      it('should have directories array', () => {
        const config =
          ConfigurationFileLoaderConfiguration.CONFIGURATION_DIRECTORIES;
        expect(Array.isArray(config.directories)).toBe(true);
        expect(config.directories.length).toBeGreaterThan(0);
      });

      it('should include root directory (empty string)', () => {
        const dirs =
          ConfigurationFileLoaderConfiguration.CONFIGURATION_DIRECTORIES
            .directories;
        expect(dirs).toContain('');
      });

      it('should include config directory', () => {
        const dirs =
          ConfigurationFileLoaderConfiguration.CONFIGURATION_DIRECTORIES
            .directories;
        expect(dirs).toContain('config/');
      });
    });

    describe('FILE_READING_CONFIG', () => {
      it('should have encoding', () => {
        const config = ConfigurationFileLoaderConfiguration.FILE_READING_CONFIG;
        expect(config.encoding).toBe('utf8');
      });

      it('should have error handling mode', () => {
        const config = ConfigurationFileLoaderConfiguration.FILE_READING_CONFIG;
        expect(config.errorHandling).toBe('skip');
      });
    });

    describe('PACKAGE_JSON_CONFIG', () => {
      it('should have fileName', () => {
        const config = ConfigurationFileLoaderConfiguration.PACKAGE_JSON_CONFIG;
        expect(config.fileName).toBe('package.json');
      });

      it('should have configKeys', () => {
        const config = ConfigurationFileLoaderConfiguration.PACKAGE_JSON_CONFIG;
        expect(Array.isArray(config.configKeys)).toBe(true);
        expect(config.configKeys).toContain('ruleofcode');
        expect(config.configKeys).toContain('roc');
      });
    });

    describe('ENVIRONMENT_CONFIG', () => {
      it('should have prefixes', () => {
        const config = ConfigurationFileLoaderConfiguration.ENVIRONMENT_CONFIG;
        expect(Array.isArray(config.prefixes)).toBe(true);
        expect(config.prefixes).toContain('ROC_');
        expect(config.prefixes).toContain('RULEOFCODE_');
      });

      it('should have separators', () => {
        const config = ConfigurationFileLoaderConfiguration.ENVIRONMENT_CONFIG;
        expect(config.separators.key).toBe('.');
        expect(config.separators.value).toBe('_');
      });
    });

    describe('VALUE_PARSING_CONFIG', () => {
      it('should have boolean values', () => {
        const config =
          ConfigurationFileLoaderConfiguration.VALUE_PARSING_CONFIG;
        expect(config.booleanValues.true).toContain('true');
        expect(config.booleanValues.false).toContain('false');
      });

      it('should have number detection', () => {
        const config =
          ConfigurationFileLoaderConfiguration.VALUE_PARSING_CONFIG;
        expect(config.numberDetection).toBe(true);
      });
    });
  });

  // ============================================
  // Getter Methods
  // ============================================
  describe('Getter Methods', () => {
    describe('getConfigurationFiles()', () => {
      it('should return configuration files', () => {
        const result =
          ConfigurationFileLoaderConfiguration.getConfigurationFiles();
        expect(result.files).toBeDefined();
        expect(result).toBe(
          ConfigurationFileLoaderConfiguration.CONFIGURATION_FILES
        );
      });
    });

    describe('getConfigurationDirectories()', () => {
      it('should return configuration directories', () => {
        const result =
          ConfigurationFileLoaderConfiguration.getConfigurationDirectories();
        expect(result.directories).toBeDefined();
        expect(result).toBe(
          ConfigurationFileLoaderConfiguration.CONFIGURATION_DIRECTORIES
        );
      });
    });

    describe('getFileReadingConfig()', () => {
      it('should return file reading config', () => {
        const result =
          ConfigurationFileLoaderConfiguration.getFileReadingConfig();
        expect(result.encoding).toBeDefined();
        expect(result.errorHandling).toBeDefined();
        expect(result).toBe(
          ConfigurationFileLoaderConfiguration.FILE_READING_CONFIG
        );
      });
    });

    describe('getPackageJsonConfig()', () => {
      it('should return package.json config', () => {
        const result =
          ConfigurationFileLoaderConfiguration.getPackageJsonConfig();
        expect(result.fileName).toBeDefined();
        expect(result.configKeys).toBeDefined();
        expect(result).toBe(
          ConfigurationFileLoaderConfiguration.PACKAGE_JSON_CONFIG
        );
      });
    });

    describe('getEnvironmentConfig()', () => {
      it('should return environment config', () => {
        const result =
          ConfigurationFileLoaderConfiguration.getEnvironmentConfig();
        expect(result.prefixes).toBeDefined();
        expect(result.separators).toBeDefined();
        expect(result).toBe(
          ConfigurationFileLoaderConfiguration.ENVIRONMENT_CONFIG
        );
      });
    });

    describe('getValueParsingConfig()', () => {
      it('should return value parsing config', () => {
        const result =
          ConfigurationFileLoaderConfiguration.getValueParsingConfig();
        expect(result.booleanValues).toBeDefined();
        expect(result.numberDetection).toBeDefined();
        expect(result).toBe(
          ConfigurationFileLoaderConfiguration.VALUE_PARSING_CONFIG
        );
      });
    });
  });

  // ============================================
  // Utility Methods
  // ============================================
  describe('Utility Methods', () => {
    describe('isRuleOfCodeEnvVar()', () => {
      it('should return true for ROC_ prefix', () => {
        expect(
          ConfigurationFileLoaderConfiguration.isRuleOfCodeEnvVar('ROC_TEST')
        ).toBe(true);
      });

      it('should return true for RULEOFCODE_ prefix', () => {
        expect(
          ConfigurationFileLoaderConfiguration.isRuleOfCodeEnvVar(
            'RULEOFCODE_TEST'
          )
        ).toBe(true);
      });

      it('should return false for unrecognized prefix', () => {
        expect(
          ConfigurationFileLoaderConfiguration.isRuleOfCodeEnvVar('OTHER_TEST')
        ).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(
          ConfigurationFileLoaderConfiguration.isRuleOfCodeEnvVar('')
        ).toBe(false);
      });

      it('should return false for partial match', () => {
        expect(
          ConfigurationFileLoaderConfiguration.isRuleOfCodeEnvVar('MYROC_TEST')
        ).toBe(false);
      });
    });

    describe('normalizeEnvKey()', () => {
      it('should remove ROC_ prefix', () => {
        const result =
          ConfigurationFileLoaderConfiguration.normalizeEnvKey(
            'ROC_PROJECT_NAME'
          );
        expect(result).toBe('project.name');
      });

      it('should remove RULEOFCODE_ prefix', () => {
        const result = ConfigurationFileLoaderConfiguration.normalizeEnvKey(
          'RULEOFCODE_PROJECT_NAME'
        );
        expect(result).toBe('project.name');
      });

      it('should convert to lowercase', () => {
        const result = ConfigurationFileLoaderConfiguration.normalizeEnvKey(
          'ROC_UPPERCASE_VALUE'
        );
        expect(result).toBe('uppercase.value');
      });

      it('should replace underscores with dots', () => {
        const result = ConfigurationFileLoaderConfiguration.normalizeEnvKey(
          'ROC_DEEP_NESTED_VALUE'
        );
        expect(result).toBe('deep.nested.value');
      });

      it('should handle key without prefix', () => {
        const result =
          ConfigurationFileLoaderConfiguration.normalizeEnvKey('NO_PREFIX_KEY');
        expect(result).toBe('no.prefix.key');
      });
    });
  });
});

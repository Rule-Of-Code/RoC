import { FileSystemOperations } from '../../file-system-operations';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { ConfigurationFileLoaderConfiguration } from './configuration-file-loader-configuration';

type ConfigObject = Record<string, unknown>;

/**
 * ConfigurationFileLoaderValidation
 * Comprehensive configuration file loading and validation workflow
 */
export class ConfigurationFileLoaderValidation {
  /**
   * Execute complete configuration loading workflow from file system
   */
  static executeFileConfigLoadingWorkflow(
    projectRoot: string
  ): ConfigObject | null {
    const configDirectories =
      ConfigurationFileLoaderConfiguration.getConfigurationDirectories(
        undefined
      );
    const configFiles =
      ConfigurationFileLoaderConfiguration.getConfigurationFiles(undefined);

    for (const configDir of configDirectories.directories) {
      for (const configFile of configFiles.files) {
        const config = this.tryLoadConfigFile(
          projectRoot,
          configDir,
          configFile
        );
        if (config) {
          return config;
        }
      }
    }
    return null;
  }

  /**
   * Try to load a single config file with comprehensive error handling
   */
  private static tryLoadConfigFile(
    projectRoot: string,
    configDir: string,
    configFile: string
  ): ConfigObject | null {
    const fullPath = PathOperations.resolve(projectRoot, configDir, configFile);

    if (!FileUtils.exists(fullPath)) {
      return null;
    }

    try {
      return this.loadConfigContent(fullPath, configFile);
    } catch (error) {
      // A config the user wrote must never be dropped silently — defaults
      // (e.g. paretoMode: true) would quietly replace their settings.
      console.warn(
        `⚠️ RoC config found at ${fullPath} but could not be parsed (${
          (error as Error).message
        }) — file skipped, built-in defaults may apply`
      );
      return null;
    }
  }

  /**
   * Load an explicitly requested config file (--config): unlike discovery,
   * a missing or unparseable file is a hard error, never a silent fallback.
   */
  static executeExplicitConfigLoadingWorkflow(
    projectRoot: string,
    configPath: string
  ): ConfigObject {
    const fullPath = PathOperations.resolve(projectRoot, configPath);

    if (!FileUtils.exists(fullPath)) {
      throw new Error(`Config file not found: ${fullPath} (from --config)`);
    }

    try {
      return this.loadConfigContent(fullPath, fullPath) ?? {};
    } catch (error) {
      throw new Error(
        `Config file ${fullPath} could not be parsed: ${
          (error as Error).message
        }`
      );
    }
  }

  /**
   * Load config file content based on file type with fallback strategies
   */
  private static loadConfigContent(
    fullPath: string,
    configFile: string
  ): ConfigObject | null {
    if (configFile.endsWith('.json')) {
      return FileSystemOperations.readJsonFile(fullPath);
    }

    if (configFile.endsWith('.js')) {
      delete require.cache[require.resolve(fullPath)];
      return require(fullPath) as ConfigObject;
    }

    // Try JSON first, then fallback to require
    try {
      return FileSystemOperations.readJsonFile(fullPath);
    } catch {
      return require(fullPath) as ConfigObject;
    }
  }

  /**
   * Execute package.json configuration loading workflow
   */
  static executePackageJsonLoadingWorkflow(
    projectRoot: string
  ): ConfigObject | null {
    const packageConfig =
      ConfigurationFileLoaderConfiguration.getPackageJsonConfig(undefined);
    const packageJsonPath = PathOperations.resolve(
      projectRoot,
      packageConfig.fileName
    );

    if (!FileUtils.exists(packageJsonPath)) {
      return null;
    }

    try {
      const packageJson =
        FileSystemOperations.readJsonFile<Record<string, unknown>>(
          packageJsonPath
        );

      // Check each config key in order
      for (const configKey of packageConfig.configKeys) {
        const config = packageJson[configKey];
        if (config) {
          return config as ConfigObject;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Execute environment variable configuration loading workflow
   */
  static executeEnvironmentLoadingWorkflow(): ConfigObject | null {
    const envConfig: ConfigObject = {};
    let hasConfig = false;

    for (const [key, value] of Object.entries(process.env)) {
      if (
        ConfigurationFileLoaderConfiguration.isRuleOfCodeEnvVar(key) &&
        value
      ) {
        this.setEnvConfigValue(envConfig, key, value);
        hasConfig = true;
      }
    }

    return hasConfig ? envConfig : null;
  }

  /**
   * Set environment config value with dot notation support and type parsing
   */
  private static setEnvConfigValue(
    envConfig: ConfigObject,
    key: string,
    value: string
  ): void {
    const configKey = ConfigurationFileLoaderConfiguration.normalizeEnvKey(key);
    const keys = configKey.split('.');
    const parsedValue = this.parseEnvValue(value);

    this.setNestedValue(envConfig, keys, parsedValue);
  }

  /**
   * Parse environment variable value with type detection
   */
  private static parseEnvValue(value: string): unknown {
    const parsingConfig =
      ConfigurationFileLoaderConfiguration.getValueParsingConfig(undefined);

    // Check boolean values
    if (parsingConfig.booleanValues.true.includes(value)) return true;
    if (parsingConfig.booleanValues.false.includes(value)) return false;

    // Check number detection
    if (parsingConfig.numberDetection && !isNaN(Number(value))) {
      return Number(value);
    }

    return value;
  }

  /**
   * Set nested value in config object with safe traversal
   */
  private static setNestedValue(
    _config: unknown,
    keys: string[],
    value: unknown
  ): void {
    let current = _config as Record<string, unknown>;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!key) continue;

      current[key] ??= {};
      current = current[key] as ConfigObject;
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
  }
}

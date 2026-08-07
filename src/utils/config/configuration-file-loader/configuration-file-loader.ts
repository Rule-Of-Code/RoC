import { ConfigurationFileLoaderValidation } from './configuration-file-loader-validation';
type ConfigObject = Record<string, unknown>;

/**
 * Configuration File Loader
 * Specialized utility for loading configuration files from different sources
 */
export class ConfigurationFileLoader {
  /**
   * Load configuration from file system
   */
  static loadFromConfigFile(projectRoot: string): ConfigObject | null {
    return ConfigurationFileLoaderValidation.executeFileConfigLoadingWorkflow(
      projectRoot
    );
  }

  /**
   * Load an explicitly requested config file (--config path).
   * Missing or unparseable file throws — never a silent fallback.
   */
  static loadFromExplicitPath(
    projectRoot: string,
    configPath: string
  ): ConfigObject {
    return ConfigurationFileLoaderValidation.executeExplicitConfigLoadingWorkflow(
      projectRoot,
      configPath
    );
  }

  /**
   * Load configuration from package.json
   */
  static loadFromPackageJson(projectRoot: string): ConfigObject | null {
    return ConfigurationFileLoaderValidation.executePackageJsonLoadingWorkflow(
      projectRoot
    );
  }

  /**
   * Load configuration from environment variables
   */
  static loadFromEnvironment(): ConfigObject | null {
    return ConfigurationFileLoaderValidation.executeEnvironmentLoadingWorkflow();
  }
}

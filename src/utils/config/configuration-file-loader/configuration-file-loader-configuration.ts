import { CONFIG_KEY_PATHS } from '../../../config/config-key-paths';
import { CONFIG_FILES } from '../../constants';

/**
 * ConfigurationFileLoaderConfiguration
 * Centralized configuration management for configuration file loading operations
 */
export class ConfigurationFileLoaderConfiguration {
  private static readonly config = ConfigurationFileLoaderConfiguration;

  /** The config's settings, split into path segments (schema spelling). */
  private static readonly configKeySegments = CONFIG_KEY_PATHS.map(path =>
    path.split('.')
  );

  /**
   * Supported configuration files (RULE 1: 100% internal coverage)
   */
  static readonly CONFIGURATION_FILES = {
    files: [
      CONFIG_FILES.RULEOFCODE_CONFIG_JS,
      CONFIG_FILES.RULEOFCODE_CONFIG_JSON,
      CONFIG_FILES.RULEOFCODE_RC,
      CONFIG_FILES.RULEOFCODE_RC_JSON,
      CONFIG_FILES.ROC_CONFIG_JS,
      CONFIG_FILES.ROC_CONFIG_JSON,
    ] as readonly string[],
  } as const;

  /**
   * Configuration directories to search (RULE 1: 100% internal coverage)
   */
  static readonly CONFIGURATION_DIRECTORIES = {
    directories: [
      '', // Root directory
      'config/', // Config subdirectory
    ] as readonly string[],
  } as const;

  /**
   * File reading configuration (RULE 1: 100% internal coverage)
   */
  static readonly FILE_READING_CONFIG = {
    encoding: 'utf8' as BufferEncoding,
    errorHandling: 'skip' as const,
  } as const;

  /**
   * Package.json configuration paths (RULE 1: 100% internal coverage)
   */
  static readonly PACKAGE_JSON_CONFIG = {
    fileName: CONFIG_FILES.PACKAGE_JSON,
    configKeys: ['ruleofcode', 'roc'] as readonly string[],
  } as const;

  /**
   * Environment variable configuration (RULE 1: 100% internal coverage)
   */
  static readonly ENVIRONMENT_CONFIG = {
    prefixes: ['ROC_', 'RULEOFCODE_'] as readonly string[],
    separators: {
      key: '.',
      value: '_',
    },
  } as const;

  /**
   * Value parsing configuration (RULE 1: 100% internal coverage)
   */
  static readonly VALUE_PARSING_CONFIG = {
    booleanValues: {
      true: ['true'] as readonly string[],
      false: ['false'] as readonly string[],
    },
    numberDetection: true,
  } as const;

  /**
   * Get supported configuration files (RULE 2: Caching)
   */
  static getConfigurationFiles(_config?: unknown): {
    files: readonly string[];
  } {
    return this.config.CONFIGURATION_FILES;
  }

  /**
   * Get configuration directories to search (RULE 2: Caching)
   */
  static getConfigurationDirectories(_config?: unknown): {
    directories: readonly string[];
  } {
    return this.config.CONFIGURATION_DIRECTORIES;
  }

  /**
   * Get file reading configuration (RULE 2: Caching)
   */
  static getFileReadingConfig(_config?: unknown): {
    encoding: BufferEncoding;
    errorHandling: 'skip' | 'throw';
  } {
    return this.config.FILE_READING_CONFIG;
  }

  /**
   * Get package.json configuration paths (RULE 2: Caching)
   */
  static getPackageJsonConfig(_config?: unknown): {
    fileName: string;
    configKeys: readonly string[];
  } {
    return this.config.PACKAGE_JSON_CONFIG;
  }

  /**
   * Get environment variable configuration (RULE 2: Caching)
   */
  static getEnvironmentConfig(_config?: unknown): {
    prefixes: readonly string[];
    separators: {
      key: string;
      value: string;
    };
  } {
    return this.config.ENVIRONMENT_CONFIG;
  }

  /**
   * Get value parsing configuration (RULE 2: Caching)
   */
  static getValueParsingConfig(_config?: unknown): {
    booleanValues: {
      true: readonly string[];
      false: readonly string[];
    };
    numberDetection: boolean;
  } {
    return this.config.VALUE_PARSING_CONFIG;
  }

  /**
   * Check if environment variable key matches Rule of Code patterns (RULE 2: Caching)
   */
  static isRuleOfCodeEnvVar(key: string): boolean {
    const config = this.config.ENVIRONMENT_CONFIG;
    return config.prefixes.some(prefix => key.startsWith(prefix));
  }

  /**
   * Normalize environment variable key to config format (RULE 2: Caching)
   */
  static normalizeEnvKey(key: string): string {
    const config = this.config.ENVIRONMENT_CONFIG;
    let normalizedKey = key;

    // Remove prefixes
    for (const prefix of config.prefixes) {
      if (normalizedKey.startsWith(prefix)) {
        normalizedKey = normalizedKey.replace(prefix, '');
        break;
      }
    }

    return normalizedKey
      .toLowerCase()
      .replace(new RegExp(config.separators.value, 'g'), config.separators.key);
  }

  /**
   * The config path an environment variable names, in the schema's spelling.
   *
   * The variable is upper-case and split on `_`, so lower-casing it lost the
   * case of every camelCase key: ROC_LAWS_PARETOMODE became laws.paretomode,
   * a key nothing reads (#619). Each segment is now matched against the
   * config's settings without regard to case (`*` takes any entry of a
   * free-form map, as written in lower case). `known` is false when no
   * setting matches; the path is then the lower-cased one, as before.
   */
  static resolveEnvKey(key: string): { path: string[]; known: boolean } {
    const segments = this.normalizeEnvKey(key).split(
      this.config.ENVIRONMENT_CONFIG.separators.key
    );
    if (segments.some(segment => segment.length === 0)) {
      return { path: segments, known: false };
    }
    const match = this.configKeySegments.find(
      known =>
        known.length === segments.length &&
        known.every(
          (part, index) =>
            part === '*' || part.toLowerCase() === segments[index]
        )
    );
    if (!match) return { path: segments, known: false };
    return {
      path: match.map((part, index) =>
        part === '*' ? (segments[index] ?? part) : part
      ),
      known: true,
    };
  }
}

/**
 * BundleOptimizationStrategyFileDiscoveryConstants
 *
 * Responsibility:
 * - Define file patterns and discovery configuration for bundle optimization analysis
 * - Configure directories and file types to scan
 */
export class BundleOptimizationStrategyFileDiscoveryConstants {
  /**
   * Source directory to scan
   */
  static readonly SOURCE_DIRECTORY = 'src';

  /**
   * Directories to scan for bundle optimization checks
   */
  static readonly SCAN_DIRECTORIES = ['src', 'apps', 'libs', 'config'];

  /**
   * Configuration file patterns
   */
  static readonly CONFIG_FILE_PATTERNS = {
    ANGULAR_JSON: /angular\.json$/,
    WEBPACK_CONFIG: /webpack\.config\.(js|ts)$/,
    WEBPACK_PROD: /webpack\.prod\.js$/,
    NGINX_CONFIG: /nginx\.conf$/,
    PACKAGE_JSON: /package\.json$/,
  };

  /**
   * Routing file pattern for code splitting detection
   */
  static readonly ROUTING_FILE_PATTERN = 'routing';

  /**
   * Check if file is a configuration file
   */
  static isConfigFile(filePath: string): boolean {
    return Object.values(this.CONFIG_FILE_PATTERNS).some(pattern =>
      pattern.test(filePath)
    );
  }

  /**
   * Get config file type
   */
  static getConfigFileType(filePath: string): string {
    for (const [type, pattern] of Object.entries(this.CONFIG_FILE_PATTERNS)) {
      if (pattern.test(filePath)) {
        return type;
      }
    }
    return 'UNKNOWN';
  }
}

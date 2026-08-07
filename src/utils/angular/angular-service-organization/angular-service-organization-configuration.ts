import type { RuleOfCodeConfig } from '../../../config/types';
import { SignalConfigurationBase } from '../signal-configuration-base';

/**
 * Angular Service Organization Configuration
 * Centralized configuration for service organization analysis patterns and validation messages
 * Meta-dogfooding: Centralizes hardcoded constants and service organization patterns
 */
export class AngularServiceOrganizationConfiguration extends SignalConfigurationBase {
  /**
   * Config alias for cleaner internal references (RULE 2 pattern)
   */
  private static readonly Config = AngularServiceOrganizationConfiguration;
  /**
   * Service organization detection patterns
   */
  static readonly ORGANIZATION_PATTERNS = {
    DIRECTORY_NAMES: {
      SERVICES: 'services',
      CORE: 'core',
      SHARED: 'shared',
      APP: 'app',
    },
    FILE_PATTERNS: {
      SERVICE_EXTENSION: '.service.ts',
      TYPESCRIPT_EXTENSION: '.ts',
      INDEX_FILE: 'index.ts',
    },
    DEPENDENCY_INJECTION: {
      PROVIDED_IN_ROOT: "providedIn: 'root'",
      PROVIDED_IN_ANY: 'providedIn',
    },
    SERVICE_CATEGORIES: {
      HTTP_PATTERNS: ['http', 'api'],
      DATA_PATTERNS: ['data', 'repository'],
      AUTH_PATTERNS: ['auth', 'user'],
      UTILITY_PATTERNS: ['util', 'helper'],
    },
    RESPONSIBILITY_PATTERNS: {
      HTTP_CLIENT: 'HttpClient',
      LOCAL_STORAGE: 'localStorage',
      SESSION_STORAGE: 'sessionStorage',
    },
    SKIP_DIRECTORIES: ['node_modules', 'dist', '.git', 'coverage', '.nx'],
  } as const;

  /**
   * Get service organization thresholds from config
   */
  static getThresholds(config: {
    thresholds?: {
      angular?: {
        maxServicesInDirectory?: number;
        minServicesForBarrel?: number;
      };
    };
  }) {
    return {
      MAX_SERVICES_IN_DIRECTORY:
        config.thresholds?.angular?.maxServicesInDirectory ?? 10,
      MIN_SERVICES_FOR_BARREL:
        config.thresholds?.angular?.minServicesForBarrel ?? 3,
    };
  }

  /**
   * Validation messages for service organization analysis
   */
  static readonly VALIDATION_MESSAGES = {
    ORGANIZE_SERVICES_SUGGESTION:
      'Consider organizing services in dedicated directories (services/, core/, shared/)',
    SUBDIRECTORY_SUGGESTION:
      'Consider creating subdirectories in services/ for better organization',
    BARREL_EXPORT_SUGGESTION:
      'Create index.ts barrel export in services/ directory',
    CORE_PROVIDED_IN_ROOT_SUGGESTION:
      "Core services should use providedIn: 'root' in {fileName}",
    SHARED_PROVIDED_IN_SUGGESTION:
      'Shared services should specify providedIn scope in {fileName}',
    SEPARATE_HTTP_LOGIC_SUGGESTION:
      'Consider separating HTTP logic from business logic in {fileName}',
    SEPARATE_STORAGE_LOGIC_SUGGESTION:
      'Consider separating storage logic from authentication in {fileName}',
  } as const;

  /**
   * Analyze service organization patterns
   */
  static analyzeOrganizationPatterns(
    srcPath: string,
    appPath: string,
    _config: RuleOfCodeConfig
  ): {
    hasServicesDir: boolean;
    hasCoreDir: boolean;
    hasSharedDir: boolean;
    appExists: boolean;
  } {
    return {
      hasServicesDir: this.directoryExists(
        appPath,
        this.ORGANIZATION_PATTERNS.DIRECTORY_NAMES.SERVICES
      ),
      hasCoreDir: this.directoryExists(
        appPath,
        this.ORGANIZATION_PATTERNS.DIRECTORY_NAMES.CORE
      ),
      hasSharedDir: this.directoryExists(
        appPath,
        this.ORGANIZATION_PATTERNS.DIRECTORY_NAMES.SHARED
      ),
      appExists: this.directoryExists(
        srcPath,
        this.ORGANIZATION_PATTERNS.DIRECTORY_NAMES.APP
      ),
    };
  }

  /**
   * Categorize services by naming patterns
   * RULE 2: Optimized to eliminate duplicate pattern checking via array caching
   */
  static categorizeServices(serviceFiles: string[]): Record<string, string[]> {
    // Cache pattern arrays for reuse
    const httpPatterns =
      this.ORGANIZATION_PATTERNS.SERVICE_CATEGORIES.HTTP_PATTERNS;
    const dataPatterns =
      this.ORGANIZATION_PATTERNS.SERVICE_CATEGORIES.DATA_PATTERNS;
    const authPatterns =
      this.ORGANIZATION_PATTERNS.SERVICE_CATEGORIES.AUTH_PATTERNS;
    const utilityPatterns =
      this.ORGANIZATION_PATTERNS.SERVICE_CATEGORIES.UTILITY_PATTERNS;

    // Helper to check if file matches any pattern
    const matchesPattern = (
      file: string,
      patterns: readonly string[]
    ): boolean => patterns.some(pattern => file.includes(pattern));

    // Categorize services with optimized logic
    const httpServices = serviceFiles.filter(f =>
      matchesPattern(f, httpPatterns)
    );
    const dataServices = serviceFiles.filter(f =>
      matchesPattern(f, dataPatterns)
    );
    const authServices = serviceFiles.filter(f =>
      matchesPattern(f, authPatterns)
    );
    const utilityServices = serviceFiles.filter(f =>
      matchesPattern(f, utilityPatterns)
    );

    // Business services are those not matching any other category
    const businessServices = serviceFiles.filter(
      f =>
        !matchesPattern(f, httpPatterns) &&
        !matchesPattern(f, authPatterns) &&
        !matchesPattern(f, utilityPatterns)
    );

    return {
      http: httpServices,
      data: dataServices,
      auth: authServices,
      utility: utilityServices,
      business: businessServices,
    };
  }

  /**
   * Check if entry is a service file
   */
  static isServiceFile(entry: {
    isFile: () => boolean;
    name: string;
  }): boolean {
    return (
      entry.isFile() &&
      entry.name.includes(
        this.ORGANIZATION_PATTERNS.FILE_PATTERNS.SERVICE_EXTENSION
      )
    );
  }

  /**
   * Check if directory should be skipped
   */
  static shouldSkipDirectory(dirname: string): boolean {
    return (
      this.ORGANIZATION_PATTERNS.SKIP_DIRECTORIES as readonly string[]
    ).includes(dirname);
  }

  /**
   * Check if a directory exists (using import to avoid circular dependency)
   */
  private static directoryExists(_basePath: string, _dirName: string): boolean {
    // This will be implemented by the validation patterns class
    // to avoid circular dependencies with FileUtils
    return false;
  }
}

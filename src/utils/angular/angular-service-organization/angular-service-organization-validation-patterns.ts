import type { RuleOfCodeConfig } from '../../../config/types';
import { DIRECTORY_NAMES } from '../../constants';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import type { AngularAnalysisResult } from '../../result-interfaces';
import { ResultFactory } from '../../result-interfaces';
import { AngularConfigurationBase } from '../angular-configuration-base';
import { AngularServiceOrganizationConfiguration } from './angular-service-organization-configuration';

/**
 * Angular Service Organization Validation Patterns
 * Centralized validation methods for service organization analysis
 */
export class AngularServiceOrganizationValidationPatterns extends AngularConfigurationBase {
  private static readonly Config = AngularServiceOrganizationConfiguration;
  private static readonly FILE_NAME_PLACEHOLDER = '{fileName}';
  private static readonly CATEGORY_BUSINESS = 'business';
  private static readonly CATEGORY_AUTH = 'auth';

  /**
   * Validate all service organization patterns in a project
   */
  static validateAllServiceOrganizationPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): AngularAnalysisResult {
    const { violations, suggestions } =
      AngularServiceOrganizationValidationPatterns.initializeAnalysis(
        projectRoot,
        ['.ts'],
        config
      );

    const srcPath = PathOperations.join(projectRoot, DIRECTORY_NAMES.SRC);
    if (!FileUtils.exists(srcPath)) {
      return ResultFactory.createAngularResult([], []);
    }

    // Validate directory structures
    this.validateDirectoryStructures(srcPath, suggestions, config);

    // Validate service categorization
    this.validateCategorization(srcPath, suggestions, config);

    return ResultFactory.createAngularResult(violations, suggestions);
  }

  /**
   * Validate root app directory structure
   */
  private static validateDirectoryStructures(
    srcPath: string,
    suggestions: string[],
    config: RuleOfCodeConfig
  ): void {
    const appPath = PathOperations.join(srcPath, DIRECTORY_NAMES.APP);
    if (!FileUtils.exists(appPath)) return;

    // Check directory existence
    const hasServicesDir = FileUtils.exists(
      PathOperations.join(
        appPath,
        this.Config.ORGANIZATION_PATTERNS.DIRECTORY_NAMES.SERVICES
      )
    );
    const hasCoreDir = FileUtils.exists(
      PathOperations.join(
        appPath,
        this.Config.ORGANIZATION_PATTERNS.DIRECTORY_NAMES.CORE
      )
    );
    const hasSharedDir = FileUtils.exists(
      PathOperations.join(
        appPath,
        this.Config.ORGANIZATION_PATTERNS.DIRECTORY_NAMES.SHARED
      )
    );

    // Check for unorganized services
    this.checkUnorganizedServices(
      appPath,
      hasServicesDir,
      hasCoreDir,
      suggestions,
      config
    );

    // Validate each directory type
    if (hasServicesDir) {
      this.validateServicesDir(appPath, suggestions, config);
    }
    if (hasCoreDir) {
      this.validateCoreDir(appPath, suggestions, config);
    }
    if (hasSharedDir) {
      this.validateSharedDir(appPath, suggestions, config);
    }
  }

  /**
   * Check if services in root app need organization
   */
  private static checkUnorganizedServices(
    appPath: string,
    hasServicesDir: boolean,
    hasCoreDir: boolean,
    suggestions: string[],
    config: RuleOfCodeConfig
  ): void {
    const appFiles = FileUtils.safeReadDirectory(appPath, config);
    const serviceFilesInRoot = appFiles.filter(file =>
      this.Config.isServiceFile(file)
    );

    if (serviceFilesInRoot.length > 0 && !hasServicesDir && !hasCoreDir) {
      suggestions.push(
        this.Config.VALIDATION_MESSAGES.ORGANIZE_SERVICES_SUGGESTION
      );
    }
  }

  /**
   * Validate services directory structure and barrel exports
   */
  private static validateServicesDir(
    appPath: string,
    suggestions: string[],
    config: RuleOfCodeConfig
  ): void {
    const servicesPath = PathOperations.join(
      appPath,
      this.Config.ORGANIZATION_PATTERNS.DIRECTORY_NAMES.SERVICES
    );
    const entries = FileUtils.safeReadDirectory(servicesPath, config);
    const serviceFiles = entries.filter(entry =>
      this.Config.isServiceFile(entry)
    );

    // Check size threshold
    const thresholds = this.Config.getThresholds(config);
    if (serviceFiles.length > thresholds.MAX_SERVICES_IN_DIRECTORY) {
      suggestions.push(this.Config.VALIDATION_MESSAGES.SUBDIRECTORY_SUGGESTION);
    }

    // Check barrel export
    const hasIndex = entries.some(
      entry =>
        entry.isFile() &&
        entry.name ===
          this.Config.ORGANIZATION_PATTERNS.FILE_PATTERNS.INDEX_FILE
    );
    if (!hasIndex && serviceFiles.length > thresholds.MIN_SERVICES_FOR_BARREL) {
      suggestions.push(
        this.Config.VALIDATION_MESSAGES.BARREL_EXPORT_SUGGESTION
      );
    }
  }

  /**
   * Validate core directory singleton services
   */
  private static validateCoreDir(
    appPath: string,
    suggestions: string[],
    config: RuleOfCodeConfig
  ): void {
    const corePath = PathOperations.join(
      appPath,
      this.Config.ORGANIZATION_PATTERNS.DIRECTORY_NAMES.CORE
    );
    const entries = FileUtils.safeReadDirectory(corePath, config);
    const serviceFiles = entries.filter(entry =>
      this.Config.isServiceFile(entry)
    );

    for (const serviceFile of serviceFiles) {
      const fullPath = PathOperations.join(corePath, serviceFile.name);
      const content = FileUtils.readFile(fullPath, {
        encoding: 'utf8',
        fallbackToEmpty: true,
      });

      if (
        content &&
        !content.includes(
          this.Config.ORGANIZATION_PATTERNS.DEPENDENCY_INJECTION
            .PROVIDED_IN_ROOT
        )
      ) {
        suggestions.push(
          this.Config.VALIDATION_MESSAGES.CORE_PROVIDED_IN_ROOT_SUGGESTION.replace(
            this.FILE_NAME_PLACEHOLDER,
            serviceFile.name
          )
        );
      }
    }
  }

  /**
   * Validate shared directory utility services
   */
  private static validateSharedDir(
    appPath: string,
    suggestions: string[],
    config: RuleOfCodeConfig
  ): void {
    const sharedPath = PathOperations.join(
      appPath,
      this.Config.ORGANIZATION_PATTERNS.DIRECTORY_NAMES.SHARED
    );
    const entries = FileUtils.safeReadDirectory(sharedPath, config);
    const serviceFiles = entries.filter(entry =>
      this.Config.isServiceFile(entry)
    );

    for (const serviceFile of serviceFiles) {
      const isUtilityService =
        this.Config.ORGANIZATION_PATTERNS.SERVICE_CATEGORIES.UTILITY_PATTERNS.some(
          pattern => serviceFile.name.includes(pattern)
        );

      if (!isUtilityService) {
        const fullPath = PathOperations.join(sharedPath, serviceFile.name);
        const content = FileUtils.readFile(fullPath, {
          encoding: 'utf8',
          fallbackToEmpty: true,
        });

        if (
          content &&
          !content.includes(
            this.Config.ORGANIZATION_PATTERNS.DEPENDENCY_INJECTION
              .PROVIDED_IN_ANY
          )
        ) {
          suggestions.push(
            this.Config.VALIDATION_MESSAGES.SHARED_PROVIDED_IN_SUGGESTION.replace(
              this.FILE_NAME_PLACEHOLDER,
              serviceFile.name
            )
          );
        }
      }
    }
  }

  /**
   * Validate service categorization and responsibilities
   */
  private static validateCategorization(
    srcPath: string,
    suggestions: string[],
    config: RuleOfCodeConfig
  ): void {
    const serviceFiles = this.findAllServiceFiles(srcPath, config);
    const categories = this.Config.categorizeServices(serviceFiles);

    // Check each categorized service
    for (const [category, files] of Object.entries(categories)) {
      for (const file of files) {
        this.checkServiceResponsibilities(file, category, suggestions);
      }
    }
  }

  /**
   * Check for mixed responsibilities in a service file
   */
  private static checkServiceResponsibilities(
    file: string,
    category: string,
    suggestions: string[]
  ): void {
    const content = FileUtils.readFile(file, {
      encoding: 'utf8',
      fallbackToEmpty: true,
    });
    if (!content) return;

    const fileName = PathOperations.getBasename(file);

    // Check for HTTP logic in business services
    if (
      category === this.CATEGORY_BUSINESS &&
      content.includes(
        this.Config.ORGANIZATION_PATTERNS.RESPONSIBILITY_PATTERNS.HTTP_CLIENT
      )
    ) {
      suggestions.push(
        this.Config.VALIDATION_MESSAGES.SEPARATE_HTTP_LOGIC_SUGGESTION.replace(
          this.FILE_NAME_PLACEHOLDER,
          fileName
        )
      );
    }

    // Check for storage logic in auth services
    const hasStorageLogic =
      content.includes(
        this.Config.ORGANIZATION_PATTERNS.RESPONSIBILITY_PATTERNS.LOCAL_STORAGE
      ) ||
      content.includes(
        this.Config.ORGANIZATION_PATTERNS.RESPONSIBILITY_PATTERNS
          .SESSION_STORAGE
      );
    if (category === this.CATEGORY_AUTH && hasStorageLogic) {
      suggestions.push(
        this.Config.VALIDATION_MESSAGES.SEPARATE_STORAGE_LOGIC_SUGGESTION.replace(
          this.FILE_NAME_PLACEHOLDER,
          fileName
        )
      );
    }
  }

  /**
   * Find all service files recursively
   */
  private static findAllServiceFiles(
    srcPath: string,
    config: RuleOfCodeConfig
  ): string[] {
    const serviceFiles: string[] = [];

    const searchRecursively = (dirPath: string): void => {
      const entries = FileUtils.safeReadDirectory(dirPath, config);

      for (const entry of entries) {
        const fullPath = PathOperations.join(dirPath, entry.name);

        if (
          entry.isDirectory() &&
          !this.Config.shouldSkipDirectory(entry.name)
        ) {
          searchRecursively(fullPath);
        } else if (this.Config.isServiceFile(entry)) {
          serviceFiles.push(fullPath);
        }
      }
    };

    searchRecursively(srcPath);
    return serviceFiles;
  }
}

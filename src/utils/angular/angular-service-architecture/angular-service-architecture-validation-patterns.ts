import type { RuleOfCodeConfig } from '../../../config/types';
import { ANGULAR_CONSTANTS } from '../../constants';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { AngularConfigurationBase } from '../angular-configuration-base';
import { AngularServiceArchitectureConfiguration } from './angular-service-architecture-configuration';

/**
 * Angular Service Architecture Validation Patterns
 * Centralized validation methods for service architecture analysis
 */
export class AngularServiceArchitectureValidationPatterns extends AngularConfigurationBase {
  private static readonly Config = AngularServiceArchitectureConfiguration;
  private static readonly FILE_NAME_PLACEHOLDER = '{fileName}';
  private static readonly METHOD_COUNT_PLACEHOLDER = '{methodCount}';
  /**
   * Validate all service architecture patterns in a project
   */
  static validateAllServicePatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const {
      violations,
      suggestions,
      files: serviceFiles,
    } = AngularServiceArchitectureValidationPatterns.initializeAnalysis(
      projectRoot,
      [ANGULAR_CONSTANTS.SERVICE_TS],
      config
    );

    if (serviceFiles.length === 0) {
      suggestions.push(this.Config.VALIDATION_MESSAGES.NO_SERVICES_SUGGESTION);
      return { violations, suggestions };
    }

    for (const serviceFile of serviceFiles) {
      this.analyzeServiceFile(serviceFile, violations, suggestions, config);
    }

    return { violations, suggestions };
  }

  /**
   * Analyze a single service file for architecture patterns
   */
  static analyzeServiceFile(
    serviceFile: string,
    violations: string[],
    suggestions: string[],
    config: RuleOfCodeConfig
  ): void {
    const content = FileUtils.readFile(serviceFile, {
      encoding: 'utf8',
      fallbackToEmpty: true,
    });
    if (!content) return;

    const fileName = PathOperations.getBasename(serviceFile);

    this.validateServiceStructurePatterns(
      content,
      fileName,
      violations,
      suggestions
    );
    this.validateServiceArchitecturePatterns(
      content,
      fileName,
      violations,
      suggestions,
      config
    );
  }

  /**
   * Validate service structure patterns
   */
  static validateServiceStructurePatterns(
    content: string,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const patterns = this.Config.analyzeServicePatterns(content);

    // Check for Injectable decorator
    if (!patterns.hasInjectableDecorator) {
      violations.push(
        this.Config.VALIDATION_MESSAGES.MISSING_INJECTABLE_VIOLATION.replace(
          this.FILE_NAME_PLACEHOLDER,
          fileName
        )
      );
      suggestions.push(
        this.Config.VALIDATION_MESSAGES.MISSING_INJECTABLE_SUGGESTION.replace(
          this.FILE_NAME_PLACEHOLDER,
          fileName
        )
      );
    }

    // Check for providedIn root
    if (patterns.hasInjectableDecorator && !patterns.hasProvidedIn) {
      suggestions.push(
        this.Config.VALIDATION_MESSAGES.PROVIDED_IN_ROOT_SUGGESTION.replace(
          this.FILE_NAME_PLACEHOLDER,
          fileName
        )
      );
    }

    // Check for constructor injection patterns
    if (patterns.hasConstructor && !patterns.hasAccessModifiers) {
      suggestions.push(
        this.Config.VALIDATION_MESSAGES.ACCESS_MODIFIERS_SUGGESTION.replace(
          this.FILE_NAME_PLACEHOLDER,
          fileName
        )
      );
    }
  }

  /**
   * Validate service architecture patterns
   */
  static validateServiceArchitecturePatterns(
    content: string,
    fileName: string,
    violations: string[],
    suggestions: string[],
    config: RuleOfCodeConfig
  ): void {
    const patterns = this.Config.analyzeServicePatterns(content);

    // Check for interface implementation
    if (patterns.hasServiceClass && !patterns.hasImplementsKeyword) {
      suggestions.push(
        this.Config.VALIDATION_MESSAGES.INTERFACE_IMPLEMENTATION_SUGGESTION.replace(
          this.FILE_NAME_PLACEHOLDER,
          fileName
        )
      );
    }

    // Check for single responsibility
    const thresholds = this.Config.getThresholds(config);
    if (patterns.methodCount > thresholds.MAX_METHODS_PER_SERVICE) {
      suggestions.push(
        this.Config.VALIDATION_MESSAGES.SINGLE_RESPONSIBILITY_SUGGESTION.replace(
          this.FILE_NAME_PLACEHOLDER,
          fileName
        ).replace(
          this.METHOD_COUNT_PLACEHOLDER,
          patterns.methodCount.toString()
        )
      );
    }

    // Check for proper return types
    if (patterns.hasObservable && !patterns.hasObservableImport) {
      violations.push(
        this.Config.VALIDATION_MESSAGES.OBSERVABLE_IMPORT_VIOLATION.replace(
          this.FILE_NAME_PLACEHOLDER,
          fileName
        )
      );
      suggestions.push(
        this.Config.VALIDATION_MESSAGES.OBSERVABLE_IMPORT_SUGGESTION.replace(
          this.FILE_NAME_PLACEHOLDER,
          fileName
        )
      );
    }

    // Check for HTTP service patterns
    if (patterns.hasHttpClient) {
      if (!patterns.hasHttpClientInjection) {
        suggestions.push(
          this.Config.VALIDATION_MESSAGES.HTTP_CLIENT_INJECTION_SUGGESTION.replace(
            this.FILE_NAME_PLACEHOLDER,
            fileName
          )
        );
      }

      // Check for proper error handling
      if (!patterns.hasCatchError && patterns.hasHttpReference) {
        suggestions.push(
          this.Config.VALIDATION_MESSAGES.ERROR_HANDLING_SUGGESTION.replace(
            this.FILE_NAME_PLACEHOLDER,
            fileName
          )
        );
      }
    }
  }
}

import { ANGULAR_CONSTANTS, DIRECTORY_NAMES } from '../../constants';
import { PatternMatchingUtils } from '../../pattern-matching-utils';
import { SignalConfigurationBase } from '../signal-configuration-base';

/**
 * Angular Form Validation Configuration
 * Centralized configuration for form validation patterns analysis
 * Meta-dogfooding: Centralizes hardcoded constants and validation patterns
 */
export class AngularFormValidationConfiguration extends SignalConfigurationBase {
  /**
   * Config alias for cleaner internal references (RULE 2 pattern)
   */
  private static readonly Config = AngularFormValidationConfiguration;

  /**
   * File extensions for form validation analysis
   */
  static readonly ANGULAR_FILE_EXTENSIONS = [ANGULAR_CONSTANTS.COMPONENT_TS];

  /**
   * Directory configuration for form validation analysis
   */
  static readonly DIRECTORIES = {
    SRC: DIRECTORY_NAMES.SRC,
  };

  /**
   * Form validation constants and patterns
   */
  static readonly FORM_PATTERNS = {
    // Form control patterns
    FORM_CONTROL: ANGULAR_CONSTANTS.FORM_CONTROL,
    FORM_GROUP: ANGULAR_CONSTANTS.FORM_GROUP,

    // Validator patterns
    VALIDATORS_REQUIRED: ANGULAR_CONSTANTS.VALIDATORS_REQUIRED,
    REQUIRED: ANGULAR_CONSTANTS.REQUIRED,
    EMAIL: ANGULAR_CONSTANTS.EMAIL,
    VALIDATORS_EMAIL: ANGULAR_CONSTANTS.VALIDATORS_EMAIL,

    // Template patterns
    ERRORS: ANGULAR_CONSTANTS.ERRORS,
    INVALID: ANGULAR_CONSTANTS.INVALID,

    // File extensions
    COMPONENT_TS: ANGULAR_CONSTANTS.COMPONENT_TS,
    COMPONENT_HTML: ANGULAR_CONSTANTS.COMPONENT_HTML,
  };

  /**
   * Validation message constants
   */
  static readonly VALIDATION_MESSAGES = {
    REQUIRED_VALIDATION: ANGULAR_CONSTANTS.MSG_REQUIRED_VALIDATION,
    EMAIL_VALIDATION: ANGULAR_CONSTANTS.MSG_EMAIL_VALIDATION,
    TEMPLATE_ERROR_DISPLAY: ANGULAR_CONSTANTS.MSG_TEMPLATE_ERROR_DISPLAY,
    TEMPLATE_ERRORS_MISSING: ANGULAR_CONSTANTS.MSG_TEMPLATE_ERRORS_MISSING,
  };

  /**
   * File processing configuration
   */
  static readonly FILE_CONFIG = {
    ENCODING: 'utf8' as const,
    FALLBACK_TO_EMPTY: true,
  };

  /**
   * Analyze form validation patterns in component content
   * RULE 2: Optimized to eliminate duplicate pattern checks via helper method
   */
  static analyzeFormValidationPatterns(
    content: string,
    filePath: string
  ): {
    fileName: string;
    hasFormControls: boolean;
    hasFormGroup: boolean;
    hasValidatorsRequired: boolean;
    hasRequired: boolean;
    hasEmail: boolean;
    hasValidatorsEmail: boolean;
    hasErrors: boolean;
    hasInvalid: boolean;
  } {
    const fileName = filePath.split('/').pop() ?? filePath;

    // Cache patterns for reuse
    const formControl = this.FORM_PATTERNS.FORM_CONTROL;
    const formGroup = this.FORM_PATTERNS.FORM_GROUP;
    const validatorsRequired = this.FORM_PATTERNS.VALIDATORS_REQUIRED;
    const required = this.FORM_PATTERNS.REQUIRED;
    const email = this.FORM_PATTERNS.EMAIL;
    const validatorsEmail = this.FORM_PATTERNS.VALIDATORS_EMAIL;
    const errors = this.FORM_PATTERNS.ERRORS;
    const invalid = this.FORM_PATTERNS.INVALID;

    // RULE 1: Use centralized PatternMatchingUtils instead of duplicate logic
    return {
      fileName,
      hasFormControls:
        PatternMatchingUtils.hasPattern(content, formControl) ||
        PatternMatchingUtils.hasPattern(content, formGroup),
      hasFormGroup: PatternMatchingUtils.hasPattern(content, formGroup),
      hasValidatorsRequired: PatternMatchingUtils.hasPattern(
        content,
        validatorsRequired
      ),
      hasRequired: PatternMatchingUtils.hasPattern(content, required),
      hasEmail: PatternMatchingUtils.hasPattern(content, email),
      hasValidatorsEmail: PatternMatchingUtils.hasPattern(
        content,
        validatorsEmail
      ),
      hasErrors: PatternMatchingUtils.hasPattern(content, errors),
      hasInvalid: PatternMatchingUtils.hasPattern(content, invalid),
    };
  }

  /**
   * Get template path from component path
   */
  static getTemplatePath(componentFilePath: string): string {
    return componentFilePath.replace(
      this.FORM_PATTERNS.COMPONENT_TS,
      this.FORM_PATTERNS.COMPONENT_HTML
    );
  }

  /**
   * Analyze template validation patterns
   * RULE 2: Optimized to eliminate duplicate pattern checks via helper method
   */
  static analyzeTemplateValidationPatterns(
    templateContent: string,
    templatePath: string
  ): {
    templatePath: string;
    hasErrors: boolean;
    hasInvalid: boolean;
    hasErrorDisplay: boolean;
  } {
    // Cache patterns for reuse
    const errors = this.FORM_PATTERNS.ERRORS;
    const invalid = this.FORM_PATTERNS.INVALID;

    // RULE 1: Use centralized PatternMatchingUtils instead of duplicate logic
    const hasErrors = PatternMatchingUtils.hasPattern(templateContent, errors);
    const hasInvalid = PatternMatchingUtils.hasPattern(
      templateContent,
      invalid
    );

    return {
      templatePath,
      hasErrors,
      hasInvalid,
      hasErrorDisplay: hasErrors || hasInvalid,
    };
  }

  /**
   * Build validation suggestions configuration
   */
  static buildValidationSuggestions(
    patterns: ReturnType<
      typeof AngularFormValidationConfiguration.analyzeFormValidationPatterns
    >
  ): Array<{
    condition: boolean;
    suggestionMessage: string;
  }> {
    return [
      {
        condition: !patterns.hasValidatorsRequired && !patterns.hasRequired,
        suggestionMessage: this.VALIDATION_MESSAGES.REQUIRED_VALIDATION,
      },
      {
        condition: patterns.hasEmail && !patterns.hasValidatorsEmail,
        suggestionMessage: this.VALIDATION_MESSAGES.EMAIL_VALIDATION,
      },
    ];
  }

  /**
   * Build template validation suggestions configuration
   */
  static buildTemplateValidationSuggestions(
    templatePatterns: ReturnType<
      typeof AngularFormValidationConfiguration.analyzeTemplateValidationPatterns
    >
  ): Array<{
    condition: boolean;
    suggestionMessage: string;
  }> {
    return [
      {
        condition: !templatePatterns.hasErrorDisplay,
        suggestionMessage: this.VALIDATION_MESSAGES.TEMPLATE_ERROR_DISPLAY,
      },
    ];
  }
}

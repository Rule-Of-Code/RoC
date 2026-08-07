import { AngularCustomValidatorsConfiguration } from './angular-custom-validators-configuration';

/**
 * Angular custom validators validation patterns
 * Meta-dogfooding: Centralized custom validators validation logic for Angular components
 */
export class AngularCustomValidatorsValidationPatterns {
  private static readonly Config = AngularCustomValidatorsConfiguration;
  /**
   * Validate validator return type patterns
   * Meta-dogfooding: Uses centralized pattern detection and validation messages
   */
  static validateValidatorReturnType(
    patterns: ReturnType<
      typeof AngularCustomValidatorsConfiguration.analyzeValidatorPatterns
    >,
    violations: string[],
    suggestions: string[]
  ): void {
    if (!patterns.hasProperReturnType) {
      const message =
        this.Config.VALIDATION_MESSAGES.INVALID_VALIDATOR_RETURN_TYPE(
          patterns.fileName
        );
      violations.push(message.violationMessage);
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate async validator patterns
   * Meta-dogfooding: Uses centralized pattern detection and validation messages
   */
  static validateAsyncValidatorPattern(
    patterns: ReturnType<
      typeof AngularCustomValidatorsConfiguration.analyzeValidatorPatterns
    >,
    violations: string[],
    suggestions: string[]
  ): void {
    if (patterns.hasAsyncValidator && !patterns.hasAsyncReturnType) {
      const message =
        this.Config.VALIDATION_MESSAGES.INVALID_ASYNC_VALIDATOR_RETURN(
          patterns.fileName
        );
      violations.push(message.violationMessage);
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate validator export patterns
   * Meta-dogfooding: Uses centralized pattern detection and validation messages
   */
  static validateValidatorExport(
    patterns: ReturnType<
      typeof AngularCustomValidatorsConfiguration.analyzeValidatorPatterns
    >,
    suggestions: string[]
  ): void {
    if (!patterns.hasValidatorExport) {
      const message =
        this.Config.VALIDATION_MESSAGES.SUGGEST_REUSABLE_VALIDATORS(
          patterns.fileName
        );
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate form control validators
   * Meta-dogfooding: Uses centralized pattern detection and validation messages
   */
  static validateFormControlValidators(
    patterns: ReturnType<
      typeof AngularCustomValidatorsConfiguration.analyzeComponentPatterns
    >,
    suggestions: string[]
  ): void {
    if (patterns.hasFormControl && !patterns.hasValidatorsUsage) {
      const message =
        this.Config.VALIDATION_MESSAGES.SUGGEST_ADD_VALIDATORS_TO_CONTROL(
          patterns.fileName
        );
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate cross field validation patterns
   * Meta-dogfooding: Uses centralized pattern detection and validation messages
   */
  static validateCrossFieldValidation(
    patterns: ReturnType<
      typeof AngularCustomValidatorsConfiguration.analyzeComponentPatterns
    >,
    suggestions: string[]
  ): void {
    if (
      patterns.hasFormGroup &&
      patterns.hasPasswordFields &&
      !patterns.hasMatchValidator
    ) {
      const message = this.Config.VALIDATION_MESSAGES.SUGGEST_PASSWORD_MATCHING(
        patterns.fileName
      );
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate validation error display patterns
   * Meta-dogfooding: Uses centralized pattern detection and validation messages
   */
  static validateValidationErrorDisplay(
    patterns: ReturnType<
      typeof AngularCustomValidatorsConfiguration.analyzeComponentPatterns
    >,
    suggestions: string[]
  ): void {
    if (patterns.hasFormControl && !patterns.hasErrorHandling) {
      const message =
        this.Config.VALIDATION_MESSAGES.SUGGEST_ADD_ERROR_HANDLING(
          patterns.fileName
        );
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate all validator patterns - master validation method for validator files
   * Meta-dogfooding: Orchestrates all validator validation patterns
   */
  static validateAllValidatorPatterns(
    patterns: ReturnType<
      typeof AngularCustomValidatorsConfiguration.analyzeValidatorPatterns
    >,
    violations: string[],
    suggestions: string[]
  ): void {
    this.validateValidatorReturnType(patterns, violations, suggestions);
    this.validateAsyncValidatorPattern(patterns, violations, suggestions);
    this.validateValidatorExport(patterns, suggestions);
  }

  /**
   * Validate all component patterns - master validation method for component files
   * Meta-dogfooding: Orchestrates all component validation patterns
   */
  static validateAllComponentPatterns(
    patterns: ReturnType<
      typeof AngularCustomValidatorsConfiguration.analyzeComponentPatterns
    >,
    suggestions: string[]
  ): void {
    this.validateFormControlValidators(patterns, suggestions);
    this.validateCrossFieldValidation(patterns, suggestions);
    this.validateValidationErrorDisplay(patterns, suggestions);
  }
}

import { ANGULAR_CONSTANTS, FILE_EXTENSIONS } from '../../constants';

/**
 * Angular Custom Validators Configuration
 * Meta-dogfooding: Centralized configuration, patterns, and detection logic for Angular custom validators analysis
 */
export class AngularCustomValidatorsConfiguration {
  /**
   * Angular file extensions for custom validators analysis
   * Eliminates hardcoded extension arrays
   */
  static readonly VALIDATOR_FILE_EXTENSIONS = [
    FILE_EXTENSIONS.VALIDATOR_TS,
    FILE_EXTENSIONS.VALIDATORS_TS,
  ] as const;

  static readonly COMPONENT_FILE_EXTENSIONS = [
    FILE_EXTENSIONS.COMPONENT_TS,
  ] as const;

  /**
   * Custom validators validation messages - eliminates hardcoded strings
   */
  static readonly VALIDATION_MESSAGES = {
    INVALID_VALIDATOR_RETURN_TYPE: (
      fileName: string
    ): { violationMessage: string; suggestionMessage: string } => ({
      violationMessage: `Custom validator should return ${ANGULAR_CONSTANTS.VALIDATION_ERRORS} | ${ANGULAR_CONSTANTS.NULL} in ${fileName}`,
      suggestionMessage: `Use proper return type ${ANGULAR_CONSTANTS.VALIDATION_ERRORS} | ${ANGULAR_CONSTANTS.NULL} for validators in ${fileName}`,
    }),

    INVALID_ASYNC_VALIDATOR_RETURN: (
      fileName: string
    ): { violationMessage: string; suggestionMessage: string } => ({
      violationMessage: `Async validator should return ${ANGULAR_CONSTANTS.OBSERVABLE} or ${ANGULAR_CONSTANTS.PROMISE} in ${fileName}`,
      suggestionMessage: `Return ${ANGULAR_CONSTANTS.OBSERVABLE}<${ANGULAR_CONSTANTS.VALIDATION_ERRORS} | ${ANGULAR_CONSTANTS.NULL}> from async validator in ${fileName}`,
    }),

    SUGGEST_REUSABLE_VALIDATORS: (
      fileName: string
    ): { suggestionMessage: string } => ({
      suggestionMessage: ANGULAR_CONSTANTS.MSG_REUSABLE_VALIDATORS.replace(
        'in ',
        `in ${fileName}`
      ),
    }),

    SUGGEST_ADD_VALIDATORS_TO_CONTROL: (
      fileName: string
    ): { suggestionMessage: string } => ({
      suggestionMessage:
        ANGULAR_CONSTANTS.MSG_ADD_VALIDATORS_TO_CONTROL.replace(
          'in ',
          `in ${fileName}`
        ),
    }),

    SUGGEST_PASSWORD_MATCHING: (
      fileName: string
    ): { suggestionMessage: string } => ({
      suggestionMessage: ANGULAR_CONSTANTS.MSG_PASSWORD_MATCHING.replace(
        'in ',
        `in ${fileName}`
      ),
    }),

    SUGGEST_ADD_ERROR_HANDLING: (
      fileName: string
    ): { suggestionMessage: string } => ({
      suggestionMessage: ANGULAR_CONSTANTS.MSG_ADD_ERROR_HANDLING.replace(
        'in ',
        `in ${fileName}`
      ),
    }),
  };

  /**
   * Custom validators pattern detectors - centralized detection logic
   */
  static readonly PATTERN_DETECTORS = {
    HAS_VALIDATOR_FUNCTION: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.VALIDATOR_FN) ||
      content.includes(ANGULAR_CONSTANTS.ABSTRACT_CONTROL),

    HAS_PROPER_VALIDATOR_RETURN_TYPE: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.VALIDATION_ERRORS) &&
      content.includes(ANGULAR_CONSTANTS.NULL),

    HAS_ASYNC_VALIDATOR: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.ASYNC_VALIDATOR_FN),

    HAS_ASYNC_RETURN_TYPE: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.OBSERVABLE) ||
      content.includes(ANGULAR_CONSTANTS.PROMISE),

    HAS_VALIDATOR_EXPORT: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.EXPORT) &&
      (content.includes(ANGULAR_CONSTANTS.FUNCTION) ||
        content.includes(ANGULAR_CONSTANTS.CONST)),

    HAS_FORM_CONTROL: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.FORM_CONTROL),

    HAS_VALIDATORS_USAGE: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.VALIDATORS_DOT) ||
      content.includes('['),

    HAS_FORM_GROUP: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.FORM_GROUP),

    HAS_PASSWORD_FIELDS: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.PASSWORD) &&
      content.includes(ANGULAR_CONSTANTS.CONFIRM),

    HAS_MATCH_VALIDATOR: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.MATCH_VALIDATOR),

    HAS_ERROR_HANDLING: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.HAS_ERROR) ||
      content.includes(ANGULAR_CONSTANTS.ERRORS),
  };

  /**
   * Analyze validator file patterns
   * Meta-dogfooding: Centralized pattern analysis for validator files
   */
  static analyzeValidatorPatterns(
    content: string,
    filePath: string
  ): {
    hasValidatorFunction: boolean;
    hasProperReturnType: boolean;
    hasAsyncValidator: boolean;
    hasAsyncReturnType: boolean;
    hasValidatorExport: boolean;
    fileName: string;
    filePath: string;
  } {
    return {
      hasValidatorFunction:
        this.PATTERN_DETECTORS.HAS_VALIDATOR_FUNCTION(content),
      hasProperReturnType:
        this.PATTERN_DETECTORS.HAS_PROPER_VALIDATOR_RETURN_TYPE(content),
      hasAsyncValidator: this.PATTERN_DETECTORS.HAS_ASYNC_VALIDATOR(content),
      hasAsyncReturnType: this.PATTERN_DETECTORS.HAS_ASYNC_RETURN_TYPE(content),
      hasValidatorExport: this.PATTERN_DETECTORS.HAS_VALIDATOR_EXPORT(content),
      fileName: filePath.split('/').pop() ?? '',
      filePath,
    };
  }

  /**
   * Analyze component file patterns for validation usage
   * Meta-dogfooding: Centralized pattern analysis for component files
   */
  static analyzeComponentPatterns(
    content: string,
    filePath: string
  ): {
    hasFormControl: boolean;
    hasValidatorsUsage: boolean;
    hasFormGroup: boolean;
    hasPasswordFields: boolean;
    hasMatchValidator: boolean;
    hasErrorHandling: boolean;
    fileName: string;
    filePath: string;
  } {
    return {
      hasFormControl: this.PATTERN_DETECTORS.HAS_FORM_CONTROL(content),
      hasValidatorsUsage: this.PATTERN_DETECTORS.HAS_VALIDATORS_USAGE(content),
      hasFormGroup: this.PATTERN_DETECTORS.HAS_FORM_GROUP(content),
      hasPasswordFields: this.PATTERN_DETECTORS.HAS_PASSWORD_FIELDS(content),
      hasMatchValidator: this.PATTERN_DETECTORS.HAS_MATCH_VALIDATOR(content),
      hasErrorHandling: this.PATTERN_DETECTORS.HAS_ERROR_HANDLING(content),
      fileName: filePath.split('/').pop() ?? '',
      filePath,
    };
  }
}

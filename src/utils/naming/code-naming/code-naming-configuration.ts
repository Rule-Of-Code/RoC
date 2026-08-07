import {
  CODE_NAMING_MESSAGES,
  NAMING_CONVENTIONS,
  REGEX_PATTERNS,
} from '../../constants';

/**
 * Code Naming Configuration
 * Centralized configuration for code naming patterns and conventions
 */
export class CodeNamingConfiguration {
  /**
   * Get naming pattern regexes
   */
  static getNamingPatterns(_config: Record<string, unknown> = {}): {
    variable: RegExp;
    function: RegExp;
    class: RegExp;
    interface: RegExp;
    method: RegExp;
  } {
    return {
      variable: REGEX_PATTERNS.VARIABLE_DECLARATION,
      function: REGEX_PATTERNS.FUNCTION_DECLARATION,
      class: REGEX_PATTERNS.CLASS_DECLARATION,
      interface: REGEX_PATTERNS.INTERFACE_DECLARATION,
      method: REGEX_PATTERNS.METHOD_DECLARATION,
    };
  }

  /**
   * Get case validation patterns
   */
  static getCasePatterns(_config: Record<string, unknown> = {}): {
    camelCase: RegExp;
    pascalCase: RegExp;
    invalidChars: RegExp;
  } {
    return {
      camelCase: REGEX_PATTERNS.CAMEL_CASE,
      pascalCase: REGEX_PATTERNS.PASCAL_CASE,
      invalidChars: REGEX_PATTERNS.INVALID_CHARS,
    };
  }

  /**
   * Get allowed short names
   */
  static getAllowedShortNames(_config: Record<string, unknown> = {}): string[] {
    return [...NAMING_CONVENTIONS.ALLOWED_SHORT_NAMES];
  }

  /**
   * Get common pattern exceptions
   */
  static getCommonPatterns(_config: Record<string, unknown> = {}): string[] {
    return [...NAMING_CONVENTIONS.COMMON_EXCEPTIONS];
  }

  /**
   * Get Angular lifecycle methods
   */
  static getAngularLifecycleMethods(
    _config: Record<string, unknown> = {}
  ): string[] {
    return [...NAMING_CONVENTIONS.ANGULAR_LIFECYCLE];
  }

  /**
   * Get analysis configuration
   */
  static getAnalysisConfig(_config: Record<string, unknown> = {}): {
    maxFilesToAnalyze: number;
    maxViolationsPerFile: number;
    maxExampleViolations: number;
    maxExamplesPerViolation: number;
  } {
    return {
      maxFilesToAnalyze:
        NAMING_CONVENTIONS.ANALYSIS_THRESHOLDS.MAX_FILES_TO_ANALYZE,
      maxViolationsPerFile:
        NAMING_CONVENTIONS.ANALYSIS_THRESHOLDS.MAX_VIOLATIONS_PER_FILE,
      maxExampleViolations:
        NAMING_CONVENTIONS.ANALYSIS_THRESHOLDS.MAX_EXAMPLE_VIOLATIONS,
      maxExamplesPerViolation:
        NAMING_CONVENTIONS.ANALYSIS_THRESHOLDS.MAX_EXAMPLES_PER_VIOLATION,
    };
  }

  /**
   * Get validation messages
   */
  static getValidationMessages(_config: Record<string, unknown> = {}): {
    totalViolationsFound: (count: number) => string;
    invalidVariableName: (name: string) => string;
    invalidFunctionName: (name: string) => string;
    invalidClassName: (name: string) => string;
    invalidInterfaceName: (name: string) => string;
    invalidMethodName: (name: string) => string;
  } {
    return {
      totalViolationsFound: (count: number) =>
        CODE_NAMING_MESSAGES.VIOLATIONS.TOTAL_VIOLATIONS_FOUND.replace(
          '{count}',
          count.toString()
        ),
      invalidVariableName: (name: string) =>
        CODE_NAMING_MESSAGES.VIOLATIONS.INVALID_VARIABLE_NAME.replace(
          '{name}',
          name
        ),
      invalidFunctionName: (name: string) =>
        CODE_NAMING_MESSAGES.VIOLATIONS.INVALID_FUNCTION_NAME.replace(
          '{name}',
          name
        ),
      invalidClassName: (name: string) =>
        CODE_NAMING_MESSAGES.VIOLATIONS.INVALID_CLASS_NAME.replace(
          '{name}',
          name
        ),
      invalidInterfaceName: (name: string) =>
        CODE_NAMING_MESSAGES.VIOLATIONS.INVALID_INTERFACE_NAME.replace(
          '{name}',
          name
        ),
      invalidMethodName: (name: string) =>
        CODE_NAMING_MESSAGES.VIOLATIONS.INVALID_METHOD_NAME.replace(
          '{name}',
          name
        ),
    };
  }

  /**
   * Get suggestion messages
   */
  static getSuggestionMessages(_config: Record<string, unknown> = {}): {
    followConventions: string;
    exampleViolations: (examples: string[]) => string;
    unableToAnalyze: string;
  } {
    return {
      followConventions: CODE_NAMING_MESSAGES.SUGGESTIONS.FOLLOW_CONVENTIONS,
      exampleViolations: (examples: string[]) =>
        CODE_NAMING_MESSAGES.SUGGESTIONS.EXAMPLES_PREFIX.replace(
          '{examples}',
          examples.join('; ')
        ),
      unableToAnalyze: CODE_NAMING_MESSAGES.SUGGESTIONS.UNABLE_TO_ANALYZE,
    };
  }
}

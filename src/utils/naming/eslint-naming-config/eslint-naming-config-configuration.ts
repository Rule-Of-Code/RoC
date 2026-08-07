import {
  ESLINT_NAMING_CONVENTIONS,
  ESLINT_NAMING_MESSAGES,
} from '../../constants';

/**
 * ESLint Naming Config Configuration
 * Centralized configuration for ESLint naming convention analysis
 */
export class ESLintNamingConfigConfiguration {
  /**
   * Get ESLint configuration file names
   */
  static getESLintConfigFiles(_config: Record<string, unknown> = {}): string[] {
    return [...ESLINT_NAMING_CONVENTIONS.CONFIG_FILES];
  }

  /**
   * Get naming convention rule names
   */
  static getNamingConventionRules(
    _config: Record<string, unknown> = {}
  ): string[] {
    return [...ESLINT_NAMING_CONVENTIONS.NAMING_RULES];
  }

  /**
   * Get required naming patterns
   */
  static getRequiredNamingPatterns(
    _config: Record<string, unknown> = {}
  ): Record<string, string> {
    return {
      variable: ESLINT_NAMING_CONVENTIONS.REQUIRED_PATTERNS.VARIABLE,
      function: ESLINT_NAMING_CONVENTIONS.REQUIRED_PATTERNS.FUNCTION,
      class: ESLINT_NAMING_CONVENTIONS.REQUIRED_PATTERNS.CLASS,
      interface: ESLINT_NAMING_CONVENTIONS.REQUIRED_PATTERNS.INTERFACE,
    };
  }

  /**
   * Get violation messages
   */
  static getViolationMessages(_config: Record<string, unknown> = {}): {
    noESLintConfig: string;
    noNamingRules: string;
    errorParsingConfig: string;
  } {
    return {
      noESLintConfig: ESLINT_NAMING_MESSAGES.VIOLATIONS.NO_ESLINT_CONFIG,
      noNamingRules: ESLINT_NAMING_MESSAGES.VIOLATIONS.NO_NAMING_RULES,
      errorParsingConfig:
        ESLINT_NAMING_MESSAGES.VIOLATIONS.ERROR_PARSING_CONFIG,
    };
  }

  /**
   * Get suggestion messages
   */
  static getSuggestionMessages(_config: Record<string, unknown> = {}): {
    addESLintConfig: string;
    configureNamingConvention: string;
    verifyConfigSyntax: string;
    configureFilenameCase: string;
    addNamingRuleFor: (selector: string, format: string) => string;
  } {
    return {
      addESLintConfig: ESLINT_NAMING_MESSAGES.SUGGESTIONS.ADD_ESLINT_CONFIG,
      configureNamingConvention:
        ESLINT_NAMING_MESSAGES.SUGGESTIONS.CONFIGURE_NAMING_CONVENTION,
      verifyConfigSyntax:
        ESLINT_NAMING_MESSAGES.SUGGESTIONS.VERIFY_CONFIG_SYNTAX,
      configureFilenameCase:
        ESLINT_NAMING_MESSAGES.SUGGESTIONS.CONFIGURE_FILENAME_CASE,
      addNamingRuleFor: (selector: string, format: string) =>
        ESLINT_NAMING_MESSAGES.SUGGESTIONS.ADD_NAMING_RULE_FOR.replace(
          '{selector}',
          selector
        ).replace('{format}', format),
    };
  }
}

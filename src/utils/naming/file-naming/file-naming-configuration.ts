import { FILE_NAMING_CONVENTIONS, FILE_NAMING_MESSAGES } from '../../constants';

/**
 * File Naming Configuration
 * Configuration constants for file and directory naming conventions
 */
export class FileNamingConfiguration {
  /**
   * Get directories to skip during analysis
   */
  static getSkipDirectories(_config: Record<string, unknown> = {}): string[] {
    return [...FILE_NAMING_CONVENTIONS.SKIP_DIRECTORIES];
  }

  /**
   * Get Angular file suffixes
   */
  static getAngularSuffixes(_config: Record<string, unknown> = {}): string[] {
    return [...FILE_NAMING_CONVENTIONS.ANGULAR_SUFFIXES];
  }

  /**
   * Get naming issue messages
   */
  static getNamingIssueMessages(
    _config: Record<string, unknown> = {}
  ): Record<string, string> {
    return {
      mixedCasing: FILE_NAMING_MESSAGES.ISSUES.MIXED_CASING as string,
      excessiveAbbreviations: FILE_NAMING_MESSAGES.ISSUES
        .EXCESSIVE_ABBREVIATIONS as string,
      angularNaming: FILE_NAMING_MESSAGES.ISSUES.ANGULAR_NAMING as string,
      pascalCaseDirectory: FILE_NAMING_MESSAGES.ISSUES
        .PASCAL_CASE_DIRECTORY as string,
    };
  }

  /**
   * Get naming suggestion messages
   */
  static getNamingSuggestionMessages(
    _config: Record<string, unknown> = {}
  ): Record<string, string> {
    return {
      consistentCasing: FILE_NAMING_MESSAGES.SUGGESTIONS
        .CONSISTENT_CASING as string,
      descriptiveNames: FILE_NAMING_MESSAGES.SUGGESTIONS
        .DESCRIPTIVE_NAMES as string,
      angularPattern: FILE_NAMING_MESSAGES.SUGGESTIONS
        .ANGULAR_PATTERN as string,
      kebabCaseDirectory: FILE_NAMING_MESSAGES.SUGGESTIONS
        .KEBAB_CASE_DIRECTORY as string,
      verifyStructure: FILE_NAMING_MESSAGES.SUGGESTIONS
        .VERIFY_STRUCTURE as string,
    };
  }

  /**
   * Get naming patterns
   */
  static getNamingPatterns(_config: Record<string, unknown> = {}): {
    angular: RegExp;
    abbreviation: RegExp;
    pascalCase: RegExp;
  } {
    return {
      angular: FILE_NAMING_CONVENTIONS.PATTERNS.ANGULAR,
      abbreviation: FILE_NAMING_CONVENTIONS.PATTERNS.ABBREVIATION,
      pascalCase: FILE_NAMING_CONVENTIONS.PATTERNS.PASCAL_CASE,
    };
  }
}

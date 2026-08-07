import {
  ANGULAR_CONSTANTS,
  FILE_EXTENSIONS,
  NGRX_KEYWORDS,
} from '../../constants';
import { StringTemplateUtils } from '../../string-template-utils';

/**
 * NgRx Error Handling Configuration
 * Centralized configuration for NgRx error handling analysis patterns and validation messages
 */
export class NgRxErrorHandlingConfiguration {
  private static readonly Config = NgRxErrorHandlingConfiguration;

  /**
   * Error handling detection keywords (RULE 1: 100% internal coverage)
   */
  static readonly ERROR_HANDLING_KEYWORDS = {
    CATCH_ERROR: ANGULAR_CONSTANTS.CATCH_ERROR,
    RX_OF: ANGULAR_CONSTANTS.RX_OF,
    TIMEOUT: ANGULAR_CONSTANTS.TIMEOUT,
    HTTP_LOWERCASE: ANGULAR_CONSTANTS.HTTP_LOWERCASE,
    RETRY: ANGULAR_CONSTANTS.RETRY,
    RETRY_WHEN: ANGULAR_CONSTANTS.RETRY_WHEN,
    HTTP: NGRX_KEYWORDS.HTTP,
  } as const;

  /**
   * Effects file naming patterns (RULE 1: 100% internal coverage)
   */
  static readonly EFFECTS_FILE_PATTERNS = {
    EFFECTS_DOT: '.effects.',
    EFFECT_DOT: '.effect.',
    EFFECTS_PREFIX: 'effects.',
    EFFECT_KEYWORD: 'effect',
    TYPESCRIPT_EXTENSION: FILE_EXTENSIONS.TYPESCRIPT,
  } as const;

  /**
   * Validation messages for NgRx error handling analysis (RULE 1: 100% internal coverage)
   */
  static readonly VALIDATION_MESSAGES_CONFIG = {
    MISSING_CATCH_ERROR_VIOLATION: 'Missing error handling (catchError) in {0}',
    MISSING_CATCH_ERROR_SUGGESTION:
      'Add catchError operator to handle potential errors',
    MISSING_OBSERVABLE_RETURN_VIOLATION:
      'catchError should return an observable in {0}',
    MISSING_OBSERVABLE_RETURN_SUGGESTION:
      'Use of to return error action in catchError',
    RETRY_LOGIC_SUGGESTION: 'Consider adding retry logic for HTTP operations',
    TIMEOUT_SUGGESTION: 'Consider adding timeout operator for HTTP operations',
  } as const;

  /**
   * Build validation message with flexible placeholder support
   * RULE 1: Uses centralized StringTemplateUtils instead of duplicate logic
   */
  static buildMessage(
    messageTemplate: string,
    ...placeholders: string[]
  ): string {
    return StringTemplateUtils.formatTemplate(messageTemplate, ...placeholders);
  }

  /**
   * Get validation messages for NgRx error handling (RULE 2: Caching)
   */
  static getValidationMessages(): {
    MISSING_CATCH_ERROR_VIOLATION: (fileName: string) => string;
    MISSING_CATCH_ERROR_SUGGESTION: string;
    MISSING_OBSERVABLE_RETURN_VIOLATION: (fileName: string) => string;
    MISSING_OBSERVABLE_RETURN_SUGGESTION: string;
    RETRY_LOGIC_SUGGESTION: string;
    TIMEOUT_SUGGESTION: string;
  } {
    const messages = this.Config.VALIDATION_MESSAGES_CONFIG;
    return {
      MISSING_CATCH_ERROR_VIOLATION: (fileName: string) =>
        this.buildMessage(messages.MISSING_CATCH_ERROR_VIOLATION, fileName),
      MISSING_CATCH_ERROR_SUGGESTION: messages.MISSING_CATCH_ERROR_SUGGESTION,
      MISSING_OBSERVABLE_RETURN_VIOLATION: (fileName: string) =>
        this.buildMessage(
          messages.MISSING_OBSERVABLE_RETURN_VIOLATION,
          fileName
        ),
      MISSING_OBSERVABLE_RETURN_SUGGESTION:
        messages.MISSING_OBSERVABLE_RETURN_SUGGESTION,
      RETRY_LOGIC_SUGGESTION: messages.RETRY_LOGIC_SUGGESTION,
      TIMEOUT_SUGGESTION: messages.TIMEOUT_SUGGESTION,
    };
  }

  /**
   * Analyze NgRx error handling patterns in content (RULE 2: Caching)
   */
  static analyzeErrorHandlingPatterns(content: string): {
    hasCatchError: boolean;
    hasRxOf: boolean;
    hasHttpContent: boolean;
    hasRetryLogic: boolean;
    hasTimeout: boolean;
  } {
    const keywords = this.Config.ERROR_HANDLING_KEYWORDS;

    const hasCatchError = content.includes(keywords.CATCH_ERROR);
    const hasRxOf = content.includes(keywords.RX_OF);
    const hasHttpContent = this.hasHttpContent(content);
    const hasRetryLogic = this.hasRetryLogic(content);
    const hasTimeout = content.includes(keywords.TIMEOUT);

    return {
      hasCatchError,
      hasRxOf,
      hasHttpContent,
      hasRetryLogic,
      hasTimeout,
    };
  }

  /**
   * Check if content has HTTP-related code (RULE 2: Caching)
   */
  static hasHttpContent(content: string): boolean {
    const keywords = this.Config.ERROR_HANDLING_KEYWORDS;
    return (
      content.includes(keywords.HTTP_LOWERCASE) ||
      content.includes(keywords.HTTP)
    );
  }

  /**
   * Check if content has retry logic (RULE 2: Caching)
   */
  static hasRetryLogic(content: string): boolean {
    const keywords = this.Config.ERROR_HANDLING_KEYWORDS;
    return (
      content.includes(keywords.RETRY) || content.includes(keywords.RETRY_WHEN)
    );
  }

  /**
   * Check if file is an NgRx effects file based on filename patterns (RULE 2: Caching)
   */
  static isEffectsFile(fileName: string): boolean {
    const patterns = this.Config.EFFECTS_FILE_PATTERNS;
    return (
      fileName.includes(patterns.EFFECTS_DOT) ||
      fileName.includes(patterns.EFFECT_DOT) ||
      fileName.includes(patterns.EFFECTS_PREFIX) ||
      (fileName.endsWith(patterns.TYPESCRIPT_EXTENSION) &&
        fileName.includes(patterns.EFFECT_KEYWORD))
    );
  }
}

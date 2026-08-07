import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * InputValidationConstants
 *
 * Input validation and sanitization configuration.
 * Single Responsibility: Form validation and XSS prevention patterns
 */
export class InputValidationConstants {
  static readonly VALIDATION_PATTERNS = {
    FORM_CONTROL: /FormControl/,
    VALIDATORS: /Validators/,
    INNER_HTML: /innerHTML/,
    SANITIZE: /sanitiz/i,
    HTTP_CLIENT: /HttpClient/,
    VALIDATE: /validate/i,
  };

  static readonly RISKY_PATTERNS = {
    INNER_HTML_WITHOUT_SANITIZE: /innerHTML.*[^sanitiz]/i,
    FORM_CONTROL_NO_VALIDATORS: /FormControl\s*\(/,
  };

  static readonly SEARCH_FILES = {
    COMPONENT: '*.component.ts',
    SERVICE: '*.service.ts',
  };

  static hasProperFormValidation(content: string): boolean {
    return (
      PatternMatchingUtils.hasRegexPattern(
        content,
        this.VALIDATION_PATTERNS.FORM_CONTROL
      ) &&
      PatternMatchingUtils.hasRegexPattern(
        content,
        this.VALIDATION_PATTERNS.VALIDATORS
      )
    );
  }

  static hasFormControl(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      content,
      this.VALIDATION_PATTERNS.FORM_CONTROL
    );
  }

  static hasValidators(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      content,
      this.VALIDATION_PATTERNS.VALIDATORS
    );
  }

  static hasXSSVulnerability(content: string): boolean {
    return (
      PatternMatchingUtils.hasRegexPattern(
        content,
        this.VALIDATION_PATTERNS.INNER_HTML
      ) &&
      !PatternMatchingUtils.hasRegexPattern(
        content,
        this.VALIDATION_PATTERNS.SANITIZE
      )
    );
  }

  static hasHttpValidation(content: string): boolean {
    return (
      PatternMatchingUtils.hasRegexPattern(
        content,
        this.VALIDATION_PATTERNS.HTTP_CLIENT
      ) &&
      PatternMatchingUtils.hasRegexPattern(
        content,
        this.VALIDATION_PATTERNS.VALIDATE
      )
    );
  }
}

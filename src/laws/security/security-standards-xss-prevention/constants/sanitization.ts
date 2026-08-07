import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * SanitizationConstants
 *
 * Input sanitization and DomSanitizer validation patterns.
 * Single Responsibility: DomSanitizer usage and unsanitized input detection
 */
export class SanitizationConstants {
  static readonly PATTERNS = {
    DOM_SANITIZER: /DomSanitizer|@angular\/platform-browser/,
    SANITIZE_CALL: /sanitize\(|\.sanitizeHtml\(/,
  };

  static readonly UNSAFE_INPUT_PATTERNS = [
    /\$\{.*\}/g, // Template literals with interpolation
    /\+.*input/gi, // String concatenation with input
    /.innerHTML.*\+/gi, // innerHTML with concatenation
  ];

  static hasDomSanitizer(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      content,
      this.PATTERNS.DOM_SANITIZER
    );
  }

  static hasSanitizationCall(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      content,
      this.PATTERNS.SANITIZE_CALL
    );
  }

  static hasUnsanitizedInput(content: string): boolean {
    return this.UNSAFE_INPUT_PATTERNS.some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }
}
